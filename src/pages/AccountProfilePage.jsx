import { useState } from 'react'
import { Link } from 'react-router-dom'
import AccountShell from '../components/AccountShell'

export default function AccountProfilePage() {
  const [form, setForm] = useState({ firstName: 'Alex', lastName: 'Rivera', email: 'alex.rivera@example.com', phone: '' })
  const [saved, setSaved] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setSaved(false)
  }
  const handleSubmit = (e) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <AccountShell title={`${form.firstName} ${form.lastName}`.trim() || 'Your account'} intro={form.email}>
      <section className="tc-acct__section">
        <div className="tc-acct__sechead">
          <h2>Personal details</h2>
          {saved && <span className="tc-acct__saved" role="status">Changes saved</span>}
        </div>
        <form onSubmit={handleSubmit} className="tc-formgrid">
          <div className="tc-formfield">
            <label htmlFor="firstName">First name</label>
            <input id="firstName" name="firstName" value={form.firstName} onChange={handleChange} type="text" className="tc-input" />
          </div>
          <div className="tc-formfield">
            <label htmlFor="lastName">Last name</label>
            <input id="lastName" name="lastName" value={form.lastName} onChange={handleChange} type="text" className="tc-input" />
          </div>
          <div className="tc-formfield">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" value={form.email} onChange={handleChange} type="email" className="tc-input" />
          </div>
          <div className="tc-formfield">
            <label htmlFor="phone">Phone number</label>
            <input id="phone" name="phone" value={form.phone} onChange={handleChange} type="tel" placeholder="+91 98765 43210" className="tc-input" />
          </div>
          <div className="tc-formfield is-wide">
            <button type="submit" className="tc-btn tc-btn--primary">Save changes</button>
          </div>
        </form>
      </section>

      <section className="tc-acct__section">
        <div className="tc-acct__sechead">
          <h2>Quick links</h2>
        </div>
        <ul className="tc-acct__links">
          <li><Link to="/orders"><span>Order history</span><small>Review recent purchases and custom orders</small></Link></li>
          <li><Link to="/track-order"><span>Track an order</span><small>See where your order is right now</small></Link></li>
          <li><Link to="/account/password"><span>Change password</span><small>Keep your account secure</small></Link></li>
        </ul>
      </section>
    </AccountShell>
  )
}
