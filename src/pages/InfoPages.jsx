import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Icon from '../components/ui/Icon'
import { SITE } from '../config/site'
import { formatPrice } from '../data/products'
import { api } from '../lib/api'

/* ───────── Contact ───────── */
export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', topic: 'Custom order', message: '', website: '' })
  const [status, setStatus] = useState('idle') // idle | sending | sent
  const [error, setError] = useState('')
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    setError('')
    try {
      await api('/api/contact', { method: 'POST', json: { name: form.name, email: form.email, subject: form.topic, message: form.message, website: form.website } })
      setStatus('sent')
      setForm({ name: '', email: '', topic: 'Custom order', message: '', website: '' })
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  const channels = [
    { icon: 'mail', title: 'Email', text: SITE.contact.email, href: `mailto:${SITE.contact.email}` },
    SITE.contact.whatsapp && { icon: 'whatsapp', title: 'WhatsApp', text: 'Chat with us', href: `https://wa.me/${SITE.contact.whatsapp}` },
    SITE.contact.phone && { icon: 'phone', title: 'Phone', text: SITE.contact.phone, href: `tel:${SITE.contact.phone}` },
    { icon: 'pin', title: 'Based in', text: SITE.contact.city },
  ].filter(Boolean)

  return (
    <div className="tc-page">
      <header className="tc-pagehead">
        <div className="tc-container">
          <h1 className="tc-h2 tc-h2--page">
            Get in <em>touch</em>
          </h1>
          <p className="tc-lead">Questions about an order, a custom print or a bulk quote? Send us a note and we'll get back to you.</p>
        </div>
      </header>
      <div className="tc-container tc-contact">
        <ul className="tc-contact__cards">
          {channels.map((c) => (
            <li key={c.title}>
              <h3>{c.title}</h3>
              {c.href ? <a href={c.href}>{c.text}</a> : <p>{c.text}</p>}
            </li>
          ))}
        </ul>

        <form className="tc-panel tc-contact__form" onSubmit={submit}>
          <div className="tc-panel__head">
            <h2>Send a message</h2>
          </div>
          <div className="tc-formgrid">
            <div className="tc-formfield">
              <label htmlFor="c-name">Your name</label>
              <input id="c-name" name="name" className="tc-input" value={form.name} onChange={set} required autoComplete="name" />
            </div>
            <div className="tc-formfield">
              <label htmlFor="c-email">Email</label>
              <input id="c-email" name="email" type="email" className="tc-input" value={form.email} onChange={set} required autoComplete="email" />
            </div>
            <div className="tc-formfield is-wide">
              <label htmlFor="c-topic">Topic</label>
              <div className="tc-select tc-select--field">
                <select id="c-topic" name="topic" value={form.topic} onChange={set}>
                  {['Custom order', 'Bulk / corporate', 'Existing order', 'Returns', 'Something else'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <Icon name="chevron-down" size={16} />
              </div>
            </div>
            <div className="tc-formfield is-wide">
              <label htmlFor="c-msg">Message</label>
              <textarea id="c-msg" name="message" rows="6" className="tc-input" value={form.message} onChange={set} required />
            </div>
          </div>
          {/* Honeypot: hidden from people, bots fill it in */}
          <input name="website" value={form.website} onChange={set} className="tc-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <button type="submit" className="tc-btn tc-btn--primary" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : 'Send message'}
          </button>
          {status === 'sent' && <p className="tc-note" role="status">Thank you. We have your message and will reply by email.</p>}
          {error && <p className="tc-error" role="alert">{error}</p>}
        </form>
      </div>
    </div>
  )
}

/* ───────── Policies ───────── */
const POLICIES = {
  shipping: {
    title: 'Shipping',
    intro: 'How and when your order reaches you.',
    sections: [
      ['Dispatch time', `Orders are printed and dispatched within ${SITE.policy.dispatchHours} hours of confirmation. Bulk and corporate orders are scheduled with you in advance.`],
      ['Shipping charges', `Shipping is free on orders above ${formatPrice(SITE.policy.freeShippingThreshold)}. Below that, a flat fee of ${formatPrice(SITE.policy.shippingFee)} applies.`],
      ['Delivery time', 'Delivery typically takes a few working days after dispatch depending on your location. You will receive tracking details by email once your order ships.'],
      ['Cash on delivery', 'Cash on delivery is available only for t-shirts bought from the collection. Custom studio orders are made to order and are always paid online in advance, and hoodies and polos are paid online as well.'],
    ],
  },
  returns: {
    title: 'Returns & exchanges',
    intro: 'Simple, fair and clearly written.',
    sections: [
      ['Stock items', `Unworn, unwashed items from the collection can be returned or exchanged within ${SITE.policy.returnDays} days of delivery, with tags and packaging intact.`],
      ['Custom-designed pieces', 'Because custom pieces are made specifically for you and cannot be resold to anyone else, they are not eligible for cash on delivery, and we cannot accept returns for change of mind. If your piece arrives damaged, misprinted or does not match your approved design, we will reprint or refund it at no cost.'],
      ['How to start a return', `Email ${SITE.contact.email} with your order number and a photo if the item is faulty. We will guide you through the next steps.`],
      ['Refunds', 'Approved refunds are issued to your original payment method. Cash-on-delivery refunds are sent by bank transfer.'],
    ],
  },
  privacy: {
    title: 'Privacy policy',
    intro: 'What we collect and why.',
    sections: [
      ['What we collect', 'Contact details, delivery address and order information you provide at checkout, and any artwork you upload to the studio.'],
      ['How we use it', 'To process and deliver your order, provide support, and, if you opt in, send you news about new drops. We do not sell your personal information.'],
      ['Your artwork', 'Artwork you upload is stored privately and used only to produce your order. It is not public and not shared. We keep the original file and a preview of your design with the order so it can be reprinted exactly, and delete it on request. Please only upload designs you own or have permission to print.'],
      ['Your choices', `You can ask us to access, correct or delete your information at any time by emailing ${SITE.contact.email}.`],
    ],
  },
  terms: {
    title: 'Terms of service',
    intro: 'The ground rules for using ThreadCraft.',
    sections: [
      ['Orders', 'An order is confirmed once payment is received (or, for t-shirts from the collection, a cash-on-delivery order is verified). Custom studio orders are never cash on delivery. We may cancel an order if an item is unavailable or a design cannot be printed as requested, and will refund you in full.'],
      ['Custom designs & IP', 'You are responsible for having the right to print any artwork, text or logos you submit. We may decline designs that infringe trademarks or copyright, or that contain unlawful or offensive content.'],
      ['Colours & print', 'Colours on screen may differ slightly from the printed result. Print placement is approved by you in the studio preview before checkout.'],
      ['Pricing', 'Prices are in Indian rupees and include applicable taxes unless stated otherwise.'],
    ],
  },
}

export function PolicyPage() {
  const { slug } = useParams()
  const policy = POLICIES[slug]
  if (!policy) return <NotFoundPage />
  return (
    <div className="tc-page">
      <header className="tc-pagehead">
        <div className="tc-container">
          <nav className="tc-crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <Icon name="chevron-right" size={14} />
            <span aria-current="page">{policy.title}</span>
          </nav>
          <h1 className="tc-h2 tc-h2--page">{policy.title}</h1>
          <p className="tc-lead">{policy.intro}</p>
        </div>
      </header>
      <div className="tc-container tc-policy">
        <nav className="tc-policy__nav" aria-label="Policies">
          {Object.entries(POLICIES).map(([key, p]) => (
            <Link key={key} to={`/policies/${key}`} className={key === slug ? 'is-on' : ''}>
              {p.title}
            </Link>
          ))}
        </nav>
        <article className="tc-policy__body">
          {policy.sections.map(([h, t]) => (
            <section key={h}>
              <h2>{h}</h2>
              <p>{t}</p>
            </section>
          ))}
          <p className="tc-policy__updated">Questions? Email <a href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a>.</p>
        </article>
      </div>
    </div>
  )
}

/* ───────── 404 ───────── */
export function NotFoundPage() {
  return (
    <div className="tc-page">
      <div className="tc-container">
        <div className="tc-empty tc-empty--page tc-404">
          <p className="tc-404__num">404</p>
          <h3>This thread came loose.</h3>
          <p>The page you're looking for doesn't exist or has moved.</p>
          <div className="tc-empty__actions">
            <Link to="/" className="tc-btn tc-btn--primary">
              Back to home
            </Link>
            <Link to="/shop" className="tc-btn tc-btn--ghost">
              Shop the collection
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
