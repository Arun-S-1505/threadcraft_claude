import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import Icon from './ui/Icon'
import CartDrawer from './CartDrawer'
import SearchOverlay from './SearchOverlay'
import Toast from './ui/Toast'
import { NAV_LINKS, SITE } from '../config/site'
import { useStore } from '../store/StoreContext'
import { useScrolled } from '../hooks/useReveal'

/**
 * Global header.
 * `announcement` shows the scrolling promo strip (used by the storefront layout;
 * the Studio page renders <Navbar /> without it to keep its 80px offset).
 */
export default function Navbar({ announcement = false }) {
  const scrolled = useScrolled(announcement ? 36 : 8)
  const location = useLocation()
  const navigate = useNavigate()
  const { count, wishlist, openDrawer } = useStore()

  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const profileRef = useRef(null)

  const overDark = false

  useEffect(() => {
    const check = () => setLoggedIn(localStorage.getItem('isLoggedIn') === 'true')
    check()
    window.addEventListener('storage', check)
    return () => window.removeEventListener('storage', check)
  }, [location])

  useEffect(() => {
    setMenuOpen(false)
    setProfileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  useEffect(() => {
    const onDown = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setProfileOpen(false)
        setMenuOpen(false)
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const logout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('auth')
    setLoggedIn(false)
    setProfileOpen(false)
    navigate('/')
  }

  const ann = SITE.announcements
  const logoSrc = overDark ? '/logo-mark-light.png' : '/logo-mark.png'

  return (
    <>
      {announcement && (
        <div className="tc-ann" data-hidden={scrolled} role="region" aria-label="Store announcements">
          <div className="tc-ann__track">
            {[0, 1].map((dup) => (
              <ul key={dup} className="tc-ann__list" aria-hidden={dup === 1}>
                {ann.map((t) => (
                  <li key={t + dup}>
                    <Icon name="needle" size={14} /> {t}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      )}

      <header className="tc-nav" data-scrolled={scrolled} data-dark={overDark} data-ann={announcement}>
        <div className="tc-nav__inner">
          <button className="tc-iconbtn tc-nav__burger" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
            <Icon name="menu" size={22} />
          </button>

          <Link to="/" className="tc-brand" aria-label={`${SITE.name} home`}>
            <img src={logoSrc} alt="" className="tc-brand__mark" width="44" height="41" />
            <span className="tc-brand__word">ThreadCraft</span>
          </Link>

          <nav className="tc-nav__links" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `tc-nav__link ${isActive ? 'is-active' : ''}`}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="tc-nav__actions">
            <button className="tc-iconbtn tc-nav__search" aria-label="Search (Ctrl K)" onClick={() => setSearchOpen(true)}>
              <Icon name="search" size={20} />
            </button>
            <Link to="/wishlist" className="tc-iconbtn tc-nav__wish" aria-label={`Wishlist, ${wishlist.length} items`}>
              <Icon name="heart" size={20} />
              {wishlist.length > 0 && <span className="tc-count">{wishlist.length}</span>}
            </Link>

            <div className="tc-profile" ref={profileRef}>
              <button className="tc-iconbtn" aria-label="Account" aria-expanded={profileOpen} onClick={() => setProfileOpen((v) => !v)}>
                <Icon name="user" size={20} />
              </button>
              {profileOpen && (
                <div className="tc-menu" role="menu">
                  {loggedIn ? (
                    <>
                      <Link role="menuitem" to="/account">Profile</Link>
                      <Link role="menuitem" to="/orders">Orders</Link>
                      <Link role="menuitem" to="/wishlist">Wishlist{wishlist.length > 0 ? ` (${wishlist.length})` : ''}</Link>
                      <Link role="menuitem" to="/track-order">Track an order</Link>
                      <button role="menuitem" onClick={logout}>Log out</button>
                    </>
                  ) : (
                    <>
                      <Link role="menuitem" to="/login">Log in</Link>
                      <Link role="menuitem" to="/signup">Create account</Link>
                      <Link role="menuitem" to="/wishlist">Wishlist{wishlist.length > 0 ? ` (${wishlist.length})` : ''}</Link>
                      <Link role="menuitem" to="/track-order">Track an order</Link>
                    </>
                  )}
                </div>
              )}
            </div>

            <button className="tc-iconbtn tc-nav__bag" aria-label={`Open bag, ${count} items`} onClick={openDrawer}>
              <Icon name="bag" size={20} />
              {count > 0 && <span className="tc-count">{count}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <div className={`tc-mobile ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
        <div className="tc-mobile__top">
          <Link to="/" className="tc-brand">
            <img src="/logo-mark.png" alt="" className="tc-brand__mark" width="40" height="37" />
            <span className="tc-brand__word">ThreadCraft</span>
          </Link>
          <button className="tc-iconbtn" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            <Icon name="x" size={24} />
          </button>
        </div>
        <nav className="tc-mobile__links" aria-label="Mobile">
          {NAV_LINKS.map((l) => (
            <Link key={l.to} to={l.to}>{l.label}</Link>
          ))}
          <Link to="/wishlist">Wishlist</Link>
          <Link to={loggedIn ? '/account' : '/login'}>{loggedIn ? 'My account' : 'Log in / Sign up'}</Link>
        </nav>
        <div className="tc-mobile__foot">
          <p>{SITE.contact.email}</p>
        </div>
      </div>

      <CartDrawer />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Toast />
    </>
  )
}
