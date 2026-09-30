import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Icon from './ui/Icon'
import Garment from './ui/Garment'
import { formatPrice } from '../data/products'
import { SITE } from '../config/site'
import { useStore } from '../store/StoreContext'

export default function CartDrawer() {
  const { drawerOpen, closeDrawer, lines, subtotal, count, updateQty, removeLine, freeShippingRemaining } = useStore()

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e) => e.key === 'Escape' && closeDrawer()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [drawerOpen, closeDrawer])

  const threshold = SITE.policy.freeShippingThreshold
  const progress = Math.min(100, (subtotal / threshold) * 100)

  return (
    <>
      <div className={`tc-scrim ${drawerOpen ? 'is-open' : ''}`} onClick={closeDrawer} aria-hidden="true" />
      <aside className={`tc-drawer ${drawerOpen ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-label="Shopping bag" aria-hidden={!drawerOpen}>
        <header className="tc-drawer__head">
          <h2>
            Your bag <span>({count})</span>
          </h2>
          <button className="tc-iconbtn" onClick={closeDrawer} aria-label="Close bag">
            <Icon name="x" size={22} />
         </button>
        </header>

        {lines.length > 0 && (
          <div className="tc-ship">
            <p>
              {freeShippingRemaining > 0 ? (
                <>
                  You're <strong>{formatPrice(freeShippingRemaining)}</strong> away from free shipping
                </>
              ) : (
                <>
 You've unlocked <strong>free shipping</strong>
                </>
              )}
            </p>
            <div className="tc-ship__bar">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="tc-drawer__body">
          {lines.length === 0 ? (
            <div className="tc-empty">
              <div className="tc-empty__icon">
 
              </div>
              <h3>Your bag is empty</h3>
              <p>Pick a piece from the collection, or design one of your own.</p>
              <div className="tc-empty__actions">
                <Link to="/shop" className="tc-btn tc-btn--primary" onClick={closeDrawer}>
                  Shop the collection
                </Link>
                <Link to="/studio" className="tc-btn tc-btn--ghost" onClick={closeDrawer}>
                  Open the studio
                </Link>
              </div>
            </div>
          ) : (
            <ul className="tc-lines">
              {lines.map((l) => (
                <li key={l.key} className="tc-line">
                  <Link to={`/product/${l.product.slug}`} onClick={closeDrawer} className="tc-line__img">
                    <div className="tc-stage tc-stage--thumb">
                      <div className="tc-stage__layer">
                        <Garment type={l.product.type} color={l.color} art={l.product.art} />
                      </div>
                    </div>
                  </Link>
                  <div className="tc-line__info">
                    <div className="tc-line__top">
                      <div>
                        <p className="tc-line__name">{l.product.name}</p>
                        <p className="tc-line__var">
                          {l.colorName} · Size {l.size}
                        </p>
                      </div>
                      <p className="tc-line__price">{formatPrice(l.product.price * l.qty)}</p>
                    </div>
                    <div className="tc-line__bottom">
                      <div className="tc-qty" role="group" aria-label="Quantity">
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
          )}
        </div>

        {lines.length > 0 && (
          <footer className="tc-drawer__foot">
            <div className="tc-drawer__sub">
              <span>Subtotal</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <p className="tc-drawer__note">Taxes included. Shipping calculated at checkout.</p>
            <Link to="/checkout" className="tc-btn tc-btn--primary tc-btn--block" onClick={closeDrawer}>
              Checkout 
            </Link>
            <Link to="/cart" className="tc-btn tc-btn--ghost tc-btn--block" onClick={closeDrawer}>
              View full bag
            </Link>
          </footer>
        )}
      </aside>
    </>
  )
}
