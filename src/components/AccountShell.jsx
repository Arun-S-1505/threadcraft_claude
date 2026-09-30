import { Link, NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/account', label: 'Profile', end: true },
  { to: '/orders', label: 'Orders' },
  { to: '/track-order', label: 'Track an order' },
  { to: '/wishlist', label: 'Wishlist' },
  { to: '/account/password', label: 'Password' },
]

/** Shared frame for signed-in pages: quiet side menu + content column. */
export default function AccountShell({ title, intro, children, action }) {
  return (
    <div className="tc-page">
      <header className="tc-pagehead">
        <div className="tc-container tc-acct__head">
          <div>
            <p className="tc-eyebrow">My account</p>
            <h1 className="tc-h2 tc-h2--page">{title}</h1>
            {intro && <p className="tc-lead">{intro}</p>}
          </div>
          {action}
        </div>
      </header>
      <div className="tc-container tc-acct">
        <nav className="tc-acct__nav" aria-label="Account">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'is-on' : '')}>
              {l.label}
            </NavLink>
          ))}
          <Link to="/studio">Design studio</Link>
        </nav>
        <div className="tc-acct__body">{children}</div>
      </div>
    </div>
  )
}
