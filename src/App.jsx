import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import CollectionsPage from './pages/CollectionsPage'
import ShopPage from './pages/ShopPage'
import ProductPage from './pages/ProductPage'
import StudioPage from './pages/StudioPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderConfirmationPage from './pages/OrderConfirmationPage'
import TrackOrderPage from './pages/TrackOrderPage'
import WishlistPage from './pages/WishlistPage'
import AdminPage from './pages/AdminPage'
import BulkOrdersPage from './pages/BulkOrdersPage'
import SustainabilityPage from './pages/SustainabilityPage'
import { ContactPage, PolicyPage, NotFoundPage } from './pages/InfoPages'

function App() {
  return (
    <Routes>
      {/* Pages with shared Navbar + Footer layout */}
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/product/:slug" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        {/* Customer accounts are not built: old account URLs go to order tracking */}
        {['/login', '/signup', '/orders', '/account', '/account/password'].map((p) => (
          <Route key={p} path={p} element={<Navigate to="/track-order" replace />} />
        ))}
        <Route path="/track-order" element={<TrackOrderPage />} />
        <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
        <Route path="/bulk-orders" element={<BulkOrdersPage />} />
        <Route path="/sustainability" element={<SustainabilityPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/policies/:slug" element={<PolicyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Studio has its own full-screen workspace */}
      <Route path="/studio" element={<StudioPage />} />

      {/* Owner area: protected by Cloudflare Access + server-side checks on /api/admin */}
      <Route path="/admin/*" element={<AdminPage />} />
    </Routes>
  )
}

export default App
