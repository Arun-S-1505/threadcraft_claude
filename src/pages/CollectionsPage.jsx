import { Link } from 'react-router-dom'
import Icon from '../components/ui/Icon'
import Garment from '../components/ui/Garment'
import Reveal from '../components/ui/Reveal'
import { COLLECTIONS, PRODUCTS } from '../data/products'

export default function CollectionsPage() {
  return (
    <div className="tc-page">
      <header className="tc-pagehead">
        <div className="tc-container">
          <nav className="tc-crumbs" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <Icon name="chevron-right" size={14} />
            <span aria-current="page">Collections</span>
          </nav>
          <h1 className="tc-h2 tc-h2--page">
            The <em>collections</em>
          </h1>
          <p className="tc-lead">Original artwork, grouped by mood. Every design is printed to order on heavyweight cotton.</p>
        </div>
      </header>

      <div className="tc-container tc-collections">
        {COLLECTIONS.map((c, i) => {
          const items = PRODUCTS.filter((p) => p.collection === c.slug)
          return (
            <Reveal key={c.slug} className={`tc-col ${i % 2 ? 'is-flip' : ''}`}>
              <Link to={`/shop?collection=${c.slug}`} className={`tc-col__art ${c.tone === 'dark' ? 'is-dark' : ''}`} style={{ '--tile': c.color }} aria-label={`Shop ${c.title}`}>
                <Garment type={c.garment} color={c.color} art={c.art} />
              </Link>
              <div className="tc-col__copy">
                <p className="tc-eyebrow">
                  Collection 0{i + 1} · {items.length} designs
                </p>
                <h2 className="tc-h2">{c.title}</h2>
                <p className="tc-lead">{c.blurb}</p>
                <ul className="tc-col__list">
                  {items.map((p) => (
                    <li key={p.id}>
                      <Link to={`/product/${p.slug}`}>
                        {p.name}
 
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link to={`/shop?collection=${c.slug}`} className="tc-btn tc-btn--primary">
                  Shop {c.title} 
                </Link>
              </div>
            </Reveal>
          )
        })}
      </div>
    </div>
  )
}
