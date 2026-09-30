import { useState } from 'react'
import { SITE } from '../config/site'

const OFFERS = [
  { title: 'Custom prints', text: 'Your logo or artwork, placed consistently across every piece in the order.' },
  { title: 'Consistent quality', text: `The same ${SITE.policy.fabricGsm} GSM combed cotton and print process as our own collections.` },
  { title: 'Sizing across teams', text: 'Full size run from S to XXL, with a size guide for your team to check.' },
  { title: 'Clear timelines', text: 'A quote and production schedule confirmed before anything is printed.' },
]

export default function BulkOrdersPage() {
  const [form, setForm] = useState({ company: '', contact: '', email: '', volume: '50 - 200 units', details: '' })
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const handleSubmit = (e) => {
    e.preventDefault()
    // TODO: send to your backend / email service. For now the request is confirmed on screen only.
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 5000)
  }

  return (
    <div className="tc-page">
      <header className="tc-pagehead">
        <div className="tc-container">
          <p className="tc-eyebrow">Bulk orders</p>
          <h1 className="tc-h2 tc-h2--page">Merchandise for teams and companies</h1>
          <p className="tc-lead">
            Uniforms, event tees and corporate gifting, printed at volume with your branding. Tell us what you need and we will send a quote.
          </p>
        </div>
      </header>

      <section className="tc-container tc-section tc-section--tight">
        <div className="tc-offers">
          {OFFERS.map((o) => (
            <div key={o.title} className="tc-offers__item">
              <h3>{o.title}</h3>
              <p>{o.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="tc-container tc-section tc-section--tight tc-contact tc-contact--bulk" id="quote-form">
        <div>
          <p className="tc-eyebrow">Request a quote</p>
          <h2 className="tc-h2">Tell us about your order</h2>
          <p className="tc-lead">Share a few details and we will get back to you with pricing and timelines.</p>
          <p className="tc-note">
            Prefer email? Write to <a className="tc-link" href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a>
          </p>
        </div>

        <div className="tc-contact__form">
          {submitted ? (
            <div className="tc-formdone" role="status">
              <h3>Request received</h3>
              <p>Thank you. We will review your details and reply by email.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="tc-formgrid">
              <div className="tc-formfield">
                <label htmlFor="company">Company name</label>
                <input id="company" name="company" value={form.company} onChange={handleChange} className="tc-input" type="text" required />
              </div>
              <div className="tc-formfield">
                <label htmlFor="contact">Contact person</label>
                <input id="contact" name="contact" value={form.contact} onChange={handleChange} className="tc-input" type="text" required />
              </div>
              <div className="tc-formfield">
                <label htmlFor="email">Email address</label>
                <input id="email" name="email" value={form.email} onChange={handleChange} className="tc-input" placeholder="work@company.com" type="email" required />
              </div>
              <div className="tc-formfield">
                <label htmlFor="volume">Estimated volume</label>
                <div className="tc-select tc-select--field">
                  <select id="volume" name="volume" value={form.volume} onChange={handleChange}>
                    <option>50 - 200 units</option>
                    <option>201 - 500 units</option>
                    <option>501 - 1000 units</option>
                    <option>1000+ units</option>
                  </select>
                </div>
              </div>
              <div className="tc-formfield is-wide">
                <label htmlFor="details">Project details</label>
                <textarea id="details" name="details" value={form.details} onChange={handleChange} className="tc-input" placeholder="Garments, colours, print placement, deadline…" rows={5} />
              </div>
              <div className="tc-formfield is-wide">
                <button className="tc-btn tc-btn--primary" type="submit">Submit request</button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
