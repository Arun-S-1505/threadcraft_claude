import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { openCheckout } from '../lib/razorpay'
import { formatPrice } from '../data/products'

/**
 * "Pay now" for an unpaid online order. The server decides whether the order is really paid
 * (signed webhook); this only opens Razorpay's window and tells the customer what happened.
 * order: { id, total, status, payment_method, payment_status }, email: the order's email.
 */
export default function PayNow({ order, email, onPaid }) {
  const [online, setOnline] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api('/api/config').then((c) => setOnline(c.onlinePayments)).catch(() => {})
  }, [])

  const unpaid = order.payment_status !== 'paid' && order.status !== 'cancelled'
  if (!unpaid) return null

  if (order.payment_method === 'cod') return <p className="tc-note">Payment: cash on delivery.</p>
  if (!online) {
    return order.payment_method === 'invoice' ? <p className="tc-note">We will email you a payment request after reviewing your design.</p> : null
  }

  const pay = async () => {
    setMsg('')
    setBusy(true)
    try {
      const { payment } = await api('/api/pay', { method: 'POST', json: { id: order.id, email } })
      const outcome = await openCheckout(payment, { description: `Order ${order.id}` })
      setMsg(outcome === 'completed' ? 'Thank you. Your payment is being confirmed. Refresh in a moment.' : 'Payment was not completed. You can try again.')
      if (outcome === 'completed') onPaid?.()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tc-trackpage__pay">
      <p className="tc-note">Payment is not complete yet.</p>
      <button type="button" className="tc-btn tc-btn--primary tc-btn--sm" onClick={pay} disabled={busy}>
        {busy ? 'Opening payment…' : `Pay ${formatPrice(order.total)}`}
      </button>
      {msg && <p className="tc-note" role="status">{msg}</p>}
    </div>
  )
}
