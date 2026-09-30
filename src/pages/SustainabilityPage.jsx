import { Link } from 'react-router-dom'
import Garment from '../components/ui/Garment'
import { SITE } from '../config/site'

const STEPS = [
  { title: 'Design', text: 'Every graphic is drawn in-house, or prepared from your artwork so it prints sharp at full size.' },
  { title: 'Print', text: 'High-resolution direct-to-garment printing puts fine detail and full colour onto the fabric.' },
  { title: 'Finish', text: 'Each piece is checked by hand for placement, colour and stitching before it is packed.' },
  { title: 'Ship', text: `Orders are dispatched within ${SITE.policy.dispatchHours} hours, with tracking on the way.` },
]

export default function SustainabilityPage() {
  return (
    <div className="tc-page">
      <section className="tc-container tc-studio__grid tc-craft__fabric tc-craft__intro">
        <div className="tc-studio__art" aria-hidden="true">
          <Garment type="tee" color="#15171F" art="needle" />
        </div>
        <div>
          <p className="tc-eyebrow">Our craft</p>
          <h1 className="tc-h2 tc-h2--page">Made with care, start to finish</h1>
          <p className="tc-lead">
            ThreadCraft is a small label built around original designs and made-to-order printing. Regular fit tees are cut in {SITE.policy.gsmRegular} GSM cotton and oversized tees in a heavier {SITE.policy.gsmOversized} GSM, so prints stay crisp and each fit hangs the way it should.
          </p>
          <div className="tc-studio__cta">
            <Link to="/shop" className="tc-btn tc-btn--primary">Shop the collection</Link>
            <Link to="/studio" className="tc-link">Design your own</Link>
          </div>
        </div>
      </section>
      <section className="tc-container tc-section tc-section--tight">
        <ol className="tc-offers">
          {STEPS.map((s, i) => (
            <li key={s.title} className="tc-offers__item">
              <span className="tc-craft__num">0{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
