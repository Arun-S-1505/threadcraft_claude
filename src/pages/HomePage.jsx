import { useState } from 'react'
import { Link } from 'react-router-dom'
import Garment from '../components/ui/Garment'
import ProductCard from '../components/ProductCard'
import { COLLECTIONS, PRODUCTS, COLOR_LIB } from '../data/products'
import { SITE } from '../config/site'

/* ───────── Hero ───────── */
function Hero() {
  return (
    <section className="tc-hero" aria-label="Introduction">
      <div className="tc-container tc-hero__grid">
        <div className="tc-hero__copy">
          <p className="tc-eyebrow">Custom printed apparel</p>
          <h1 className="tc-h1">Considered clothing, printed to order.</h1>
          <p className="tc-lead">
            Original collections and a print studio for your own designs. {SITE.policy.fabricGsm} GSM combed cotton, made in India.
          </p>
          <div className="tc-hero__cta">
            <Link to="/shop" className="tc-btn tc-btn--primary tc-btn--lg">Shop the collection</Link>
            <Link to="/studio" className="tc-btn tc-btn--ghost tc-btn--lg">Design your own</Link>
          </div>
        </div>
        <div className="tc-hero__visual">
          <div className="tc-hero__panel">
            <Garment type="tee" color={COLOR_LIB.onyx.hex} art="needle" title="ThreadCraft signature tee" />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ───────── Collections ───────── */
function CollectionTiles() {
  return (
    <section className="tc-section tc-section--tight" aria-labelledby="col-h">
      <div className="tc-container">
        <div className="tc-head">
          <div>
            <p className="tc-eyebrow">Collections</p>
            <h2 className="tc-h2" id="col-h">Shop by collection</h2>
          </div>
          <Link to="/collections" className="tc-link">View all</Link>
        </div>
        <div className="tc-tiles">
          {COLLECTIONS.map((c) => (
            <Link key={c.slug} to={`/shop?collection=${c.slug}`} className="tc-tile" aria-label={`Shop the ${c.title} collection`}>
              <div className="tc-tile__art" style={{ '--tile': c.color }}>
                <Garment type={c.garment} color={c.color} art={c.art} />
              </div>
              <div className="tc-tile__copy">
                <h3>{c.title}</h3>
                <span>{PRODUCTS.filter((p) => p.collection === c.slug).length} designs</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────── New arrivals ───────── */
function NewArrivals() {
  const picks = [
    ...PRODUCTS.filter((p) => p.tag === 'New'),
    ...PRODUCTS.filter((p) => p.tag !== 'New'),
  ].slice(0, 4)
  return (
    <section className="tc-section tc-section--tight" id="new" aria-labelledby="new-h">
      <div className="tc-container">
        <div className="tc-head">
          <div>
            <p className="tc-eyebrow">New</p>
            <h2 className="tc-h2" id="new-h">New arrivals</h2>
          </div>
          <Link to="/shop" className="tc-link">Shop all</Link>
        </div>
        <div className="tc-grid tc-grid--4">
          {picks.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────── Custom studio ───────── */
const STEPS = [
  { title: 'Choose a garment', text: 'Tee, oversized, hoodie or polo, in every colour we stock.' },
  { title: 'Add your artwork', text: 'Upload an image or set your own text, then place and scale it.' },
  { title: 'Preview in 3D', text: 'Turn the garment around and check every placement before you pay.' },
  { title: 'We print and ship', text: `Printed and dispatched within ${SITE.policy.dispatchHours} hours of your order.` },
]

function StudioSection() {
  return (
    <section className="tc-studio" aria-labelledby="studio-h">
      <div className="tc-container tc-studio__grid">
        <div className="tc-studio__art" aria-hidden="true">
          <Garment type="oversized" color={COLOR_LIB.bone.hex} art="wordmark" />
        </div>
        <div className="tc-studio__copy">
          <p className="tc-eyebrow">Custom studio</p>
          <h2 className="tc-h2" id="studio-h">Bring your own design</h2>
          <p className="tc-lead">A single piece for yourself, or a run for your team. No minimum order and no design skills needed.</p>
          <ol className="tc-steps">
            {STEPS.map((s, idx) => (
              <li key={s.title}>
                <span>0{idx + 1}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="tc-studio__cta">
            <Link to="/studio" className="tc-btn tc-btn--primary">Open the studio</Link>
            <Link to="/bulk-orders" className="tc-link">Ordering for a team?</Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ───────── Why ThreadCraft ───────── */
const WHY = [
  { title: 'Fabric', text: `${SITE.policy.fabricGsm} GSM, 100% combed cotton with a structured drape.` },
  { title: 'Printing', text: 'High-resolution digital printing for vivid, durable colour.' },
  { title: 'Dispatch', text: `Custom pieces are printed and shipped within ${SITE.policy.dispatchHours} hours.` },
  { title: 'Returns', text: `${SITE.policy.returnDays}-day returns on stock items. Free reprint if we get a custom print wrong.` },
]

function Why() {
  return (
    <section className="tc-section tc-section--tight tc-why" aria-label="Why ThreadCraft">
      <div className="tc-container">
        <div className="tc-why__grid">
          {WHY.map((w) => (
            <div key={w.title} className="tc-why__item">
              <h3>{w.title}</h3>
              <p>{w.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────── Bulk banner ───────── */
function BulkBanner() {
  return (
    <section className="tc-section tc-section--tight">
      <div className="tc-container">
        <div className="tc-bulk">
          <div>
            <p className="tc-eyebrow">Teams, clubs and companies</p>
            <h2 className="tc-h2">Merchandise for your organisation</h2>
            <p className="tc-lead">Uniforms, event tees and corporate gifting, printed consistently at volume with your logo and colours.</p>
          </div>
          <div className="tc-bulk__actions">
            <Link to="/bulk-orders" className="tc-btn tc-btn--primary">Request a quote</Link>
            <a className="tc-link" href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ───────── FAQ ───────── */
const FAQS = [
  {
    q: 'How long does a custom print take?',
    a: `Custom pieces are printed and dispatched within ${SITE.policy.dispatchHours} hours of your order being confirmed. Delivery time depends on your location, and you'll get tracking as soon as it ships.`,
  },
  {
    q: 'What file should I upload for my design?',
    a: 'A PNG with a transparent background at 300 DPI gives the sharpest result. JPG and SVG files also work. If your artwork is low resolution, we will let you know before printing.',
  },
  {
    q: 'Is there a minimum order for custom prints?',
    a: 'No. You can order a single custom piece. For teams, events and companies, the bulk order form gets you volume pricing and a dedicated quote.',
  },
  {
    q: 'What is your return policy?',
    a: `Stock items can be returned within ${SITE.policy.returnDays} days if unworn and unwashed. Custom-designed pieces are made just for you, so we accept returns only for defects or print errors, and we reprint them free.`,
  },
  {
    q: 'Do you offer cash on delivery?',
    a: 'Yes. Cash on delivery is available on eligible pin codes, alongside UPI and card payments.',
  },
  {
    q: 'How do I pick the right size?',
    a: 'Each product page has a size guide with chest and length measurements in inches. Our oversized tees are cut boxy, so most people wear their usual size for a relaxed fit, or size down for a closer fit.',
  },
]

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section className="tc-section tc-faq" id="faq" aria-labelledby="faq-h">
      <div className="tc-container tc-faq__grid">
        <div>
          <p className="tc-eyebrow">Questions</p>
          <h2 className="tc-h2" id="faq-h">Good to know</h2>
          <p className="tc-lead">Can't find what you're looking for? We reply to every email.</p>
          <Link to="/contact" className="tc-btn tc-btn--ghost">Contact us</Link>
        </div>
        <div className="tc-acc">
          {FAQS.map((f, idx) => (
            <div key={f.q} className={`tc-acc__item ${open === idx ? 'is-open' : ''}`}>
              <h3>
                <button aria-expanded={open === idx} aria-controls={`faq-${idx}`} onClick={() => setOpen(open === idx ? -1 : idx)}>
                  {f.q}
                  <span className="tc-acc__sign" aria-hidden="true" />
               </button>
              </h3>
              <div className="tc-acc__panel" id={`faq-${idx}`} role="region">
                <div>
                  <p>{f.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <NewArrivals />
      <CollectionTiles />
      <StudioSection />
      <Why />
      <BulkBanner />
      <Faq />
    </>
  )
}
