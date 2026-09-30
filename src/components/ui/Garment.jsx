import { useId } from 'react'

/**
 * Procedural garment renderer – vector "product photography" for tees, hoodies and polos.
 * Fully self-hosted (no external images) so the storefront never has broken pictures.
 * Swap for real product photos later by replacing <Garment/> inside <ProductImage/>.
 */

const SERIF = "Fraunces, 'Playfair Display', Georgia, serif"
const SANS = "Inter, 'Helvetica Neue', Arial, sans-serif"
const PAPER = '#F6F2EA'
const INK = '#0E1320'

/* ───────── helpers ───────── */
export function isDark(hex) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128
}
const polar = (cx, cy, r, deg) => {
  const a = (deg * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

/* ───────── Silhouettes ───────── */
const BODY = {
  tee: 'M158 40 C172 70 228 70 242 40 L306 60 L374 150 L328 190 L298 164 L298 436 L102 436 L102 164 L72 190 L26 150 L94 60 Z',
  oversized:
    'M156 42 C170 70 230 70 244 42 L318 58 L386 122 L352 178 L320 152 L324 448 L76 448 L80 152 L48 178 L14 122 L82 58 Z',
  polo: 'M158 40 C172 70 228 70 242 40 L306 60 L374 150 L328 190 L298 164 L298 436 L102 436 L102 164 L72 190 L26 150 L94 60 Z',
  hoodie:
    'M150 48 C166 72 234 72 250 48 L304 62 L354 104 L380 330 L322 342 L300 206 L298 432 L102 432 L100 206 L78 342 L20 330 L46 104 L96 62 Z',
}

// Where the artwork box (200×200) sits on each silhouette.
const PLACE = {
  tee: { x: 128, y: 126, s: 0.72 },
  oversized: { x: 122, y: 130, s: 0.78 },
  polo: { x: 130, y: 150, s: 0.7 },
  hoodie: { x: 137, y: 134, s: 0.63 },
}

/* ───────── Artwork (200×200 box) ───────── */
function Art({ name, dark, uid }) {
  const ink = dark ? PAPER : INK
  const accent = dark ? '#F0694A' : '#D24A2E'
  const soft = dark ? 'rgba(246,242,234,.55)' : 'rgba(14,19,32,.5)'

  switch (name) {
    case 'needle':
      return (
        <g>
          <image href={dark ? '/logo-mark-light.png' : '/logo-mark.png'} x="30" y="8" width="140" height="130" preserveAspectRatio="xMidYMid meet" />
          <text x="100" y="166" textAnchor="middle" fontFamily={SANS} fontWeight="600" fontSize="12" letterSpacing="7" fill={ink}>
            THREADCRAFT
          </text>
          <path d="M62 182h76" stroke={accent} strokeWidth="2" strokeLinecap="round" />
        </g>
      )

    case 'mark':
      return (
        <g>
          <image href={dark ? '/logo-mark-light.png' : '/logo-mark.png'} x="0" y="0" width="70" height="65" />
        </g>
      )

    case 'apex':
      return (
        <g fill="none" strokeLinejoin="round" strokeLinecap="round">
          <circle cx="152" cy="40" r="13" fill={accent} stroke="none" />
          <path d="M8 148 68 58 100 102 130 50 192 148Z" stroke={ink} strokeWidth="4" />
          <path d="M38 148 82 96 100 120 122 86 162 148" stroke={soft} strokeWidth="2" strokeDasharray="2 6" />
          <path d="M8 166h184" stroke={ink} strokeWidth="2" />
          <text x="100" y="192" textAnchor="middle" fontFamily={SANS} fontWeight="700" fontSize="15" letterSpacing="9" fill={ink} stroke="none">
            APEX
          </text>
        </g>
      )

    case 'orbit':
      return (
        <g fill="none">
          <g transform="rotate(-18 100 88)">
            <ellipse cx="100" cy="88" rx="88" ry="24" stroke={ink} strokeWidth="3.5" />
          </g>
          <circle cx="100" cy="88" r="46" fill={accent} />
          <g transform="rotate(-18 100 88)">
            <path d="M12 88A88 24 0 0 0 188 88" stroke={ink} strokeWidth="3.5" />
          </g>
          <circle cx="30" cy="30" r="2.5" fill={ink} />
          <circle cx="168" cy="26" r="2" fill={ink} />
          <circle cx="182" cy="150" r="2.5" fill={ink} />
          <text x="100" y="172" textAnchor="middle" fontFamily={SANS} fontWeight="700" fontSize="15" letterSpacing="8" fill={ink}>
            ORBIT
          </text>
          <text x="100" y="192" textAnchor="middle" fontFamily={SANS} fontWeight="500" fontSize="9" letterSpacing="6" fill={soft}>
            C L U B
          </text>
        </g>
      )

    case 'sunburst': {
      const rays = []
      for (let i = 0; i < 28; i++) {
        const a = -180 + (i * 180) / 27
        const [x1, y1] = polar(100, 104, 70, a)
        const [x2, y2] = polar(100, 104, i % 2 ? 84 : 94, a)
        rays.push(<path key={i} d={`M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`} stroke={ink} strokeWidth="3" strokeLinecap="round" />)
      }
      return (
        <g>
          <defs>
            <mask id={`m${uid}`}>
              <rect x="0" y="0" width="200" height="200" fill="#fff" />
              <rect x="0" y="86" width="200" height="3" fill="#000" />
              <rect x="0" y="94" width="200" height="4" fill="#000" />
              <rect x="0" y="103" width="200" height="6" fill="#000" />
            </mask>
          </defs>
          <circle cx="100" cy="104" r="56" fill={accent} mask={`url(#m${uid})`} />
          {rays}
          <path d="M14 104h172" stroke={ink} strokeWidth="3" strokeLinecap="round" />
          <text x="100" y="146" textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight="600" fontSize="34" fill={ink}>
            Solar
          </text>
          <text x="100" y="170" textAnchor="middle" fontFamily={SANS} fontWeight="600" fontSize="10" letterSpacing="9" fill={soft}>
            SUMMER CLUB
          </text>
        </g>
      )
    }

    case 'gauge': {
      const cx = 100
      const cy = 100
      const ticks = []
      for (let i = 0; i <= 32; i++) {
        const deg = 135 + (i * 270) / 32
        const major = i % 4 === 0
        const [x1, y1] = polar(cx, cy, major ? 60 : 65, deg)
        const [x2, y2] = polar(cx, cy, 72, deg)
        ticks.push(
          <path
            key={i}
            d={`M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`}
            stroke={i >= 26 ? accent : ink}
            strokeWidth={major ? 3.5 : 1.6}
            strokeLinecap="round"
          />,
        )
      }
      const [s1x, s1y] = polar(cx, cy, 82, 135)
      const [s2x, s2y] = polar(cx, cy, 82, 405)
      const [nx, ny] = polar(cx, cy, 58, 372)
      const labels = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => {
        const [lx, ly] = polar(cx, cy, 48, 135 + (n * 270) / 8)
        return (
          <text key={n} x={lx.toFixed(1)} y={(ly + 3.5).toFixed(1)} textAnchor="middle" fontFamily={SANS} fontWeight="600" fontSize="9" fill={n >= 7 ? accent : ink}>
            {n}
          </text>
        )
      })
      return (
        <g fill="none">
          <path d={`M${s1x.toFixed(1)} ${s1y.toFixed(1)}A82 82 0 1 1 ${s2x.toFixed(1)} ${s2y.toFixed(1)}`} stroke={ink} strokeWidth="3" strokeLinecap="round" />
          {ticks}
          {labels}
          <path d={`M${cx} ${cy}L${nx.toFixed(1)} ${ny.toFixed(1)}`} stroke={accent} strokeWidth="4" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="7" fill={ink} />
          <circle cx={cx} cy={cy} r="2.5" fill={accent} />
          <text x="100" y="140" textAnchor="middle" fontFamily={SANS} fontWeight="500" fontSize="7" letterSpacing="2" fill={soft}>
            RPM x1000
          </text>
          <text x="100" y="188" textAnchor="middle" fontFamily={SANS} fontWeight="700" fontSize="14" letterSpacing="9" fill={ink}>
            REDLINE
          </text>
        </g>
      )
    }

    case 'circuit':
      return (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M34 118C24 88 54 58 86 68C116 78 128 46 160 54C192 62 188 104 160 112C138 119 148 142 122 150C98 158 88 130 66 140C48 148 40 134 34 118Z"
            stroke={ink}
            strokeWidth="9"
          />
          <path
            d="M34 118C24 88 54 58 86 68C116 78 128 46 160 54C192 62 188 104 160 112C138 119 148 142 122 150C98 158 88 130 66 140C48 148 40 134 34 118Z"
            stroke={accent}
            strokeWidth="1.8"
            strokeDasharray="1 7"
          />
          <path d="M100 66l-6 14" stroke={accent} strokeWidth="4" />
          <circle cx="160" cy="54" r="0.01" />
          <text x="100" y="188" textAnchor="middle" fontFamily={SANS} fontWeight="700" fontSize="13" letterSpacing="8" fill={ink} stroke="none">
            CIRCUIT
          </text>
          <text x="100" y="172" textAnchor="middle" fontFamily={SANS} fontWeight="500" fontSize="8" letterSpacing="4" fill={soft} stroke="none">
            CORNERS 01 - 11
          </text>
        </g>
      )

    case 'wave': {
      const lines = [64, 84, 104, 124, 144].map((y, i) => (
        <path
          key={y}
          d={`M14 ${y}q21 -20 43 0t43 0t43 0t43 0`}
          stroke={i === 4 ? accent : ink}
          strokeWidth={i === 4 ? 4 : 3}
          fill="none"
          strokeLinecap="round"
          opacity={1 - i * 0.1}
        />
      ))
      return (
        <g>
          <circle cx="146" cy="32" r="12" fill={accent} />
          {lines}
          <text x="100" y="186" textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontWeight="500" fontSize="17" fill={ink}>
            one line, unbroken
          </text>
        </g>
      )
    }

    case 'wordmark':
      return (
        <g textAnchor="middle" fill={ink}>
          <text x="100" y="70" fontFamily={SERIF} fontStyle="italic" fontWeight="600" fontSize="64">
            Less
          </text>
          <path d="M40 92h120" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          <text x="100" y="116" fontFamily={SANS} fontWeight="600" fontSize="12" letterSpacing="10" style={{ textTransform: 'uppercase' }}>
            but
          </text>
          <text x="100" y="180" fontFamily={SERIF} fontWeight="700" fontSize="64" letterSpacing="-2">
            Better
          </text>
        </g>
      )

    case 'grid': {
      const v = []
      for (let x = -40; x <= 240; x += 20) v.push(<path key={`v${x}`} d={`M100 104L${x} 190`} stroke={ink} strokeWidth="1.4" opacity=".75" />)
      const h = [110, 118, 128, 141, 158, 180].map((y) => <path key={`h${y}`} d={`M0 ${y}H200`} stroke={ink} strokeWidth="1.4" opacity=".75" />)
      return (
        <g>
          <defs>
            <mask id={`m${uid}`}>
              <rect width="200" height="200" fill="#fff" />
              <rect x="0" y="70" width="200" height="3" fill="#000" />
              <rect x="0" y="80" width="200" height="4" fill="#000" />
              <rect x="0" y="91" width="200" height="5" fill="#000" />
            </mask>
            <clipPath id={`c${uid}`}>
              <rect x="0" y="104" width="200" height="90" />
            </clipPath>
          </defs>
          <circle cx="100" cy="88" r="54" fill={accent} mask={`url(#m${uid})`} />
          <path d="M0 104H200" stroke={ink} strokeWidth="2.5" />
          <g clipPath={`url(#c${uid})`}>
            {v}
            {h}
          </g>
          <text x="100" y="15" textAnchor="middle" fontFamily={SANS} fontWeight="700" fontSize="10" letterSpacing="9" fill={ink}>
            NIGHT DRIVE
          </text>
        </g>
      )
    }

    case 'torii':
      return (
        <g>
          <circle cx="100" cy="70" r="40" fill={accent} />
          <g fill={ink}>
            <path d="M22 84Q100 62 178 84L172 100Q100 82 28 100Z" />
            <rect x="46" y="112" width="108" height="9" rx="1" />
            <rect x="60" y="98" width="13" height="86" />
            <rect x="127" y="98" width="13" height="86" />
            <rect x="54" y="176" width="25" height="8" />
            <rect x="121" y="176" width="25" height="8" />
            <rect x="92" y="100" width="16" height="14" />
          </g>
          <text x="100" y="204" textAnchor="middle" fontFamily={SANS} fontWeight="600" fontSize="9" letterSpacing="8" fill={soft}>
            NIGHTFALL
          </text>
        </g>
      )

    default:
      return null
  }
}

/* ───────── Component ───────── */
export default function Garment({ type = 'tee', color = '#15171F', art = null, view = 'front', className = '', title }) {
  const raw = useId()
  const uid = raw.replace(/[^a-zA-Z0-9]/g, '')
  const dark = isDark(color)
  const body = BODY[type] || BODY.tee
  const place = PLACE[type] || PLACE.tee
  const back = view === 'back'
  const edge = dark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.16)'
  const rib = dark ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.10)'
  const fold = dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)'
  const shade = dark ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.14)'

  const artEl =
    !back && art ? (
      art === 'mark' ? (
        <g transform="translate(232 116) scale(.62)">
          <Art name={art} dark={dark} uid={uid} />
        </g>
      ) : (
        <g transform={`translate(${place.x} ${place.y}) scale(${place.s})`}>
          <Art name={art} dark={dark} uid={uid} />
        </g>
      )
    ) : null

  return (
    <svg viewBox="0 0 400 480" className={`tc-garment ${className}`} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} preserveAspectRatio="xMidYMid meet">
      <defs>
        <clipPath id={`b${uid}`}>
          <path d={body} />
        </clipPath>
        <linearGradient id={`sx${uid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity=".26" />
          <stop offset=".22" stopColor="#000" stopOpacity="0" />
          <stop offset=".72" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".3" />
        </linearGradient>
        <linearGradient id={`sy${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".16" />
          <stop offset=".35" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".18" />
        </linearGradient>
        <radialGradient id={`hl${uid}`} cx=".5" cy=".32" r=".5">
          <stop offset="0" stopColor="#fff" stopOpacity={dark ? 0.1 : 0.32} />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id={`g${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="4" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.1 -.2" />
        </filter>
        <filter id={`bl${uid}`} x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      {/* floor shadow */}
      <ellipse cx="200" cy="462" rx="132" ry="9" fill="#000" opacity=".22" filter={`url(#bl${uid})`} />

      {/* hood (behind body) */}
      {type === 'hoodie' && (
        <g>
          <path d="M134 58C112 -8 288 -8 266 58C240 40 160 40 134 58Z" fill={color} />
          <path d="M134 58C112 -8 288 -8 266 58C240 40 160 40 134 58Z" fill={shade} opacity=".55" />
        </g>
      )}

      {/* body */}
      <path d={body} fill={color} />
      <g clipPath={`url(#b${uid})`}>
        <rect width="400" height="480" fill={`url(#sx${uid})`} />
        <rect width="400" height="480" fill={`url(#sy${uid})`} />
        <rect width="400" height="480" fill={`url(#hl${uid})`} />
        <rect width="400" height="480" filter={`url(#g${uid})`} opacity={dark ? 0.16 : 0.1} style={{ mixBlendMode: 'multiply' }} />

        {/* soft fabric folds */}
        {type !== 'hoodie' ? (
          <g fill="none" stroke={fold} strokeWidth="5" strokeLinecap="round">
            <path d="M118 176C128 250 122 330 134 430" />
            <path d="M282 176C272 250 278 330 266 430" />
            <path d="M160 300C190 312 220 312 244 300" opacity=".6" />
            <path d="M92 76C110 100 112 132 104 160" opacity=".7" />
            <path d="M308 76C290 100 288 132 296 160" opacity=".7" />
          </g>
        ) : (
          <g fill="none" stroke={fold} strokeWidth="5" strokeLinecap="round">
            <path d="M116 210C124 280 118 350 128 424" />
            <path d="M284 210C276 280 282 350 272 424" />
            <path d="M62 130C72 200 66 270 76 316" opacity=".8" />
            <path d="M338 130C328 200 334 270 324 316" opacity=".8" />
          </g>
        )}
      </g>

      {/* construction details */}
      {type === 'tee' || type === 'oversized' ? (
        <g>
          {/* neckline */}
          <path d={back ? 'M158 40C172 52 228 52 242 40' : 'M158 40C172 70 228 70 242 40'} fill="none" stroke={rib} strokeWidth="9" strokeLinecap="round" />
          <path
            d={back ? 'M158 40C172 52 228 52 242 40C228 46 172 46 158 40Z' : 'M158 40C172 70 228 70 242 40C228 48 172 48 158 40Z'}
            fill={shade}
            opacity=".7"
          />
          {/* hem + cuffs */}
          <path d={type === 'tee' ? 'M102 428H298' : 'M76 440H324'} stroke={edge} strokeWidth="1.5" strokeDasharray="3 3" />
          {back && <rect x="184" y="56" width="32" height="14" rx="2" fill="none" stroke={edge} strokeDasharray="2 2" />}
        </g>
      ) : null}

      {type === 'polo' && (
        <g>
          <path d="M160 40L240 40L200 92Z" fill={shade} opacity=".85" />
          <path d="M150 36L198 30L202 88L170 72Z" fill={color} />
          <path d="M150 36L198 30L202 88L170 72Z" fill={rib} />
          <path d="M250 36L202 30L198 88L230 72Z" fill={color} />
          <path d="M250 36L202 30L198 88L230 72Z" fill={rib} />
          <path d="M150 36L198 30L202 88L170 72ZM250 36L202 30L198 88L230 72Z" fill="none" stroke={edge} strokeWidth="1.2" />
          <path d="M200 88V170" stroke={edge} strokeWidth="1.5" />
          <rect x="192" y="88" width="16" height="82" fill="none" stroke={edge} strokeWidth="1" />
          <circle cx="200" cy="106" r="3" fill={dark ? '#D9D3C5' : '#2A2E3B'} />
          <circle cx="200" cy="130" r="3" fill={dark ? '#D9D3C5' : '#2A2E3B'} />
          <circle cx="200" cy="154" r="3" fill={dark ? '#D9D3C5' : '#2A2E3B'} />
          <path d="M72 190L328 190" stroke="none" />
          <path d="M102 428H298" stroke={edge} strokeWidth="1.5" strokeDasharray="3 3" />
        </g>
      )}

      {type === 'hoodie' && (
        <g>
          {/* hood opening */}
          <path d={back ? 'M150 48C166 60 234 60 250 48C236 36 164 36 150 48Z' : 'M150 48C160 16 240 16 250 48C236 66 164 66 150 48Z'} fill="#000" opacity={back ? 0.28 : 0.5} />
          <path d={back ? 'M150 48C166 60 234 60 250 48' : 'M150 48C166 72 234 72 250 48'} fill="none" stroke={rib} strokeWidth="6" strokeLinecap="round" />
          {/* drawstrings */}
          {!back && (
            <g stroke={dark ? '#E8E2D4' : '#2B2F3C'} strokeWidth="2.6" strokeLinecap="round">
              <path d="M182 70C180 90 184 108 180 132" fill="none" />
              <path d="M218 70C220 90 216 108 220 132" fill="none" />
              <circle cx="180" cy="136" r="3" fill={dark ? '#E8E2D4' : '#2B2F3C'} />
              <circle cx="220" cy="136" r="3" fill={dark ? '#E8E2D4' : '#2B2F3C'} />
            </g>
          )}
          {/* kangaroo pocket */}
          {!back && (
            <g>
              <path d="M138 318H262L280 394H120Z" fill="#000" opacity=".06" />
              <path d="M138 318H262L280 394H120Z" fill="none" stroke={edge} strokeWidth="1.5" />
              <path d="M138 318 122 394M262 318l16 76" stroke={edge} strokeWidth="1" opacity=".6" />
            </g>
          )}
          {/* ribbed cuffs + hem */}
          <g clipPath={`url(#b${uid})`}>
            <path d="M22 306 80 318 78 344 18 332Z" fill={rib} />
            <path d="M378 306 320 318 322 344 382 332Z" fill={rib} />
            <rect x="98" y="408" width="204" height="26" fill={rib} />
          </g>
          <g stroke={edge} strokeWidth="1" opacity=".7">
            {Array.from({ length: 16 }).map((_, i) => (
              <path key={i} d={`M${112 + i * 12} 412V432`} />
            ))}
          </g>
        </g>
      )}

      {artEl}

      {/* silhouette edge */}
      <path d={body} fill="none" stroke={edge} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}
