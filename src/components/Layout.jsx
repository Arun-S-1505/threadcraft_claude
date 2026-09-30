import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

/** Scroll to top on navigation, or to #hash target when present. */
function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        // wait a frame so lazily-rendered sections exist
        requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }))
        return
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
  }, [pathname, hash])
  return null
}

export default function Layout() {
  const { pathname } = useLocation()
  const homeHero = pathname === '/'
  return (
    <div className="tc-app">
      <a href="#main" className="tc-skip">
        Skip to content
      </a>
      <ScrollManager />
      <Navbar announcement />
      <main id="main" className={homeHero ? 'tc-main tc-main--hero' : 'tc-main'}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
