import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/ui/Icon'
import Garment from '../components/ui/Garment'
import Reveal from '../components/ui/Reveal'
import ProductCard from '../components/ProductCard'
import { SIZES, SIZE_GUIDE, formatPrice, getProduct, relatedProducts } from '../data/products'
import { SITE } from '../config/site'
import { useStore } from '../store/StoreContext'
import { NotFoundPage } from './InfoPages'

const VIEWS = [
  { id: 'front', label: 'Front' },
  { id: 'back', label: 'Back' },
  { id: 'detail', label: 'Print detail' },
]

function SizeGuide({ onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="tc-modal" role="dialog" aria-modal="true" aria-label="Size guide">
      <div className="tc-modal__scrim" onClick={onClose} />
      <div className="tc-modal__card">
        <header>
          <h2>Size guide</h2>
          <button className="tc-iconbtn" onClick={onClose} aria-label="Close size guide">
            <Icon name="x" size={22} />
         </button>
        </header>
        <p>Garment measurements in inches, laid flat. If you're between sizes, size up for a relaxed fit.</p>
        <table className="tc-table">
          <thead>
            <tr>
              <th>Size</th>
              <th>Chest</th>
              <th>Length</th>
            </tr>
          </thead>
          <tbody>
            {SIZE_GUIDE.map((r) => (
              <tr key={r.size}>
                <td>{r.size}</td>
                <td>{r.chest}"</td>
                <td>{r.length}"</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="tc-modal__tip">
 Measure a tee you already love, laid flat from armpit to armpit, and compare it with the chest column.
        </p>
      </div>
    </div>
  )
}

export default function ProductPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const product = getProduct(slug)
  const { addToCart, toggleWishlist, isWished } = useStore()

  const [color, setColor] = useState(null)
  const [size, setSize] = useState(null)
  const [qty, setQty] = useState(1)
  const [view, setView] = useState('front')
  const [error, setError] = useState(false)
  const [guide, setGuide] = useState(false)
  const [open, setOpen] = useState('details')

  useEffect(() => {
    setColor(null)
    setSize(null)
    setQty(1)
    setView('front')
    setError(false)
  }, [slug])

  if (!product) return <NotFoundPage />

  const chosen = color || product.colors[0]
  const wished = isWished(product.id)
  const related = relatedProducts(product, 4)

  const add = (goCheckout = false) => {
    if (!size) {
      setError(true)
      document.getElementById('size-group')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    addToCart({ productId: product.id, size, color: chosen.hex, colorName: chosen.name, qty }, { openDrawer: !goCheckout })
    if (goCheckout) navigate('/checkout')
  }

  const accordion = [
    {
      id: 'details',
      title: 'Details & fabric',
      body: (
        <ul className="tc-bullets">
          {(product.type === 'tee' || product.type === 'oversized') && (
            <li>{product.type === 'oversized' ? SITE.policy.gsmOversized : SITE.policy.gsmRegular} GSM, 100% cotton</li>
          )}
          <li>{product.type === 'oversized' ? 'Boxy oversized fit with dropped shoulders' : product.type === 'hoodie' ? 'Heavyweight fleece, ribbed cuffs and hem' : product.type === 'polo' ? 'Classic polo collar and placket' : 'Regular fit, ribbed crew neck'}</li>
          <li>{product.art ? 'High-resolution direct-to-garment print' : 'Blank garment, ready for your design in the studio'}</li>
          <li>Printed to order in India</li>
        </ul>
      ),
    },
    {
      id: 'ship',
      title: 'Shipping & returns',
      body: (
        <p>
          Dispatched within {SITE.policy.dispatchHours} hours. Free shipping over {formatPrice(SITE.policy.freeShippingThreshold)}, otherwise {formatPrice(SITE.policy.shippingFee)}. Cash on delivery is available on eligible pin codes. Unworn stock items can be returned within {SITE.policy.returnDays} days.{' '}
          <Link to="/policies/returns" className="tc-link">Read the full policy</Link>.
        </p>
      ),
    },
    {
      id: 'care',
      title: 'Care',
      body: <p>Machine wash cold, inside out, with similar colours. Tumble dry low or hang dry. Do not iron directly on the print. Do not bleach.</p>,
    },
  ]

  return (
    <div className="tc-page">
      <div className="tc-container">
        <nav className="tc-crumbs tc-crumbs--pdp" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <Icon name="chevron-right" size={14} />
          <Link to="/shop">Shop</Link>
          <Icon name="chevron-right" size={14} />
          <Link to={`/shop?collection=${product.collection}`}>{product.collectionTitle}</Link>
          <Icon name="chevron-right" size={14} />
          <span aria-current="page">{product.name}</span>
        </nav>

        <div className="tc-pdp">
          {/* Gallery */}
          <div className="tc-gallery">
            <ul className="tc-gallery__thumbs" aria-label="Product views">
              {VIEWS.map((v) => (
                <li key={v.id}>
                  <button className={view === v.id ? 'is-on' : ''} onClick={() => setView(v.id)} aria-label={v.label} aria-pressed={view === v.id}>
                    <div className={`tc-stage tc-stage--thumb ${v.id === 'detail' ? 'tc-stage--detail' : ''}`}>
                      <div className="tc-stage__layer">
                        <Garment type={product.type} color={chosen.hex} art={product.art} view={v.id === 'back' ? 'back' : 'front'} />
                      </div>
                    </div>
                 </button>
                </li>
              ))}
            </ul>
            <div className={`tc-gallery__main tc-stage ${view === 'detail' ? 'tc-stage--detail' : ''}`}>
              {product.tag && <span className="tc-badge tc-card__tag">{product.tag}</span>}
              <div className="tc-stage__layer" key={`${view}-${chosen.hex}`}>
                <Garment type={product.type} color={chosen.hex} art={product.art} view={view === 'back' ? 'back' : 'front'} title={`${product.name} in ${chosen.name}, ${view} view`} />
              </div>
            </div>
          </div>

          {/* Buy box */}
          <div className="tc-buy">
            <p className="tc-eyebrow">
              <Link to={`/shop?collection=${product.collection}`}>{product.collectionTitle}</Link> · {product.typeLabel}
            </p>
            <h1 className="tc-buy__title">{product.name}</h1>
            <p className="tc-buy__price">
              {formatPrice(product.price)} <span>Inclusive of all taxes</span>
            </p>
            <p className="tc-buy__blurb">{product.blurb}</p>

            <div className="tc-field">
              <div className="tc-field__label">
                <span>Colour</span>
                <strong>{chosen.name}</strong>
              </div>
              <div className="tc-swatches tc-swatches--wrap">
                {product.colors.map((c) => (
                  <button
                    key={c.hex}
                    className={`tc-swatch tc-swatch--xl ${chosen.hex === c.hex ? 'is-active' : ''}`}
                    style={{ '--sw': c.hex }}
                    title={c.name}
                    aria-label={c.name}
                    aria-pressed={chosen.hex === c.hex}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>

            <div className="tc-field" id="size-group">
              <div className="tc-field__label">
                <span>Size</span>
                <button className="tc-link" onClick={() => setGuide(true)}>
 Size guide
               </button>
              </div>
              <div className={`tc-sizes ${error ? 'is-error' : ''}`} role="group" aria-label="Size">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    className={`tc-size ${size === s ? 'is-on' : ''}`}
                    aria-pressed={size === s}
                    onClick={() => {
                      setSize(s)
                      setError(false)
                    }}
                  >
                    {s}
                 </button>
                ))}
              </div>
              {error && (
                <p className="tc-error" role="alert">
                  Please choose a size to continue.
                </p>
              )}
            </div>

            <div className="tc-buy__actions">
              <div className="tc-qty tc-qty--lg" role="group" aria-label="Quantity">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" disabled={qty <= 1}>
                  <Icon name="minus" size={16} />
               </button>
                <span>{qty}</span>
                <button onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Increase quantity" disabled={qty >= 10}>
                  <Icon name="plus" size={16} />
               </button>
              </div>
              <button className="tc-btn tc-btn--primary tc-btn--lg tc-buy__add" onClick={() => add(false)}>
 Add to bag · {formatPrice(product.price * qty)}
             </button>
              <button
                className={`tc-iconbtn tc-iconbtn--boxed ${wished ? 'is-on' : ''}`}
                onClick={() => toggleWishlist(product.id)}
                aria-pressed={wished}
                aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                <Icon name="heart" size={20} className={wished ? 'is-filled' : ''} />
             </button>
            </div>
            <button className="tc-btn tc-btn--ghost tc-btn--block" onClick={() => add(true)}>
              Buy it now
           </button>

            <ul className="tc-perks">
              <li> <span>Dispatched in {SITE.policy.dispatchHours} hours<small>Free over {formatPrice(SITE.policy.freeShippingThreshold)}</small></span></li>
              <li> <span>Cash on delivery<small>On eligible pin codes</small></span></li>
              <li> <span>{SITE.policy.returnDays}-day returns<small>On unworn stock items</small></span></li>
            </ul>

            <div className="tc-acc tc-acc--compact">
              {accordion.map((a) => (
                <div key={a.id} className={`tc-acc__item ${open === a.id ? 'is-open' : ''}`}>
                  <h2>
                    <button aria-expanded={open === a.id} onClick={() => setOpen(open === a.id ? '' : a.id)}>
                      {a.title}
                      <span className="tc-acc__sign" aria-hidden="true" />
                   </button>
                  </h2>
                  <div className="tc-acc__panel">
                    <div>{a.body}</div>
                  </div>
                </div>
              ))}
            </div>

            <Link to="/studio" className="tc-callout">
 
              <span>
                <strong>Want your own design on this?</strong>
                <small>Open the studio and print anything you like.</small>
              </span>
 
            </Link>
          </div>
        </div>
      </div>

      <section className="tc-section tc-section--tight">
        <div className="tc-container">
          <Reveal className="tc-head">
            <div>
              <p className="tc-eyebrow">Complete the look</p>
              <h2 className="tc-h2">
                You may also <em>like</em>
              </h2>
            </div>
          </Reveal>
          <div className="tc-grid tc-grid--4">
            {related.map((p, i) => (
              <Reveal key={p.id} delay={i * 70}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Sticky mobile buy bar */}
      <div className="tc-stickybuy">
        <div>
          <strong>{product.name}</strong>
          <span>{formatPrice(product.price)}</span>
        </div>
        <button className="tc-btn tc-btn--primary tc-btn--sm" onClick={() => add(false)}>
          Add to bag
       </button>
      </div>

      {guide && <SizeGuide onClose={() => setGuide(false)} />}
    </div>
  )
}
