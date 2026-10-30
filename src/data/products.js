import { SITE } from '../config/site.js'
import { SIZES as SPEC_SIZES, COLOURS, SHOP_PRICES, coloursForFit } from '../../shared/designSpec.js'

/* ───────── Formatting ───────── */
const nf = new Intl.NumberFormat(SITE.currency.locale, { maximumFractionDigits: 0 })
export const formatPrice = (n) => `${SITE.currency.symbol}${nf.format(Math.round(n))}`

/* ───────── Shared option lists ───────── */
export const SIZES = SPEC_SIZES


export const TYPES = {
  tee: { label: 'Round-neck Tee', group: 'T-Shirts' },
}

export const CATEGORY_FILTERS = ['All', 'T-Shirts']

/* ───────── Colours (only what we stock) ───────── */
const C = { white: COLOURS.white, black: COLOURS.black, blue: COLOURS.blue, maroon: COLOURS.maroon }

/* ───────── Collections ───────── */
// `cover` = the product photo shown for the collection on the home and collections pages
export const COLLECTIONS = [
  {
    slug: 'automotive',
    title: 'Automotive',
    blurb: 'Race cars, helmets and late-night drives. Graphics for people who love engines.',
    color: C.black.hex,
    cover: { slug: 'japanese-racing-tee', view: 'model-back' },
  },
  {
    slug: 'minimal',
    title: 'Minimal',
    blurb: 'Quiet line-work and considered type. Designs that whisper instead of shout.',
    color: C.white.hex,
    cover: { slug: 'crane-rising-tee', view: 'model-back' },
  },
  {
    slug: 'anime',
    title: 'Anime',
    blurb: 'Ronin, heroes and night-city graphics on heavyweight cotton.',
    color: C.maroon.hex,
    cover: { slug: 'ronin-eclipse-tee', view: 'model-back' },
  },
  {
    slug: 'streetwear',
    title: 'Streetwear',
    blurb: 'Bold shapes, oversized fits and prints that hold up wash after wash.',
    color: C.blue.hex,
    cover: { slug: 'born-from-chaos-tee', view: 'model-back' },
  },
]

/* ───────── Product photos ───────── */
// Files live in public/products/<slug>/<view>.webp (900px) and <view>-sm.webp (240px thumbnail)
export const VIEW_LABELS = {
  'model-back': 'Back, on model',
  'model-front': 'Front, on model',
  'hang-back': 'Back, on hanger',
  'hang-front': 'Front, on hanger',
}
export const photoUrl = (slug, view, small = false) => `/products/${slug}/${view}${small ? '-sm' : ''}.webp`

/* ───────── Products ───────── */
// Every design comes in oversized and regular fit and in every colour we stock, but only the black oversized tee has been photographed so far.
const products = [
  {
    id: 101,
    slug: 'ronin-eclipse-tee',
    name: 'Ronin Eclipse Tee',
    collection: 'anime',
    type: 'tee',
    blurb: "A masked ronin under a blood-red eclipse. Large back print with a small mark on the chest.",
    views: ['model-back','model-front','hang-back','hang-front'],
  },
  {
    id: 102,
    slug: 'naruto-manga-tee',
    hidden: true,
    name: 'Naruto Manga Tee',
    collection: 'anime',
    type: 'tee',
    blurb: "Manga-style Naruto artwork across the back, with a small logo on the chest.",
    views: ['model-back','model-front','hang-back','hang-front'],
  },
  {
    id: 103,
    slug: 'gear-5-tee',
    hidden: true,
    name: 'Gear 5 Tee',
    collection: 'anime',
    type: 'tee',
    blurb: "Luffy in Gear 5, printed large on the back, with a small One Piece logo on the chest.",
    views: ['model-back','model-front','hang-back','hang-front'],
  },
  {
    id: 104,
    slug: 'tanjiro-brushstroke-tee',
    hidden: true,
    name: 'Tanjiro Brushstroke Tee',
    collection: 'anime',
    type: 'tee',
    blurb: "Tanjiro in fiery colour on the back, with a brushstroke Demon Slayer mark on the chest.",
    views: ['model-back','model-front','hang-back','hang-front'],
  },
  {
    id: 105,
    slug: 'zenitsu-lightning-tee',
    hidden: true,
    name: 'Zenitsu Lightning Tee',
    collection: 'anime',
    type: 'tee',
    blurb: "Zenitsu in a flash of lightning on the back, with a small Demon Slayer mark on the chest.",
    views: ['model-back','model-front','hang-back','hang-front'],
  },
  {
    id: 106,
    slug: 'less-but-better-tee',
    name: 'Less But Better Tee',
    collection: 'minimal',
    type: 'tee',
    blurb: "A classical statue drawn with architectural lines and a red sun. Large back print, small chest mark.",
    views: ['model-back','model-front','hang-back','hang-front'],
  },
  {
    id: 107,
    slug: 'mountain-sun-tee',
    name: 'Mountain Sun Tee',
    collection: 'minimal',
    type: 'tee',
    blurb: "A single mountain line under a red sun. Quiet back print with a small mark on the chest.",
    views: ['model-back','model-front','hang-back','hang-front'],
  },
  {
    id: 108,
    slug: 'geometric-butterfly-tee',
    name: 'Geometric Butterfly Tee',
    collection: 'minimal',
    type: 'tee',
    blurb: "A butterfly built from sharp geometry in black, white and red, printed on the back.",
    views: ['model-back','hang-back'],
  },
  {
    id: 109,
    slug: 'crane-rising-tee',
    name: 'Crane Rising Tee',
    collection: 'minimal',
    type: 'tee',
    blurb: "A crane rising over a red sun, printed on the back, with a feather mark on the chest.",
    views: ['model-back','model-front','hang-back','hang-front'],
  },
  {
    id: 110,
    slug: 'industrial-noir-27-tee',
    name: 'Industrial Noir 27 Tee',
    collection: 'minimal',
    type: 'tee',
    blurb: "A bold, broken numeral 27 in monochrome, printed large on the back.",
    views: ['model-back','hang-back'],
  },
  {
    id: 111,
    slug: 'race-helmet-tee',
    name: 'Race Helmet Tee',
    collection: 'automotive',
    type: 'tee',
    blurb: "A scratched racing helmet and the word RACE in red. Large back print, small helmet on the chest.",
    views: ['model-back','model-front','hang-back','hang-front'],
  },
  {
    id: 112,
    slug: 'japanese-racing-tee',
    name: 'Japanese Racing Tee',
    collection: 'automotive',
    type: 'tee',
    blurb: "A race car on a mountain road under a red sun, with the kanji for speed. Back print with a small chest mark.",
    views: ['model-back','model-front','hang-back','hang-front'],
  },
  {
    id: 113,
    slug: 'motorsport-focus-tee',
    name: 'Motorsport Focus Tee',
    collection: 'automotive',
    type: 'tee',
    blurb: "A driver's focused eyes through a torn visor, printed on the back with a small red stripe on the chest.",
    views: ['model-back','model-front','hang-back','hang-front'],
  },
  {
    id: 114,
    slug: 'porsche-gt3-rs-tee',
    hidden: true,
    name: 'Porsche GT3 RS Tee',
    collection: 'automotive',
    type: 'tee',
    blurb: "A Porsche GT3 RS on the back under big white lettering, with the crest on the chest.",
    views: ['model-back','model-front','hang-back','hang-front'],
  },
  {
    id: 115,
    slug: 'mercedes-amg-gt-tee',
    hidden: true,
    name: 'Mercedes-AMG GT Tee',
    collection: 'automotive',
    type: 'tee',
    blurb: "A technical blueprint of the Mercedes-AMG GT on the back, with the Mercedes star on the chest.",
    views: ['model-back','model-front','hang-back','hang-front'],
  },
  {
    id: 116,
    slug: 'bugatti-chiron-tee',
    hidden: true,
    name: 'Bugatti Chiron Tee',
    collection: 'automotive',
    type: 'tee',
    blurb: "A blueprint-style Bugatti Chiron on the back, with a small mark on the chest.",
    views: ['model-back','model-front','hang-back','hang-front'],
  },
  {
    id: 117,
    slug: 'max-verstappen-tee',
    hidden: true,
    name: 'Max Verstappen Tee',
    collection: 'automotive',
    type: 'tee',
    blurb: "A racing-poster portrait of Max Verstappen on the back, with a small mark on the chest.",
    views: ['model-back','model-front','hang-back','hang-front'],
  },
  {
    id: 118,
    slug: 'sergio-perez-tee',
    hidden: true,
    name: 'Sergio Pérez Tee',
    collection: 'automotive',
    type: 'tee',
    blurb: "A Red Bull graphic of Sergio Pérez on the back, with a small mark on the chest.",
    views: ['model-back','model-front','hang-back','hang-front'],
  },
  {
    id: 119,
    slug: 'fall-rise-repeat-tee',
    name: 'Fall Rise Repeat Tee',
    collection: 'streetwear',
    type: 'tee',
    blurb: "A gothic angel above the words FALL RISE REPEAT, with a star emblem on the chest.",
    views: ['model-back','model-front','hang-back','hang-front'],
  },
  {
    id: 120,
    slug: 'born-from-chaos-tee',
    name: 'Born From Chaos Tee',
    collection: 'streetwear',
    type: 'tee',
    blurb: "A skull wrapped in roses and thorns on the back, with a snake and rose mark on the chest.",
    views: ['model-back','model-front','hang-back','hang-front'],
  },
  {
    id: 121,
    slug: 'no-signal-tee',
    name: 'No Signal Tee',
    collection: 'streetwear',
    type: 'tee',
    blurb: "A blue grunge collage that reads NO SIGNAL on the back, with a small After Midnight panel on the chest.",
    views: ['model-back','model-front','hang-back','hang-front'],
  },
  {
    id: 122,
    slug: 'drive-discipline-tee',
    name: 'Drive Discipline Tee',
    collection: 'streetwear',
    type: 'tee',
    blurb: "A neo-classical bust with bold red DRIVE lettering on the back, with a gothic emblem on the chest.",
    views: ['model-back','model-front','hang-back','hang-front'],
  },
]

// `hidden: true` = held back from the site (not listed, not purchasable). These designs use other companies' brands or
// characters; their photos are parked in hold/products/ (outside the deployed public/ folder). To release one: get a licence,
// move its folder back to public/products/ and delete the flag.
export const PRODUCTS = products.filter((p) => !p.hidden).map((p) => ({
  ...p,
  colors: coloursForFit('regular'), // superset; the colours per fit come from coloursForFit(fit)
  price: SHOP_PRICES.oversized, // default fit; regular fit is cheaper (SHOP_PRICES.regular)
  fromPrice: SHOP_PRICES.regular,
  category: TYPES[p.type].group,
  typeLabel: TYPES[p.type].label,
  collectionTitle: COLLECTIONS.find((c) => c.slug === p.collection)?.title,
  // first view = card image, second = shown on hover (when there is one)
  image: photoUrl(p.slug, p.views[0]),
  thumb: photoUrl(p.slug, p.views[0], true),
  hoverImage: p.views[1] ? photoUrl(p.slug, p.views[1]) : null,
}))

export const getProduct = (slug) => PRODUCTS.find((p) => p.slug === slug)
export const getProductById = (id) => PRODUCTS.find((p) => p.id === id)
export const getCollection = (slug) => COLLECTIONS.find((c) => c.slug === slug)
export const relatedProducts = (product, n = 4) =>
  PRODUCTS.filter((p) => p.slug !== product.slug)
    .sort((a, b) => Number(b.collection === product.collection) - Number(a.collection === product.collection))
    .slice(0, n)

// Colours that at least one product is offered in (the shop's colour filter only shows these)
export const ALL_COLORS = [...new Map(PRODUCTS.flatMap((p) => p.colors).map((c) => [c.hex, c])).values()]
export { C as COLOR_LIB }
