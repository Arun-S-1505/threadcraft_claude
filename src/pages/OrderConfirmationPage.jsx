import { Link, useLocation } from 'react-router-dom'
import Icon from '../components/ui/Icon'
import { formatPrice } from '../data/products'
import { SITE } from '../config/site'

const readOrder = (state) => {
  if (state?.order) return state.order
  try {
    return JSON.parse(localStorage.getItem('tc_last_order') || 'null')
  } catch {
    return null
  }
}

const PAY_LABEL = { upi: 'UPI', card: 'Card', cod: 'Cash on delivery' }

export default function OrderConfirmationPage() {
  const { state } = useLocation()
  const order = readOrder(state)

  if (!order) {
    return (
      <div className="tc-page">
        <div className="tc-container">
          <div className="tc-empty tc-empty--page">
            <div className="tc-empty__icon">
 
            </div>
            <h3>No recent order found</h3>
            <p>Once you place an order, its confirmation appears here.</p>
            <div className="tc-empty__actions">
              <Link to="/shop" className="tc-btn tc-btn--primary">
                Shop the collection
              </Link>
              <Link to="/track-order" className="tc-btn tc-btn--ghost">
                Track an order
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="tc-page">
      <div className="tc-container tc-confirm">
        <div className="tc-confirm__hero">
          <span className="tc-confirm__check" aria-hidden="true">
            <svg viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="24" />
              <path d="M15 27l8 8 15-17" />
            </svg>
          </span>
          <p className="tc-eyebrow">Order confirmed</p>
          <h1 className="tc-h2 tc-h2--page">
            Thank you, <em>{order.customer.name.split(' ')[0]}.</em>
          </h1>
          <p className="tc-lead">
            Your order is in and our print team has been notified. We'll dispatch it within {SITE.policy.dispatchHours} hours and send tracking details to {order.customer.email}.
          </p>
        </div>

        <div className="tc-confirm__grid">
          <section className="tc-panel">
            <div className="tc-panel__head">
              <h2>Order #{order.number}</h2>
              <p>{new Date(order.placedAt).toLocaleDateString(SITE.currency.locale, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
            <ul className="tc-mini tc-mini--plain">
              {order.items.map((it, i) => (
                <li key={i}>
                  <div>
                    <strong>{it.name}</strong>
                    <small>
                      {it.color} · {it.size} · Qty {it.qty}
                    </small>
                  </div>
                  <em>{formatPrice(it.price * it.qty)}</em>
                </li>
              ))}
            </ul>
            <dl className="tc-summary__list">
              <div>
                <dt>Subtotal</dt>
                <dd>{formatPrice(order.subtotal)}</dd>
              </div>
              <div>
                <dt>Shipping</dt>
                <dd>{order.shipping === 0 ? 'Free' : formatPrice(order.shipping)}</dd>
              </div>
              <div className="tc-summary__total">
                <dt>Total</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </section>

          <section className="tc-panel">
            <div className="tc-panel__head">
              <h2>Delivering to</h2>
            </div>
            <address className="tc-address">
              {order.customer.name}
              <br />
              {order.address.line1}
              {order.address.line2 && (
                <>
                  <br />
                  {order.address.line2}
                </>
              )}
              <br />
              {order.address.city}, {order.address.state} {order.address.pin}
              <br />
              {order.customer.phone}
            </address>
            <div className="tc-panel__head tc-panel__head--sub">
              <h2>Payment</h2>
            </div>
            <p className="tc-address">{PAY_LABEL[order.payment] || order.payment}</p>
          </section>
        </div>

        <div className="tc-confirm__actions">
          <Link to="/shop" className="tc-btn tc-btn--primary">
            Continue shopping 
          </Link>
          <Link to="/track-order" className="tc-btn tc-btn--ghost">
            Track your order
          </Link>
        </div>
      </div>
    </div>
  )
}
