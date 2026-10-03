import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import { getProduct } from '../data/products'
import { SITE } from '../config/site'

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

const TITLES = {
  '/': null,
  '/shop': 'Shop',
  '/collections': 'Collections',
  '/cart': 'Your bag',
  '/checkout': 'Checkout',
  '/wishlist': 'Wishlist',
  '/track-order': 'Track an order',
  '/order-confirmation': 'Order confirmation',
  '/bulk-orders': 'Bulk orders',
  '/sustainability': 'Our craft',
  '/contact': 'Contact',
}

/** Per-page browser tab title (helps search results and history). */
function usePageTitle(pathname) {
  useEffect(() => {
    let page = TITLES[pathname]
    if (pathname.startsWith('/product/')) page = getProduct(pathname.split('/')[2])?.name
    if (pathname.startsWith('/policies/')) page = 'Policies'
    document.title = page ? `${page} | ${SITE.name}` : `${SITE.name} | ${SITE.tagline.replace(/^./, (c) => c.toUpperCase())}`
  }, [pathname])
}

export default function Layout() {
  const { pathname } = useLocation()
  const homeHero = pathname === '/'
  usePageTitle(pathname)
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
