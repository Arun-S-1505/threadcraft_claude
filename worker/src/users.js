/**
 * Customer accounts. Sign-in is an emailed 6-digit code (no passwords to leak or reset).
 * The code proves the person owns the email, so a signed-in user may see every order placed with
 * that email, including orders placed as a guest before they created an account.
 */
import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { sendLoginCode } from './email.js'

const COOKIE = 'tc_session'
const SESSION_DAYS = 30
const CODE_MINUTES = 10
const MAX_ATTEMPTS = 5
const MAX_SENDS_PER_HOUR = 5
const RESEND_GAP_SECONDS = 45

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^\+?[0-9\s-]{10,15}$/
const PIN_RE = /^[0-9]{6}$/
const now = () => new Date().toISOString()
const clip = (v, n) => String(v ?? '').trim().slice(0, n)

async function sha256Hex(text) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

const randomCode = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0')
const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  name: u.name || '',
  phone: u.phone || '',
  address: u.address || '',
  city: u.city || '',
  state: u.state || '',
  pincode: u.pincode || '',
})

export async function getSessionUser(c) {
  const token = getCookie(c, COOKIE)
  if (!token || token.length < 20) return null
  return c.env.DB.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`).bind(await sha256Hex(token), now()).first()
}

// Cookies are sent automatically, so refuse state-changing requests that come from another website.
async function sameOrigin(c, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) return next()
  const origin = c.req.header('Origin')
  if (origin && origin !== new URL(c.req.url).origin && origin !== c.env.ALLOWED_ORIGIN) return c.json({ error: 'Forbidden' }, 403)
  return next()
}

function summarize(row) {
  let spec = {}
  try {
    spec = JSON.parse(row.spec_json)
  } catch {
    /* ignore */
  }
  if (spec.erased) return 'Details removed at your request'
  if (row.kind === 'shop') return (spec.items || []).map((i) => `${i.name} × ${i.qty}`).join(', ')
  const g = spec.garment || {}
  const n = (spec.items || []).length
  return `Custom ${g.fit || ''} tee × ${row.quantity} · ${n} print${n === 1 ? '' : 's'}`
}

export function userRoutes({ rateLimit }) {
  const r = new Hono()
  r.use('/auth/*', sameOrigin)
  r.use('/me', sameOrigin)
  r.use('/me/*', sameOrigin)

  /* ── ask for a code ── */
  r.post('/auth/request-code', rateLimit, async (c) => {
    const b = await c.req.json().catch(() => ({}))
    if (b.website) return c.json({ ok: true }) // honeypot
    const email = clip(b.email, 200).toLowerCase()
    const name = clip(b.name, 100)
    if (!EMAIL_RE.test(email)) return c.json({ error: 'Enter a valid email address' }, 400)

    const db = c.env.DB
    const row = await db.prepare(`SELECT * FROM login_codes WHERE email = ?`).bind(email).first()
    const t = Date.now()
    let inWindow = false
    if (row) {
      const since = (t - Date.parse(row.created_at)) / 1000
      if (since < RESEND_GAP_SECONDS) return c.json({ error: `Please wait ${Math.ceil(RESEND_GAP_SECONDS - since)} seconds before asking for another code.` }, 429)
      inWindow = t - Date.parse(row.window_start) < 3600_000
      if (inWindow && row.sent_count >= MAX_SENDS_PER_HOUR) return c.json({ error: 'Too many codes requested. Please try again in an hour.' }, 429)
    }

    const code = randomCode()
    const at = now()
    await db
      .prepare(
        `INSERT INTO login_codes (email, code_hash, name, expires_at, attempts, sent_count, window_start, created_at)
         VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6, ?7)
         ON CONFLICT(email) DO UPDATE SET code_hash = ?2, name = COALESCE(?3, name), expires_at = ?4, attempts = 0, sent_count = ?5, window_start = ?6, created_at = ?7`
      )
      .bind(email, await sha256Hex(`${email}:${code}`), name || null, new Date(t + CODE_MINUTES * 60_000).toISOString(), inWindow ? row.sent_count + 1 : 1, inWindow ? row.window_start : at, at)
      .run()

    const sent = await sendLoginCode(c.env, email, code, CODE_MINUTES)
    if (!sent) return c.json({ error: 'We could not send the email right now. Please try again in a moment.' }, 502)
    return c.json({ ok: true, minutes: CODE_MINUTES })
  })

  /* ── check the code, create the account if needed, start a session ── */
  r.post('/auth/verify', rateLimit, async (c) => {
    const b = await c.req.json().catch(() => ({}))
    const email = clip(b.email, 200).toLowerCase()
    const code = String(b.code ?? '').replace(/\s/g, '')
    if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) return c.json({ error: 'Enter the 6-digit code from your email' }, 400)

    const db = c.env.DB
    const row = await db.prepare(`SELECT * FROM login_codes WHERE email = ?`).bind(email).first()
    if (!row || row.expires_at < now()) return c.json({ error: 'That code has expired. Please request a new one.' }, 400)
    if (row.attempts >= MAX_ATTEMPTS) {
      await db.prepare(`DELETE FROM login_codes WHERE email = ?`).bind(email).run()
      return c.json({ error: 'Too many wrong attempts. Please request a new code.' }, 429)
    }
    if (!safeEqual(await sha256Hex(`${email}:${code}`), row.code_hash)) {
      await db.prepare(`UPDATE login_codes SET attempts = attempts + 1 WHERE email = ?`).bind(email).run()
      return c.json({ error: 'That code is not correct.' }, 400)
    }

    const at = now()
    await db.prepare(`DELETE FROM login_codes WHERE email = ?`).bind(email).run() // a code works once
    let user = await db.prepare(`SELECT * FROM users WHERE email = ?`).bind(email).first()
    if (!user) {
      await db.prepare(`INSERT INTO users (email, name, created_at, last_login_at) VALUES (?, ?, ?, ?)`).bind(email, row.name, at, at).run()
    } else {
      await db.prepare(`UPDATE users SET last_login_at = ?1, name = COALESCE(NULLIF(name, ''), ?2) WHERE id = ?3`).bind(at, row.name, user.id).run()
    }
    user = await db.prepare(`SELECT * FROM users WHERE email = ?`).bind(email).first()

    const token = randomToken()
    await db.prepare(`INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`).bind(await sha256Hex(token), user.id, new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString(), at).run()
    setCookie(c, COOKIE, token, { path: '/', httpOnly: true, secure: new URL(c.req.url).protocol === 'https:', sameSite: 'Lax', maxAge: SESSION_DAYS * 86400 })
    return c.json({ user: publicUser(user) })
  })

  r.post('/auth/logout', async (c) => {
    const token = getCookie(c, COOKIE)
    if (token) await c.env.DB.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(await sha256Hex(token)).run()
    deleteCookie(c, COOKIE, { path: '/' })
    return c.json({ ok: true })
  })

  /* ── the signed-in customer ── */
  r.get('/me', async (c) => {
    const u = await getSessionUser(c)
    c.header('Cache-Control', 'no-store')
    return c.json({ user: u ? publicUser(u) : null })
  })

  r.patch('/me', async (c) => {
    const u = await getSessionUser(c)
    if (!u) return c.json({ error: 'Please sign in' }, 401)
    const b = await c.req.json().catch(() => ({}))
    const name = clip(b.name, 100)
    const phone = clip(b.phone, 20)
    const pincode = clip(b.pincode, 6)
    if (name.length < 2) return c.json({ error: 'Enter your name' }, 400)
    if (phone && !PHONE_RE.test(phone)) return c.json({ error: 'Enter a valid phone number' }, 400)
    if (pincode && !PIN_RE.test(pincode)) return c.json({ error: 'PIN code must be 6 digits' }, 400)
    await c.env.DB.prepare(`UPDATE users SET name=?1, phone=?2, address=?3, city=?4, state=?5, pincode=?6 WHERE id=?7`).bind(name, phone, clip(b.address, 300), clip(b.city, 80), clip(b.state, 60), pincode, u.id).run()
    return c.json({ user: publicUser(await c.env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(u.id).first()) })
  })

  r.get('/me/orders', async (c) => {
    const u = await getSessionUser(c)
    if (!u) return c.json({ error: 'Please sign in' }, 401)
    const rows = (
      await c.env.DB.prepare(
        `SELECT id, kind, status, payment_method, payment_status, tracking_no, total, quantity, created_at, spec_json,
                EXISTS (SELECT 1 FROM order_files f WHERE f.order_id = orders.id AND f.kind = 'preview' AND f.label = 'front') AS has_preview
         FROM orders WHERE email = ? ORDER BY created_at DESC LIMIT 100`
      )
        .bind(u.email)
        .all()
    ).results
    c.header('Cache-Control', 'no-store')
    return c.json({ orders: rows.map(({ spec_json, has_preview, ...o }) => ({ ...o, summary: summarize({ ...o, spec_json }), hasPreview: !!has_preview })) })
  })

  r.get('/me/orders/:id', async (c) => {
    const u = await getSessionUser(c)
    if (!u) return c.json({ error: 'Please sign in' }, 401)
    const id = c.req.param('id')
    const o = await c.env.DB.prepare(`SELECT id, kind, status, payment_method, payment_status, tracking_no, total, shipping, quantity, size, created_at, updated_at, spec_json FROM orders WHERE id = ? AND email = ?`).bind(id, u.email).first()
    if (!o) return c.json({ error: 'Order not found' }, 404)
    const history = (await c.env.DB.prepare(`SELECT status, at FROM status_history WHERE order_id = ? ORDER BY id`).bind(id).all()).results.filter((h) => !h.status.includes('erased'))
    const { spec_json, ...rest } = o
    const spec = JSON.parse(spec_json)
    const items = spec.erased ? [] : o.kind === 'shop' ? spec.items : (spec.items || []).map((i) => ({ type: i.type, placement: i.placement, text: i.text || null, name: i.name || null }))
    c.header('Cache-Control', 'no-store')
    return c.json({ ...rest, summary: summarize(o), items, garment: spec.garment || null, history })
  })

  // The saved front preview of a custom design, only for the order's owner
  r.get('/me/orders/:id/preview', async (c) => {
    const u = await getSessionUser(c)
    if (!u) return c.json({ error: 'Please sign in' }, 401)
    const f = await c.env.DB.prepare(
      `SELECT f.sha256, f.mime FROM order_files o JOIN files f ON f.sha256 = o.sha256 JOIN orders ord ON ord.id = o.order_id
       WHERE o.order_id = ? AND ord.email = ? AND o.kind = 'preview' AND o.label = 'front'`
    )
      .bind(c.req.param('id'), u.email)
      .first()
    const obj = f && (await c.env.FILES.get(`files/${f.sha256}`))
    if (!obj) return c.json({ error: 'Not found' }, 404)
    return new Response(obj.body, { headers: { 'Content-Type': f.mime, 'Cache-Control': 'private, max-age=3600', 'Content-Security-Policy': "default-src 'none'; sandbox" } })
  })

  return r
}

/** Removes expired sign-in codes and sessions (called from the monthly cron). */
export async function cleanupAuth(env) {
  const t = now()
  await env.DB.batch([env.DB.prepare(`DELETE FROM login_codes WHERE expires_at < ?`).bind(t), env.DB.prepare(`DELETE FROM sessions WHERE expires_at < ?`).bind(t)])
}
