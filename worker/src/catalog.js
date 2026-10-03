// Shop pricing is computed here from the same catalog the storefront displays.
// Nothing the browser sends (prices, totals) is trusted; only product ids, sizes, colours and quantities.
import { getProductById } from '../../src/data/products.js'
import { SITE } from '../../src/config/site.js'

const SIZES = ['S', 'M', 'L', 'XL', 'XXL']
export const MAX_LINE_QTY = 10
export const MAX_LINES = 20

/** Returns { error } or { items, subtotal, shipping, total, count }. */
export function priceCart(rawItems, { cod = false } = {}) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return { error: 'Your bag is empty' }
  if (rawItems.length > MAX_LINES) return { error: 'Too many items in the bag' }

  const items = []
  for (const raw of rawItems) {
    const product = getProductById(Number(raw.productId))
    const qty = Number(raw.qty)
    if (!product) return { error: 'An item in your bag is no longer available' }
    if (!SIZES.includes(raw.size)) return { error: `Choose a size for ${product.name}` }
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_LINE_QTY) return { error: 'Invalid quantity' }
    const colour = product.colors.find((c) => c.hex === raw.color)
    if (!colour) return { error: `Invalid colour for ${product.name}` }
    items.push({ productId: product.id, slug: product.slug, name: product.name, size: raw.size, colour: colour.name, colourHex: colour.hex, qty, price: product.price })
  }

  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0)
  const { freeShippingThreshold, shippingFee, codFee } = SITE.policy
  const shipping = subtotal >= freeShippingThreshold ? 0 : shippingFee
  const total = subtotal + shipping + (cod ? codFee : 0)
  return { items, subtotal, shipping: shipping + (cod ? codFee : 0), total, count: items.reduce((n, i) => n + i.qty, 0) }
}
