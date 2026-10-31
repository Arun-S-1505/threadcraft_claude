import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { SITE } from '../../src/config/site.js'
import { computePrice, validateDesignSpec, validateCustomer, SIZES, sizesFor, PLACEMENTS, PRINT_LABEL, printSummary, stockCombos } from '../../shared/designSpec.js'
import { readUploads, MAX_REQUEST_BYTES } from './files.js'
import { requireAdmin } from './auth.js'
import { notifyNewOrder, notifyMessage, notifyStatus, notifyRefund } from './email.js'
import { reserveStock, releaseStock, linesFromOrder, enabledGated } from './stock.js'
import { gatewayEnabled, createGatewayOrder, listGatewayPayments, refundGatewayPayment } from './payments.js'
import { orderMailPayload } from './orderMail.js'
import { priceCart } from './catalog.js'
import { runMonthlyBackup } from './backup.js'
import { userRoutes, cleanupAuth, getSessionUser } from './users.js'

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
  const { spec, size } = payload
  const customer = await withAccountEmail(c, payload.customer)
  const quantity = Number(payload.quantity)

  const specErrors = validateDesignSpec(spec)
  if (specErrors.length) return c.json({ error: specErrors[0] }, 400)
  const custErrors = validateCustomer({ ...customer, quantity })
  if (Object.keys(custErrors).length) return c.json({ error: Object.values(custErrors)[0] }, 400)
  if (!SIZES.includes(size)) return c.json({ error: 'Invalid size' }, 400)
  if (!sizesFor(spec.garment.fit, spec.garment.colour, await enabledGated(c.env.DB)).includes(size)) return c.json({ error: `Size ${size} is not available in this fit and colour` }, 400)

  const up = await readUploads(form)
  if (up.error) return c.json({ error: up.error }, 400)
  const fileError = checkSpecFiles(spec, up.files)
  if (fileError) return c.json({ error: fileError }, 400)
  if (!up.previews.has('front')) return c.json({ error: 'Preview image missing' }, 400)
  for (const view of up.previews.keys()) if (!PLACEMENTS.includes(view)) return c.json({ error: 'Invalid preview view' }, 400)

  // Price is always computed here; any total from the browser is ignored.
  const { unit, subtotal, shipping, total } = computePrice(spec, quantity, SITE.policy)
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
        `INSERT INTO orders (id, kind, created_at, updated_at, payment_method, customer_name, email, phone, address, city, pincode, notes, size, quantity, unit_price, shipping, total, spec_json)
         VALUES (?1,'custom',?2,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)`
      )
      .bind(id, at, online ? 'online' : 'invoice', customer.name.trim(), customer.email.trim().toLowerCase(), customer.phone.trim(), customer.address.trim(), customer.city.trim(), customer.pincode.trim(), (customer.notes || '').trim() || null, size, quantity, unit, shipping, total, JSON.stringify(spec)),
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
  const held = await reserveStock(db, [{ fit: spec.garment.fit, colour: spec.garment.colour, size, qty: quantity }], at)
  if (held.error) return c.json({ error: held.error }, 409)
  try {
    await db.batch(stmts)
  } catch (err) {
    await releaseStock(db, held.taken, at)
    throw err
  }

  // Paid online: the order emails are sent when the payment is confirmed (webhook), not before.
  if (online) c.executionCtx.waitUntil(cancelStaleUnpaid(c.env))
  const paymentNote = 'Payment: we will email you a payment request once we have reviewed your design.'
  if (!online)
  c.executionCtx.waitUntil(
    notifyNewOrder(c.env, {
      id,
      total,
      customer,
      paymentNote,
      lines: [`${spec.garment.fit} tee (${spec.garment.gsm} GSM), size ${size}, ${spec.items.length} print(s) (${printSummary(spec.items)}), ${PRINT_LABEL[spec.garment.printType] || spec.garment.printType}`, `Quantity ${quantity} × ₹${unit} = ₹${subtotal}`, shipping ? `Delivery ₹${shipping}` : 'Free delivery'],
    })
  )
  return c.json({ orderId: id, subtotal, shipping, total, payment: await startPayment(c, id) }, 201)
})

// A signed-in customer's orders always carry the account's verified email, whatever the browser sent,
// so the admin knows who really placed the order. Guests keep the email they typed.
async function withAccountEmail(c, raw) {
  const customer = { ...(raw && typeof raw === 'object' ? raw : {}) }
  const user = await getSessionUser(c).catch(() => null)
  if (user?.email) customer.email = user.email
  return customer
}

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

/* ───────── Public: sizes that are sold out or nearly (counts are only shown when 3 or fewer are left) ───────── */
app.get('/api/stock', async (c) => {
  let low = []
  try {
    low = (await c.env.DB.prepare(`SELECT fit, colour, size, qty FROM stock WHERE qty <= 3`).all()).results
  } catch (err) {
    console.error('stock list failed', err)
  }
  // `enabled` = sizes that are only on sale once stocked (e.g. white oversized S) and are in stock now
  c.header('Cache-Control', 'public, max-age=30')
  return c.json({ low, enabled: await enabledGated(c.env.DB) })
})

/* ───────── Public: what the storefront may offer ───────── */
app.get('/api/config', (c) => c.json({ onlinePayments: gatewayEnabled(c.env), googleClientId: c.env.GOOGLE_CLIENT_ID || null }))

/* ───────── Public: shop (cart) order ───────── */
app.post('/api/shop-orders', rateLimit, async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Invalid request' }, 400)
  const { items } = body
  const customer = await withAccountEmail(c, body.customer)
  // Prepaid only: every shop order is paid online (there is no cash on delivery)
  const method = 'online'
  if (!gatewayEnabled(c.env)) return c.json({ error: 'Online payment is not available right now. Please try again later.' }, 400)

  const priced = priceCart(items, { enabled: await enabledGated(c.env.DB) })
  if (priced.error) return c.json({ error: priced.error }, 400)
  const custErrors = validateCustomer({ ...customer, quantity: priced.count })
  if (Object.keys(custErrors).length) return c.json({ error: Object.values(custErrors)[0] }, 400)

  const id = newOrderId()
  const at = now()
  const held = await reserveStock(c.env.DB, priced.items.map((i) => ({ fit: i.fit, colour: i.colourHex, size: i.size, qty: i.qty })), at)
  if (held.error) return c.json({ error: held.error }, 409)
  try {
  await c.env.DB.batch([
    c.env.DB
      .prepare(
        `INSERT INTO orders (id, kind, created_at, updated_at, payment_method, customer_name, email, phone, address, city, pincode, notes, quantity, unit_price, shipping, total, spec_json)
         VALUES (?1,'shop',?2,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)`
      )
      .bind(id, at, method, customer.name.trim(), customer.email.trim().toLowerCase(), customer.phone.trim(), customer.address.trim(), customer.city.trim(), customer.pincode.trim(), (customer.notes || '').trim() || null, priced.count, priced.subtotal, priced.shipping, priced.total, JSON.stringify({ items: priced.items })),
    c.env.DB.prepare(`INSERT INTO status_history (order_id, status, actor, at) VALUES (?,?,?,?)`).bind(id, 'new', 'customer', at),
  ])
  } catch (err) {
    await releaseStock(c.env.DB, held.taken, at)
    throw err
  }

  c.executionCtx.waitUntil(cancelStaleUnpaid(c.env))
  // The emails are sent when the payment is confirmed (webhook)
  return c.json({ orderId: id, total: priced.total, subtotal: priced.subtotal, shipping: priced.shipping, method, payment: await startPayment(c, id) }, 201)
})

/* ───────── Public: the customer's online payment failed or was cancelled → the order is not placed ───────── */
// Only an order that has no live payment is removed. If Razorpay says a payment is in progress or done (for example a
// UPI approval that is still pending) the order is kept and the webhook decides.
app.post('/api/orders/:id/abandon', rateLimit, async (c) => {
  const id = c.req.param('id').trim().toUpperCase()
  const body = await c.req.json().catch(() => ({}))
  const email = String(body.email || '').trim().toLowerCase()
  const order = await c.env.DB.prepare(`SELECT id, kind, status, payment_method, payment_status, gateway_order_id, size, quantity, spec_json FROM orders WHERE id = ? AND email = ?`).bind(id, email).first()
  if (!order) return c.json({ error: 'Order not found' }, 404)
  if (order.payment_method !== 'online' || order.status !== 'new' || !['unpaid', 'failed'].includes(order.payment_status)) return c.json({ removed: false })
  if (order.gateway_order_id && body.gatewayOrderId !== order.gateway_order_id) return c.json({ error: 'Forbidden' }, 403)
  if (order.gateway_order_id) {
    let payments
    try {
      payments = await listGatewayPayments(c.env, order.gateway_order_id)
    } catch (err) {
      console.error(err)
      return c.json({ removed: false, pending: true })
    }
    if (payments.some((p) => p.status !== 'failed')) return c.json({ removed: false, pending: true })
  }
  const at = now()
  await releaseStock(c.env.DB, linesFromOrder(order), at).catch((err) => console.error('stock release failed', err))
  await c.env.DB.batch([
    c.env.DB.prepare(`DELETE FROM status_history WHERE order_id = ?`).bind(id),
    c.env.DB.prepare(`DELETE FROM order_files WHERE order_id = ?`).bind(id),
    c.env.DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(id),
  ])
  return c.json({ removed: true })
})

// Online orders whose payment never arrived (tab closed, phone died) are cancelled after 2 hours and their tees returned
// to stock. A payment that still lands later revives the order (see the webhook).
async function cancelStaleUnpaid(env) {
  try {
    const cutoff = new Date(Date.now() - 2 * 3600_000).toISOString()
    const rows = (await env.DB.prepare(`SELECT id, kind, size, quantity, spec_json FROM orders WHERE payment_method = 'online' AND payment_status IN ('unpaid','failed') AND status = 'new' AND created_at < ?`).bind(cutoff).all()).results
    for (const o of rows) {
      const at = now()
      await env.DB.batch([
        env.DB.prepare(`UPDATE orders SET status = 'cancelled', updated_at = ?1 WHERE id = ?2 AND status = 'new'`).bind(at, o.id),
        env.DB.prepare(`INSERT INTO status_history (order_id, status, actor, at) VALUES (?,?,?,?)`).bind(o.id, 'cancelled', 'system', at),
      ])
      await releaseStock(env.DB, linesFromOrder(o), at)
    }
  } catch (err) {
    console.error('stale order cleanup failed', err)
  }
}

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
  const refunds = (await c.env.DB.prepare(`SELECT id, amount, reason, status, actor, at FROM refunds WHERE order_id = ? ORDER BY at`).bind(id).all().catch(() => ({ results: [] }))).results
  const { spec_json, ...rest } = order
  return c.json({ ...rest, spec: JSON.parse(spec_json), files, history, refunds })
})

admin.patch('/orders/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  if (!STATUSES.includes(body.status)) return c.json({ error: 'Invalid status' }, 400)
  // A courier tracking number or a tracking link (http/https only, so nothing else can be planted)
  const tracking = (body.trackingNo || '').toString().trim().slice(0, 300) || null
  if (tracking && /^[a-z][a-z0-9+.-]*:/i.test(tracking) && !/^https?:\/\//i.test(tracking)) return c.json({ error: 'A tracking link must start with http:// or https://' }, 400)
  if (body.status === 'shipped' && !tracking) return c.json({ error: 'Tracking number is required when shipping' }, 400)
  const before = await c.env.DB.prepare(`SELECT status, kind, size, quantity, spec_json, tracking_no, customer_name, email FROM orders WHERE id = ?`).bind(id).first()
  if (!before) return c.json({ error: 'Not found' }, 404)
  const at = now()
  await c.env.DB.prepare(`UPDATE orders SET status = ?1, tracking_no = COALESCE(?2, tracking_no), updated_at = ?3 WHERE id = ?4`).bind(body.status, tracking, at, id).run()
  // Completing a cash-on-delivery order means the cash was collected
  if (body.status === 'delivered') await c.env.DB.prepare(`UPDATE orders SET payment_status = 'paid' WHERE id = ?1 AND payment_method = 'cod' AND payment_status = 'unpaid'`).bind(id).run()
  await c.env.DB.prepare(`INSERT INTO status_history (order_id, status, tracking_no, actor, at) VALUES (?,?,?,?,?)`).bind(id, body.status, tracking, c.get('admin'), at).run()

  // Cancelling puts the tees back in stock; re-opening a cancelled order takes them again (best effort)
  // (a stock problem must never stop the status change)
  if (body.status === 'cancelled' && before.status !== 'cancelled') await releaseStock(c.env.DB, linesFromOrder(before), at).catch((err) => console.error('stock release failed', err))
  if (before.status === 'cancelled' && body.status !== 'cancelled') await reserveStock(c.env.DB, linesFromOrder(before), at)

  // Customer email when the order ships (or the tracking changes) and when it is completed
  const newTracking = tracking || before.tracking_no
  const shippedNow = body.status === 'shipped' && (before.status !== 'shipped' || (tracking && tracking !== before.tracking_no))
  const completedNow = body.status === 'delivered' && before.status !== 'delivered'
  if (shippedNow || completedNow) {
    c.executionCtx.waitUntil(notifyStatus(c.env, { id, name: before.customer_name, email: before.email, status: body.status, tracking: newTracking }))
  }
  return c.json({ ok: true, emailed: Boolean(shippedNow || completedNow) })
})

// Refund (all or part) of a paid online order. The money goes back through Razorpay to the customer's original payment method.
// A full refund marks the order refunded; `cancel: true` also cancels the order and puts its tees back in stock.
admin.post('/orders/:id/refund', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const order = await c.env.DB.prepare(`SELECT id, status, kind, size, quantity, spec_json, total, payment_method, payment_status, payment_id, customer_name, email FROM orders WHERE id = ?`).bind(id).first()
  if (!order) return c.json({ error: 'Not found' }, 404)
  if (order.payment_method !== 'online' || !order.payment_id) return c.json({ error: 'Only orders paid online can be refunded here. Cash-on-delivery or unpaid orders have nothing to refund.' }, 400)
  if (order.payment_status === 'refunded') return c.json({ error: 'This order has already been refunded in full.' }, 400)
  if (order.payment_status !== 'paid') return c.json({ error: 'This order has not been paid, so there is nothing to refund.' }, 400)
  if (!gatewayEnabled(c.env)) return c.json({ error: 'Online payments are not configured.' }, 400)

  const done = (await c.env.DB.prepare(`SELECT COALESCE(SUM(amount), 0) AS n FROM refunds WHERE order_id = ?`).bind(id).first()).n
  const remaining = order.total - done
  const amount = body.amount === undefined || body.amount === '' || body.amount === null ? remaining : Number(body.amount)
  if (!Number.isInteger(amount) || amount < 1) return c.json({ error: 'Enter a refund amount in whole rupees (1 or more).' }, 400)
  if (amount > remaining) return c.json({ error: `You can refund at most ₹${remaining} on this order.` }, 400)
  const reason = String(body.reason || '').trim().slice(0, 200)

  let refund
  try {
    refund = await refundGatewayPayment(c.env, order.payment_id, amount, { receipt: `${id}-${Date.now().toString(36)}`, reason: reason || undefined })
  } catch (err) {
    return c.json({ error: err.message }, 502)
  }
  const at = now()
  const full = done + amount >= order.total
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO refunds (id, order_id, payment_id, amount, reason, status, actor, at) VALUES (?,?,?,?,?,?,?,?)`).bind(refund.id, id, order.payment_id, amount, reason || null, refund.status, c.get('admin'), at),
      c.env.DB.prepare(`UPDATE orders SET payment_status = CASE WHEN ?1 = 1 THEN 'refunded' ELSE payment_status END, updated_at = ?2 WHERE id = ?3`).bind(full ? 1 : 0, at, id),
    ])
  } catch (err) {
    // The money has already gone back, so say so plainly instead of hiding it
    console.error('refund saved at Razorpay but not in D1', refund.id, err)
    return c.json({ error: `The refund (${refund.id}) went through at Razorpay but could not be saved here. Check the Razorpay dashboard and do not refund again.` }, 500)
  }
  if (body.cancel === true && order.status !== 'cancelled') {
    await c.env.DB.batch([
      c.env.DB.prepare(`UPDATE orders SET status = 'cancelled', updated_at = ?1 WHERE id = ?2`).bind(at, id),
      c.env.DB.prepare(`INSERT INTO status_history (order_id, status, actor, at) VALUES (?,?,?,?)`).bind(id, 'cancelled', c.get('admin'), at),
    ])
    await releaseStock(c.env.DB, linesFromOrder(order), at).catch((err) => console.error('stock release failed', err))
  }
  c.executionCtx.waitUntil(notifyRefund(c.env, { id, name: order.customer_name, email: order.email, amount, full, reason }))
  return c.json({ ok: true, refundId: refund.id, amount, full, status: refund.status, emailed: !order.email.endsWith('@invalid') })
})

// Blank-tee stock: every fit/colour/size we make, with its count (null = not tracked)
admin.get('/stock', async (c) => {
  const rows = (await c.env.DB.prepare(`SELECT fit, colour, size, qty FROM stock`).all()).results
  const have = new Map(rows.map((r) => [`${r.fit}|${r.colour}|${r.size}`, r.qty]))
  return c.json({ items: stockCombos().map((k) => ({ ...k, qty: have.get(`${k.fit}|${k.colour}|${k.size}`) ?? null })) })
})

admin.put('/stock', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  if (!Array.isArray(body.items) || body.items.length > 100) return c.json({ error: 'Invalid request' }, 400)
  const valid = new Set(stockCombos().map((k) => `${k.fit}|${k.colour}|${k.size}`))
  const at = now()
  const stmts = []
  for (const it of body.items) {
    const colour = String(it.colour || '').toUpperCase()
    if (!valid.has(`${it.fit}|${colour}|${it.size}`)) return c.json({ error: 'Unknown size, colour or fit' }, 400)
    if (it.qty === null) {
      stmts.push(c.env.DB.prepare(`DELETE FROM stock WHERE fit = ?1 AND colour = ?2 AND size = ?3`).bind(it.fit, colour, it.size))
    } else {
      if (!Number.isInteger(it.qty) || it.qty < 0 || it.qty > 100000) return c.json({ error: 'Stock must be a whole number, 0 or more' }, 400)
      stmts.push(
        c.env.DB
          .prepare(`INSERT INTO stock (fit, colour, size, qty, updated_at) VALUES (?1,?2,?3,?4,?5) ON CONFLICT (fit, colour, size) DO UPDATE SET qty = ?4, updated_at = ?5`)
          .bind(it.fit, colour, it.size, it.qty, at),
      )
    }
  }
  if (stmts.length) await c.env.DB.batch(stmts)
  return c.json({ ok: true, saved: stmts.length })
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

app.route('/api', userRoutes({ rateLimit }))
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
    const order = await c.env.DB.prepare(`SELECT * FROM orders WHERE id = ?`).bind(orderId).first()
    // Only mark paid if the amount the gateway captured equals the price WE computed.
    if (order && pay.amount === order.total * 100 && order.payment_status !== 'paid') {
      const at = now()
      // A payment that lands on an order we auto-cancelled (customer left the payment window open) revives it
      let revive = false
      if (order.status === 'cancelled') {
        const last = await c.env.DB.prepare(`SELECT actor FROM status_history WHERE order_id = ? AND status = 'cancelled' ORDER BY id DESC LIMIT 1`).bind(orderId).first()
        revive = last?.actor === 'system'
      }
      await c.env.DB.batch([
        c.env.DB.prepare(`UPDATE orders SET payment_status='paid', payment_id=?1, status=CASE WHEN status='new' OR ?4 = 1 THEN 'paid' ELSE status END, updated_at=?2 WHERE id=?3`).bind(pay.id, at, orderId, revive ? 1 : 0),
        c.env.DB.prepare(`INSERT INTO status_history (order_id, status, actor, at) VALUES (?,?,?,?)`).bind(orderId, 'paid', 'webhook', at),
      ])
      if (revive) await reserveStock(c.env.DB, linesFromOrder(order), at)
      // Online orders get their confirmation emails now that the money is in
      if (order.payment_method === 'online') c.executionCtx.waitUntil(notifyNewOrder(c.env, orderMailPayload(order, 'Payment: paid online.')))
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
  scheduled: (event, env, ctx) => ctx.waitUntil(Promise.all([runMonthlyBackup(env), cleanupAuth(env)])),
}
