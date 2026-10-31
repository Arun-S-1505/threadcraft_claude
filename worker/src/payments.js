/**
 * Razorpay hosted checkout support. We only create a gateway order here; the browser
 * opens Razorpay's own checkout (card details never touch us) and the signed webhook
 * in index.js is the only thing that marks an order paid.
 */
export const gatewayEnabled = (env) => Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET)

/** Creates a Razorpay order for an existing ThreadCraft order. Returns params for checkout.js. */
export async function createGatewayOrder(env, order) {
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: order.total * 100, // paise
      currency: 'INR',
      receipt: order.id,
      notes: { order_id: order.id },
    }),
  })
  if (!res.ok) {
    console.error('Razorpay order failed', res.status, await res.text())
    throw new Error('Could not start the payment. Please try again.')
  }
  const data = await res.json()
  await env.DB.prepare(`UPDATE orders SET gateway_order_id = ? WHERE id = ?`).bind(data.id, order.id).run()
  return {
    keyId: env.RAZORPAY_KEY_ID, // public key id, safe for the browser
    gatewayOrderId: data.id,
    amount: order.total * 100,
    currency: 'INR',
    prefill: { name: order.customer_name, email: order.email, contact: order.phone },
  }
}

/** Payments tried on a Razorpay order: [{ id, status }] (status: created, authorized, captured, failed ...). */
export async function listGatewayPayments(env, gatewayOrderId) {
  const res = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(gatewayOrderId)}/payments`, {
    headers: { Authorization: 'Basic ' + btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`) },
  })
  if (!res.ok) throw new Error('Razorpay lookup failed: ' + res.status)
  return (await res.json()).items || []
}

/** Refunds part or all of a captured payment back to the customer's original payment method. amountInr is a whole number of rupees. */
export async function refundGatewayPayment(env, paymentId, amountInr, { receipt, reason } = {}) {
  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: amountInr * 100, speed: 'normal', ...(receipt ? { receipt } : {}), notes: { reason: reason || 'Refund from ThreadCraft admin' } }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('Razorpay refund failed', res.status, JSON.stringify(data))
    // Razorpay's own message is safe to show the owner (for example "The payment has been fully refunded already")
    throw new Error(data?.error?.description || 'Razorpay could not process the refund')
  }
  return { id: data.id, status: data.status || 'processed' }
}
