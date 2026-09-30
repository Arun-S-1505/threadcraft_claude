import { Link } from 'react-router-dom'
import Garment from '../components/ui/Garment'
import AccountShell from '../components/AccountShell'

// Sample tracking data shown until the storefront is connected to a backend.
const steps = [
  { label: 'Order placed', date: 'Sep 24, 2026, 2:30 PM', done: true },
  { label: 'Design approved', date: 'Sep 24, 2026, 4:15 PM', done: true },
  { label: 'In production', date: 'Sep 25, 2026, 10:00 AM', done: true, active: true },
  { label: 'Quality check', date: 'Estimated Sep 26', done: false },
  { label: 'Shipped', date: 'Estimated Sep 27', done: false },
  { label: 'Delivered', date: 'Estimated Sep 29 – Oct 1', done: false },
]

export default function TrackOrderPage() {
  return (
    <AccountShell
      title="Track an order"
      intro="Order #TC-2026-1042"
      action={<Link to="/orders" className="tc-link">Back to orders</Link>}
    >
      <ol className="tc-track">
        {steps.map((step) => (
          <li key={step.label} className={`${step.done ? 'is-done' : ''} ${step.active ? 'is-active' : ''}`}>
            <span className="tc-track__dot" aria-hidden="true" />
            <div>
              <h3>{step.label}</h3>
              <p>{step.date}</p>
              {step.active && <p className="tc-track__now">Currently in progress</p>}
            </div>
          </li>
        ))}
      </ol>

      <section className="tc-acct__section">
        <div className="tc-acct__sechead">
          <h2>Items in this order</h2>
        </div>
        <div className="tc-order__item">
          <div className="tc-order__thumb">
            <Garment type="tee" color="#15171F" />
          </div>
          <div>
            <h3>Classic Heavyweight Tee</h3>
            <p>Black / Medium</p>
            <p className="tc-order__price">₹1,299</p>
          </div>
        </div>
      </section>
    </AccountShell>
  )
}
