// Blank-tee stock, counted per fit + colour + size (every design is printed to order on the same blanks).
// A combination with no row is "not tracked": it can always be ordered. A row with qty 0 is sold out.
import { FIT_LABEL, colourName, comboKey, isGated } from '../../shared/designSpec.js'

const normColour = (hex) => String(hex || '').toUpperCase()
const keyOf = (l) => `${l.fit}|${normColour(l.colour)}|${l.size}`
const label = (l) => `${FIT_LABEL[l.fit] || l.fit}, ${colourName(l.colour)}, size ${l.size}`

/** comboKey()s of gated sizes (e.g. white oversized S) that the owner has stocked (count above 0). */
export async function enabledGated(db) {
  try {
    const rows = (await db.prepare(`SELECT fit, colour, size FROM stock WHERE qty > 0`).all()).results
    return rows.filter((r) => isGated(r.fit, r.colour, r.size)).map((r) => comboKey(r.fit, r.colour, r.size))
  } catch (err) {
    console.error('stock enabled list failed', err)
    return []
  }
}

/** Merge lines with the same fit + colour + size. */
export function mergeLines(lines) {
  const map = new Map()
  for (const l of lines) {
    if (!l.fit || !l.colour || !l.size || !(l.qty > 0)) continue
    const k = keyOf(l)
    const prev = map.get(k)
    map.set(k, prev ? { ...prev, qty: prev.qty + l.qty } : { fit: l.fit, colour: normColour(l.colour), size: l.size, qty: l.qty })
  }
  return [...map.values()]
}

/** The tees an order uses: [{ fit, colour, size, qty }]. Old orders without a fit give no lines. */
export function linesFromOrder(order) {
  let spec
  try {
    spec = JSON.parse(order.spec_json || '{}')
  } catch {
    return []
  }
  if (order.kind === 'custom') {
    const g = spec.garment || {}
    return [{ fit: g.fit, colour: g.colour, size: order.size, qty: order.quantity }]
  }
  return (spec.items || []).map((i) => ({ fit: i.fit, colour: i.colourHex, size: i.size, qty: i.qty }))
}

/**
 * Takes the tees from stock. Returns { ok: true, taken } or { error } (nothing is taken then).
 * A problem with the stock table itself never blocks an order: it is logged and the order goes through.
 */
export async function reserveStock(db, lines, at) {
  const taken = []
  try {
    for (const l of mergeLines(lines)) {
      const r = await db
        .prepare(`UPDATE stock SET qty = qty - ?1, updated_at = ?2 WHERE fit = ?3 AND colour = ?4 AND size = ?5 AND qty >= ?1`)
        .bind(l.qty, at, l.fit, l.colour, l.size)
        .run()
      if (r.meta.changes) {
        taken.push(l)
        continue
      }
      const row = await db.prepare(`SELECT qty FROM stock WHERE fit = ?1 AND colour = ?2 AND size = ?3`).bind(l.fit, l.colour, l.size).first()
      if (row) {
        await releaseStock(db, taken, at)
        return { error: row.qty > 0 ? `Sorry, only ${row.qty} left of ${label(l)}. Please lower the quantity or pick another size.` : `Sorry, ${label(l)} is sold out.` }
      }
      // no row = not tracked
    }
    return { ok: true, taken }
  } catch (err) {
    console.error('stock reserve failed', err)
    await releaseStock(db, taken, at).catch(() => {})
    return { ok: true, taken: [] }
  }
}

/** Puts tees back (cancelled order, or an order that could not be saved). Only rows that exist are changed. */
export async function releaseStock(db, lines, at) {
  for (const l of mergeLines(lines)) {
    await db.prepare(`UPDATE stock SET qty = qty + ?1, updated_at = ?2 WHERE fit = ?3 AND colour = ?4 AND size = ?5`).bind(l.qty, at, l.fit, l.colour, l.size).run()
  }
}
