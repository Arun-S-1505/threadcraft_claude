import { useEffect, useRef, useState } from 'react'
import { FIT_LABEL } from '../../shared/designSpec'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/ui/Icon'
import { ProductThumb } from '../components/ui/ProductImage'
import { formatPrice } from '../data/products'
import { SITE } from '../config/site'
import { useStore } from '../store/StoreContext'
import { useAuth } from '../store/AuthContext'
import { STATES } from '../data/india'
import { api } from '../lib/api'
import { openCheckout } from '../lib/razorpay'
import { abandonOrder } from '../lib/orders'

const PAYMENT_FAILED = 'Payment failed, so your order was not placed. Your bag is unchanged: you can try again. If any money was deducted, your bank will refund it automatically.'
const PAYMENT_UNCONFIRMED = 'We could not confirm your payment yet. If the money was deducted, your order will be confirmed automatically and we will email you. Please check your email before trying again.'
import { rememberDetails } from '../lib/remember'

const initial = { email: '', phone: '', firstName: '', lastName: '', address: '', apartment: '', city: '', state: 'Tamil Nadu', pin: '', notes: '' }

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { lines, count, subtotal, shipping, total, clearCart } = useStore()
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const { user, setUser } = useAuth()
  const prefilled = useRef(false)
  const [cfg, setCfg] = useState(null) // what the server can accept: { onlinePayments }
  const [placing, setPlacing] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const ctrl = new AbortController()
    api('/api/config', { signal: ctrl.signal })
      .then((c) => {
        setCfg(c)
      })
      .catch((e) => e.name !== 'AbortError' && setCfg({ onlinePayments: false, offline: true }))
    return () => ctrl.abort()
  }, [])
  // Signed-in customers get their saved details filled in (once, and only into empty fields)
  useEffect(() => {
    if (!user || prefilled.current) return
    prefilled.current = true
    // First-time customers (nothing saved yet) start with empty fields; returning ones are pre-filled
    const returning = !!(user.phone || user.address)
    if (!returning) return setForm((f) => ({ ...f, email: user.email }))
    const [firstName = '', ...rest] = (user.name || '').split(' ')
    setForm((f) => ({
      ...f,
      email: user.email, // always the sign-in email (locked), so we know who placed the order
      phone: f.phone || user.phone || '',
      firstName: f.firstName || firstName,
      lastName: f.lastName || rest.join(' '),
      address: f.address || user.address || '',
      city: f.city || user.city || '',
      state: user.state || f.state,
      pin: f.pin || user.pincode || '',
    }))
  }, [user])
  // The email of a signed-in customer cannot be changed here; the server enforces it too
  const emailLocked = !!user
  const online = !!cfg?.onlinePayments

  const set = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }))
  }

  const validate = () => {
    const er = {}
    if (!/^\S+@\S+\.\S+$/.test(emailLocked ? user.email : form.email)) er.email = 'Enter a valid email address'
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\s|-/g, ''))) er.phone = 'Enter a valid 10-digit mobile number'
    if (!form.firstName.trim()) er.firstName = 'Required'
    if (!form.lastName.trim()) er.lastName = 'Required'
    if (form.address.trim().length < 6) er.address = 'Enter your full address'
    if (!form.city.trim()) er.city = 'Required'
    if (!/^\d{6}$/.test(form.pin)) er.pin = 'Enter a 6-digit PIN code'
    setErrors(er)
    return Object.keys(er).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    if (placing) return
    if (!validate()) {
      document.querySelector('.tc-input.is-error, .tc-select.is-error')?.focus?.()
      return
    }
    setPlacing(true)
    setFormError('')
    try {
      const res = await api('/api/shop-orders', {
        method: 'POST',
        json: {
          customer: {
            name: `${form.firstName.trim()} ${form.lastName.trim()}`,
            email: (emailLocked ? user.email : form.email).trim(),
            phone: form.phone.trim(),
            address: [form.address.trim(), form.apartment.trim(), form.state].filter(Boolean).join(', '),
            city: form.city.trim(),
            pincode: form.pin.trim(),
            notes: '',
          },
          // Only ids, sizes, colours and quantities are sent. The server prices the bag itself.
          items: lines.map((l) => ({ productId: l.productId, size: l.size, fit: l.fit, color: l.color, qty: l.qty })),
        },
      })

      // Remember the details on the account so the next order is pre-filled
      rememberDetails(user, setUser, {
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        phone: form.phone.trim(),
        address: [form.address.trim(), form.apartment.trim()].filter(Boolean).join(', '),
        city: form.city.trim(),
        state: form.state,
        pincode: form.pin.trim(),
      })

      // "completed" only means the customer finished; the server confirms payment via webhook
      let outcome = 'dismissed'
      if (res.payment?.gatewayOrderId) outcome = await openCheckout(res.payment, { description: `Order ${res.orderId}` }).catch(() => 'dismissed')
      if (outcome !== 'completed') {
        // Not paid: the order must not exist. The server removes it unless a payment is still in progress.
        const gone = await abandonOrder(res.orderId, (emailLocked ? user.email : form.email).trim(), res.payment?.gatewayOrderId).catch(() => null)
        setFormError(gone?.removed ? PAYMENT_FAILED : PAYMENT_UNCONFIRMED)
        setPlacing(false)
        return
      }
      const payState = 'completed'

      const order = {
        number: res.orderId,
        placedAt: new Date().toISOString(),
        customer: { name: `${form.firstName} ${form.lastName}`, email: emailLocked ? user.email : form.email, phone: form.phone },
        address: { line1: form.address, line2: form.apartment, city: form.city, state: form.state, pin: form.pin },
        payment: 'online',
        payState,
        items: lines.map((l) => ({ name: l.product.name, size: l.size, fit: FIT_LABEL[l.fit], color: l.colorName, qty: l.qty, price: l.price })),
        subtotal: res.subtotal, // server-verified amounts
        shipping: res.shipping,
        total: res.total,
      }
      try {
        localStorage.setItem('tc_last_order', JSON.stringify(order))
      } catch {
        /* ignore */
      }
      clearCart()
      navigate('/order-confirmation', { state: { order } })
    } catch (err) {
      setFormError(err.message)
      setPlacing(false)
    }
  }

  const field = (name, label, { wide, ...props } = {}) => (
    <div className={`tc-formfield ${wide ? 'is-wide' : ''}`}>
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
            <li className="is-on"><span>2</span> Details</li>
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
              </div>
              <div className="tc-formgrid">
                {field('email', 'Email address', { type: 'email', autoComplete: 'email', wide: true, placeholder: 'you@email.com', ...(emailLocked ? { readOnly: true, value: user.email, 'aria-readonly': true } : {}) })}
                {emailLocked && <p className="tc-hint tc-formfield is-wide">Orders are placed with the email you signed in with, so we can match them to your account.</p>}
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

          </div>

          <aside className="tc-summary tc-summary--checkout" aria-label="Order summary">
            <h2>Order summary</h2>
            <ul className="tc-mini">
              {lines.map((l) => (
                <li key={l.key}>
                  <div className="tc-mini__img">
                    <ProductThumb product={l.product} />
                    <span>{l.qty}</span>
                  </div>
                  <div>
                    <strong>{l.product.name}</strong>
                    <small>
                      {FIT_LABEL[l.fit]} · {l.colorName} · {l.size}
                    </small>
                  </div>
                  <em>{formatPrice(l.price * l.qty)}</em>
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
              <div className="tc-summary__total">
                <dt>Total</dt>
                <dd>{formatPrice(total)}</dd>
              </div>
            </dl>
            {formError && <p className="tc-error" role="alert">{formError}</p>}
            {online && (
              <button type="submit" className="tc-btn tc-btn--primary tc-btn--block tc-btn--lg" disabled={placing || !cfg}>
                {placing ? 'Placing your order…' : `Pay & place order · ${formatPrice(total)}`}
              </button>
            )}
            {cfg && !online && <p className="tc-error" role="alert">Online payment is not available right now. Please try again in a little while.</p>}
            {online && <p className="tc-hint">Pay securely with UPI, card or netbanking.</p>}
            <ul className="tc-summary__trust">
              <li> Free delivery</li>
              <li> Dispatched in {SITE.policy.dispatchHours} hours</li>
              <li> {SITE.policy.returnDays}-day returns on collection tees</li>
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
