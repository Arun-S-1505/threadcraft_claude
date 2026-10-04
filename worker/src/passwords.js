/**
 * Password hashing with PBKDF2-SHA256 (built into the Workers runtime, no libraries).
 * The stored text carries its own settings: pbkdf2-sha256$<iterations>$<salt>$<hash>, so the
 * iteration count can be changed later without breaking existing passwords.
 * Workers allow at most 100,000 PBKDF2 iterations per call.
 */
const MAX_ITERATIONS = 100_000

const enc = new TextEncoder()
const toB64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
}

function safeEqualBytes(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export const iterationsFor = (env) => Math.min(MAX_ITERATIONS, Math.max(10_000, Number(env?.PBKDF2_ITERATIONS) || MAX_ITERATIONS))

export async function hashPassword(password, iterations = MAX_ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return `pbkdf2-sha256$${iterations}$${toB64(salt)}$${toB64(await derive(password, salt, iterations))}`
}

export async function verifyPassword(password, stored) {
  const [scheme, iter, salt, hash] = String(stored || '').split('$')
  if (scheme !== 'pbkdf2-sha256' || !iter || !salt || !hash) return false
  const iterations = Math.min(MAX_ITERATIONS, Number(iter))
  if (!Number.isFinite(iterations) || iterations < 1) return false
  const got = new Uint8Array(await derive(password, fromB64(salt), iterations))
  return safeEqualBytes(got, fromB64(hash))
}

// Used when the email is unknown, so a wrong email takes as long as a wrong password.
let dummy
export const dummyVerify = (password) => {
  dummy ??= hashPassword('threadcraft-timing-equaliser', MAX_ITERATIONS)
  return dummy.then((h) => verifyPassword(password, h)).then(() => false)
}

const COMMON = new Set(['password', 'password1', '12345678', '123456789', '1234567890', 'qwertyuiop', 'iloveyou', 'threadcraft', 'abcd1234', '11111111'])

/** Returns an error message, or null when the password is acceptable. */
export function passwordProblem(password, email = '') {
  const p = String(password ?? '')
  if (p.length < 8) return 'Use at least 8 characters for your password.'
  if (p.length > 128) return 'That password is too long (128 characters at most).'
  if (COMMON.has(p.toLowerCase()) || /^(.)\1+$/.test(p)) return 'That password is too easy to guess. Please choose another.'
  if (email && p.toLowerCase() === String(email).toLowerCase()) return 'Your password should not be your email address.'
  return null
}
