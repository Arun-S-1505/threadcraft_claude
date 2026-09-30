import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/ui/Icon'
import Garment from '../components/ui/Garment'
import { formatPrice } from '../data/products'
import { SITE } from '../config/site'
import { useStore } from '../store/StoreContext'

const STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jammu & Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan',
  'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Other',
]

const PAYMENTS = [
  { id: 'upi', icon: 'zap', title: 'UPI', text: 'Pay with any UPI app' },
  { id: 'card', icon: 'card', title: 'Credit / debit card', text: 'Visa, Mastercard, RuPay' },
  { id: 'cod', icon: 'cash', title: 'Cash on delivery', text: 'Pay when your order arrives' },
]

const initial = { email: '', phone: '', firstName: '', lastName: '', address: '', apartment: '', city: '', state: 'Tamil Nadu', pin: '', payment: 'upi', notes: '' }

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { lines, count, subtotal, shipping, gstIncluded, total, clearCart } = useStore()
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})

  const set = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }))
  }

  const validate = () => {
    const er = {}
    if (!/^\S+@\S+\.\S+$/.test(form.email)) er.email = 'Enter a valid email address'
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\s|-/g, ''))) er.phone = 'Enter a valid 10-digit mobile number'
    if (!form.firstName.trim()) er.firstName = 'Required'
    if (!form.lastName.trim()) er.lastName = 'Required'
    if (form.address.trim().length < 6) er.address = 'Enter your full address'
    if (!form.city.trim()) er.city = 'Required'
    if (!/^\d{6}$/.test(form.pin)) er.pin = 'Enter a 6-digit PIN code'
    setErrors(er)
    return Object.keys(er).length === 0
  }

  const submit = (e) => {
    e.preventDefault()
    if (!validate()) {
      document.querySelector('.tc-input.is-error, .tc-select.is-error')?.focus?.()
      return
    }
    const order = {
      number: `TC${Date.now().toString().slice(-8)}`,
      placedAt: new Date().toISOString(),
      customer: { name: `${form.firstName} ${form.lastName}`, email: form.email, phone: form.phone },
      address: { line1: form.address, line2: form.apartment, city: form.city, state: form.state, pin: form.pin },
      payment: form.payment,
      items: lines.map((l) => ({ name: l.product.name, size: l.size, color: l.colorName, qty: l.qty, price: l.product.price })),
      subtotal,
      shipping,
      total,
    }
    // TODO: send `order` to your backend / payment gateway (Razorpay, Cashfree, Stripe …)
    try {
      localStorage.setItem('tc_last_order', JSON.stringify(order))
    } catch {
      /* ignore */
    }
    clearCart()
    navigate('/order-confirmation', { state: { order } })
  }

  const field = (name, label, props = {}) => (
    <div className={`tc-formfield ${props.wide ? 'is-wide' : ''}`}>
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        value={form[name]}
        onChange={set}
        className={`tc-input ${errors[name] ? 'is-error' : ''}`}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${name}-err` : undefined}
        {...props}
      />
      {errors[name] && (
        <p className="tc-error" id={`${name}-err`} role="alert">
          {errors[name]}
        </p>
      )}
    </div>
  )

  if (lines.length === 0) {
    return (
      <div className="tc-page">
        <div className="tc-container">
          <div className="tc-empty tc-empty--page">
            <div className="tc-empty__icon">
 
            </div>
            <h3>Your bag is empty</h3>
            <p>Add something to your bag to check out.</p>
            <div className="tc-empty__actions">
              <Link to="/shop" className="tc-btn tc-btn--primary">
                Shop the collection
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="tc-page">
      <header className="tc-pagehead tc-pagehead--slim">
        <div className="tc-container">
          <ol className="tc-progress" aria-label="Checkout progress">
            <li className="is-done"><span>1</span> Bag</li>
            <li className="is-on"><span>2</span> Details &amp; payment</li>
            <li><span>3</span> Confirmation</li>
          </ol>
          <h1 className="tc-h2 tc-h2--page">
            Check<em>out</em>
          </h1>
        </div>
      </header>

      <div className="tc-container">
        <form className="tc-checkout" onSubmit={submit} noValidate>
          <div className="tc-checkout__main">
            <section className="tc-panel">
              <div className="tc-panel__head">
                <h2>Contact</h2>
                <p>
                  Have an account? <Link to="/login" className="tc-link">Log in</Link>
                </p>
              </div>
              <div className="tc-formgrid">
                {field('email', 'Email address', { type: 'email', autoComplete: 'email', wide: true, placeholder: 'you@email.com' })}
                {field('phone', 'Mobile number', { type: 'tel', autoComplete: 'tel', wide: true, placeholder: '98765 43210', inputMode: 'numeric' })}
              </div>
            </section>

            <section className="tc-panel">
              <div className="tc-panel__head">
                <h2>Delivery address</h2>
              </div>
              <div className="tc-formgrid">
                {field('firstName', 'First name', { autoComplete: 'given-name' })}
                {field('lastName', 'Last name', { autoComplete: 'family-name' })}
                {field('address', 'Address', { wide: true, autoComplete: 'address-line1', placeholder: 'House number, street, area' })}
                {field('apartment', 'Apartment, landmark (optional)', { wide: true, autoComplete: 'address-line2' })}
                {field('city', 'City', { autoComplete: 'address-level2' })}
                <div className="tc-formfield">
                  <label htmlFor="state">State</label>
                  <div className="tc-select tc-select--field">
                    <select id="state" name="state" value={form.state} onChange={set} autoComplete="address-level1">
                      {STATES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <Icon name="chevron-down" size={16} />
                  </div>
                </div>
                {field('pin', 'PIN code', { autoComplete: 'postal-code', inputMode: 'numeric', maxLength: 6, placeholder: '600001' })}
              </div>
            </section>

            <section className="tc-panel">
              <div className="tc-panel__head">
                <h2>Payment</h2>
                <p>
 Encrypted &amp; secure
                </p>
              </div>
              <div className="tc-pays" role="radiogroup" aria-label="Payment method">
                {PAYMENTS.map((p) => (
                  <label key={p.id} className={`tc-pay-opt ${form.payment === p.id ? 'is-on' : ''}`}>
                    <input type="radio" name="payment" value={p.id} checked={form.payment === p.id} onChange={set} />
                    <span className="tc-pay-opt__icon">
                      <Icon name={p.icon} size={20} />
                    </span>
                    <span className="tc-pay-opt__text">
                      <strong>{p.title}</strong>
                      <small>{p.text}</small>
                    </span>
                    <span className="tc-radio" />
                  </label>
                ))}
              </div>
            </section>
          </div>

          <aside className="tc-summary tc-summary--checkout" aria-label="Order summary">
            <h2>Order summary</h2>
            <ul className="tc-mini">
              {lines.map((l) => (
                <li key={l.key}>
                  <div className="tc-mini__img">
                    <div className="tc-stage tc-stage--thumb">
                      <div className="tc-stage__layer">
                        <Garment type={l.product.type} color={l.color} art={l.product.art} />
                      </div>
                    </div>
                    <span>{l.qty}</span>
                  </div>
                  <div>
                    <strong>{l.product.name}</strong>
                    <small>
                      {l.colorName} · {l.size}
                    </small>
                  </div>
                  <em>{formatPrice(l.product.price * l.qty)}</em>
                </li>
              ))}
            </ul>
            <dl>
              <div>
                <dt>Subtotal ({count})</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              <div>
                <dt>Shipping</dt>
                <dd>{shipping === 0 ? 'Free' : formatPrice(shipping)}</dd>
              </div>
              <div className="tc-summary__muted">
                <dt>GST included</dt>
                <dd>{formatPrice(gstIncluded)}</dd>
              </div>
              <div className="tc-summary__total">
                <dt>Total</dt>
                <dd>{formatPrice(total)}</dd>
              </div>
            </dl>
            <button type="submit" className="tc-btn tc-btn--primary tc-btn--block tc-btn--lg">
              {form.payment === 'cod' ? 'Place order' : 'Pay & place order'} · {formatPrice(total)}
           </button>
            <ul className="tc-summary__trust">
              <li> Dispatched in {SITE.policy.dispatchHours} hours</li>
              <li> {SITE.policy.returnDays}-day returns on stock items</li>
            </ul>
            <p className="tc-summary__legal">
              By placing your order you agree to our <Link to="/policies/terms" className="tc-link">Terms</Link> and <Link to="/policies/privacy" className="tc-link">Privacy Policy</Link>.
            </p>
          </aside>
        </form>
      </div>
    </div>
  )
}
