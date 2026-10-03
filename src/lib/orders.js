import { buildDesignSpec, validateDesignSpec } from '../../shared/designSpec'
import { api } from './api'
import { getPlacementTransform, getScaleXY, DECAL_MODEL_VERSION } from '../components/decalTransform'
import { textItemToBlob } from '../components/textRaster'

export async function sha256Hex(blob) {
  const buf = await blob.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const resolveTransform = (item, fit) =>
  getPlacementTransform(item.placement, item.pos, getScaleXY(item.scale), fit)

/** Views that need a preview snapshot: front always, plus any other printed side. */
export function viewsToCapture(designList) {
  const set = new Set(['front'])
  designList.forEach((d) => set.add(d.placement || 'front'))
  return [...set]
}

/**
 * Builds everything the Worker needs: the spec, the untouched original uploads,
 * rasterised text PNGs, and preview snapshots. Files are keyed by sha256 (dedupes).
 */
export async function prepareOrder({ fit, colour, printType, designList, capture }) {
  const files = {} // itemId -> { sha256 }
  const blobs = new Map() // sha256 -> Blob

  for (const item of designList) {
    const blob = item.type === 'image' ? item.file : await textItemToBlob(item)
    if (!blob) continue
    const sha256 = await sha256Hex(blob)
    blobs.set(sha256, blob)
    files[item.id] = { fileId: sha256, sha256 }
  }

  const spec = buildDesignSpec({ fit, colour, printType, designList }, resolveTransform, {
    modelVersion: DECAL_MODEL_VERSION,
    files,
  })
  const errors = validateDesignSpec(spec)

  let previews = {}
  if (errors.length === 0 && capture) previews = await capture(viewsToCapture(designList))

  return { spec, errors, blobs, previews }
}

/**
 * Sends the order. The Worker recomputes the price from the spec; any total shown
 * in the browser is for display only and is never trusted.
 * Resolves { orderId, total, payment } where payment is Razorpay params, null, or { error }.
 */
export function submitOrder({ spec, blobs, previews, customer, size, quantity }) {
  const form = new FormData()
  form.append('order', JSON.stringify({ spec, customer, size, quantity }))
  blobs.forEach((blob, sha) => form.append(`file_${sha}`, blob, sha))
  Object.entries(previews).forEach(([view, blob]) => form.append(`preview_${view}`, blob, `${view}.webp`))
  return api('/api/orders', { method: 'POST', form })
}
