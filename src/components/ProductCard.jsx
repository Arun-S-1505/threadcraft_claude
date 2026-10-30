import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './ui/Icon'
import ProductImage from './ui/ProductImage'
import { formatPrice } from '../data/products'
import { sizesFor, COLOURS } from '../../shared/designSpec'
import { useStore } from '../store/StoreContext'

export default function ProductCard({ product, hanger = false }) {
  const { addToCart, toggleWishlist, isWished } = useStore()
  const [pickSize, setPickSize] = useState(false)
  const wished = isWished(product.id)

  const quickAdd = (size) => {
    // quick add = the default: oversized, black (change fit and colour on the product page)
    addToCart({ productId: product.id, size, fit: 'oversized', color: COLOURS.black.hex, colorName: COLOURS.black.name })
    setPickSize(false)
  }

  return (
    <article className="tc-card" onMouseLeave={() => setPickSize(false)}>
      <div className="tc-card__media">
        <Link to={`/product/${product.slug}`} className="tc-card__link" aria-label={`View ${product.name}`}>
          <ProductImage product={product} hoverBack hanger={hanger} />
        </Link>

        {product.tag && <span className="tc-badge tc-card__tag">{product.tag}</span>}

        <button
          type="button"
          className={`tc-card__wish ${wished ? 'is-on' : ''}`}
          onClick={() => toggleWishlist(product.id)}
          aria-pressed={wished}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
        >
          <Icon name="heart" size={18} className={wished ? 'is-filled' : ''} />
        </button>

        <div className={`tc-card__quick ${pickSize ? 'is-open' : ''}`}>
          {pickSize ? (
            <div className="tc-card__sizes" role="group" aria-label="Choose a size">
              {sizesFor('oversized', COLOURS.black.hex).map((s) => (
                <button key={s} type="button" onClick={() => quickAdd(s)} className="tc-size tc-size--sm">
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <button type="button" className="tc-btn tc-btn--light tc-btn--block tc-btn--sm" onClick={() => setPickSize(true)}>
              Quick add
            </button>
          )}
        </div>
      </div>

      <div className="tc-card__body">
        <div className="tc-card__row">
          <h3 className="tc-card__name">
            <Link to={`/product/${product.slug}`}>{product.name}</Link>
          </h3>
          <p className="tc-card__price">From {formatPrice(product.fromPrice)}</p>
        </div>
        <p className="tc-card__meta">
          {product.collectionTitle} · Oversized or regular fit
        </p>
      </div>
    </article>
  )
}
