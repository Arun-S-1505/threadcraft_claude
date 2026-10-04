const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`

async function send(env, { to, subject, html, replyTo }) {
  if (!env.RESEND_API_KEY) {
    console.log('[email skipped: RESEND_API_KEY not set]', subject)
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.FROM_EMAIL, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  })
  if (!res.ok) console.error('Email failed', res.status, await res.text())
}

/**
 * Order emails (owner + customer). Best-effort: an email problem must never lose an order.
 * o = { id, total, customer, lines: string[], paymentNote }
 */
export async function notifyNewOrder(env, o) {
  const owner = `
    <p><strong>Order ${esc(o.id)}</strong> · ${inr(o.total)}</p>
    <p>${esc(o.customer.name)}<br>${esc(o.customer.phone)} · ${esc(o.customer.email)}<br>
    ${esc(o.customer.address)}, ${esc(o.customer.city)} ${esc(o.customer.pincode)}</p>
    <ul>${o.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <p>${esc(o.paymentNote)}</p>
    ${o.customer.notes ? `<p>Notes: ${esc(o.customer.notes)}</p>` : ''}`
  const customer = `
    <p>Hi ${esc(o.customer.name)},</p>
    <p>Thank you for your order <strong>${esc(o.id)}</strong> (${inr(o.total)}).</p>
    <ul>${o.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <p>${esc(o.paymentNote)}</p>
    <p>You can check progress any time on our Track Order page using this order number and your email.</p>
    <p>ThreadCraft</p>`
  await Promise.allSettled([
    send(env, { to: env.OWNER_EMAIL, subject: `New order ${o.id}`, html: owner, replyTo: o.customer.email }),
    send(env, { to: o.customer.email, subject: `We received your ThreadCraft order ${o.id}`, html: customer, replyTo: env.OWNER_EMAIL }),
  ])
}

export async function notifyMessage(env, { kind, name, email, fields }) {
  const rows = Object.entries(fields).map(([k, v]) => `<li><strong>${esc(k)}:</strong> ${esc(v)}</li>`).join('')
  await send(env, {
    to: env.OWNER_EMAIL,
    subject: kind === 'bulk' ? `Bulk quote request from ${name}` : `Message from ${name}`,
    html: `<p>${esc(name)} &lt;${esc(email)}&gt;</p><ul>${rows}</ul>`,
    replyTo: email,
  })
}
