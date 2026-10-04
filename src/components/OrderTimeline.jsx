import { SITE } from '../config/site'

// Order progress. "Payment received" is only a step for orders that are paid online.
const STEPS = [
  { key: 'new', label: 'Order placed' },
  { key: 'paid', label: 'Payment received', onlineOnly: true },
  { key: 'printing', label: 'In production' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
]

export const STATUS_LABEL = { new: 'Order placed', paid: 'Paid', printing: 'In production', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' }

export const formatWhen = (iso) =>
  new Date(iso).toLocaleString(SITE.currency.locale, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

/** order: { status, payment_method, tracking_no }, history: [{ status, at }] */
export default function OrderTimeline({ order, history = [] }) {
  if (order.status === 'cancelled') {
    return <p className="tc-note">This order was cancelled. If you did not expect this, please contact us.</p>
  }
  const reached = new Map(history.map((h) => [h.status, h.at]))
  const steps = STEPS.filter((s) => !s.onlineOnly || order.payment_method === 'online')
  const current = steps.map((s) => s.key).lastIndexOf(order.status)

  return (
    <ol className="tc-track">
      {steps.map((s, i) => (
        <li key={s.key} className={`${i <= current ? 'is-done' : ''} ${i === current ? 'is-active' : ''}`}>
          <span className="tc-track__dot" aria-hidden="true" />
          <div>
            <h3>{s.label}</h3>
            {reached.has(s.key) && <p>{formatWhen(reached.get(s.key))}</p>}
            {s.key === 'shipped' && order.tracking_no && i <= current && <p>Tracking number: {order.tracking_no}</p>}
            {i === current && i < steps.length - 1 && <p className="tc-track__now">Currently in progress</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}
