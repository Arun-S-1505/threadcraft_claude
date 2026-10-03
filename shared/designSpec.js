/**
 * Design-spec schema, pricing and validation, shared by the React app and the
 * Worker. Pure JS, no DOM or framework imports, so it runs in both places.
 * The Worker must call computePrice() itself and ignore any total from the browser.
 */
export const SCHEMA_VERSION = 1

export const FITS = { regular: { gsm: 180 }, oversized: { gsm: 240 } }
export const SIZES = ['S', 'M', 'L', 'XL', 'XXL']
export const PRINT_TYPES = ['dtg', 'screen', 'embroidery']
export const PLACEMENTS = ['front', 'back', 'left_sleeve', 'right_sleeve']
export const FONTS = ['Geist', 'Inter', 'serif', 'monospace']
export const SHIRT_COLOURS = {
  '#FFFFFF': 'White',
  '#1A1A1A': 'Onyx Black',
  '#1E293B': 'Slate Navy',
  '#0051d5': 'Royal Blue',
  '#D1D5DB': 'Silver Mist',
}

// Prices in INR (placeholders: replace with real prices)
export const BASE_PRICES = { dtg: 899, screen: 799, embroidery: 1199 }
export const PRINT_FEES = { dtg: 199, screen: 149, embroidery: 299 }
export const EXTRA_ITEM_FEE = 99
export const FIT_PRICE = { regular: 0, oversized: 200 } // oversized uses the heavier 240 GSM fabric

// Upload rules
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
export const MIN_IMAGE_SIDE = 1000 // below this the print will look soft
export const MAX_ITEMS = 8
export const MAX_QUANTITY = 500

export function printFee(count, type) {
  if (!count) return 0
  return PRINT_FEES[type] + Math.max(0, count - 1) * EXTRA_ITEM_FEE
}

/** Price of ONE garment with the given spec. */
export function unitPrice({ fit, printType, itemCount }) {
  return BASE_PRICES[printType] + FIT_PRICE[fit] + printFee(itemCount, printType)
}

export function computePrice(spec, quantity = 1) {
  const unit = unitPrice({ fit: spec.garment.fit, printType: spec.garment.printType, itemCount: spec.items.length })
  return { unit, quantity, total: unit * quantity }
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
  if (!SHIRT_COLOURS[g.colour]) errs.push('Invalid shirt colour')
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
