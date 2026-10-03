import { toOversized } from './oversizedFit'

/**
 * Model-space decal transform for a design item.
 * Bump DECAL_MODEL_VERSION whenever the maths below (or oversizedFit.js) changes,
 * so orders saved under an older version keep their stored resolved transform.
 */
export const DECAL_MODEL_VERSION = 1

export function getScaleXY(scale) {
  if (typeof scale === 'number') return { x: scale, y: scale }
  if (scale && typeof scale === 'object') return { x: scale.x || 0.35, y: scale.y || 0.35 }
  return { x: 0.35, y: 0.35 }
}

function getBaseTransform(placement, pos, scale) {
  const p = placement || 'front'
  const x = pos?.x || 0
  const y = pos?.y || 0.04
  const sX = scale.x * 1.25
  const sY = scale.y * 1.25

  switch (p) {
    case 'back':
      return { position: [-x * 1.5, y * 1.5 - 0.02, -0.14], rotation: [0, Math.PI, 0], scale: [sX, sY, 0.26] }
    case 'left_sleeve':
      return { position: [-0.22 - y * 0.4, 0.08 + x * 0.4, 0.02], rotation: [0, -Math.PI / 2, 0], scale: [sX * 0.75, sY * 0.75, 0.15] }
    case 'right_sleeve':
      return { position: [0.22 + y * 0.4, 0.08 - x * 0.4, 0.02], rotation: [0, Math.PI / 2, 0], scale: [sX * 0.75, sY * 0.75, 0.15] }
    case 'front':
    default:
      return { position: [x * 1.5, y * 1.5 - 0.02, 0.14], rotation: [0, 0, 0], scale: [sX, sY, 0.26] }
  }
}

export function getPlacementTransform(placement, pos, scale, fit = 'regular') {
  const base = getBaseTransform(placement, pos, scale)
  if (fit !== 'oversized') return base
  // Same anchor point, moved through the oversized reshaping, with prints a little larger
  const sleeve = placement === 'left_sleeve' || placement === 'right_sleeve'
  const k = sleeve ? [1.1, 1.1, 1.1] : [1.2, 1.1, 1.1]
  return {
    position: toOversized(base.position),
    rotation: base.rotation,
    scale: [base.scale[0] * k[0], base.scale[1] * k[1], base.scale[2] * k[2]],
  }
}
