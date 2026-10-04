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

// Erasing personal data: order stays for accounting, personal info and files go
const toErase = await (await post(orderForm())).json()
check('erase needs confirmation', (await admin(`/orders/${toErase.orderId}/personal-data`, { method: 'DELETE', body: '{}', headers: json })).status === 400)
const erased = await (await admin(`/orders/${toErase.orderId}/personal-data`, { method: 'DELETE', body: JSON.stringify({ confirm: toErase.orderId }), headers: json })).json()
check('erase removes order files', erased.ok === true)
const after2 = await (await admin(`/orders/${toErase.orderId}`)).json()
check('erased order keeps total, loses personal data', after2.customer_name === '[erased]' && after2.address === '' && after2.total > 0 && after2.spec.erased === true && after2.files.length === 0)
check('erased customer cannot be tracked by old email', (await api(`/api/track?id=${toErase.orderId}&email=test@example.com`)).status === 404)

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
  // An order taken before the gateway existed becomes payable once it is switched on
  const before = makeApi({ DEV_ADMIN_EMAIL: 'threadcraftcustomwear@gmail.com' })
  const early = await (await before.api('/api/orders', { method: 'POST', body: orderForm() })).json()
  const later = makeApi({ DB: before.env.DB, FILES: before.env.FILES, DEV_ADMIN_EMAIL: 'threadcraftcustomwear@gmail.com', RAZORPAY_KEY_ID: 'rzp_test_abc', RAZORPAY_KEY_SECRET: 'sek' })
  check('invoice order starts as invoice', (await (await later.api(`/api/track?id=${early.orderId}&email=${customer.email}`)).json()).payment_method === 'invoice')
  check('invoice order can pay once gateway is on', (await jpost('/api/pay', { id: early.orderId, email: customer.email }, later.api)).status === 200)
  check('invoice order is now online', (await (await later.api(`/api/track?id=${early.orderId}&email=${customer.email}`)).json()).payment_method === 'online')
  check('gateway: retry with wrong email -> 404', (await jpost('/api/pay', { id: o.orderId, email: 'x@example.com' }, gw)).status === 404)
  globalThis.fetch = realFetch
}

// Customer accounts: emailed one-time code sign-in
if (!REMOTE) {
  const codes = {}
  const acc = makeApi({ DEV_LOGIN_CODES: '1', onLoginCode: (email, code) => (codes[email] = code) })
  const call = (path, init = {}, cookie) => acc.api(path, { ...init, headers: { ...(init.headers || {}), ...(cookie ? { Cookie: cookie } : {}) } })
  const jsonPost = (path, body, cookie, extra = {}) => call(path, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...extra } }, cookie)
  const cookieOf = (res) => (res.headers.get('set-cookie') || '').split(';')[0]
  const patchMe = (body, cookie) => call('/api/me', { method: 'PATCH', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }, cookie)

  check('code: invalid email -> 400', (await jsonPost('/api/auth/request-code', { email: 'nope' })).status === 400)
  const rc = await jsonPost('/api/auth/request-code', { email: 'Test@Example.com', name: 'Asha K' })
  check('code: sent', rc.status === 200 && /^\d{6}$/.test(codes['test@example.com'] || ''), JSON.stringify(codes))
  check('code: asking again at once -> 429', (await jsonPost('/api/auth/request-code', { email: 'test@example.com' })).status === 429)
  const wrongCode = codes['test@example.com'] === '000000' ? '111111' : '000000'
  check('code: wrong code -> 400', (await jsonPost('/api/auth/verify', { email: 'test@example.com', code: wrongCode })).status === 400)
  const good = await jsonPost('/api/auth/verify', { email: 'test@example.com', code: codes['test@example.com'] })
  const sess = cookieOf(good)
  const setCookie = good.headers.get('set-cookie') || ''
  check('code: right code signs in', good.status === 200 && sess.startsWith('tc_session='), setCookie)
  check('code: cookie is HttpOnly + SameSite=Lax', /HttpOnly/i.test(setCookie) && /SameSite=Lax/i.test(setCookie), setCookie)
  check('code: a code only works once', (await jsonPost('/api/auth/verify', { email: 'test@example.com', code: codes['test@example.com'] })).status === 400)

  const me = await (await call('/api/me', {}, sess)).json()
  check('me: signed-in user, name saved from sign-up', me.user?.email === 'test@example.com' && me.user.name === 'Asha K', JSON.stringify(me))
  check('me: signed-out is null', (await (await call('/api/me')).json()).user === null)
  check('me: bad cookie is null', (await (await call('/api/me', {}, 'tc_session=' + 'x'.repeat(43))).json()).user === null)

  const upd = await patchMe({ name: 'Asha K', phone: '9876543210', address: '12 Test Street', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' }, sess)
  check('profile: saved', upd.status === 200 && (await upd.json()).user.city === 'Chennai')
  check('profile: bad phone -> 400', (await patchMe({ name: 'Asha K', phone: '12' }, sess)).status === 400)
  check('profile: needs sign-in', (await patchMe({ name: 'Asha K' })).status === 401)

  // orders placed as a guest with the same email appear under the account
  const guestShop = await (await jsonPost('/api/shop-orders', { payment: 'cod', customer: { name: 'Asha K', email: 'test@example.com', phone: '9876543210', address: '12 Test Street, Test Area', city: 'Chennai', pincode: '600001' }, items: [{ productId: 1, size: 'M', color: '#15171F', qty: 2 }] })).json()
  const guestCustom = await (await acc.api('/api/orders', { method: 'POST', body: orderForm() })).json()
  const list = await (await call('/api/me/orders', {}, sess)).json()
  check('orders: lists guest orders for the verified email', list.orders?.length === 2 && list.orders.some((o) => o.id === guestShop.orderId && o.summary.includes('Track Day Tee × 2')), JSON.stringify(list).slice(0, 300))
  check('orders: custom order has a preview flag', list.orders.find((o) => o.id === guestCustom.orderId)?.hasPreview === true)
  const det = await (await call('/api/me/orders/' + guestShop.orderId, {}, sess)).json()
  check('orders: detail has items + history', det.items?.[0]?.name === 'Track Day Tee' && det.history?.length === 1)
  const prev = await call('/api/me/orders/' + guestCustom.orderId + '/preview', {}, sess)
  check('orders: owner can load the design preview', prev.status === 200 && /image\//.test(prev.headers.get('content-type') || ''))
  check('orders: needs sign-in', (await call('/api/me/orders')).status === 401)

  // another customer cannot see these orders
  await jsonPost('/api/auth/request-code', { email: 'other@example.com', name: 'Other' })
  const other = cookieOf(await jsonPost('/api/auth/verify', { email: 'other@example.com', code: codes['other@example.com'] }))
  check('privacy: other customer sees no orders', (await (await call('/api/me/orders', {}, other)).json()).orders.length === 0)
  check('privacy: other customer cannot open this order', (await call('/api/me/orders/' + guestShop.orderId, {}, other)).status === 404)
  check('privacy: other customer cannot load this preview', (await call('/api/me/orders/' + guestCustom.orderId + '/preview', {}, other)).status === 404)

  // brute force and cross-site protection
  await jsonPost('/api/auth/request-code', { email: 'brute@example.com' })
  const guess = codes['brute@example.com'] === '123456' ? '654321' : '123456'
  const wrong = []
  for (let i = 0; i < 5; i++) wrong.push((await jsonPost('/api/auth/verify', { email: 'brute@example.com', code: guess })).status)
  check('lockout: 5 wrong codes are rejected', wrong.every((s) => s === 400), wrong.join())
  check('lockout: even the right code is refused after 5 misses', (await jsonPost('/api/auth/verify', { email: 'brute@example.com', code: codes['brute@example.com'] })).status === 429)
  check('csrf: request from another website -> 403', (await jsonPost('/api/auth/request-code', { email: 'x@example.com' }, undefined, { Origin: 'https://evil.example' })).status === 403)
  check('csrf: own site origin is allowed', (await jsonPost('/api/auth/request-code', { email: 'ok@example.com' }, undefined, { Origin: 'http://localhost:5173' })).status === 200)

  // sign out
  await jsonPost('/api/auth/logout', {}, sess)
  check('logout: session no longer works', (await (await call('/api/me', {}, sess)).json()).user === null)
}

// Passwords and Google sign-in
if (!REMOTE) {
  const codes = {}
  const CLIENT_ID = 'test-client.apps.googleusercontent.com'
  const acc = makeApi({ DEV_LOGIN_CODES: '1', onLoginCode: (email, code) => (codes[email] = code), GOOGLE_CLIENT_ID: CLIENT_ID, PBKDF2_ITERATIONS: '20000' })
  const call = (path, init = {}, cookie) => acc.api(path, { ...init, headers: { ...(init.headers || {}), ...(cookie ? { Cookie: cookie } : {}) } })
  const jpost = (path, body, cookie) => call(path, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }, cookie)
  const jpatch = (path, body, cookie) => call(path, { method: 'PATCH', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }, cookie)
  const cookieOf = (res) => (res.headers.get('set-cookie') || '').split(';')[0]

  // Sign up WITH a password: the email is still confirmed by a code before the account exists
  check('password: weak password refused at sign-up', (await jpost('/api/auth/request-code', { email: 'pw@example.com', name: 'Pia', password: 'short' })).status === 400)
  check('password: common password refused', (await jpost('/api/auth/request-code', { email: 'pw@example.com', name: 'Pia', password: 'password1' })).status === 400)
  check('password: sign-up with password sends a code', (await jpost('/api/auth/request-code', { email: 'pw@example.com', name: 'Pia', password: 'river-stone-42' })).status === 200)
  check('password: cannot sign in before the email is confirmed', (await jpost('/api/auth/login', { email: 'pw@example.com', password: 'river-stone-42' })).status === 401)
  const first = await jpost('/api/auth/verify', { email: 'pw@example.com', code: codes['pw@example.com'] })
  const firstCookie = cookieOf(first)
  const me1 = (await (await call('/api/me', {}, firstCookie)).json()).user
  check('password: account created after confirming, password recorded', first.status === 200 && me1.hasPassword === true, JSON.stringify(me1))
  check('password: /me never exposes the hash', !JSON.stringify(me1).includes('pbkdf2') && !('password_hash' in me1))

  // Sign in with the password
  const ok = await jpost('/api/auth/login', { email: 'PW@example.com', password: 'river-stone-42' })
  check('password: correct password signs in (email case ignored)', ok.status === 200 && cookieOf(ok).startsWith('tc_session='))
  const bad = await jpost('/api/auth/login', { email: 'pw@example.com', password: 'wrong-password-1' })
  const unknown = await jpost('/api/auth/login', { email: 'nobody@example.com', password: 'wrong-password-1' })
  check('password: wrong password -> 401', bad.status === 401)
  check('password: unknown email gets the same answer as a wrong password', unknown.status === 401 && (await unknown.json()).error === (await bad.json()).error)

  // Lockout after repeated wrong passwords, with the email code as the way back in
  for (let i = 0; i < 4; i++) await jpost('/api/auth/login', { email: 'pw@example.com', password: 'wrong-password-' + i })
  check('password: locked after 5 wrong tries, even the right password waits', (await jpost('/api/auth/login', { email: 'pw@example.com', password: 'river-stone-42' })).status === 429)
  await jpost('/api/auth/request-code', { email: 'pw@example.com' })
  const viaCode = await jpost('/api/auth/verify', { email: 'pw@example.com', code: codes['pw@example.com'] })
  check('password: an email code still gets them in while locked', viaCode.status === 200)
  const afterCode = await jpost('/api/auth/login', { email: 'pw@example.com', password: 'river-stone-42' })
  check('password: a successful code sign-in clears the lock', afterCode.status === 200)

  // Change password from the profile
  const sess = cookieOf(afterCode)
  check('password change: needs the current password', (await jpatch('/api/me/password', { current: 'nope-nope-nope', password: 'blue-door-open-9' }, sess)).status === 400)
  check('password change: weak new password refused', (await jpatch('/api/me/password', { current: 'river-stone-42', password: 'aaaaaaaa' }, sess)).status === 400)
  const other = cookieOf(await jpost('/api/auth/login', { email: 'pw@example.com', password: 'river-stone-42' }))
  const changed = await jpatch('/api/me/password', { current: 'river-stone-42', password: 'blue-door-open-9' }, sess)
  check('password change: works with the right current password', changed.status === 200)
  check('password change: old password no longer works', (await jpost('/api/auth/login', { email: 'pw@example.com', password: 'river-stone-42' })).status === 401)
  check('password change: new password works', (await jpost('/api/auth/login', { email: 'pw@example.com', password: 'blue-door-open-9' })).status === 200)
  check('password change: other devices are signed out', (await (await call('/api/me', {}, other)).json()).user === null)
  check('password change: this device stays signed in', (await (await call('/api/me', {}, sess)).json()).user?.email === 'pw@example.com')

  // An account created without a password can add one
  await jpost('/api/auth/request-code', { email: 'nopw@example.com', name: 'Noor' })
  const nopw = cookieOf(await jpost('/api/auth/verify', { email: 'nopw@example.com', code: codes['nopw@example.com'] }))
  check('password: code-only account has no password', (await (await call('/api/me', {}, nopw)).json()).user.hasPassword === false)
  check('password: password login refused for it', (await jpost('/api/auth/login', { email: 'nopw@example.com', password: 'anything-at-all-1' })).status === 401)
  check('password: it can set one from the profile', (await jpatch('/api/me/password', { password: 'maple-syrup-33' }, nopw)).status === 200)
  check('password: and then sign in with it', (await jpost('/api/auth/login', { email: 'nopw@example.com', password: 'maple-syrup-33' })).status === 200)

  // Forgot password: confirm the email with a code while choosing a new password
  await jpost('/api/auth/request-code', { email: 'forgot@example.com', name: 'Farah', password: 'first-pass-word-1' })
  await jpost('/api/auth/verify', { email: 'forgot@example.com', code: codes['forgot@example.com'] })
  check('forgot: original password works', (await jpost('/api/auth/login', { email: 'forgot@example.com', password: 'first-pass-word-1' })).status === 200)
  await jpost('/api/auth/request-code', { email: 'forgot@example.com', password: 'second-pass-word-2' })
  check('forgot: new password is NOT active until the email code is confirmed', (await jpost('/api/auth/login', { email: 'forgot@example.com', password: 'second-pass-word-2' })).status === 401)
  await jpost('/api/auth/verify', { email: 'forgot@example.com', code: codes['forgot@example.com'] })
  check('forgot: after the code, the new password works', (await jpost('/api/auth/login', { email: 'forgot@example.com', password: 'second-pass-word-2' })).status === 200)
  check('forgot: and the old one is gone', (await jpost('/api/auth/login', { email: 'forgot@example.com', password: 'first-pass-word-1' })).status === 401)

  // Google: make a throwaway signing key and pretend to be Google's certificate server
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
  const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'test-key-1', alg: 'RS256', use: 'sig' }
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const makeToken = async (claims, key = pair.privateKey) => {
    const head = enc({ alg: 'RS256', kid: 'test-key-1', typ: 'JWT' })
    const body = enc(claims)
    const sig = Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(head + '.' + body))).toString('base64url')
    return head + '.' + body + '.' + sig
  }
  const nowS = Math.floor(Date.now() / 1000)
  const good = { iss: 'https://accounts.google.com', aud: CLIENT_ID, sub: '1234567890', email: 'gina@example.com', email_verified: true, name: 'Gina Google', iat: nowS, exp: nowS + 3600 }
  const realFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => (String(url).startsWith('https://www.googleapis.com/oauth2/v3/certs') ? new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }) : realFetch(url, init))

  const g = await jpost('/api/auth/google', { credential: await makeToken(good) })
  const gCookie = cookieOf(g)
  const gMe = (await (await call('/api/me', {}, gCookie)).json()).user
  check('google: valid token signs in and creates the account', g.status === 200 && gMe?.email === 'gina@example.com' && gMe.name === 'Gina Google' && gMe.hasPassword === false, JSON.stringify(gMe))
  check('google: signing in again reuses the account', (await jpost('/api/auth/google', { credential: await makeToken(good) })).status === 200)
  check('google: a token for another app is refused', (await jpost('/api/auth/google', { credential: await makeToken({ ...good, aud: 'someone-elses-app' }) })).status === 401)
  check('google: an expired token is refused', (await jpost('/api/auth/google', { credential: await makeToken({ ...good, exp: nowS - 60 }) })).status === 401)
  check('google: an unverified email is refused', (await jpost('/api/auth/google', { credential: await makeToken({ ...good, email_verified: false }) })).status === 401)
  check('google: a wrong issuer is refused', (await jpost('/api/auth/google', { credential: await makeToken({ ...good, iss: 'https://evil.example' }) })).status === 401)
  const other2 = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
  check('google: a token signed with someone else\'s key is refused', (await jpost('/api/auth/google', { credential: await makeToken(good, other2.privateKey) })).status === 401)
  check('google: garbage is refused', (await jpost('/api/auth/google', { credential: 'not.a.token' })).status === 401)
  check('google: cross-site request is refused', (await call('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential: await makeToken(good) }), headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' } })).status === 403)

  // Google sign-in links to the account that already holds the same email (and its guest orders)
  const guest = await (await jpost('/api/shop-orders', { payment: 'cod', customer: { name: 'Gina', email: 'gina@example.com', phone: '9876543210', address: '12 Test Street, Test Area', city: 'Chennai', pincode: '600001' }, items: [{ productId: 1, size: 'M', color: '#15171F', qty: 1 }] })).json()
  const gOrders = await (await call('/api/me/orders', {}, gCookie)).json()
  check('google: guest orders for that email appear', gOrders.orders?.some((o) => o.id === guest.orderId))
  globalThis.fetch = realFetch

  const noGoogle = makeApi({})
  check('google: refused when it is not configured', (await noGoogle.api('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential: 'x.y.z' }), headers: { 'Content-Type': 'application/json' } })).status === 503)
  check('google: config tells the page whether to show the button', (await (await call('/api/config')).json()).googleClientId === CLIENT_ID && (await (await noGoogle.api('/api/config')).json()).googleClientId === null)
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
