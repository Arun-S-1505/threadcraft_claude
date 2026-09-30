import { Link } from 'react-router-dom'
import Icon from '../components/ui/Icon'
import ProductCard from '../components/ProductCard'
import { getProductById } from '../data/products'
import { useStore } from '../store/StoreContext'

export default function WishlistPage() {
  const { wishlist } = useStore()
  const items = wishlist.map(getProductById).filter(Boolean)

  return (
    <div className="tc-page">
      <header className="tc-pagehead tc-pagehead--slim">
        <div className="tc-container">
          <h1 className="tc-h2 tc-h2--page">
            Your <em>wishlist</em>
          </h1>
          <p className="tc-lead">{items.length > 0 ? `${items.length} ${items.length === 1 ? 'piece' : 'pieces'} saved for later.` : 'Save the pieces you love and come back to them any time.'}</p>
        </div>
      </header>
      <div className="tc-container tc-wish">
        {items.length === 0 ? (
          <div className="tc-empty tc-empty--page">
            <div className="tc-empty__icon">
              <Icon name="heart" size={32} />
            </div>
            <h3>Nothing saved yet</h3>
            <p>Tap the heart on any product to keep it here.</p>
            <div className="tc-empty__actions">
              <Link to="/shop" className="tc-btn tc-btn--primary">
                Browse the shop
              </Link>
            </div>
          </div>
        ) : (
          <div className="tc-grid tc-grid--4">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
