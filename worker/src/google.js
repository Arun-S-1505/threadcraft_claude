/**
 * Server-side checks for "Sign in with Google". The browser only passes a token along; we never trust it
 * until Google confirms it was issued to OUR app and that Google verified the email. No client secret is used.
 *
 * Two token kinds are accepted:
 *  - an ID token (signature checked here against Google's published keys), and
 *  - an access token from the popup flow behind our own "Sign in with Google" button (checked with Google).
 */
const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs'
let cache = { at: 0, keys: null }

const b64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
const parse = (s) => JSON.parse(new TextDecoder().decode(b64url(s)))

async function googleKeys(force = false) {
  if (!force && cache.keys && Date.now() - cache.at < 60 * 60 * 1000) return cache.keys
  const res = await fetch(CERTS_URL)
  if (!res.ok) throw new Error('Could not load Google keys')
  cache = { at: Date.now(), keys: (await res.json()).keys }
  return cache.keys
}

/** ID token: returns the token's claims when valid, otherwise null. */
export async function verifyGoogleIdToken(token, clientId) {
  try {
    if (!clientId || typeof token !== 'string') return null
    const [h, p, s] = token.split('.')
    if (!h || !p || !s) return null
    const header = parse(h)
    const claims = parse(p)
    if (header.alg !== 'RS256') return null

    let jwk = (await googleKeys()).find((k) => k.kid === header.kid)
    if (!jwk) jwk = (await googleKeys(true)).find((k) => k.kid === header.kid) // Google rotates keys
    if (!jwk) return null

    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(s), new TextEncoder().encode(`${h}.${p}`))
    if (!valid) return null

    const now = Math.floor(Date.now() / 1000)
    if (claims.aud !== clientId) return null
    if (claims.iss !== 'https://accounts.google.com' && claims.iss !== 'accounts.google.com') return null
    if (!(claims.exp > now) || claims.iat > now + 300) return null
    if (!claims.sub || typeof claims.email !== 'string') return null
    if (claims.email_verified !== true && claims.email_verified !== 'true') return null
    return claims
  } catch {
    return null
  }
}

/**
 * Access token: Google's tokeninfo says who it belongs to. The crucial check is `aud`, which must be OUR client id,
 * otherwise a token issued to some other website could be replayed here.
 * Returns { sub, email, name } or null.
 */
export async function verifyGoogleAccessToken(token, clientId) {
  try {
    if (!clientId || typeof token !== 'string' || token.length < 20 || token.length > 4096) return null
    const res = await fetch('https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(token))
    if (!res.ok) return null
    const info = await res.json()
    if (info.aud !== clientId) return null
    if (!(Number(info.expires_in) > 0)) return null
    if (info.email_verified !== true && info.email_verified !== 'true') return null
    if (!info.sub || typeof info.email !== 'string') return null

    let name = ''
    try {
      const u = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } })
      if (u.ok) name = String((await u.json()).name || '')
    } catch {
      /* the name is optional */
    }
    return { sub: info.sub, email: info.email, name }
  } catch {
    return null
  }
}
