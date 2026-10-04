/**
 * Verifies a "Sign in with Google" ID token on the server. The browser only passes the token along;
 * we check Google's signature, our own client id, the expiry and that Google verified the email.
 * No client secret is needed for this flow.
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

/** Returns the token's claims when valid, otherwise null. */
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
