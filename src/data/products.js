import { SITE } from '../config/site'

/* ───────── Formatting ───────── */
const nf = new Intl.NumberFormat(SITE.currency.locale, { maximumFractionDigits: 0 })
export const formatPrice = (n) => `${SITE.currency.symbol}${nf.format(Math.round(n))}`

/* ───────── Shared option lists ───────── */
export const SIZES = ['S', 'M', 'L', 'XL', 'XXL']

export const SIZE_GUIDE = [
  // chest / length in inches (garment measurements)
  { size: 'S', chest: 38, length: 27 },
  { size: 'M', chest: 40, length: 28 },
  { size: 'L', chest: 42, length: 29 },
  { size: 'XL', chest: 44, length: 30 },
  { size: 'XXL', chest: 46, length: 31 },
]

export const TYPES = {
  tee: { label: 'Regular Tee', group: 'T-Shirts' },
  oversized: { label: 'Oversized Tee', group: 'T-Shirts' },
  hoodie: { label: 'Hoodie', group: 'Hoodies' },
  polo: { label: 'Polo', group: 'Polos' },
}

export const CATEGORY_FILTERS = ['All', 'T-Shirts', 'Hoodies', 'Polos']

/* ───────── Colours ───────── */
const C = {
  onyx: { name: 'Onyx Black', hex: '#15171F' },
  bone: { name: 'Bone', hex: '#E9E1D2' },
  white: { name: 'Off White', hex: '#F4F1EA' },
  navy: { name: 'Midnight Navy', hex: '#1E2A44' },
  sand: { name: 'Sand', hex: '#CDB99A' },
  sage: { name: 'Sage', hex: '#7E8B74' },
  charcoal: { name: 'Charcoal', hex: '#3B3E47' },
  rust: { name: 'Rust', hex: '#9B4B32' },
  slate: { name: 'Slate Blue', hex: '#5A6C8C' },
}

/* ───────── Collections ───────── */
export const COLLECTIONS = [
  {
    slug: 'automotive',
    title: 'Automotive',
    blurb: 'Track maps, tachometers and late-night drives. Graphics for people who love engines.',
    art: 'gauge',
    garment: 'oversized',
    color: C.onyx.hex,
    tone: 'dark',
  },
  {
    slug: 'minimal',
    title: 'Minimal',
    blurb: 'Quiet line-work and considered type. Designs that whisper instead of shout.',
    art: 'needle',
    garment: 'tee',
    color: C.bone.hex,
    tone: 'light',
  },
  {
    slug: 'anime',
    title: 'Anime',
    blurb: 'Moonlit gates and night-city graphics on heavyweight cotton.',
    art: 'torii',
    garment: 'hoodie',
    color: C.navy.hex,
    tone: 'dark',
  },
  {
    slug: 'streetwear',
    title: 'Streetwear',
    blurb: 'Bold shapes, oversized fits and prints that hold up wash after wash.',
    art: 'sunburst',
    garment: 'oversized',
    color: C.sand.hex,
    tone: 'light',
  },
]

/* ───────── Products ───────── */
const products = [
  {
    slug: 'track-day-tee',
    name: 'Track Day Tee',
    collection: 'automotive',
    type: 'tee',
    price: 899,
    art: 'circuit',
    tag: 'New',
    colors: [C.onyx, C.white, C.charcoal],
    blurb: 'A hand-drawn circuit map printed across the chest. Every corner numbered.',
  },
  {
    slug: 'redline-oversized-tee',
    name: 'Redline Oversized Tee',
    collection: 'automotive',
    type: 'oversized',
    price: 1099,
    art: 'gauge',
    tag: 'New',
    colors: [C.onyx, C.bone, C.rust],
    blurb: 'A tachometer pushed to the limit. Dropped shoulders, boxy oversized cut.',
  },
  {
    slug: 'apex-tee',
    name: 'Apex Tee',
    collection: 'automotive',
    type: 'tee',
    price: 899,
    art: 'apex',
    colors: [C.navy, C.white, C.sage],
    blurb: 'Mountain roads and the perfect line through the switchbacks.',
  },
  {
    slug: 'night-drive-hoodie',
    name: 'Night Drive Hoodie',
    collection: 'automotive',
    type: 'hoodie',
    price: 1999,
    art: 'grid',
    tag: 'Limited',
    colors: [C.onyx, C.navy, C.charcoal],
    blurb: 'Heavy fleece hoodie with a horizon-grid print that catches the light.',
  },
  {
    slug: 'needle-and-thread-tee',
    name: 'Needle & Thread Tee',
    collection: 'minimal',
    type: 'tee',
    price: 799,
    art: 'needle',
    tag: 'Signature',
    colors: [C.bone, C.onyx, C.sage],
    blurb: 'Our signature mark. One needle, one thread, and a lot of care.',
  },
  {
    slug: 'wave-line-tee',
    name: 'Wave Line Tee',
    collection: 'minimal',
    type: 'tee',
    price: 799,
    art: 'wave',
    colors: [C.white, C.slate, C.onyx],
    blurb: 'Five lines of ocean drawn in a single stroke.',
  },
  {
    slug: 'less-but-better-hoodie',
    name: 'Less But Better Hoodie',
    collection: 'minimal',
    type: 'hoodie',
    price: 1799,
    art: 'wordmark',
    colors: [C.bone, C.charcoal, C.sage],
    blurb: 'A clean typographic statement on brushed-back fleece.',
  },
  {
    slug: 'everyday-polo',
    name: 'Everyday Polo',
    collection: 'minimal',
    type: 'polo',
    price: 999,
    art: 'mark',
    colors: [C.navy, C.white, C.sand],
    blurb: 'Piqué cotton polo with a small embroidered needle mark on the chest.',
  },
  {
    slug: 'midnight-torii-tee',
    name: 'Midnight Torii Tee',
    collection: 'anime',
    type: 'tee',
    price: 899,
    art: 'torii',
    tag: 'New',
    colors: [C.onyx, C.navy, C.bone],
    blurb: 'A silent gate under a full moon. Soft-hand print, no cracking.',
  },
  {
    slug: 'moonlit-gate-hoodie',
    name: 'Moonlit Gate Hoodie',
    collection: 'anime',
    type: 'hoodie',
    price: 2099,
    art: 'torii',
    colors: [C.navy, C.onyx, C.rust],
    blurb: 'Oversized heavyweight hoodie carrying our Torii artwork.',
  },
  {
    slug: 'orbit-club-tee',
    name: 'Orbit Club Tee',
    collection: 'streetwear',
    type: 'oversized',
    price: 1049,
    art: 'orbit',
    colors: [C.white, C.onyx, C.slate],
    blurb: 'A planet, a ring, a very good excuse to stay out late.',
  },
  {
    slug: 'solar-oversized-tee',
    name: 'Solar Oversized Tee',
    collection: 'streetwear',
    type: 'oversized',
    price: 1049,
    art: 'sunburst',
    colors: [C.sand, C.onyx, C.rust],
    blurb: 'Retro sunset stripes on a boxy heavyweight body.',
  },
  {
    slug: 'heavyweight-blank-tee',
    name: 'Heavyweight Blank Tee',
    collection: 'streetwear',
    type: 'tee',
    price: 599,
    art: null,
    tag: 'Customisable',
    colors: [C.onyx, C.white, C.bone, C.navy, C.sage],
    blurb: `Plain ${SITE.policy.gsmRegular} GSM cotton. Wear it as is, or take it to the studio and make it yours.`,
  },
]

export const PRODUCTS = products.map((p, i) => ({
  ...p,
  id: i + 1,
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
