// Shop pricing is computed here from the same catalog the storefront displays.
// Nothing the browser sends (prices, totals) is trusted; only product ids, sizes, colours and quantities.
import { getProductById } from '../../src/data/products.js'
import { SIZES, SHOP_FITS, SHOP_PRICES, FIT_LABEL, coloursForFit, sizesFor } from '../../shared/designSpec.js'

export const MAX_LINE_QTY = 10
export const MAX_LINES = 20

/** Returns { error } or { items, subtotal, shipping, total, count }. */
export function priceCart(rawItems, { enabled = [] } = {}) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return { error: 'Your bag is empty' }
  if (rawItems.length > MAX_LINES) return { error: 'Too many items in the bag' }

  const items = []
  for (const raw of rawItems) {
    const product = getProductById(Number(raw.productId))
    const qty = Number(raw.qty)
    if (!product) return { error: 'An item in your bag is no longer available' }
    if (!SIZES.includes(raw.size)) return { error: `Choose a size for ${product.name}` }
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_LINE_QTY) return { error: 'Invalid quantity' }
    if (!SHOP_FITS.includes(raw.fit)) return { error: `Choose a fit for ${product.name}` }
    const colour = coloursForFit(raw.fit).find((c) => c.hex === raw.color)
    if (!colour) return { error: `${product.name} is not available in that colour in the ${FIT_LABEL[raw.fit].toLowerCase()}` }
    if (!sizesFor(raw.fit, colour.hex, enabled).includes(raw.size)) return { error: `${product.name} in ${colour.name} (${FIT_LABEL[raw.fit].toLowerCase()}) is not available in size ${raw.size}` }
    items.push({ productId: product.id, slug: product.slug, name: product.name, size: raw.size, fit: raw.fit, fitLabel: FIT_LABEL[raw.fit], colour: colour.name, colourHex: colour.hex, qty, price: SHOP_PRICES[raw.fit] })
  }

  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0)
  // Delivery is free on every collection order (custom studio orders pay delivery, see shippingFor)
  return { items, subtotal, shipping: 0, total: subtotal, count: items.reduce((n, i) => n + i.qty, 0) }
}
