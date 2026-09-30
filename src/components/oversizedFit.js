/**
 * Oversized fit: reshapes the regular-fit shirt mesh (shirt_baked.glb) instead of
 * shipping a second model. Boxier body, wider and longer sleeves, dropped
 * shoulders and a longer hem. Decal anchor points go through the same
 * transform so prints stay on the right spot.
 */
export const OVERSIZED = {
  width: 1.32, // body + sleeve width
  depth: 1.1, // front-to-back
  drop: 0.06, // how far the shoulder seam drops
  length: 0.09, // extra body length at the hem
  boxy: 0.06, // extra width toward the hem (less waist taper)
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

/** Move one point of the regular-fit mesh to its oversized position. */
export function toOversized([x, y, z], o = OVERSIZED) {
  // Length: stretch everything below the armpit down toward the hem
  const t = clamp((0.0 - y) / 0.35, 0, 1)
  let ny = y - o.length * t
  // Dropped shoulder: pull the sleeve and shoulder area down
  const ax = Math.abs(x)
  ny -= o.drop * smooth(0.08, 0.22, ax) * smooth(-0.12, 0.05, y)
  // Width: whole garment wider, hem a little wider still (boxy)
  const nx = x * (o.width + o.boxy * t)
  const nz = z * o.depth
  return [nx, ny, nz]
}

/** Returns a new BufferGeometry with the oversized shape applied. */
export function makeOversizedGeometry(source) {
  const g = source.clone()
  const pos = g.attributes.position
  const nor = g.attributes.normal
  const p = [0, 0, 0]
  for (let i = 0; i < pos.count; i++) {
    p[0] = pos.getX(i)
    p[1] = pos.getY(i)
    p[2] = pos.getZ(i)
    const q = toOversized(p)
    pos.setXYZ(i, q[0], q[1], q[2])
    if (nor) {
      // normals scale inversely with the axis stretch
      const w = OVERSIZED.width + OVERSIZED.boxy * clamp((0.0 - p[1]) / 0.35, 0, 1)
      let nx = nor.getX(i) / w
      let nz = nor.getZ(i) / OVERSIZED.depth
      const ny = nor.getY(i)
      const len = Math.hypot(nx, ny, nz) || 1
      nor.setXYZ(i, nx / len, ny / len, nz / len)
    }
  }
  pos.needsUpdate = true
  if (nor) nor.needsUpdate = true
  g.computeBoundingBox()
  g.computeBoundingSphere()
  return g
}
