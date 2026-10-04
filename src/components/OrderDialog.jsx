import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './ui/Icon'
import { formatPrice } from '../data/products'
import { prepareOrder, submitOrder } from '../lib/orders'
import { useAuth } from '../store/AuthContext'
import { openCheckout } from '../lib/razorpay'
import { MAX_QUANTITY, MIN_IMAGE_SIDE, unitPrice, validateCustomer } from '../../shared/designSpec'

const EMPTY = { name: '', email: '', phone: '', address: '', city: '', pincode: '', quantity: 1, notes: '' }

export default function OrderDialog({ order, getCapture, onClose }) {
  const { fit, colour, size, printType, designList } = order
  const { user } = useAuth()
  const [form, setForm] = useState(() => (user ? { ...EMPTY, name: user.name || '', email: user.email, phone: user.phone || '', address: user.address || '', city: user.city || '', pincode: user.pincode || '' } : EMPTY))
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('form') // form | sending | done
  const [formError, setFormError] = useState('')
  const [result, setResult] = useState(null)

  const qty = Math.max(1, Math.min(MAX_QUANTITY, Number(form.quantity) || 1))
  const unit = unitPrice({ fit, printType, itemCount: designList.length })
  const lowRes = designList.filter((d) => d.type === 'image' && d.width && Math.max(d.width, d.height) < MIN_IMAGE_SIDE)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const field = (key, label, props = {}, wide = false) => (
    <div className={`tc-formfield ${wide ? 'is-wide' : ''}`}>
      <label htmlFor={`od-${key}`}>{label}</label>
      {props.as === 'textarea' ? (
        <textarea id={`od-${key}`} className={`tc-input ${errors[key] ? 'is-error' : ''}`} rows={3} value={form[key]} onChange={set(key)} />
      ) : (
        <input id={`od-${key}`} className={`tc-input ${errors[key] ? 'is-error' : ''}`} value={form[key]} onChange={set(key)} {...props} />
      )}
      {errors[key] && <p className="tc-error">{errors[key]}</p>}
    </div>
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (status === 'sending' || status === 'paying') return
    const errs = validateCustomer(form)
    setErrors(errs)
    setFormError('')
    if (Object.keys(errs).length) return

    setStatus('sending')
    try {
      const capture = getCapture()
      const prepared = await prepareOrder({ fit, colour: colour.hex, printType, designList, capture })
      if (prepared.errors.length) {
        setFormError(prepared.errors[0])
        setStatus('form')
        return
      }
      const res = await submitOrder({
        ...prepared,
        customer: { ...form, quantity: undefined },
        size,
        quantity: qty,
      })
      let pay = res.payment?.gatewayOrderId ? 'pending' : res.payment?.error ? 'failed' : 'invoice'
      if (pay === 'pending') {
        setStatus('paying')
        try {
          // "completed" only means the customer finished; the server confirms payment via webhook
          pay = (await openCheckout(res.payment, { description: `Custom order ${res.orderId}` })) === 'completed' ? 'completed' : 'pending'
        } catch {
          pay = 'pending'
        }
      }
      setResult({ ...res, pay })
      setStatus('done')
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.')
      setStatus('form')
    }
  }

  return (
    <div className="tc-modal" role="dialog" aria-modal="true" aria-labelledby="od-title">
      <div className="tc-modal__scrim" onClick={status === 'form' ? onClose : undefined} />
      <div className="tc-modal__card tc-order">
        <header>
          <h2 id="od-title">{status === 'done' ? 'Order received' : 'Place your order'}</h2>
          <button type="button" className="sx__iconbtn" onClick={onClose} disabled={status === 'sending' || status === 'paying'} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </header>

        {status === 'done' ? (
          <div className="tc-order__done">
            <p>
              Thank you. Your order number is <strong>{result.orderId}</strong>. We have saved your design exactly as you approved it and emailed {form.email.trim()}.
            </p>
            <p>
              {result.pay === 'completed' && 'Your payment went through. We will confirm it by email shortly.'}
              {result.pay === 'pending' && 'Your payment is not complete yet. You can finish it any time from Track Order using your order number and email.'}
              {result.pay === 'failed' && result.payment.error}
              {result.pay === 'invoice' && 'We will email you a payment request after reviewing your design.'}
            </p>
            <div className="sx__actions">
              <button type="button" className="tc-btn tc-btn--primary tc-btn--sm" onClick={onClose}>Back to studio</button>
              <Link to="/track-order" className="tc-btn tc-btn--ghost tc-btn--sm">Track order</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <p className="tc-order__sum">
              {fit === 'oversized' ? 'Oversized' : 'Regular fit'} tee · {colour.name} · size {size} · {designList.length} {designList.length === 1 ? 'print' : 'prints'}
            </p>

            {lowRes.length > 0 && (
              <div className="tc-order__warn" role="alert">
                <strong>Low-resolution image.</strong> {lowRes.map((d) => d.name).join(', ')} {lowRes.length > 1 ? 'are' : 'is'} under {MIN_IMAGE_SIDE}px on the longest side and may print blurry. You can still continue.
              </div>
            )}

            <div className="tc-formgrid">
              {field('name', 'Full name', { autoComplete: 'name' })}
              {field('phone', 'Phone', { type: 'tel', autoComplete: 'tel' })}
              {field('email', 'Email', { type: 'email', autoComplete: 'email' }, true)}
              {field('address', 'Delivery address', { autoComplete: 'street-address' }, true)}
              {field('city', 'City', { autoComplete: 'address-level2' })}
              {field('pincode', 'PIN code', { inputMode: 'numeric', maxLength: 6, autoComplete: 'postal-code' })}
              {field('quantity', 'Quantity', { type: 'number', min: 1, max: MAX_QUANTITY })}
              {field('notes', 'Notes (optional)', { as: 'textarea' }, true)}
            </div>

            <dl className="tc-order__total">
              <div><dt>{formatPrice(unit)} × {qty}</dt><dd>{formatPrice(unit * qty)}</dd></div>
              <p>Final price is confirmed by us when the order is placed. Shipping is calculated separately.</p>
            </dl>

            {formError && <p className="tc-error" role="alert">{formError}</p>}

            <button type="submit" className="tc-btn tc-btn--primary tc-btn--block" disabled={status !== 'form'}>
              {status === 'sending' ? 'Saving your design…' : status === 'paying' ? 'Waiting for payment…' : 'Submit order'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
