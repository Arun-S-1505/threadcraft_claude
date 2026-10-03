// Smoke test. Default: runs the Worker in-process with stand-in D1/R2 (see harness.mjs).
// With API=http://localhost:8787 it instead hits a running `wrangler dev` (needs .dev.vars).
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { buildDesignSpec, computePrice } from '../../shared/designSpec.js'
import { makeApi } from './harness.mjs'

const REMOTE = process.env.API
const { api } = REMOTE
  ? { api: (path, init) => fetch(REMOTE + path, init) }
  : makeApi({ DEV_ADMIN_EMAIL: 'threadcraftcustomwear@gmail.com' })
let failed = 0
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${ok ? '' : extra}`)
  if (!ok) failed++
}
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex')

function png(color) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(zlib.crc32(body) >>> 0)
    return Buffer.concat([len, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(1, 0)
  ihdr.writeUInt32BE(1, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const raw = Buffer.from([0, ...color, 255])
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
const fakeWebp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([20, 0, 0, 0]), Buffer.from('WEBP'), Buffer.alloc(32, 1)])

const art = png([200, 10, 10])
const textPng = png([10, 10, 200])
const resolved = { position: [0, 0.04, 0.14], rotation: [0, 0, 0], scale: [0.4, 0.3, 0.26] }
const designList = [
  { id: 'i1', type: 'image', placement: 'front', pos: { x: 0, y: 0.04 }, scale: { x: 0.35, y: 0.35 }, name: 'art.png', mime: 'image/png', width: 1200, height: 1200 },
  { id: 't1', type: 'text', placement: 'back', pos: { x: 0, y: 0.04 }, scale: { x: 0.35, y: 0.25 }, text: 'Hello', textColor: '#000000', textSize: 24, textFont: 'Geist' },
]
const files = { i1: { fileId: sha(art), sha256: sha(art) }, t1: { fileId: sha(textPng), sha256: sha(textPng) } }
const spec = buildDesignSpec({ fit: 'oversized', colour: '#FFFFFF', printType: 'dtg', designList }, () => resolved, { files })
const customer = { name: 'Test Buyer', email: 'test@example.com', phone: '9876543210', address: '12 Test Street, Test Area', city: 'Chennai', pincode: '600001', notes: '' }

function orderForm({ s = spec, size = 'M', quantity = 2, extraFiles = {}, skip = [], total } = {}) {
  const f = new FormData()
  f.append('order', JSON.stringify({ spec: s, customer, size, quantity, ...(total ? { total } : {}) }))
  const parts = { [`file_${sha(art)}`]: art, [`file_${sha(textPng)}`]: textPng, preview_front: fakeWebp, preview_back: fakeWebp, ...extraFiles }
  for (const [k, v] of Object.entries(parts)) if (!skip.includes(k)) f.append(k, new Blob([v]), k)
  return f
}
const post = (form) => api(`/api/orders`, { method: 'POST', body: form })
const admin = (path, init) => api(`/api/admin${path}`, init)
const json = { 'Content-Type': 'application/json' }

// Public ordering
check('health', (await api(`/api/health`)).ok)
const expected = computePrice(spec, 2).total
const ok = await post(orderForm({ total: 1 })) // a fake client total must be ignored
const okBody = await ok.json()
check('valid order -> 201', ok.status === 201, JSON.stringify(okBody))
check('price recomputed on server', okBody.total === expected, `${okBody.total} vs ${expected}`)
const id = okBody.orderId

const evilSvg = Buffer.from('<svg><script>1</script></svg>')
check('missing file -> 400', (await post(orderForm({ skip: [`file_${sha(art)}`] }))).status === 400)
check('bad checksum -> 400', (await post(orderForm({ extraFiles: { [`file_${'0'.repeat(64)}`]: art } }))).status === 400)
check('svg with script -> 400', (await post(orderForm({ extraFiles: { [`file_${sha(evilSvg)}`]: evilSvg } }))).status === 400)
check('non-image file -> 400', (await post(orderForm({ extraFiles: { [`file_${sha(Buffer.from('hello'))}`]: Buffer.from('hello') } }))).status === 400)
check('bad size -> 400', (await post(orderForm({ size: 'XXXL' }))).status === 400)
check('no preview -> 400', (await post(orderForm({ skip: ['preview_front'] }))).status === 400)

// Tracking needs both id and matching email
check('track ok', (await api(`/api/track?id=${id}&email=TEST@example.com`)).status === 200)
check('track wrong email -> 404', (await api(`/api/track?id=${id}&email=other@example.com`)).status === 404)

// Admin (requires DEV_ADMIN_EMAIL in .dev.vars)
const list = await admin('/orders')
check('admin list', list.status === 200, String(list.status))
const detail = await (await admin(`/orders/${id}`)).json()
check('admin detail has spec + 4 files', detail.spec?.items?.length === 2 && detail.files?.length === 4, JSON.stringify(detail.files?.length))
const preview = detail.files.find((f) => f.kind === 'preview')
const fileRes = await admin(`/files/${preview.sha256}`)
check('admin file stream', fileRes.status === 200 && fileRes.headers.get('content-security-policy')?.includes('sandbox'))
check('ship without tracking -> 400', (await admin(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'shipped' }), headers: json })).status === 400)
check('ship with tracking', (await admin(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'shipped', trackingNo: 'DTDC123' }), headers: json })).status === 200)
const month = new Date().toISOString().slice(0, 7)
const csv = await (await admin(`/export?month=${month}`)).text()
check('csv export contains order', csv.includes(id))

// Webhook
const secret = 'test_secret'
const event = (amount, eid) => {
  const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_test1', amount, notes: { order_id: id } } } } })
  const sig = crypto.createHmac('sha256', secret).update(body).digest('hex')
  return api(`/api/webhooks/razorpay`, { method: 'POST', body, headers: { 'x-razorpay-signature': sig, 'x-razorpay-event-id': eid } })
}
check('webhook bad signature -> 401', (await api(`/api/webhooks/razorpay`, { method: 'POST', body: '{}', headers: { 'x-razorpay-signature': 'nope' } })).status === 401)
await event(100, 'evt_wrong_amount')
let after = await (await admin(`/orders/${id}`)).json()
check('wrong amount does not mark paid', after.payment_status === 'unpaid', after.payment_status)
await event(expected * 100, 'evt_ok')
after = await (await admin(`/orders/${id}`)).json()
check('correct amount marks paid', after.payment_status === 'paid' && after.payment_id === 'pay_test1', after.payment_status)
check('duplicate event ignored', (await (await event(expected * 100, 'evt_ok')).json()).duplicate === true)

const jpost = (path, body, fn = api) => fn(path, { method: 'POST', body: JSON.stringify(body), headers: json })

// Shop (cart) orders: prices come from the catalog, never from the browser
const shopCustomer = { name: 'Test Buyer', email: 'shop@example.com', phone: '9876543210', address: '12 Test Street, Test Area', city: 'Chennai', pincode: '600001' }
const line = { productId: 1, size: 'M', color: '#15171F', qty: 2 }
const shop = await (await jpost('/api/shop-orders', { customer: shopCustomer, payment: 'cod', items: [{ ...line, price: 1 }], total: 1 })).json()
check('shop COD order placed', !!shop.orderId && shop.method === 'cod', JSON.stringify(shop))
check('shop price from catalog (899 x 2 = 1798, free shipping)', shop.subtotal === 1798 && shop.total === 1798, JSON.stringify(shop))
check('shop online rejected when gateway off', (await jpost('/api/shop-orders', { customer: shopCustomer, payment: 'upi', items: [line] })).status === 400)
check('shop bad colour -> 400', (await jpost('/api/shop-orders', { customer: shopCustomer, payment: 'cod', items: [{ ...line, color: '#000000' }] })).status === 400)
check('shop bad product -> 400', (await jpost('/api/shop-orders', { customer: shopCustomer, payment: 'cod', items: [{ ...line, productId: 9999 }] })).status === 400)
check('shop qty over limit -> 400', (await jpost('/api/shop-orders', { customer: shopCustomer, payment: 'cod', items: [{ ...line, qty: 99 }] })).status === 400)
check('shop empty bag -> 400', (await jpost('/api/shop-orders', { customer: shopCustomer, payment: 'cod', items: [] })).status === 400)
const small = await (await jpost('/api/shop-orders', { customer: shopCustomer, payment: 'cod', items: [{ ...line, productId: 13, qty: 1 }] })).json()
check('shop shipping fee below threshold', small.shipping === 79 && small.total === small.subtotal + 79, JSON.stringify(small))
const shopDetail = await (await admin(`/orders/${shop.orderId}`)).json()
check('admin sees shop order items', shopDetail.kind === 'shop' && shopDetail.spec.items[0].name.length > 0)
const cfg = await (await api('/api/config')).json()
check('config: online off, cod on', cfg.onlinePayments === false && cfg.cod === true)

// Contact + bulk forms
check('contact saved', (await jpost('/api/contact', { name: 'Asha', email: 'asha@example.com', message: 'Do you ship to Kochi?' })).status === 201)
check('contact invalid -> 400', (await jpost('/api/contact', { name: 'A', email: 'nope', message: '' })).status === 400)
check('contact honeypot ignored', (await (await jpost('/api/contact', { name: 'Bot', email: 'b@example.com', message: 'spam spam', website: 'http://x' })).json()).ok === true)
check('bulk saved', (await jpost('/api/bulk', { company: 'Acme', contact: 'Ravi', email: 'ravi@acme.com', volume: '50 - 200 units', details: 'Polos' })).status === 201)
const msgs = await (await admin('/messages')).json()
check('admin lists 2 messages (honeypot dropped)', msgs.messages.length === 2, String(msgs.messages?.length))

// Backup writes last-month JSON into R2
const backup = await (await admin(`/backup?month=${new Date().toISOString().slice(0, 7)}`, { method: 'POST' })).json()
check('backup counts orders', backup.orders >= 3 && backup.messages === 2, JSON.stringify(backup))

// Razorpay path (mocked gateway): order creation, retry, webhook
if (!REMOTE) {
  const realFetch = globalThis.fetch
  const gwCalls = []
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('https://api.razorpay.com/')) {
      gwCalls.push({ url: String(url), auth: init.headers.Authorization, body: JSON.parse(init.body) })
      return new Response(JSON.stringify({ id: 'order_TEST' + gwCalls.length }), { status: 200 })
    }
    return realFetch(url, init)
  }
  const { api: gw } = makeApi({ DEV_ADMIN_EMAIL: 'threadcraftcustomwear@gmail.com', RAZORPAY_KEY_ID: 'rzp_test_abc', RAZORPAY_KEY_SECRET: 'sek' })
  const o = await (await gw('/api/orders', { method: 'POST', body: orderForm() })).json()
  check('gateway: custom order returns payment params', o.payment?.gatewayOrderId === 'order_TEST1' && o.payment.amount === expected * 100, JSON.stringify(o))
  check('gateway: amount sent in paise, secret never returned', gwCalls[0].body.amount === expected * 100 && !JSON.stringify(o).includes('sek'))
  const s = await (await jpost('/api/shop-orders', { customer: shopCustomer, payment: 'upi', items: [line] }, gw)).json()
  check('gateway: shop online order returns payment params', s.payment?.gatewayOrderId === 'order_TEST2', JSON.stringify(s))
  const retry = await jpost('/api/pay', { id: o.orderId, email: customer.email }, gw)
  check('gateway: retry payment works', retry.status === 200 && (await retry.json()).payment.gatewayOrderId === 'order_TEST3')
  check('gateway: retry with wrong email -> 404', (await jpost('/api/pay', { id: o.orderId, email: 'x@example.com' }, gw)).status === 404)
  globalThis.fetch = realFetch
}

// Admin must reject everyone when no valid Access login exists (production-like env)
if (!REMOTE) {
  const { api: locked } = makeApi({ ACCESS_TEAM_DOMAIN: 'example.cloudflareaccess.com', ACCESS_AUD: 'abc' })
  check('admin without Access login -> 403', (await locked('/api/admin/orders')).status === 403)
  check('admin with forged Access header -> 403', (await locked('/api/admin/orders', { headers: { 'Cf-Access-Jwt-Assertion': 'a.b.c' } })).status === 403)
  check('admin file route locked too', (await locked(`/api/admin/files/${'a'.repeat(64)}`)).status === 403)
  const { api: nonAdmin } = makeApi({ DEV_ADMIN_EMAIL: 'stranger@example.com' })
  check('logged-in non-admin email -> 403', (await nonAdmin('/api/admin/orders')).status === 403)
}

console.log(failed ?`\n${failed} check(s) failed` : '\nAll checks passed')
process.exit(failed ? 1 : 0)
