import { Link } from 'react-router-dom'
import Icon from '../components/ui/Icon'
import Garment from '../components/ui/Garment'
import ProductCard from '../components/ProductCard'
import { PRODUCTS, formatPrice } from '../data/products'
import { SITE } from '../config/site'
import { useStore } from '../store/StoreContext'

export default function CartPage() {
  const { lines, count, subtotal, shipping, gstIncluded, total, updateQty, removeLine, freeShippingRemaining } = useStore()
  const threshold = SITE.policy.freeShippingThreshold
  const progress = Math.min(100, (subtotal / threshold) * 100)
  const inCart = new Set(lines.map((l) => l.productId))
  const suggestions = PRODUCTS.filter((p) => !inCart.has(p.id)).slice(0, 4)

  return (
    <div className="tc-page">
      <header className="tc-pagehead tc-pagehead--slim">
        <div className="tc-container">
          <h1 className="tc-h2 tc-h2--page">
            Your <em>bag</em>
          </h1>
          <p className="tc-lead">{count > 0 ? `${count} ${count === 1 ? 'item' : 'items'} ready for checkout` : 'Nothing here yet'}</p>
        </div>
      </header>

      <div className="tc-container">
        {lines.length === 0 ? (
          <div className="tc-empty tc-empty--page">
            <div className="tc-empty__icon">
 
            </div>
            <h3>Your bag is empty</h3>
            <p>Pick something from the collection, or design a piece that's entirely yours.</p>
            <div className="tc-empty__actions">
              <Link to="/shop" className="tc-btn tc-btn--primary">
                Shop the collection
              </Link>
              <Link to="/studio" className="tc-btn tc-btn--ghost">
                Open the studio
              </Link>
            </div>
          </div>
        ) : (
          <div className="tc-cart">
            <section aria-label="Items in your bag">
              <div className="tc-ship tc-ship--card">
                <p>
                  {freeShippingRemaining > 0 ? (
                    <>
                      Add <strong>{formatPrice(freeShippingRemaining)}</strong> more for free shipping
                    </>
                  ) : (
                    <>
 Your order qualifies for <strong>free shipping</strong>
                    </>
                  )}
                </p>
                <div className="tc-ship__bar">
                  <span style={{ width: `${progress}%` }} />
                </div>
              </div>

              <ul className="tc-lines tc-lines--page">
                {lines.map((l) => (
                  <li key={l.key} className="tc-line tc-line--page">
                    <Link to={`/product/${l.product.slug}`} className="tc-line__img">
                      <div className="tc-stage tc-stage--thumb">
                        <div className="tc-stage__layer">
                          <Garment type={l.product.type} color={l.color} art={l.product.art} />
                        </div>
                      </div>
                    </Link>
                    <div className="tc-line__info">
                      <div className="tc-line__top">
                        <div>
                          <Link to={`/product/${l.product.slug}`} className="tc-line__name">
                            {l.product.name}
                          </Link>
                          <p className="tc-line__var">
                            {l.colorName} · Size {l.size}
                          </p>
                          <p className="tc-line__var">{formatPrice(l.product.price)} each</p>
                        </div>
                        <p className="tc-line__price">{formatPrice(l.product.price * l.qty)}</p>
                      </div>
                      <div className="tc-line__bottom">
                        <div className="tc-qty" role="group" aria-label={`Quantity for ${l.product.name}`}>
                          <button onClick={() => updateQty(l.key, -1)} aria-label="Decrease quantity" disabled={l.qty <= 1}>
                            <Icon name="minus" size={14} />
                         </button>
                          <span>{l.qty}</span>
                          <button onClick={() => updateQty(l.key, 1)} aria-label="Increase quantity" disabled={l.qty >= 10}>
                            <Icon name="plus" size={14} />
                         </button>
                        </div>
                        <button className="tc-link tc-line__remove" onClick={() => removeLine(l.key)}>
 Remove
                       </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <Link to="/shop" className="tc-link tc-link--arrow tc-cart__continue">
 Continue shopping
              </Link>
            </section>

            <aside className="tc-summary" aria-label="Order summary">
              <h2>Order summary</h2>
              <dl>
                <div>
                  <dt>Subtotal</dt>
                  <dd>{formatPrice(subtotal)}</dd>
                </div>
                <div>
                  <dt>Shipping</dt>
                  <dd>{shipping === 0 ? 'Free' : formatPrice(shipping)}</dd>
                </div>
                <div className="tc-summary__muted">
                  <dt>GST included</dt>
                  <dd>{formatPrice(gstIncluded)}</dd>
                </div>
                <div className="tc-summary__total">
                  <dt>Total</dt>
                  <dd>{formatPrice(total)}</dd>
                </div>
              </dl>
              <Link to="/checkout" className="tc-btn tc-btn--primary tc-btn--block tc-btn--lg">
                Checkout 
              </Link>
              <ul className="tc-summary__trust">
                <li> Secure checkout</li>
                <li> Cash on delivery available</li>
                <li> {SITE.policy.returnDays}-day returns on stock items</li>
              </ul>
            </aside>
          </div>
        )}
      </div>

      <section className="tc-section tc-section--tight">
        <div className="tc-container">
          <div className="tc-head">
            <div>
              <p className="tc-eyebrow">Pairs well with</p>
              <h2 className="tc-h2">
                Add a <em>little more</em>
              </h2>
            </div>
          </div>
          <div className="tc-grid tc-grid--4">
            {suggestions.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
