import { useState } from 'react'
import { Link } from 'react-router-dom'
import Garment from '../components/ui/Garment'
import AccountShell from '../components/AccountShell'

// Sample orders shown until the storefront is connected to a backend.
const orders = [
  { id: '#TC-2026-1042', date: 'Sep 24, 2026', total: '₹1,398', status: 'In Production', items: [
    { name: 'Classic Heavyweight Tee', variant: 'Black / M', type: 'tee', color: '#15171F' },
  ]},
  { id: '#TC-2026-0987', date: 'Sep 09, 2026', total: '₹3,297', status: 'Delivered', items: [
    { name: 'French Terry Hoodie', variant: 'Bone / L', type: 'hoodie', color: '#E9E2D3' },
    { name: 'Oversized Graphic Tee', variant: 'Charcoal / XL', type: 'oversized', color: '#3A3D45' },
  ]},
  { id: '#TC-2026-0861', date: 'Aug 21, 2026', total: '₹1,299', status: 'Delivered', items: [
    { name: 'Classic Polo Shirt', variant: 'Navy / M', type: 'polo', color: '#1F2A44' },
  ]},
]

export default function OrderHistoryPage() {
  const [filter, setFilter] = useState('All')
  const [expandedOrder, setExpandedOrder] = useState(orders[0].id)

  const filteredOrders = orders.filter((o) => filter === 'All' || o.status === filter)

  return (
    <AccountShell title="Orders" intro="Review your purchases and follow custom orders through production.">
      <div className="tc-chips tc-orders__filters" role="group" aria-label="Filter orders">
        {['All', 'In Production', 'Delivered'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`tc-chip ${filter === f ? 'is-on' : ''}`} aria-pressed={filter === f}>
            {f}
          </button>
        ))}
      </div>

      <ul className="tc-orders">
        {filteredOrders.map((order) => {
          const open = expandedOrder === order.id
          return (
            <li key={order.id} className="tc-order">
              <button className="tc-order__head" aria-expanded={open} onClick={() => setExpandedOrder(open ? null : order.id)}>
                <span className="tc-order__id">
                  <strong>{order.id}</strong>
                  <small>{order.date}</small>
                </span>
                <span className="tc-order__status">{order.status}</span>
                <span className="tc-order__total">{order.total}</span>
                <span className="tc-acc__sign" aria-hidden="true" data-open={open} />
              </button>
              {open && (
                <div className="tc-order__body">
                  {order.items.map((item, i) => (
                    <div key={i} className="tc-order__item">
                      <div className="tc-order__thumb">
                        <Garment type={item.type} color={item.color} />
                      </div>
                      <div>
                        <h3>{item.name}</h3>
                        <p>{item.variant}</p>
                      </div>
                    </div>
                  ))}
                  <div className="tc-order__actions">
                    <Link to="/track-order" className="tc-link">Track order</Link>
                    <button className="tc-link" type="button">Reorder</button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </AccountShell>
  )
}
