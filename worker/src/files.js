import { MAX_UPLOAD_BYTES } from '../../shared/designSpec.js'

export const MAX_FILES = 16
export const MAX_REQUEST_BYTES = 40 * 1024 * 1024

export async function sha256Hex(buf) {
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Identify a file from its bytes; never trust the client's MIME type. */
export function sniffMime(bytes) {
  const b = bytes
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp'
  const head = new TextDecoder().decode(b.slice(0, 512)).trimStart().toLowerCase()
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'image/svg+xml'
  return null
}

// SVG is untrusted input: reject anything that can run code or pull in other resources.
const SVG_FORBIDDEN = /<script|<foreignobject|<iframe|<embed|<object|\son[a-z]+\s*=|javascript:|<!entity|<!doctype[^>]*\[/i
export function svgIsSafe(bytes) {
  return !SVG_FORBIDDEN.test(new TextDecoder().decode(bytes))
}

/**
 * Reads the multipart form into verified file records.
 * Returns { files: Map<sha256,{bytes,mime}>, previews: Map<view,{sha256,bytes,mime}>, error? }
 */
export async function readUploads(form) {
  const files = new Map()
  const previews = new Map()
  let count = 0

  for (const [key, value] of form.entries()) {
    if (typeof value === 'string' || key === 'order') continue
    if (++count > MAX_FILES) return { error: 'Too many files' }
    if (value.size > MAX_UPLOAD_BYTES) return { error: 'A file is larger than 8 MB' }

    const bytes = new Uint8Array(await value.arrayBuffer())
    const mime = sniffMime(bytes)
    if (!mime) return { error: 'Unsupported file type' }
    if (mime === 'image/svg+xml' && !svgIsSafe(bytes)) return { error: 'SVG contains disallowed content' }
    const sha256 = await sha256Hex(bytes)

    if (key.startsWith('file_')) {
      if (key.slice(5) !== sha256) return { error: 'File checksum mismatch' }
      files.set(sha256, { bytes, mime })
    } else if (key.startsWith('preview_')) {
      if (mime !== 'image/webp' && mime !== 'image/png') return { error: 'Invalid preview image' }
      previews.set(key.slice(8), { sha256, bytes, mime })
    } else {
      return { error: 'Unexpected upload field' }
    }
  }
  return { files, previews }
}
