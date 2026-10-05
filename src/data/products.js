import { SITE } from '../config/site.js'
import { SIZES as SPEC_SIZES, COLOURS, sizesFor } from '../../shared/designSpec.js'

/* ───────── Formatting ───────── */
const nf = new Intl.NumberFormat(SITE.currency.locale, { maximumFractionDigits: 0 })
export const formatPrice = (n) => `${SITE.currency.symbol}${nf.format(Math.round(n))}`

/* ───────── Shared option lists ───────── */
export const SIZES = SPEC_SIZES

/** Sizes in stock for a product in a colour (white oversized has no S). */
export const sizesForProduct = (product, hex) => sizesFor(product.type === 'oversized' ? 'oversized' : 'regular', hex)

/** Cash on delivery is only for t-shirts from the collection, never for custom studio orders. */
export const COD_TYPES = ['tee', 'oversized']
export const codAllowed = (product) => COD_TYPES.includes(product.type)

export const TYPES = {
  tee: { label: 'Regular Tee', group: 'T-Shirts' },
  oversized: { label: 'Oversized Tee', group: 'T-Shirts' },
}

export const CATEGORY_FILTERS = ['All', 'T-Shirts']

/* ───────── Colours (only what we stock) ───────── */
const C = { white: COLOURS.white, black: COLOURS.black, blue: COLOURS.blue, maroon: COLOURS.maroon }
// Regular tees come in 4 colours; maroon is not made in oversized. We only sell round-neck tees.
const COLOURS_BY_TYPE = {
  tee: [C.black, C.white, C.blue, C.maroon],
  oversized: [C.black, C.white, C.blue],
}

/* ───────── Collections ───────── */
export const COLLECTIONS = [
  {
    slug: 'automotive',
    title: 'Automotive',
    blurb: 'Track maps, tachometers and late-night drives. Graphics for people who love engines.',
    art: 'gauge',
    garment: 'oversized',
    color: C.black.hex,
    tone: 'dark',
  },
  {
    slug: 'minimal',
    title: 'Minimal',
    blurb: 'Quiet line-work and considered type. Designs that whisper instead of shout.',
    art: 'needle',
    garment: 'tee',
    color: C.white.hex,
    tone: 'light',
  },
  {
    slug: 'anime',
    title: 'Anime',
    blurb: 'Moonlit gates and night-city graphics on heavyweight cotton.',
    art: 'torii',
    garment: 'tee',
    color: C.maroon.hex,
    tone: 'dark',
  },
  {
    slug: 'streetwear',
    title: 'Streetwear',
    blurb: 'Bold shapes, oversized fits and prints that hold up wash after wash.',
    art: 'sunburst',
    garment: 'oversized',
    color: C.blue.hex,
    tone: 'light',
  },
]

/* ───────── Products ───────── */
const products = [
  {
    id: 1,
    slug: 'track-day-tee',
    name: 'Track Day Tee',
    collection: 'automotive',
    type: 'tee',
    price: 899,
    art: 'circuit',
    tag: 'New',
    blurb: 'A hand-drawn circuit map printed across the chest. Every corner numbered.',
  },
  {
    id: 2,
    slug: 'redline-oversized-tee',
    name: 'Redline Oversized Tee',
    collection: 'automotive',
    type: 'oversized',
    price: 1099,
    art: 'gauge',
    tag: 'New',
    blurb: 'A tachometer pushed to the limit. Dropped shoulders, boxy oversized cut.',
  },
  {
    id: 3,
    slug: 'apex-tee',
    name: 'Apex Tee',
    collection: 'automotive',
    type: 'tee',
    price: 899,
    art: 'apex',
    blurb: 'Mountain roads and the perfect line through the switchbacks.',
  },
  {
    id: 5,
    slug: 'needle-and-thread-tee',
    name: 'Needle & Thread Tee',
    collection: 'minimal',
    type: 'tee',
    price: 799,
    art: 'needle',
    tag: 'Signature',
    blurb: 'Our signature mark. One needle, one thread, and a lot of care.',
  },
  {
    id: 6,
    slug: 'wave-line-tee',
    name: 'Wave Line Tee',
    collection: 'minimal',
    type: 'tee',
    price: 799,
    art: 'wave',
    blurb: 'Five lines of ocean drawn in a single stroke.',
  },
  {
    id: 9,
    slug: 'midnight-torii-tee',
    name: 'Midnight Torii Tee',
    collection: 'anime',
    type: 'tee',
    price: 899,
    art: 'torii',
    tag: 'New',
    blurb: 'A silent gate under a full moon. Soft-hand print, no cracking.',
  },
  {
    id: 11,
    slug: 'orbit-club-tee',
    name: 'Orbit Club Tee',
    collection: 'streetwear',
    type: 'oversized',
    price: 1049,
    art: 'orbit',
    blurb: 'A planet, a ring, a very good excuse to stay out late.',
  },
  {
    id: 12,
    slug: 'solar-oversized-tee',
    name: 'Solar Oversized Tee',
    collection: 'streetwear',
    type: 'oversized',
    price: 1049,
    art: 'sunburst',
    blurb: 'Retro sunset stripes on a boxy heavyweight body.',
  },
  {
    id: 13,
    slug: 'heavyweight-blank-tee',
    name: 'Heavyweight Blank Tee',
    collection: 'streetwear',
    type: 'tee',
    price: 599,
    art: null,
    tag: 'Customisable',
    blurb: `Plain ${SITE.policy.gsmRegular} GSM cotton. Wear it as is, or take it to the studio and make it yours.`,
  },
]

export const PRODUCTS = products.map((p) => ({
  ...p,
  colors: COLOURS_BY_TYPE[p.type],
  category: TYPES[p.type].group,
  typeLabel: TYPES[p.type].label,
  collectionTitle: COLLECTIONS.find((c) => c.slug === p.collection)?.title,
}))

export const getProduct = (slug) => PRODUCTS.find((p) => p.slug === slug)
export const getProductById = (id) => PRODUCTS.find((p) => p.id === id)
export const getCollection = (slug) => COLLECTIONS.find((c) => c.slug === slug)
export const relatedProducts = (product, n = 4) =>
  PRODUCTS.filter((p) => p.slug !== product.slug)
    .sort((a, b) => Number(b.collection === product.collection) - Number(a.collection === product.collection))
    .slice(0, n)

export const ALL_COLORS = Object.values(C)
export { C as COLOR_LIB }
