import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import Icon from '../components/ui/Icon'
import OrderTimeline, { STATUS_LABEL, formatWhen } from '../components/OrderTimeline'
import PayNow from '../components/PayNow'
import { api } from '../lib/api'
import { formatPrice } from '../data/products'
import { STATES } from '../data/india'
import { useAuth } from '../store/AuthContext'

const PLACE = { front: 'Front', back: 'Back', left_sleeve: 'Left sleeve', right_sleeve: 'Right sleeve' }

export default function AccountPage() {
  const { user, loading, signOut } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'profile' ? 'profile' : 'orders'

  useEffect(() => {
    document.title = 'My account | ThreadCraft'
  }, [])

  if (loading) {
    return (
      <div className="tc-page">
        <div className="tc-container"><p className="tc-note">Loading…</p></div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login?next=/account" replace />

  const first = (user.name || '').split(' ')[0]
  const go = (t) => setParams(t === 'orders' ? {} : { tab: t }, { replace: true })

  return (
    <div className="tc-page">
      <header className="tc-pagehead">
        <div className="tc-container tc-acct__head">
          <div>
            <p className="tc-eyebrow">My account</p>
            <h1 className="tc-h2 tc-h2--page">{first ? <>Hello, <em>{first}</em></> : 'Hello'}</h1>
            <p className="tc-lead">{user.email}</p>
          </div>
          <button type="button" className="tc-btn tc-btn--ghost tc-btn--sm" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <div className="tc-container tc-me">
        <div className="tc-me__tabs" role="tablist" aria-label="Account sections">
          <button role="tab" aria-selected={tab === 'orders'} className={tab === 'orders' ? 'is-on' : ''} onClick={() => go('orders')}>Orders</button>
          <button role="tab" aria-selected={tab === 'profile'} className={tab === 'profile' ? 'is-on' : ''} onClick={() => go('profile')}>Profile</button>
        </div>
        {tab === 'orders' ? <Orders email={user.email} /> : (
          <>
            <Profile />
            <PasswordCard />
          </>
        )}
      </div>
    </div>
  )
}

/* ───────── Orders ───────── */
function Orders({ email }) {
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)

  const load = () =>
    api('/api/me/orders')
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message))
  useEffect(() => {
    load()
  }, [])

  if (error) return <p className="tc-error" role="alert">{error}</p>
  if (!orders) return <p className="tc-note">Loading your orders…</p>

  if (orders.length === 0) {
    return (
      <div className="tc-empty">
        <h3>No orders yet</h3>
        <p>Orders you place with <strong>{email}</strong> will appear here, including ones placed before you created an account.</p>
        <div className="tc-empty__actions">
          <Link to="/shop" className="tc-btn tc-btn--primary">Shop the collection</Link>
          <Link to="/studio" className="tc-btn tc-btn--ghost">Design your own</Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <ul className="tc-ord">
        {orders.map((o) => (
          <li key={o.id} className={open === o.id ? 'is-open' : ''}>
            <button type="button" className="tc-ord__head" aria-expanded={open === o.id} onClick={() => setOpen(open === o.id ? null : o.id)}>
              <span className="tc-ord__thumb" aria-hidden="true">
                {o.hasPreview ? <img src={`/api/me/orders/${o.id}/preview`} alt="" loading="lazy" /> : <Icon name={o.kind === 'custom' ? 'palette' : 'bag'} size={22} />}
              </span>
              <span className="tc-ord__main">
                <strong>{o.id}</strong>
                <small>{formatWhen(o.created_at)}</small>
                <span className="tc-ord__sum">{o.summary}</span>
              </span>
              <span className="tc-ord__side">
                <span className={`tc-ord__status tc-ord__status--${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span>
                <span className="tc-ord__total">{formatPrice(o.total)}</span>
              </span>
            </button>
            {open === o.id && <OrderDetail id={o.id} email={email} onChanged={load} />}
          </li>
        ))}
      </ul>
      <p className="tc-note">Need help with an order? <Link to="/contact" className="tc-link">Contact us</Link> with the order number.</p>
    </>
  )
}

function OrderDetail({ id, email, onChanged }) {
  const [o, setO] = useState(null)
  const [error, setError] = useState('')

  const load = () =>
    api(`/api/me/orders/${id}`)
      .then(setO)
      .catch((e) => setError(e.message))
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (error) return <p className="tc-error tc-ord__body" role="alert">{error}</p>
  if (!o) return <p className="tc-note tc-ord__body">Loading…</p>

  return (
    <div className="tc-ord__body">
      <div className="tc-ord__cols">
        <section>
          <h2 className="tc-ord__h">Progress</h2>
          <OrderTimeline order={o} history={o.history} />
        </section>
        <section>
          <h2 className="tc-ord__h">Items</h2>
          {o.kind === 'shop' ? (
            <ul className="tc-ord__items">
              {o.items.map((it, i) => (
                <li key={i}>
                  <span>{it.name}<small>{it.colour} · {it.size} · Qty {it.qty}</small></span>
                  <em>{formatPrice(it.price * it.qty)}</em>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p className="tc-ord__line">
                {o.garment ? `${o.garment.fit === 'oversized' ? 'Oversized' : 'Regular fit'} tee · ${o.garment.gsm} GSM` : 'Custom tee'} · size {o.size} · Qty {o.quantity}
              </p>
              <ul className="tc-ord__items">
                {o.items.map((it, i) => (
                  <li key={i}>
                    <span>{it.type === 'text' ? `Text “${it.text}”` : `Image ${it.name || ''}`}<small>{PLACE[it.placement] || it.placement}</small></span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <dl className="tc-ord__sumlist">
            {o.shipping > 0 && <div><dt>Shipping</dt><dd>{formatPrice(o.shipping)}</dd></div>}
            <div className="tc-ord__grand"><dt>Total</dt><dd>{formatPrice(o.total)}</dd></div>
          </dl>
          <PayNow order={o} email={email} onPaid={() => { load(); onChanged?.() }} />
        </section>
      </div>
    </div>
  )
}

/* ───────── Profile ───────── */
function Profile() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({ name: user.name || '', phone: user.phone || '', address: user.address || '', city: user.city || '', state: user.state || 'Tamil Nadu', pincode: user.pincode || '' })
  const [status, setStatus] = useState('') // '' | saving | saved
  const [error, setError] = useState('')
  const set = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setStatus('')
  }

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setStatus('saving')
    try {
      const res = await api('/api/me', { method: 'PATCH', json: form })
      setUser(res.user)
      setStatus('saved')
    } catch (err) {
      setError(err.message)
      setStatus('')
    }
  }

  const field = (name, label, props = {}) => (
    <div className={`tc-formfield ${props.wide ? 'is-wide' : ''}`}>
      <label htmlFor={`p-${name}`}>{label}</label>
      <input id={`p-${name}`} name={name} className="tc-input" value={form[name]} onChange={set} {...props} />
    </div>
  )

  return (
    <form onSubmit={save} className="tc-me__profile" noValidate>
      <p className="tc-note">These details fill in your checkout automatically. Your email <strong>{user.email}</strong> is how your orders are matched to you, so it cannot be changed here.</p>
      <div className="tc-formgrid">
        {field('name', 'Full name', { autoComplete: 'name', wide: true })}
        {field('phone', 'Mobile number', { type: 'tel', inputMode: 'numeric', autoComplete: 'tel', wide: true })}
        {field('address', 'Delivery address', { autoComplete: 'street-address', wide: true, placeholder: 'House number, street, area' })}
        {field('city', 'City', { autoComplete: 'address-level2' })}
        <div className="tc-formfield">
          <label htmlFor="p-state">State</label>
          <div className="tc-select tc-select--field">
            <select id="p-state" name="state" value={form.state} onChange={set} autoComplete="address-level1">
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <Icon name="chevron-down" size={16} />
          </div>
        </div>
        {field('pincode', 'PIN code', { inputMode: 'numeric', maxLength: 6, autoComplete: 'postal-code' })}
      </div>
      {error && <p className="tc-error" role="alert">{error}</p>}
      <div className="tc-me__save">
        <button type="submit" className="tc-btn tc-btn--primary" disabled={status === 'saving'}>{status === 'saving' ? 'Saving…' : 'Save changes'}</button>
        {status === 'saved' && <span className="tc-acct__saved" role="status">Saved</span>}
      </div>
    </form>
  )
}

/* ───────── Password ───────── */
function PasswordCard() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({ current: '', password: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)
  const has = user.hasPassword

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setDone(false)
    if (form.password.length < 8) return setError('Use at least 8 characters.')
    setBusy(true)
    try {
      const res = await api('/api/me/password', { method: 'PATCH', json: { current: form.current, password: form.password } })
      setUser(res.user)
      setForm({ current: '', password: '' })
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="tc-me__profile tc-me__password" noValidate>
      <h2 className="tc-ord__h">{has ? 'Change password' : 'Add a password'}</h2>
      <p className="tc-note">
        {has
          ? 'Changing it signs you out on your other devices.'
          : 'Optional. With a password you can sign in without waiting for an emailed code. You can always still use a code.'}
      </p>
      {has && (
        <div className="tc-formfield">
          <label htmlFor="pw-current">Current password</label>
          <input id="pw-current" type={show ? 'text' : 'password'} className="tc-input" value={form.current} onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))} autoComplete="current-password" />
        </div>
      )}
      <div className="tc-formfield">
        <label htmlFor="pw-new">{has ? 'New password' : 'Password'}</label>
        <div className="tc-pwfield">
          <input id="pw-new" type={show ? 'text' : 'password'} className="tc-input" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} autoComplete="new-password" />
          <button type="button" className="tc-pwfield__toggle" onClick={() => setShow((v) => !v)} aria-pressed={show}>{show ? 'Hide' : 'Show'}</button>
        </div>
        <p className="tc-auth__fine">At least 8 characters.{has && ' Forgot the current one? Sign out and use “Forgot password?” on the sign-in page.'}</p>
      </div>
      {error && <p className="tc-error" role="alert">{error}</p>}
      <div className="tc-me__save">
        <button type="submit" className="tc-btn tc-btn--primary" disabled={busy}>{busy ? 'Saving…' : has ? 'Change password' : 'Save password'}</button>
        {done && <span className="tc-acct__saved" role="status">Password saved</span>}
      </div>
    </form>
  )
}
