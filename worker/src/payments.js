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
