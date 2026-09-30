import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import SignUpPage from './pages/SignUpPage'
import LoginPage from './pages/LoginPage'
import CollectionsPage from './pages/CollectionsPage'
import ShopPage from './pages/ShopPage'
import ProductPage from './pages/ProductPage'
import StudioPage from './pages/StudioPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderConfirmationPage from './pages/OrderConfirmationPage'
import OrderHistoryPage from './pages/OrderHistoryPage'
import TrackOrderPage from './pages/TrackOrderPage'
import WishlistPage from './pages/WishlistPage'
import AccountProfilePage from './pages/AccountProfilePage'
import ChangePasswordPage from './pages/ChangePasswordPage'
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
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/orders" element={<OrderHistoryPage />} />
        <Route path="/track-order" element={<TrackOrderPage />} />
        <Route path="/account" element={<AccountProfilePage />} />
        <Route path="/account/password" element={<ChangePasswordPage />} />
        <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
        <Route path="/bulk-orders" element={<BulkOrdersPage />} />
        <Route path="/sustainability" element={<SustainabilityPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/policies/:slug" element={<PolicyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Studio has its own full-screen workspace */}
      <Route path="/studio" element={<StudioPage />} />
    </Routes>
  )
}

export default App
