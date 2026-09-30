import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Icon from '../components/ui/Icon'
import Reveal from '../components/ui/Reveal'
import ProductCard from '../components/ProductCard'
import { ALL_COLORS, CATEGORY_FILTERS, COLLECTIONS, PRODUCTS, getCollection } from '../data/products'

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name A–Z' },
]

export default function ShopPage() {
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const collection = params.get('collection') || 'all'
  const category = params.get('category') || 'All'
  const color = params.get('color') || ''
  const sort = params.get('sort') || 'featured'

  const set = (key, value, empty) => {
    const next = new URLSearchParams(params)
    if (!value || value === empty) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }
  const clearAll = () => setParams({}, { replace: true })

  const active = getCollection(collection)

  const items = useMemo(() => {
    let list = PRODUCTS.filter(
      (p) =>
        (collection === 'all' || p.collection === collection) &&
        (category === 'All' || p.category === category) &&
        (!color || p.colors.some((c) => c.hex === color)),
    )
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price)
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [collection, category, color, sort])

  const filtered = collection !== 'all' || category !== 'All' || color

  return (
    <div className="tc-page">
      <header className="tc-pagehead">
        <div className="tc-container">
          <nav className="tc-crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <Icon name="chevron-right" size={14} />
            <Link to="/shop" aria-current={!active ? 'page' : undefined}>Shop</Link>
            {active && (
              <>
                <Icon name="chevron-right" size={14} />
                <span aria-current="page">{active.title}</span>
              </>
            )}
          </nav>
          <h1 className="tc-h2 tc-h2--page">{active ? active.title : <>The <em>shop</em></>}</h1>
          <p className="tc-lead">{active ? active.blurb : 'Original designs on premium cotton. Every piece is printed to order.'}</p>
        </div>
      </header>

      <div className="tc-container">
        <div className="tc-toolbar">
          <div className="tc-chips" role="tablist" aria-label="Collection">
            <button className={`tc-chip ${collection === 'all' ? 'is-on' : ''}`} onClick={() => set('collection', 'all', 'all')}>All</button>
            {COLLECTIONS.map((c) => (
              <button key={c.slug} className={`tc-chip ${collection === c.slug ? 'is-on' : ''}`} onClick={() => set('collection', c.slug, 'all')}>
                {c.title}
             </button>
            ))}
          </div>
          <div className="tc-toolbar__right">
            <button className="tc-btn tc-btn--ghost tc-btn--sm tc-toolbar__filterbtn" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen}>
 Filters
           </button>
            <label className="tc-select">
              <span className="tc-sr">Sort by</span>
              <select value={sort} onChange={(e) => set('sort', e.target.value, 'featured')}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    Sort: {s.label}
                  </option>
                ))}
              </select>
              <Icon name="chevron-down" size={16} />
            </label>
          </div>
        </div>

        <div className="tc-shop">
          <aside className={`tc-filters ${filtersOpen ? 'is-open' : ''}`} aria-label="Filters">
            <div className="tc-filters__group">
              <h2>Category</h2>
              <ul>
                {CATEGORY_FILTERS.map((c) => (
                  <li key={c}>
                    <button className={category === c ? 'is-on' : ''} onClick={() => set('category', c, 'All')}>
                      <span className="tc-radio" /> {c}
                   </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="tc-filters__group">
              <h2>Colour</h2>
              <div className="tc-swatches tc-swatches--wrap">
                {ALL_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    className={`tc-swatch tc-swatch--lg ${color === c.hex ? 'is-active' : ''}`}
                    style={{ '--sw': c.hex }}
                    title={c.name}
                    aria-label={c.name}
                    aria-pressed={color === c.hex}
                    onClick={() => set('color', color === c.hex ? '' : c.hex, '')}
                  />
                ))}
              </div>
            </div>
            {filtered && (
              <button className="tc-link" onClick={clearAll}>
                Clear all filters
             </button>
            )}
            <div className="tc-filters__promo">
 
              <p>Don't see your idea? Design it in the studio.</p>
              <Link to="/studio" className="tc-link tc-link--arrow">
                Open studio 
              </Link>
            </div>
          </aside>

          <section aria-label="Products" className="tc-shop__main">
            <p className="tc-shop__count" aria-live="polite">
              {items.length} {items.length === 1 ? 'product' : 'products'}
            </p>
            {items.length === 0 ? (
              <div className="tc-empty tc-empty--page">
                <div className="tc-empty__icon">
                  
                </div>
                <h3>Nothing matches those filters</h3>
                <p>Try removing a filter, or design exactly what you want.</p>
                <div className="tc-empty__actions">
                  <button className="tc-btn tc-btn--primary" onClick={clearAll}>Clear filters</button>
                  <Link to="/studio" className="tc-btn tc-btn--ghost">Open the studio</Link>
                </div>
              </div>
            ) : (
              <div className="tc-grid tc-grid--3">
                {items.map((p, i) => (
                  <Reveal key={p.id} delay={(i % 3) * 70}>
                    <ProductCard product={p} />
                  </Reveal>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
