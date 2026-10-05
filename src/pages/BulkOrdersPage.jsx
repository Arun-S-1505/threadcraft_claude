import { useState } from 'react'
import { SITE } from '../config/site'
import { api } from '../lib/api'

const OFFERS = [
  { title: 'Custom prints', text: 'Your logo or artwork, placed consistently across every piece in the order.' },
  { title: 'Consistent quality', text: `The same cotton and print process as our own collections, in ${SITE.policy.gsmRegular} GSM regular fit or ${SITE.policy.gsmOversized} GSM oversized.` },
  { title: 'Sizing across teams', text: 'Sizes from S to XL, so everyone on the team gets a good fit.' },
  { title: 'Clear timelines', text: 'A quote and production schedule confirmed before anything is printed.' },
]

export default function BulkOrdersPage() {
  const [form, setForm] = useState({ company: '', contact: '', email: '', volume: '50 - 200 units', details: '', website: '' })
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      await api('/api/bulk', { method: 'POST', json: form })
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="tc-page">
      <section className="tc-container tc-contact tc-contact--bulk tc-contact--merged" id="quote-form">
        <div>
          <p className="tc-eyebrow">Bulk orders</p>
          <h1 className="tc-h2 tc-h2--page">Merchandise for teams and companies</h1>
          <p className="tc-lead">
            Uniforms, event tees and corporate gifting, printed at volume with your branding. Tell us what you need and we will reply with a quote and timeline.
          </p>
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
                <input name="website" value={form.website} onChange={handleChange} className="tc-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                <button className="tc-btn tc-btn--primary" type="submit" disabled={sending}>{sending ? 'Sending…' : 'Submit request'}</button>
                {error && <p className="tc-error" role="alert">{error}</p>}
              </div>
            </form>
          )}
        </div>
      </section>
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
    </div>
  )
}
