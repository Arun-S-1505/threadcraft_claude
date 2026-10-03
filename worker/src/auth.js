/**
 * Admin auth. Cloudflare Access sits in front of /admin and /api/admin and adds a signed
 * JWT header; we verify it here too, because hiding a route is not security.
 * Local dev only: set DEV_ADMIN_EMAIL in .dev.vars to skip Access (never set it in production).
 */
let jwksCache = { at: 0, keys: null }

const b64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
const parseJson = (s) => JSON.parse(new TextDecoder().decode(b64url(s)))

async function getKeys(teamDomain) {
  if (jwksCache.keys && Date.now() - jwksCache.at < 60 * 60 * 1000) return jwksCache.keys
  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`)
  if (!res.ok) throw new Error('Could not load Access keys')
  jwksCache = { at: Date.now(), keys: (await res.json()).keys }
  return jwksCache.keys
}

async function verifyAccessJwt(token, env) {
  const [h, p, s] = token.split('.')
  if (!h || !p || !s) return null
  const header = parseJson(h)
  const payload = parseJson(p)
  if (header.alg !== 'RS256') return null

  const jwk = (await getKeys(env.ACCESS_TEAM_DOMAIN)).find((k) => k.kid === header.kid)
  if (!jwk) return null
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(s), new TextEncoder().encode(`${h}.${p}`))
  if (!ok) return null

  const now = Math.floor(Date.now() / 1000)
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (payload.exp < now || !aud.includes(env.ACCESS_AUD)) return null
  if (payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return null
  return payload.email || null
}

/** Hono middleware: only allow-listed admins get through. */
export async function requireAdmin(c, next) {
  const env = c.env
  const allowed = (env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  let email = null

  if (env.DEV_ADMIN_EMAIL) {
    email = env.DEV_ADMIN_EMAIL
  } else if (env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD) {
    const token = c.req.header('Cf-Access-Jwt-Assertion')
    try {
      email = token ? await verifyAccessJwt(token, env) : null
    } catch {
      email = null
    }
  }

  if (!email || !allowed.includes(email.toLowerCase())) return c.json({ error: 'Forbidden' }, 403)
  c.set('admin', email)
  await next()
}
