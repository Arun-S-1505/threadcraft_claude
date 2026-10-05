import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './ui/Icon'
import Garment from './ui/Garment'
import { COLLECTIONS, PRODUCTS, formatPrice } from '../data/products'

const SUGGESTIONS = ['Oversized', 'Regular', 'Automotive', 'Minimal', 'Anime']

export default function SearchOverlay({ open, onClose }) {
  const [q, setQ] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setQ('')
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return []
    return PRODUCTS.filter((p) =>
      [p.name, p.collectionTitle, p.typeLabel, p.category, ...p.colors.map((c) => c.name)].join(' ').toLowerCase().includes(term),
    ).slice(0, 6)
  }, [q])

  return (
    <div className={`tc-search ${open ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-label="Search" aria-hidden={!open}>
      <div className="tc-search__scrim" onClick={onClose} />
      <div className="tc-search__panel">
        <div className="tc-search__bar">
          <Icon name="search" size={22} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tees and collections…" aria-label="Search products" />
          <button className="tc-iconbtn" onClick={onClose} aria-label="Close search">
            <Icon name="x" size={22} />
          </button>
        </div>

        <div className="tc-search__body">
          {!q.trim() ? (
            <div>
              <p className="tc-search__label">Popular searches</p>
              <div className="tc-chips">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="tc-chip" onClick={() => setQ(s)}>
                    {s}
                  </button>
                ))}
              </div>
              <p className="tc-search__label">Collections</p>
              <div className="tc-search__cols">
                {COLLECTIONS.map((c) => (
                  <Link key={c.slug} to={`/shop?collection=${c.slug}`} onClick={onClose} className="tc-search__col">
                    {c.title} <Icon name="arrow-up-right" size={16} />
                  </Link>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="tc-search__none">
              <p>
                No results for “<strong>{q}</strong>”.
              </p>
              <Link to="/studio" onClick={onClose} className="tc-btn tc-btn--ghost tc-btn--sm">
                Can't find it? Design it yourself
              </Link>
            </div>
          ) : (
            <ul className="tc-search__results">
              {results.map((p) => (
                <li key={p.id}>
                  <Link to={`/product/${p.slug}`} onClick={onClose}>
                    <div className="tc-stage tc-stage--thumb">
                      <div className="tc-stage__layer">
                        <Garment type={p.type} color={p.colors[0].hex} art={p.art} />
                      </div>
                    </div>
                    <div>
                      <strong>{p.name}</strong>
                      <span>
                        {p.collectionTitle} · {p.typeLabel}
                      </span>
                    </div>
                    <em>{formatPrice(p.price)}</em>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
