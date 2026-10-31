const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`

// Pasted secrets often carry a stray space, newline or quotes; those make the Authorization header invalid.
const cleanKey = (k) => String(k ?? '').trim().replace(/^["']|["']$/g, '').trim()

/* ───────── Layout: table based with inline styles, the only thing every mail app renders reliably ───────── */
const INK = '#1a1a1a'
const MUTED = '#6b6a66'
const LINE = '#e7e5df'
const FONT = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif"
const SERIF = "Georgia,'Times New Roman',serif"

const siteOf = (env) => (env.ALLOWED_ORIGIN || '').replace(/\/$/, '')
const para = (html) => `<p style="margin:0 0 14px">${html}</p>`

const button = (href, label) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px"><tr><td style="background:${INK};border-radius:999px"><a href="${esc(href)}" style="display:inline-block;padding:13px 28px;font:600 14px ${FONT};color:#ffffff;text-decoration:none;letter-spacing:.02em">${esc(label)}</a></td></tr></table>`

/** A soft grey panel with a small label and a big value (order number, tracking number, sign-in code). */
const panel = (label, value, extra = '') =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;background:#f8f7f3;border-radius:10px"><tr><td style="padding:14px 18px;font:12px ${FONT};letter-spacing:.08em;text-transform:uppercase;color:${MUTED}">${esc(label)}<br><span style="font:600 19px ${FONT};letter-spacing:.04em;text-transform:none;color:${INK}">${esc(value)}</span>${extra}</td></tr></table>`

const itemRows = (lines) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">${lines
    .map((l) => `<tr><td style="padding:11px 0;border-top:1px solid ${LINE};font:14px/1.5 ${FONT};color:${INK}">${esc(l)}</td></tr>`)
    .join('')}<tr><td style="border-top:1px solid ${LINE};font-size:0;line-height:0">&nbsp;</td></tr></table>`

/** Wraps content in the ThreadCraft frame. preheader = the grey preview text shown next to the subject in the inbox. */
function layout(env, { preheader = '', heading, body }) {
  const site = siteOf(env)
  const reply = esc(env.OWNER_EMAIL || '')
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#f4f3ef">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f4f3ef">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3ef"><tr><td align="center" style="padding:32px 14px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td align="center" style="padding:0 0 22px">
      <a href="${esc(site || '#')}" style="font:600 21px ${FONT};letter-spacing:.34em;color:${INK};text-decoration:none">THREADCRAFT</a>
    </td></tr>
    <tr><td style="background:#ffffff;border:1px solid ${LINE};border-radius:14px;padding:36px 34px">
      ${heading ? `<h1 style="margin:0 0 18px;font:600 25px/1.25 ${SERIF};color:${INK}">${esc(heading)}</h1>` : ''}
      <div style="font:15px/1.65 ${FONT};color:${INK}">${body}</div>
    </td></tr>
    <tr><td align="center" style="padding:22px 10px 0;font:12px/1.7 ${FONT};color:${MUTED}">
      Questions? Just reply to this email${reply ? ` or write to <a href="mailto:${reply}" style="color:${MUTED}">${reply}</a>` : ''}.<br>
      ThreadCraft · Custom printed apparel, made to order in India
    </td></tr>
  </table>
</td></tr></table></body></html>`
}

async function send(env, { to, subject, html, replyTo }) {
  const key = cleanKey(env.RESEND_API_KEY)
  if (!key) {
    console.log('[email skipped: RESEND_API_KEY not set]', subject)
    return false
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'User-Agent': 'threadcraft-worker/1.0' },
    body: JSON.stringify({ from: env.FROM_EMAIL, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  })
  if (!res.ok) {
    // Safe diagnostics only: never log the key itself
    console.error('Email failed', res.status, await res.text(), JSON.stringify({ keyLength: key.length, looksLikeResendKey: key.startsWith('re_'), rawHadWhitespaceOrQuotes: String(env.RESEND_API_KEY) !== key, from: env.FROM_EMAIL }))
    return false
  }
  return true
}

/**
 * Order emails (owner + customer). Best-effort: an email problem must never lose an order.
 * o = { id, total, customer, lines: string[], paymentNote }
 */
export async function notifyNewOrder(env, o) {
  const site = siteOf(env)
  const owner = layout(env, {
    heading: `New order ${o.id}`,
    preheader: `${inr(o.total)} from ${o.customer.name}`,
    body:
      panel('Order total', inr(o.total), `<br><span style="font:12px ${FONT};letter-spacing:.04em;text-transform:none;color:${MUTED}">${esc(o.id)}</span>`) +
      para(`<strong>${esc(o.customer.name)}</strong><br>${esc(o.customer.phone)} · ${esc(o.customer.email)}<br>${esc(o.customer.address)}, ${esc(o.customer.city)} ${esc(o.customer.pincode)}`) +
      itemRows(o.lines) +
      para(esc(o.paymentNote)) +
      (o.customer.notes ? para(`<strong>Notes:</strong> ${esc(o.customer.notes)}`) : '') +
      (site ? button(site + '/admin', 'Open admin') : ''),
  })
  const customer = layout(env, {
    heading: 'Thank you for your order',
    preheader: `Order ${o.id} · ${inr(o.total)}. We are getting it ready.`,
    body:
      para(`Hi ${esc(o.customer.name)}, we have received your order and will start on it right away.`) +
      panel('Order number', o.id, `<br><span style="font:14px ${FONT};letter-spacing:0;text-transform:none;color:${MUTED}">Total ${inr(o.total)}</span>`) +
      itemRows(o.lines) +
      para(`<span style="color:${MUTED}">${esc(o.paymentNote)}</span>`) +
      para('We print and dispatch within 48 hours. You will get another email with tracking as soon as it ships.') +
      (site ? button(site + '/track-order', 'Track your order') : ''),
  })
  await Promise.allSettled([
    send(env, { to: env.OWNER_EMAIL, subject: `New order ${o.id}`, html: owner, replyTo: o.customer.email }),
    send(env, { to: o.customer.email, subject: `We received your ThreadCraft order ${o.id}`, html: customer, replyTo: env.OWNER_EMAIL }),
  ])
}

/**
 * Customer email when an order ships or is completed. Best-effort: never blocks the admin action.
 * o = { id, name, email, status: 'shipped' | 'delivered', tracking }
 */
export async function notifyStatus(env, o) {
  if (!o.email || o.email.endsWith('@invalid')) return // personal data was erased
  const site = siteOf(env)
  const isLink = /^https?:\/\//i.test(o.tracking || '')
  let subject
  let html
  if (o.status === 'shipped') {
    subject = `Your ThreadCraft order ${o.id} has shipped`
    const track = o.tracking ? (isLink ? button(o.tracking, 'Track your parcel') : panel('Courier tracking number', o.tracking)) : ''
    html = layout(env, {
      heading: 'Your order is on its way',
      preheader: `Order ${o.id} has shipped.`,
      body:
        para(`Hi ${esc(o.name)}, good news: your order is on its way to you.`) +
        panel('Order number', o.id) +
        track +
        para(`You can also follow it any time on our ${site ? `<a href="${esc(site)}/track-order" style="color:${INK}">Track Order page</a>` : 'Track Order page'} with your order number and email.`),
    })
  } else {
    subject = `Your ThreadCraft order ${o.id} is complete`
    html = layout(env, {
      heading: 'Your order is complete',
      preheader: `Order ${o.id} is complete. Thank you!`,
      body:
        para(`Hi ${esc(o.name)}, your order is now marked as complete. Thank you for shopping with ThreadCraft!`) +
        panel('Order number', o.id) +
        para('If anything is not right, just reply to this email and we will help.') +
        (site ? button(site + '/shop', 'Shop the collection') : ''),
    })
  }
  await send(env, { to: o.email, subject, html, replyTo: env.OWNER_EMAIL })
}

/** Customer email when the owner refunds an order. o = { id, name, email, amount, full, reason } */
export async function notifyRefund(env, o) {
  if (!o.email || o.email.endsWith('@invalid')) return // personal data was erased
  await send(env, {
    to: o.email,
    subject: `Your ThreadCraft refund of ${inr(o.amount)} for order ${o.id}`,
    html: layout(env, {
      heading: 'Your refund is on its way',
      preheader: `${inr(o.amount)} is being refunded to your original payment method.`,
      body:
        para(`Hi ${esc(o.name)}, we have ${o.full ? 'refunded your order' : 'issued a partial refund'}.`) +
        panel('Refund amount', inr(o.amount), `<br><span style="font:14px ${FONT};letter-spacing:0;text-transform:none;color:${MUTED}">Order ${esc(o.id)}</span>`) +
        para('It goes back to the UPI account, card or bank account you paid from. Banks usually take 5 to 7 working days to show it.') +
        (o.reason ? para(`<span style="color:${MUTED}">Note: ${esc(o.reason)}</span>`) : '') +
        para('If it has not arrived after 7 working days, just reply to this email.'),
    }),
    replyTo: env.OWNER_EMAIL,
  })
}

export async function notifyMessage(env, { kind, name, email, fields }) {
  const rows = Object.entries(fields).map(([k, v]) => `<li style="margin:0 0 6px"><strong>${esc(k)}:</strong> ${esc(v)}</li>`).join('')
  await send(env, {
    to: env.OWNER_EMAIL,
    subject: kind === 'bulk' ? `Bulk quote request from ${name}` : `Message from ${name}`,
    html: layout(env, {
      heading: kind === 'bulk' ? 'Bulk quote request' : 'New message',
      preheader: `${name} wrote to you`,
      body: `${para(`<strong>${esc(name)}</strong> &lt;${esc(email)}&gt;`)}<ul style="margin:0;padding-left:18px">${rows}</ul>`,
    }),
    replyTo: email,
  })
}

/** Sign-in code email. Returns true when the email was accepted, so the page can tell the customer if it was not. */
export async function sendLoginCode(env, email, code, minutes) {
  // Local development only: with no email key, hand the code to a test hook or the console instead.
  if (!cleanKey(env.RESEND_API_KEY) && env.DEV_LOGIN_CODES === '1') {
    if (typeof env.onLoginCode === 'function') env.onLoginCode(email, code)
    else console.log(`[dev] sign-in code for ${email}: ${code}`)
    return true
  }
  return send(env, {
    to: email,
    subject: `Your ThreadCraft sign-in code: ${code}`,
    html: layout(env, {
      heading: 'Your sign-in code',
      preheader: `${code} is your ThreadCraft sign-in code`,
      body:
        para('Enter this code to sign in to ThreadCraft:') +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;background:#f8f7f3;border-radius:10px"><tr><td align="center" style="padding:22px;font:600 34px ${FONT};letter-spacing:.4em;color:${INK}">${esc(code)}</td></tr></table>` +
        para(`It works for ${minutes} minutes and only once. If you did not ask for it, you can safely ignore this email.`),
    }),
  })
}
