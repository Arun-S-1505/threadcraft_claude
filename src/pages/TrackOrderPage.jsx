import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import OrderTimeline, { formatWhen } from '../components/OrderTimeline'
import PayNow from '../components/PayNow'
import { api } from '../lib/api'
import { formatPrice } from '../data/products'
import { useAuth } from '../store/AuthContext'

export default function TrackOrderPage() {
  const [params] = useSearchParams()
  const { user } = useAuth()
  const [id, setId] = useState(params.get('id') || '')
  const [email, setEmail] = useState('')
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const lookup = async (e) => {
    e?.preventDefault()
    setLoading(true)
    setError('')
    try {
      setOrder(await api(`/api/track?id=${encodeURIComponent(id.trim())}&email=${encodeURIComponent(email.trim())}`))
    } catch (err) {
      setOrder(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tc-page">
      <header className="tc-pagehead">
        <div className="tc-container">
          <h1 className="tc-h2 tc-h2--page">Track an <em>order</em></h1>
          <p className="tc-lead">Enter your order number and the email you used when ordering.</p>
          {user ? (
            <p className="tc-note">You are signed in. <Link to="/account" className="tc-link">See all your orders</Link> without typing numbers.</p>
          ) : (
            <p className="tc-note"><Link to="/login" className="tc-link">Sign in</Link> to see all your orders in one place.</p>
          )}
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
              <p>{formatPrice(order.total)} · placed {formatWhen(order.created_at)}</p>
            </div>
            <OrderTimeline order={order} history={order.history} />
            <PayNow order={order} email={email.trim()} onPaid={lookup} />
          </section>
        )}
      </div>
    </div>
  )
}
