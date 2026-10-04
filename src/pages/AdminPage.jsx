import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import TShirt3D from '../components/TShirt3D'
import { api, apiUrl } from '../lib/api'
import { formatPrice } from '../data/products'
import { SHIRT_COLOURS, PRINT_LABEL } from '../../shared/designSpec'

/**
 * Owner-only area. The real protection is Cloudflare Access in front of this page plus the
 * server-side check on every /api/admin route; this screen just shows what the API returns.
 */
const STATUSES = ['new', 'paid', 'printing', 'shipped', 'delivered', 'cancelled']
const PLACE_LABEL = { front: 'Front', back: 'Back', left_sleeve: 'Left sleeve', right_sleeve: 'Right sleeve' }
const fmt = (iso) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
const fileUrl = (sha, download) => apiUrl(`/api/admin/files/${sha}${download ? '?download=1' : ''}`)

function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    document.title = 'Admin | ThreadCraft'
    return () => meta.remove()
  }, [])
}

export default function AdminPage() {
  useNoIndex()
  const [tab, setTab] = useState('orders') // orders | messages
  const [openId, setOpenId] = useState(null)
  const [denied, setDenied] = useState(false)

  if (denied) {
    return (
      <div className="ad ad--center">
        <h1>Access denied</h1>
        <p>This area is for the ThreadCraft owner. Sign in through your organisation login, then reload.</p>
        <Link to="/" className="tc-link">Back to the store</Link>
      </div>
    )
  }

  return (
    <div className="ad">
      <header className="ad__bar">
        <strong>ThreadCraft admin</strong>
        <nav>
          <button className={tab === 'orders' ? 'is-on' : ''} onClick={() => { setTab('orders'); setOpenId(null) }}>Orders</button>
          <button className={tab === 'messages' ? 'is-on' : ''} onClick={() => setTab('messages')}>Messages</button>
        </nav>
        <Link to="/" className="tc-link">View store</Link>
      </header>
      <main className="ad__main">
        {tab === 'messages' ? (
          <Messages onDenied={() => setDenied(true)} />
        ) : openId ? (
          <OrderDetail id={openId} onBack={() => setOpenId(null)} onDenied={() => setDenied(true)} />
        ) : (
          <OrderList onOpen={setOpenId} onDenied={() => setDenied(true)} />
        )}
      </main>
    </div>
  )
}

/* ───────── List ───────── */
function OrderList({ onOpen, onDenied }) {
  const [status, setStatus] = useState('')
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [backupMsg, setBackupMsg] = useState('')

  useEffect(() => {
    setOrders(null)
    api(`/api/admin/orders${status ? `?status=${status}` : ''}`)
      .then((d) => setOrders(d.orders))
      .catch((e) => (e.status === 403 ? onDenied() : setError(e.message)))
  }, [status, onDenied])

  const backup = async () => {
    setBackupMsg('Saving…')
    try {
      const r = await api(`/api/admin/backup?month=${month}`, { method: 'POST' })
      setBackupMsg(`Saved ${r.orders} orders and ${r.messages} messages for ${r.month} to storage.`)
    } catch (e) {
      setBackupMsg(e.message)
    }
  }

  return (
    <>
      <div className="ad__tools">
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <span className="ad__spacer" />
        <label>
          Month
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <a className="tc-btn tc-btn--ghost tc-btn--sm" href={apiUrl(`/api/admin/export?month=${month}&format=csv`)}>CSV</a>
        <a className="tc-btn tc-btn--ghost tc-btn--sm" href={apiUrl(`/api/admin/export?month=${month}&format=json`)}>JSON</a>
        <button className="tc-btn tc-btn--ghost tc-btn--sm" onClick={backup}>Back up to storage</button>
      </div>
      {backupMsg && <p className="ad__note">{backupMsg}</p>}
      {error && <p className="tc-error">{error}</p>}
      {!orders && !error && <p className="ad__note">Loading…</p>}
      {orders && orders.length === 0 && <p className="ad__note">No orders yet.</p>}
      {orders && orders.length > 0 && (
        <div className="ad__table" role="table">
          <div className="ad__row ad__row--head" role="row">
            <span>Order</span><span>Placed</span><span>Customer</span><span>Type</span><span>Total</span><span>Payment</span><span>Status</span>
          </div>
          {orders.map((o) => (
            <button key={o.id} className="ad__row" role="row" onClick={() => onOpen(o.id)}>
              <span>{o.id}</span>
              <span>{fmt(o.created_at)}</span>
              <span>{o.customer_name}</span>
              <span>{o.kind === 'custom' ? 'Custom' : 'Shop'}</span>
              <span>{formatPrice(o.total)}</span>
              <span>{o.payment_method} · {o.payment_status}</span>
              <span className={`ad__pill ad__pill--${o.status}`}>{o.status}</span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

/* ───────── Detail ───────── */
function OrderDetail({ id, onBack, onDenied }) {
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('new')
  const [tracking, setTracking] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [view, setView] = useState('front')

  const load = useCallback(() => {
    api(`/api/admin/orders/${id}`)
      .then((o) => { setOrder(o); setStatus(o.status); setTracking(o.tracking_no || '') })
      .catch((e) => (e.status === 403 ? onDenied() : setError(e.message)))
  }, [id, onDenied])
  useEffect(load, [load])

  // Rebuild the design list for the read-only 3D view from the SAVED spec:
  // text is shown from its frozen PNG, and each item keeps the transform stored at order time.
  const designList = useMemo(() => {
    if (order?.kind !== 'custom') return []
    return order.spec.items.map((it) => ({
      id: it.id,
      type: 'image',
      image: fileUrl(it.type === 'image' ? it.sha256 : it.rasterSha256),
      placement: it.placement,
      resolved: it.resolved,
    }))
  }, [order])

  const erase = async () => {
    const ok = window.confirm(`Permanently erase the name, contact details, address, design and all files for order ${id}? The amounts and status are kept. This cannot be undone.`)
    if (!ok) return
    try {
      const r = await api(`/api/admin/orders/${id}/personal-data`, { method: 'DELETE', json: { confirm: id } })
      setSaveMsg(`Erased. ${r.filesRemoved} file(s) removed.`)
      load()
    } catch (e) {
      setSaveMsg(e.message)
    }
  }

  const save = async () => {
    setSaving(true)
    setSaveMsg('')
    try {
      await api(`/api/admin/orders/${id}`, { method: 'PATCH', json: { status, trackingNo: tracking } })
      setSaveMsg('Saved')
      load()
    } catch (e) {
      setSaveMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (error) return <><button className="tc-link" onClick={onBack}>← All orders</button><p className="tc-error">{error}</p></>
  if (!order) return <p className="ad__note">Loading…</p>

  const erased = order.spec?.erased === true
  const isCustom = order.kind === 'custom' && !erased
  const spec = order.spec
  const viewOrder = Object.keys(PLACE_LABEL)
  const previews = order.files.filter((f) => f.kind === 'preview').sort((a, b) => viewOrder.indexOf(a.label) - viewOrder.indexOf(b.label))
  const originals = order.files.filter((f) => f.kind !== 'preview')

  return (
    <>
      <button className="tc-link ad__back" onClick={onBack}>← All orders</button>
      <div className="ad__head">
        <h1>{order.id}</h1>
        <span className={`ad__pill ad__pill--${order.status}`}>{order.status}</span>
        <span className="ad__muted">{order.kind === 'custom' ? 'Custom print' : 'Shop order'} · {fmt(order.created_at)}</span>
      </div>

      <div className="ad__grid">
        <section className="ad__card">
          <h2>Customer</h2>
          <p><strong>{order.customer_name}</strong></p>
          <p>{order.email}<br />{order.phone}</p>
          <p>{order.address}<br />{order.city} {order.pincode}</p>
          {order.notes && <p className="ad__muted">Notes: {order.notes}</p>}
        </section>

        <section className="ad__card">
          <h2>Payment</h2>
          <p>{order.payment_method} · <strong>{order.payment_status}</strong></p>
          <p>Total {formatPrice(order.total)}{order.shipping ? ` (incl. ${formatPrice(order.shipping)} shipping)` : ''}</p>
          {order.payment_id && <p className="ad__muted">Gateway payment: {order.payment_id}</p>}
        </section>

        <section className="ad__card">
          <h2>Update status</h2>
          <label>Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label>Tracking number {status === 'shipped' && '(required)'}
            <input className="tc-input" value={tracking} onChange={(e) => setTracking(e.target.value)} />
          </label>
          <button className="tc-btn tc-btn--primary tc-btn--sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          {saveMsg && <p className="ad__note" role="status">{saveMsg}</p>}
          {!erased && <button className="tc-btn tc-btn--ghost tc-btn--sm" onClick={erase}>Erase customer data</button>}
          {erased && <p className="ad__muted">Customer data was erased.</p>}
          <ul className="ad__history">
            {order.history.map((h, i) => <li key={i}>{fmt(h.at)} · {h.status}{h.tracking_no ? ` (${h.tracking_no})` : ''} · {h.actor}</li>)}
          </ul>
        </section>
      </div>

      {isCustom ? (
        <section className="ad__card ad__design">
          <h2>Design</h2>
          <p>
            {spec.garment.fit} tee, {spec.garment.gsm} GSM, {SHIRT_COLOURS[spec.garment.colour]} · size {order.size} · qty {order.quantity} · {PRINT_LABEL[spec.garment.printType] || spec.garment.printType.toUpperCase()}
          </p>

          <div className="ad__two">
            <div>
              <h3>Preview saved at order time</h3>
              <div className="ad__previews">
                {previews.map((f) => (
                  <figure key={f.sha256}>
                    <a href={fileUrl(f.sha256)} target="_blank" rel="noreferrer"><img src={fileUrl(f.sha256)} alt={`${PLACE_LABEL[f.label]} preview`} /></a>
                    <figcaption>{PLACE_LABEL[f.label]}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
            <div>
              <h3>Rebuilt from saved spec (read-only)</h3>
              <div className="ad__viewbtns">
                {Object.entries(PLACE_LABEL).map(([k, l]) => (
                  <button key={k} className={view === k ? 'is-on' : ''} onClick={() => setView(k)}>{l}</button>
                ))}
              </div>
              <div className="ad__3d">
                <TShirt3D color={spec.garment.colour} designList={designList} viewAngle={view} fit={spec.garment.fit} />
              </div>
            </div>
          </div>

          <h3>Print items</h3>
          <ul className="ad__items">
            {spec.items.map((it) => (
              <li key={it.id}>
                <strong>{PLACE_LABEL[it.placement]}</strong> ·{' '}
                {it.type === 'text' ? `Text “${it.text}” (${it.textFont}, ${it.textColor})` : `Image ${it.name}${it.width ? ` (${it.width}×${it.height}px)` : ''}`}
                {it.width && Math.max(it.width, it.height) < 1000 && <em className="ad__warn"> low resolution</em>}
              </li>
            ))}
          </ul>

          <h3>Files to print from</h3>
          <ul className="ad__files">
            {originals.map((f) => (
              <li key={f.sha256 + f.label}>
                {f.kind === 'original' ? 'Original upload' : 'Text (transparent PNG)'} · {(f.size / 1024).toFixed(0)} KB · {f.mime}
                <a href={fileUrl(f.sha256, true)}>Download</a>
              </li>
            ))}
          </ul>
        </section>
      ) : erased ? null : (
        <section className="ad__card">
          <h2>Items</h2>
          <ul className="ad__items">
            {spec.items.map((it, i) => (
              <li key={i}>{it.name} · {it.colour} · {it.size} · qty {it.qty} · {formatPrice(it.price * it.qty)}</li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

/* ───────── Messages ───────── */
function Messages({ onDenied }) {
  const [messages, setMessages] = useState(null)
  const [error, setError] = useState('')
  const load = useCallback(() => {
    api('/api/admin/messages')
      .then((d) => setMessages(d.messages))
      .catch((e) => (e.status === 403 ? onDenied() : setError(e.message)))
  }, [onDenied])
  useEffect(load, [load])

  const toggle = async (m) => {
    await api(`/api/admin/messages/${m.id}`, { method: 'PATCH', json: { handled: !m.handled } }).catch(() => {})
    load()
  }

  if (error) return <p className="tc-error">{error}</p>
  if (!messages) return <p className="ad__note">Loading…</p>
  if (messages.length === 0) return <p className="ad__note">No messages yet.</p>
  return (
    <ul className="ad__msgs">
      {messages.map((m) => (
        <li key={m.id} className={m.handled ? 'is-done' : ''}>
          <div className="ad__msghead">
            <strong>{m.kind === 'bulk' ? 'Bulk quote' : 'Message'} · {m.name}</strong>
            <a href={`mailto:${m.email}`} className="tc-link">{m.email}</a>
            <span className="ad__muted">{fmt(m.created_at)}</span>
            <button className="tc-btn tc-btn--ghost tc-btn--sm" onClick={() => toggle(m)}>{m.handled ? 'Reopen' : 'Mark handled'}</button>
          </div>
          {Object.entries(m.fields).filter(([, v]) => v).map(([k, v]) => <p key={k}><em>{k}:</em> {v}</p>)}
        </li>
      ))}
    </ul>
  )
}
