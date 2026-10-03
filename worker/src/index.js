import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { computePrice, validateDesignSpec, validateCustomer, SIZES, PLACEMENTS } from '../../shared/designSpec.js'
import { readUploads, MAX_REQUEST_BYTES } from './files.js'
import { requireAdmin } from './auth.js'
import { notifyNewOrder, notifyMessage } from './email.js'
import { gatewayEnabled, createGatewayOrder } from './payments.js'
import { priceCart } from './catalog.js'
import { runMonthlyBackup } from './backup.js'

const app = new Hono()

const STATUSES = ['new', 'paid', 'printing', 'shipped', 'delivered', 'cancelled']
const now = () => new Date().toISOString()

/* ───────── Middleware ───────── */
app.use('/api/*', async (c, next) => {
  const origin = c.env.ALLOWED_ORIGIN
  return cors({ origin, allowMethods: ['GET', 'POST', 'PATCH'], allowHeaders: ['Content-Type'], maxAge: 600 })(c, next)
})

app.use('*', async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Referrer-Policy', 'no-referrer')
})

// Public routes only. Admin routes are protected by Access instead and are not rate limited here.
async function rateLimit(c, next) {
  const limiter = c.env.RATE_LIMITER
  if (limiter) {
    const ip = c.req.header('CF-Connecting-IP') || 'local'
    const { success } = await limiter.limit({ key: `${c.req.path}:${ip}` })
    if (!success) return c.json({ error: 'Too many requests. Please wait a minute and try again.' }, 429)
  }
  await next()
}

/* ───────── Helpers ───────── */
const ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L
function newOrderId() {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return 'TC-' + [...bytes].map((b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('')
}

const vec3 = (v) => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n))

function checkSpecFiles(spec, files) {
  for (const [i, it] of spec.items.entries()) {
    if (!vec3(it.resolved?.position) || !vec3(it.resolved?.rotation) || !vec3(it.resolved?.scale)) return `Item ${i + 1}: missing resolved transform`
    if (it.type === 'image') {
      const f = files.get(it.sha256)
      if (!f) return `Item ${i + 1}: image file was not uploaded`
    } else if (it.type === 'text') {
      const f = files.get(it.rasterSha256)
      if (!f || f.mime !== 'image/png') return `Item ${i + 1}: text image was not uploaded`
    }
  }
  return null
}

/* ───────── Public: place an order ───────── */
app.post('/api/orders', rateLimit, async (c) => {
  // Reject early when the size is declared, and verify again after reading (chunked uploads have no length).
  const declared = Number(c.req.header('content-length') || 0)
  if (declared > MAX_REQUEST_BYTES) return c.json({ error: 'Upload is too large' }, 413)
  const body = await c.req.arrayBuffer()
  if (body.byteLength > MAX_REQUEST_BYTES) return c.json({ error: 'Upload is too large' }, 413)

  let form
  try {
    form = await new Response(body, { headers: { 'Content-Type': c.req.header('content-type') || '' } }).formData()
  } catch {
    return c.json({ error: 'Invalid request' }, 400)
  }

  let payload
  try {
    payload = JSON.parse(form.get('order'))
  } catch {
    return c.json({ error: 'Invalid order data' }, 400)
  }
  const { spec, customer = {}, size } = payload
  const quantity = Number(payload.quantity)

  const specErrors = validateDesignSpec(spec)
  if (specErrors.length) return c.json({ error: specErrors[0] }, 400)
  const custErrors = validateCustomer({ ...customer, quantity })
  if (Object.keys(custErrors).length) return c.json({ error: Object.values(custErrors)[0] }, 400)
  if (!SIZES.includes(size)) return c.json({ error: 'Invalid size' }, 400)

  const up = await readUploads(form)
  if (up.error) return c.json({ error: up.error }, 400)
  const fileError = checkSpecFiles(spec, up.files)
  if (fileError) return c.json({ error: fileError }, 400)
  if (!up.previews.has('front')) return c.json({ error: 'Preview image missing' }, 400)
  for (const view of up.previews.keys()) if (!PLACEMENTS.includes(view)) return c.json({ error: 'Invalid preview view' }, 400)

  // Price is always computed here; any total from the browser is ignored.
  const { unit, total } = computePrice(spec, quantity)
  const online = gatewayEnabled(c.env)
  const id = newOrderId()
  const at = now()

  // Store bytes first (content-addressed, so re-uploading the same file is a no-op).
  const all = new Map(up.files)
  for (const p of up.previews.values()) all.set(p.sha256, p)
  await Promise.all(
    [...all].map(async ([sha, f]) => {
      const key = `files/${sha}`
      if (!(await c.env.FILES.head(key))) await c.env.FILES.put(key, f.bytes, { httpMetadata: { contentType: f.mime } })
    })
  )

  const db = c.env.DB
  const stmts = [
    db
      .prepare(
        `INSERT INTO orders (id, kind, created_at, updated_at, payment_method, customer_name, email, phone, address, city, pincode, notes, size, quantity, unit_price, total, spec_json)
         VALUES (?1,'custom',?2,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)`
      )
      .bind(id, at, online ? 'online' : 'invoice', customer.name.trim(), customer.email.trim().toLowerCase(), customer.phone.trim(), customer.address.trim(), customer.city.trim(), customer.pincode.trim(), (customer.notes || '').trim() || null, size, quantity, unit, total, JSON.stringify(spec)),
    db.prepare(`INSERT INTO status_history (order_id, status, actor, at) VALUES (?,?,?,?)`).bind(id, 'new', 'customer', at),
  ]
  const link = (sha, mime, size_, kind, label) => {
    stmts.push(db.prepare(`INSERT OR IGNORE INTO files (sha256, mime, size, created_at) VALUES (?,?,?,?)`).bind(sha, mime, size_, at))
    stmts.push(db.prepare(`INSERT OR IGNORE INTO order_files (order_id, sha256, kind, label) VALUES (?,?,?,?)`).bind(id, sha, kind, label))
  }
  for (const it of spec.items) {
    if (it.type === 'image') link(it.sha256, up.files.get(it.sha256).mime, up.files.get(it.sha256).bytes.length, 'original', it.id)
    else link(it.rasterSha256, 'image/png', up.files.get(it.rasterSha256).bytes.length, 'text_raster', it.id)
  }
  for (const [view, p] of up.previews) link(p.sha256, p.mime, p.bytes.length, 'preview', view)
  await db.batch(stmts)

  const paymentNote = online
    ? 'Payment: online. If you have not completed payment yet, use the Track Order page to pay.'
    : 'Payment: we will email you a payment request once we have reviewed your design.'
  c.executionCtx.waitUntil(
    notifyNewOrder(c.env, {
      id,
      total,
      customer,
      paymentNote,
      lines: [`${spec.garment.fit} tee (${spec.garment.gsm} GSM), size ${size}, ${spec.items.length} print(s), ${spec.garment.printType}`, `Quantity ${quantity} × ₹${unit}`],
    })
  )
  return c.json({ orderId: id, total, payment: await startPayment(c, id) }, 201)
})

// Creates the Razorpay order when the gateway is configured. A gateway hiccup must not lose the order:
// the customer gets their order number and can retry payment from POST /api/pay.
async function startPayment(c, id) {
  if (!gatewayEnabled(c.env)) return null
  try {
    const order = await c.env.DB.prepare(`SELECT id, total, customer_name, email, phone FROM orders WHERE id = ?`).bind(id).first()
    return await createGatewayOrder(c.env, order)
  } catch (err) {
    console.error(err)
    return { error: 'Payment could not be started. You can retry from Track Order.' }
  }
}

/* ───────── Public: what the storefront may offer ───────── */
app.get('/api/config', (c) => c.json({ onlinePayments: gatewayEnabled(c.env), cod: true }))

/* ───────── Public: shop (cart) order ───────── */
app.post('/api/shop-orders', rateLimit, async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Invalid request' }, 400)
  const { customer = {}, payment, items } = body
  const method = payment === 'cod' ? 'cod' : 'online'
  if (method === 'online' && !gatewayEnabled(c.env)) return c.json({ error: 'Online payment is not available yet. Please choose cash on delivery.' }, 400)

  const priced = priceCart(items, { cod: method === 'cod' })
  if (priced.error) return c.json({ error: priced.error }, 400)
  const custErrors = validateCustomer({ ...customer, quantity: priced.count })
  if (Object.keys(custErrors).length) return c.json({ error: Object.values(custErrors)[0] }, 400)

  const id = newOrderId()
  const at = now()
  await c.env.DB.batch([
    c.env.DB
      .prepare(
        `INSERT INTO orders (id, kind, created_at, updated_at, payment_method, customer_name, email, phone, address, city, pincode, notes, quantity, unit_price, shipping, total, spec_json)
         VALUES (?1,'shop',?2,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)`
      )
      .bind(id, at, method, customer.name.trim(), customer.email.trim().toLowerCase(), customer.phone.trim(), customer.address.trim(), customer.city.trim(), customer.pincode.trim(), (customer.notes || '').trim() || null, priced.count, priced.subtotal, priced.shipping, priced.total, JSON.stringify({ items: priced.items })),
    c.env.DB.prepare(`INSERT INTO status_history (order_id, status, actor, at) VALUES (?,?,?,?)`).bind(id, 'new', 'customer', at),
  ])

  c.executionCtx.waitUntil(
    notifyNewOrder(c.env, {
      id,
      total: priced.total,
      customer,
      paymentNote: method === 'cod' ? 'Payment: cash on delivery.' : 'Payment: online.',
      lines: priced.items.map((i) => `${i.name} (${i.colour}, ${i.size}) × ${i.qty}`),
    })
  )
  return c.json({ orderId: id, total: priced.total, subtotal: priced.subtotal, shipping: priced.shipping, method, payment: method === 'online' ? await startPayment(c, id) : null }, 201)
})

/* ───────── Public: retry payment for an unpaid online order ───────── */
app.post('/api/pay', rateLimit, async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const id = String(body.id || '').trim().toUpperCase()
  const email = String(body.email || '').trim().toLowerCase()
  const order = await c.env.DB.prepare(`SELECT id, total, customer_name, email, phone, payment_status, payment_method, status FROM orders WHERE id = ? AND email = ?`).bind(id, email).first()
  if (!order) return c.json({ error: 'No order found for that number and email' }, 404)
  if (order.payment_status === 'paid') return c.json({ error: 'This order is already paid' }, 400)
  if (order.status === 'cancelled' || order.payment_method === 'cod') return c.json({ error: 'Payment is not needed for this order' }, 400)
  if (!gatewayEnabled(c.env)) return c.json({ error: 'Online payment is not available yet' }, 400)
  try {
    const payment = await createGatewayOrder(c.env, order)
    // An order taken before the gateway existed ("invoice") becomes a normal online order
    await c.env.DB.prepare(`UPDATE orders SET payment_method = 'online' WHERE id = ? AND payment_method = 'invoice'`).bind(id).run()
    return c.json({ payment })
  } catch (err) {
    return c.json({ error: err.message }, 502)
  }
})

/* ───────── Public: contact + bulk forms ───────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const clip = (v, n) => String(v ?? '').trim().slice(0, n)

async function saveMessage(c, kind, name, email, fields) {
  await c.env.DB.prepare(`INSERT INTO messages (kind, name, email, body_json, created_at) VALUES (?,?,?,?,?)`).bind(kind, name, email, JSON.stringify(fields), now()).run()
  c.executionCtx.waitUntil(notifyMessage(c.env, { kind, name, email, fields }))
  return c.json({ ok: true }, 201)
}

app.post('/api/contact', rateLimit, async (c) => {
  const b = await c.req.json().catch(() => ({}))
  if (b.website) return c.json({ ok: true }) // honeypot: real people never fill this hidden field
  const name = clip(b.name, 100)
  const email = clip(b.email, 200).toLowerCase()
  const message = clip(b.message, 4000)
  if (name.length < 2 || !EMAIL_RE.test(email) || message.length < 5) return c.json({ error: 'Please fill in your name, a valid email and a message' }, 400)
  return saveMessage(c, 'contact', name, email, { subject: clip(b.subject, 150), phone: clip(b.phone, 20), message })
})

app.post('/api/bulk', rateLimit, async (c) => {
  const b = await c.req.json().catch(() => ({}))
  if (b.website) return c.json({ ok: true })
  const contact = clip(b.contact, 100)
  const company = clip(b.company, 150)
  const email = clip(b.email, 200).toLowerCase()
  if (contact.length < 2 || company.length < 2 || !EMAIL_RE.test(email)) return c.json({ error: 'Please fill in company, contact person and a valid email' }, 400)
  return saveMessage(c, 'bulk', contact, email, { company, volume: clip(b.volume, 40), details: clip(b.details, 4000) })
})

/* ───────── Public: track an order (needs order id AND email) ───────── */
app.get('/api/track', rateLimit, async (c) => {
  const id = (c.req.query('id') || '').trim().toUpperCase()
  const email = (c.req.query('email') || '').trim().toLowerCase()
  const order = await c.env.DB.prepare(`SELECT id, kind, status, payment_method, payment_status, tracking_no, total, created_at, updated_at FROM orders WHERE id = ? AND email = ?`).bind(id, email).first()
  if (!order) return c.json({ error: 'No order found for that number and email' }, 404)
  const { results } = await c.env.DB.prepare(`SELECT status, at FROM status_history WHERE order_id = ? ORDER BY id`).bind(id).all()
  return c.json({ ...order, history: results })
})

/* ───────── Admin (Cloudflare Access + server-side check) ───────── */
const admin = new Hono()
admin.use('*', requireAdmin)

admin.get('/orders', async (c) => {
  const status = c.req.query('status')
  const limit = Math.min(100, Number(c.req.query('limit')) || 50)
  const offset = Math.max(0, Number(c.req.query('offset')) || 0)
  const where = STATUSES.includes(status) ? 'WHERE status = ?1' : ''
  const sql = `SELECT id, kind, created_at, status, payment_method, payment_status, customer_name, email, size, quantity, total, tracking_no FROM orders ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
  const stmt = where ? c.env.DB.prepare(sql).bind(status) : c.env.DB.prepare(sql)
  return c.json({ orders: (await stmt.all()).results })
})

admin.get('/orders/:id', async (c) => {
  const id = c.req.param('id')
  const order = await c.env.DB.prepare(`SELECT * FROM orders WHERE id = ?`).bind(id).first()
  if (!order) return c.json({ error: 'Not found' }, 404)
  const files = (await c.env.DB.prepare(`SELECT f.sha256, f.mime, f.size, o.kind, o.label FROM order_files o JOIN files f ON f.sha256 = o.sha256 WHERE o.order_id = ?`).bind(id).all()).results
  const history = (await c.env.DB.prepare(`SELECT status, tracking_no, actor, at FROM status_history WHERE order_id = ? ORDER BY id`).bind(id).all()).results
  const { spec_json, ...rest } = order
  return c.json({ ...rest, spec: JSON.parse(spec_json), files, history })
})

admin.patch('/orders/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  if (!STATUSES.includes(body.status)) return c.json({ error: 'Invalid status' }, 400)
  const tracking = (body.trackingNo || '').toString().trim().slice(0, 60) || null
  if (body.status === 'shipped' && !tracking) return c.json({ error: 'Tracking number is required when shipping' }, 400)
  const at = now()
  const res = await c.env.DB.prepare(`UPDATE orders SET status = ?1, tracking_no = COALESCE(?2, tracking_no), updated_at = ?3 WHERE id = ?4`).bind(body.status, tracking, at, id).run()
  if (!res.meta.changes) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare(`INSERT INTO status_history (order_id, status, tracking_no, actor, at) VALUES (?,?,?,?,?)`).bind(id, body.status, tracking, c.get('admin'), at).run()
  return c.json({ ok: true })
})

// Streams a stored file. Only hashes that belong to an order are served.
admin.get('/files/:sha', async (c) => {
  const sha = c.req.param('sha')
  if (!/^[0-9a-f]{64}$/.test(sha)) return c.json({ error: 'Bad request' }, 400)
  const meta = await c.env.DB.prepare(`SELECT mime FROM files WHERE sha256 = ?`).bind(sha).first()
  const obj = meta && (await c.env.FILES.get(`files/${sha}`))
  if (!obj) return c.json({ error: 'Not found' }, 404)
  const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg' }[meta.mime]
  const headers = new Headers({
    'Content-Type': meta.mime,
    'Cache-Control': 'private, max-age=300',
    // Untrusted uploads: lock down anything an SVG could try to do if opened directly.
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  })
  if (c.req.query('download')) headers.set('Content-Disposition', `attachment; filename="${sha.slice(0, 12)}.${ext}"`)
  return new Response(obj.body, { headers })
})

const csvCell = (v) => {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s // stop spreadsheet formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Monthly backup: /api/admin/export?month=2026-09&format=csv|json
admin.get('/export', async (c) => {
  const month = c.req.query('month') || ''
  if (!/^\d{4}-\d{2}$/.test(month)) return c.json({ error: 'month must be YYYY-MM' }, 400)
  const { results } = await c.env.DB.prepare(`SELECT * FROM orders WHERE created_at >= ?1 AND created_at < ?2 ORDER BY created_at`).bind(`${month}`, `${month}~`).all()
  if (c.req.query('format') === 'json') return c.json(results.map(({ spec_json, ...r }) => ({ ...r, spec: JSON.parse(spec_json) })))
  const cols = ['id', 'created_at', 'status', 'payment_status', 'payment_id', 'tracking_no', 'customer_name', 'email', 'phone', 'address', 'city', 'pincode', 'notes', 'size', 'quantity', 'unit_price', 'total']
  const csv = [cols.join(','), ...results.map((r) => cols.map((k) => csvCell(r[k])).join(','))].join('\n')
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="orders-${month}.csv"` } })
})

// Erase a customer's personal data on request. The order row stays (amounts, status) for accounting,
// but name, contact, address, notes, the design and every stored file are removed.
admin.delete('/orders/:id/personal-data', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  if (body.confirm !== id) return c.json({ error: 'Send {"confirm": "<order id>"} to confirm' }, 400)
  const db = c.env.DB
  const order = await db.prepare(`SELECT id FROM orders WHERE id = ?`).bind(id).first()
  if (!order) return c.json({ error: 'Not found' }, 404)

  const linked = (await db.prepare(`SELECT DISTINCT sha256 FROM order_files WHERE order_id = ?`).bind(id).all()).results
  const at = now()
  await db.batch([
    db.prepare(`UPDATE orders SET customer_name='[erased]', email='erased-' || id || '@invalid', phone='', address='', city='', pincode='', notes=NULL, spec_json='{"erased":true,"items":[]}', updated_at=?1 WHERE id=?2`).bind(at, id),
    db.prepare(`DELETE FROM order_files WHERE order_id = ?`).bind(id),
    db.prepare(`INSERT INTO status_history (order_id, status, actor, at) VALUES (?,?,?,?)`).bind(id, 'personal data erased', c.get('admin'), at),
  ])
  // Remove a file only if no other order still uses it (identical uploads are shared by hash)
  let removed = 0
  for (const { sha256 } of linked) {
    const stillUsed = await db.prepare(`SELECT 1 FROM order_files WHERE sha256 = ? LIMIT 1`).bind(sha256).first()
    if (!stillUsed) {
      await c.env.FILES.delete(`files/${sha256}`)
      await db.prepare(`DELETE FROM files WHERE sha256 = ?`).bind(sha256).run()
      removed++
    }
  }
  return c.json({ ok: true, filesRemoved: removed })
})

admin.delete('/messages/:id', async (c) => {
  await c.env.DB.prepare(`DELETE FROM messages WHERE id = ?`).bind(Number(c.req.param('id'))).run()
  return c.json({ ok: true })
})

admin.get('/messages', async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT id, kind, name, email, body_json, handled, created_at FROM messages ORDER BY created_at DESC LIMIT 100`).all()
  return c.json({ messages: results.map(({ body_json, ...m }) => ({ ...m, fields: JSON.parse(body_json) })) })
})

admin.patch('/messages/:id', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  await c.env.DB.prepare(`UPDATE messages SET handled = ? WHERE id = ?`).bind(body.handled ? 1 : 0, Number(c.req.param('id'))).run()
  return c.json({ ok: true })
})

// Run the backup on demand (the cron does this monthly for the previous month)
admin.post('/backup', async (c) => c.json(await runMonthlyBackup(c.env, c.req.query('month') || undefined)))

app.route('/api/admin', admin)

/* ───────── Payment webhook (Razorpay) ───────── */
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

app.post('/api/webhooks/razorpay', async (c) => {
  const secret = c.env.RAZORPAY_WEBHOOK_SECRET
  const signature = c.req.header('x-razorpay-signature') || ''
  if (!secret) return c.json({ error: 'Not configured' }, 503)

  const raw = await c.req.text() // must be the exact raw body for the signature to match
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const expected = toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)))
  if (!safeEqual(expected, signature)) return c.json({ error: 'Bad signature' }, 401)

  const eventId = c.req.header('x-razorpay-event-id')
  if (eventId) {
    const seen = await c.env.DB.prepare(`INSERT OR IGNORE INTO webhook_events (id, at) VALUES (?,?)`).bind(eventId, now()).run()
    if (!seen.meta.changes) return c.json({ ok: true, duplicate: true })
  }

  const event = JSON.parse(raw)
  const pay = event?.payload?.payment?.entity
  const orderId = pay?.notes?.order_id
  if (event.event === 'payment.captured' && orderId) {
    const order = await c.env.DB.prepare(`SELECT total, status FROM orders WHERE id = ?`).bind(orderId).first()
    // Only mark paid if the amount the gateway captured equals the price WE computed.
    if (order && pay.amount === order.total * 100) {
      const at = now()
      await c.env.DB.batch([
        c.env.DB.prepare(`UPDATE orders SET payment_status='paid', payment_id=?1, status=CASE WHEN status='new' THEN 'paid' ELSE status END, updated_at=?2 WHERE id=?3`).bind(pay.id, at, orderId),
        c.env.DB.prepare(`INSERT INTO status_history (order_id, status, actor, at) VALUES (?,?,?,?)`).bind(orderId, 'paid', 'webhook', at),
      ])
    }
  } else if (event.event === 'payment.failed' && orderId) {
    await c.env.DB.prepare(`UPDATE orders SET payment_status='failed', updated_at=?1 WHERE id=?2 AND payment_status='unpaid'`).bind(now(), orderId).run()
  }
  return c.json({ ok: true })
})

app.get('/api/health', (c) => c.json({ ok: true }))
app.notFound((c) => c.json({ error: 'Not found' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Something went wrong' }, 500)
})

export { app }
export default {
  fetch: app.fetch,
  // Monthly cron (see wrangler.toml): copies last month's orders and messages into R2 as a backup.
  scheduled: (event, env, ctx) => ctx.waitUntil(runMonthlyBackup(env)),
}
