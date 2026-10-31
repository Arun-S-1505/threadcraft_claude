import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SITE } from '../config/site'
import { api } from '../lib/api'
import Icon from './ui/Icon'

const socials = [
  { key: 'instagram', icon: 'instagram', label: 'Instagram' },
  { key: 'facebook', icon: 'facebook', label: 'Facebook' },
  { key: 'youtube', icon: 'youtube', label: 'YouTube' },
]

export default function Footer() {
  const [email, setEmail] = useState('')
  const [joined, setJoined] = useState(false)

  const [failed, setFailed] = useState(false)

  // A signup is sent to the owner as a message (email + the admin Messages tab); there is no mailing-list service yet.
  const submit = async (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return
    setFailed(false)
    try {
      await api('/api/contact', { method: 'POST', json: { name: 'Newsletter signup', email, subject: 'Newsletter', message: 'Please add me to the newsletter.' } })
      setJoined(true)
    } catch {
      setFailed(true)
    }
  }

  const activeSocials = socials.filter((s) => SITE.social[s.key])

  return (
    <footer className="tc-footer">
      <div className="tc-container">
        <div className="tc-footer__grid">
          <div className="tc-footer__brand">
            <Link to="/" className="tc-brand" aria-label={`${SITE.name} home`}>
              <img src="/logo-mark.png" alt="" width="40" height="37" className="tc-brand__mark" />
              <span className="tc-brand__word">ThreadCraft</span>
            </Link>
            <p>Original collections and made-to-order custom prints, crafted in India on {SITE.policy.gsmRegular} GSM regular and {SITE.policy.gsmOversized} GSM oversized cotton.</p>
            {activeSocials.length > 0 && (
              <div className="tc-social">
                {activeSocials.map((s) => (
                  <a key={s.key} href={SITE.social[s.key]} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                    <Icon name={s.icon} size={20} />
                  </a>
                ))}
              </div>
            )}
          </div>

          <nav aria-label="Shop" className="tc-footer__col">
            <h3>Shop</h3>
            <Link to="/shop">All products</Link>
            <Link to="/shop?collection=automotive">Automotive</Link>
            <Link to="/shop?collection=minimal">Minimal</Link>
            <Link to="/shop?collection=anime">Anime</Link>
            <Link to="/shop?collection=streetwear">Streetwear</Link>
          </nav>

          <nav aria-label="Custom" className="tc-footer__col">
            <h3>Custom</h3>
            <Link to="/studio">Design studio</Link>
            <Link to="/bulk-orders">Bulk orders</Link>
            <Link to="/sustainability">Our craft</Link>
            <Link to="/track-order">Track an order</Link>
            <Link to="/account">My account</Link>
          </nav>

          <nav aria-label="Help" className="tc-footer__col">
            <h3>Help</h3>
            <Link to="/contact">Contact</Link>
            <Link to="/policies/shipping">Shipping</Link>
            <Link to="/policies/returns">Returns</Link>
            <Link to="/#faq">FAQ</Link>
          </nav>

          <div className="tc-footer__news">
            <h3>Newsletter</h3>
            <p>New collections and studio news, occasionally.</p>
            {joined ? (
              <p className="tc-footer__thanks">Thank you, you're subscribed.</p>
            ) : (
              <form onSubmit={submit} noValidate>
                <label htmlFor="footer-email" className="tc-sr">
                  Email address
                </label>
                <input id="footer-email" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                <button type="submit">Subscribe</button>
                {failed && <p className="tc-error" role="alert">Sorry, that did not go through. Please try again.</p>}
              </form>
            )}
          </div>
        </div>

        <div className="tc-footer__bottom">
          <p>
            © {new Date().getFullYear()} {SITE.name}. {SITE.contact.email}
          </p>
          <div className="tc-footer__legal">
            <Link to="/policies/privacy">Privacy</Link>
            <Link to="/policies/terms">Terms</Link>
            <Link to="/policies/shipping">Shipping</Link>
            <Link to="/policies/returns">Returns</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
