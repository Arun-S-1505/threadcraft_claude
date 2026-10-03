// Razorpay hosted checkout. Card/UPI details are entered on Razorpay's own window,
// never on our pages. Whether an order is really paid is decided only by the signed
// webhook on the server; the result here only drives the message we show.
const SRC = 'https://checkout.razorpay.com/v1/checkout.js'
let loading

function loadScript() {
  if (window.Razorpay) return Promise.resolve()
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SRC
    s.onload = resolve
    s.onerror = () => {
      loading = null
      reject(new Error('Could not load the payment window. Check your connection and try again.'))
    }
    document.head.appendChild(s)
  })
  return loading
}

/** Opens checkout. Resolves 'completed' (customer finished paying) or 'dismissed' (closed / failed). */
export async function openCheckout(payment, { description }) {
  await loadScript()
  return new Promise((resolve) => {
    const rzp = new window.Razorpay({
      key: payment.keyId,
      order_id: payment.gatewayOrderId,
      amount: payment.amount,
      currency: payment.currency,
      name: 'ThreadCraft',
      description,
      prefill: payment.prefill,
      theme: { color: '#1b1b1a' },
      handler: () => resolve('completed'),
      modal: { ondismiss: () => resolve('dismissed') },
    })
    rzp.on('payment.failed', () => resolve('dismissed'))
    rzp.open()
  })
}
