/**
 * Design-spec schema, pricing and validation, shared by the React app and the
 * Worker. Pure JS, no DOM or framework imports, so it runs in both places.
 * The Worker must call computePrice() itself and ignore any total from the browser.
 */
export const SCHEMA_VERSION = 1

export const FITS = { regular: { gsm: 180 }, oversized: { gsm: 240 } }
export const SIZES = ['S', 'M', 'L', 'XL'] // we do not sell XXL
// Fit + colour + size combinations that are NOT on sale until the owner enters a stock count above 0
// in the admin Stock tab (white oversized S: none in stock yet). Everything else is on sale unless sold out.
export const STOCK_GATED = [{ fit: 'oversized', colour: '#FFFFFF', size: 'S' }]
export const comboKey = (fit, hex, size) => `${fit}|${String(hex).toUpperCase()}|${size}`
const GATED_KEYS = new Set(STOCK_GATED.map((g) => comboKey(g.fit, g.colour, g.size)))
export const isGated = (fit, hex, size) => GATED_KEYS.has(comboKey(fit, hex, size))
/** Sizes on sale for a fit + colour. `enabled` = comboKey()s of gated combinations that currently have stock. */
export const sizesFor = (fit, hex, enabled = []) => SIZES.filter((s) => !isGated(fit, hex, s) || enabled.includes(comboKey(fit, hex, s)))
export const PRINT_TYPES = ['dtf']

// Shop (collection) tee prices in INR, by fit. The Worker prices carts from these, never from the browser.
export const SHOP_FITS = ['oversized', 'regular']
export const SHOP_PRICES = { oversized: 649, regular: 449 }
export const FIT_LABEL = { oversized: 'Oversized fit', regular: 'Regular fit' }
// The colours we actually stock (hex approximates the real fabric; see the product photos).
export const COLOURS = {
  white: { name: 'White', hex: '#FFFFFF' },
  black: { name: 'Black', hex: '#1A1A1A' },
  blue: { name: 'Royal Blue', hex: '#0536A8' },
  maroon: { name: 'Maroon', hex: '#6E0F1E' },
}
// Maroon is only available in the regular fit
export const FIT_COLOURS = {
  regular: ['white', 'black', 'blue', 'maroon'],
  oversized: ['white', 'black', 'blue'],
}
export const coloursForFit = (fit) => (FIT_COLOURS[fit] || []).map((k) => COLOURS[k])
/** Every blank tee we could stock: [{ fit, colour (hex), size }] (used by the stock page and its checks) */
export const stockCombos = () =>
  Object.keys(FIT_COLOURS).flatMap((fit) =>
    coloursForFit(fit).flatMap((c) => SIZES.map((size) => ({ fit, colour: c.hex.toUpperCase(), size }))),
  )
// Names for display, including colours from earlier test orders that are no longer offered
const LEGACY_NAMES = { '#1E293B': 'Slate Navy', '#D1D5DB': 'Silver Mist', '#0051d5': 'Royal Blue', '#15171F': 'Black' }
export const colourName = (hex) => Object.values(COLOURS).find((c) => c.hex.toLowerCase() === String(hex).toLowerCase())?.name || LEGACY_NAMES[hex] || hex

export const PRINT_LABEL = { dtf: 'DTF (Direct to Film)' }
export const PLACEMENTS = ['front', 'back', 'left_sleeve', 'right_sleeve']
export const FONTS = ['Geist', 'Inter', 'serif', 'monospace']

// Custom studio prices in INR (owner, 2026-10-30)
// Blank tee by fit, plus a fee for EACH design (print) by its size. Size follows where the print goes:
// the back is large, the front chest is medium, a sleeve is small. Delivery is charged separately.
export const GARMENT_PRICE = { oversized: 350, regular: 250 }
export const PRINT_TIER = { back: 'large', front: 'medium', left_sleeve: 'small', right_sleeve: 'small' }
export const TIER_FEE = { large: 80, medium: 50, small: 30 }
export const TIER_ORDER = ['large', 'medium', 'small']
export const printFeeFor = (placement) => TIER_FEE[PRINT_TIER[placement]] ?? 0

// Upload rules
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
export const MIN_IMAGE_SIDE = 1000 // below this the print will look soft
export const MAX_ITEMS = 8
export const MAX_QUANTITY = 500

/** Total print fee for one garment. `items` = anything with a `placement` (the design list or spec.items). */
export function printFee(items) {
  return items.reduce((n, it) => n + printFeeFor(it.placement), 0)
}

/** e.g. "1 large, 2 small" */
export function printSummary(items) {
  const counts = {}
  for (const it of items) counts[PRINT_TIER[it.placement]] = (counts[PRINT_TIER[it.placement]] || 0) + 1
  return TIER_ORDER.filter((t) => counts[t]).map((t) => `${counts[t]} ${t}`).join(', ')
}

/** Price of ONE garment with the given fit and designs. */
export function unitPrice({ fit, items }) {
  return GARMENT_PRICE[fit] + printFee(items)
}

/** Delivery: free from the threshold, otherwise a flat fee. `policy` = SITE.policy */
export const shippingFor = (subtotal, policy) => (subtotal >= policy.freeShippingThreshold ? 0 : policy.shippingFee)

/** Full order price. Pass SITE.policy to include delivery in `total`. */
export function computePrice(spec, quantity = 1, policy = null) {
  const unit = unitPrice({ fit: spec.garment.fit, items: spec.items })
  const subtotal = unit * quantity
  const shipping = policy ? shippingFor(subtotal, policy) : 0
  return { unit, quantity, subtotal, shipping, total: subtotal + shipping }
}

/**
 * Build the JSON spec stored as the source of truth for an order.
 * @param state   { fit, colour, size, printType, designList }
 * @param resolve (item, fit) => { position, rotation, scale } in model space
 * @param extras  { modelVersion, files: { [itemId]: { fileId, sha256 } } }
 */
export function buildDesignSpec(state, resolve, extras = {}) {
  const { fit, colour, printType, designList } = state
  const files = extras.files || {}
  return {
    schemaVersion: SCHEMA_VERSION,
    garment: {
      model: 'tshirt_male_v1',
      modelVersion: extras.modelVersion ?? 1,
      fit,
      gsm: FITS[fit].gsm,
      colour,
      printType,
    },
    items: designList.map((item) => {
      const base = {
        id: item.id,
        type: item.type,
        placement: item.placement || 'front',
        pos: { x: item.pos?.x ?? 0, y: item.pos?.y ?? 0.04 },
        scale: { x: item.scale?.x ?? 0.35, y: item.scale?.y ?? 0.35 },
        resolved: resolve(item, fit),
      }
      if (item.type === 'text') {
        return {
          ...base,
          text: item.text,
          textColor: item.textColor,
          textSize: item.textSize,
          textFont: item.textFont,
          rasterSha256: files[item.id]?.sha256 ?? null, // transparent PNG frozen at order time
        }
      }
      return {
        ...base,
        name: item.name || 'image',
        mime: item.mime || null,
        width: item.width || null,
        height: item.height || null,
        fileId: files[item.id]?.fileId ?? null,
        sha256: files[item.id]?.sha256 ?? null,
      }
    }),
  }
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

/** Returns an array of error strings (empty = valid). Worker re-runs this. */
export function validateDesignSpec(spec) {
  const errs = []
  if (!spec || spec.schemaVersion !== SCHEMA_VERSION) return ['Unsupported design version']
  const g = spec.garment || {}
  if (!FITS[g.fit]) errs.push('Invalid fit')
  if (!PRINT_TYPES.includes(g.printType)) errs.push('Invalid print type')
  if (!coloursForFit(g.fit).some((c) => c.hex === g.colour)) errs.push('That shirt colour is not available in this fit')
  const items = Array.isArray(spec.items) ? spec.items : []
  if (items.length === 0) errs.push('Add at least one design to the garment')
  if (items.length > MAX_ITEMS) errs.push(`Too many design items (max ${MAX_ITEMS})`)
  items.forEach((it, i) => {
    const n = `Item ${i + 1}`
    if (!PLACEMENTS.includes(it.placement)) errs.push(`${n}: invalid placement`)
    if (!isNum(it.pos?.x) || !isNum(it.pos?.y) || Math.abs(it.pos.x) > 0.4 || Math.abs(it.pos.y) > 0.4) errs.push(`${n}: invalid position`)
    if (!isNum(it.scale?.x) || !isNum(it.scale?.y) || it.scale.x < 0.05 || it.scale.x > 0.6 || it.scale.y < 0.05 || it.scale.y > 0.6) errs.push(`${n}: invalid size`)
    if (it.type === 'text') {
      if (typeof it.text !== 'string' || !it.text.trim() || it.text.length > 200) errs.push(`${n}: text must be 1 to 200 characters`)
      if (!/^#[0-9a-fA-F]{6}$/.test(it.textColor || '')) errs.push(`${n}: invalid text colour`)
      if (!FONTS.includes(it.textFont)) errs.push(`${n}: invalid font`)
    } else if (it.type === 'image') {
      if (!it.fileId || !/^[0-9a-f]{64}$/.test(it.sha256 || '')) errs.push(`${n}: image file missing`)
    } else {
      errs.push(`${n}: unknown type`)
    }
  })
  return errs
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^\+?[0-9\s-]{10,15}$/
const PIN_RE = /^[0-9]{6}$/

/** Customer details + quantity. Returns { field: message }. */
export function validateCustomer(c) {
  const e = {}
  if (!c.name?.trim() || c.name.trim().length < 2) e.name = 'Enter your full name'
  if (!EMAIL_RE.test(c.email?.trim() || '')) e.email = 'Enter a valid email address'
  if (!PHONE_RE.test(c.phone?.trim() || '')) e.phone = 'Enter a valid phone number'
  if (!c.address?.trim() || c.address.trim().length < 8) e.address = 'Enter your full delivery address'
  if (!c.city?.trim()) e.city = 'Enter your city'
  if (!PIN_RE.test(c.pincode?.trim() || '')) e.pincode = 'Enter a 6-digit PIN code'
  const q = Number(c.quantity)
  if (!Number.isInteger(q) || q < 1 || q > MAX_QUANTITY) e.quantity = `Quantity must be 1 to ${MAX_QUANTITY}`
  if ((c.notes || '').length > 1000) e.notes = 'Notes are too long (max 1000 characters)'
  return e
}
