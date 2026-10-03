import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { openCheckout } from '../lib/razorpay'
import { formatPrice } from '../data/products'
import { SITE } from '../config/site'

// Order progress. Payment is only shown as a step for orders that are paid online.
const STEPS = [
  { key: 'new', label: 'Order placed' },
  { key: 'paid', label: 'Payment received', onlineOnly: true },
  { key: 'printing', label: 'In production' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
]

const fmt = (iso) => new Date(iso).toLocaleString(SITE.currency.locale, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function TrackOrderPage() {
  const [params] = useSearchParams()
  const [id, setId] = useState(params.get('id') || '')
  const [email, setEmail] = useState('')
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [payMsg, setPayMsg] = useState('')

  const lookup = async (e) => {
    e?.preventDefault()
    setLoading(true)
    setError('')
    setPayMsg('')
    try {
      setOrder(await api(`/api/track?id=${encodeURIComponent(id.trim())}&email=${encodeURIComponent(email.trim())}`))
    } catch (err) {
      setOrder(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const pay = async () => {
    setPayMsg('')
    try {
      const { payment } = await api('/api/pay', { method: 'POST', json: { id: order.id, email: email.trim() } })
      const outcome = await openCheckout(payment, { description: `Order ${order.id}` })
      setPayMsg(outcome === 'completed' ? 'Thank you. Your payment is being confirmed. Refresh in a moment.' : 'Payment was not completed. You can try again.')
    } catch (err) {
      setPayMsg(err.message)
    }
  }

  const reached = order ? new Map(order.history.map((h) => [h.status, h.at])) : new Map()
  const steps = order ? STEPS.filter((s) => !s.onlineOnly || order.payment_method === 'online') : []
  const current = order ? steps.map((s) => s.key).lastIndexOf(order.status) : -1

  return (
    <div className="tc-page">
      <header className="tc-pagehead">
        <div className="tc-container">
          <h1 className="tc-h2 tc-h2--page">Track an <em>order</em></h1>
          <p className="tc-lead">Enter your order number and the email you used when ordering.</p>
        </div>
      </header>

      <div className="tc-container tc-trackpage">
        <form onSubmit={lookup} className="tc-formgrid tc-trackpage__form" noValidate>
          <div className="tc-formfield">
            <label htmlFor="t-id">Order number</label>
            <input id="t-id" className="tc-input" value={id} onChange={(e) => setId(e.target.value)} placeholder="TC-ABCD2345" autoComplete="off" required />
          </div>
          <div className="tc-formfield">
            <label htmlFor="t-email">Email</label>
            <input id="t-email" type="email" className="tc-input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          <div className="tc-formfield is-wide">
            <button className="tc-btn tc-btn--primary" type="submit" disabled={loading || !id.trim() || !email.trim()}>
              {loading ? 'Looking up…' : 'Track order'}
            </button>
            {error && <p className="tc-error" role="alert">{error}</p>}
          </div>
        </form>

        {order && (
          <section className="tc-trackpage__result" aria-live="polite">
            <div className="tc-panel__head">
              <h2>Order {order.id}</h2>
              <p>{formatPrice(order.total)} · placed {fmt(order.created_at)}</p>
            </div>

            {order.status === 'cancelled' ? (
              <p className="tc-note">This order was cancelled. If you did not expect this, please <Link to="/contact" className="tc-link">contact us</Link>.</p>
            ) : (
              <ol className="tc-track">
                {steps.map((s, i) => (
                  <li key={s.key} className={`${i <= current ? 'is-done' : ''} ${i === current ? 'is-active' : ''}`}>
                    <span className="tc-track__dot" aria-hidden="true" />
                    <div>
                      <h3>{s.label}</h3>
                      {reached.has(s.key) && <p>{fmt(reached.get(s.key))}</p>}
                      {s.key === 'shipped' && order.tracking_no && i <= current && <p>Tracking number: {order.tracking_no}</p>}
                      {i === current && i < steps.length - 1 && <p className="tc-track__now">Currently in progress</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {order.payment_method === 'cod' && <p className="tc-note">Payment: cash on delivery.</p>}
            {order.payment_method === 'invoice' && order.payment_status !== 'paid' && (
              <p className="tc-note">We will email you a payment request after reviewing your design.</p>
            )}
            {order.payment_method === 'online' && order.payment_status !== 'paid' && order.status !== 'cancelled' && (
              <div className="tc-trackpage__pay">
                <p className="tc-note">Payment is not complete yet.</p>
                <button type="button" className="tc-btn tc-btn--primary tc-btn--sm" onClick={pay}>Pay {formatPrice(order.total)}</button>
                {payMsg && <p className="tc-note" role="status">{payMsg}</p>}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
