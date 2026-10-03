// Same-origin /api by default (Vite proxy in dev, Worker route in production).
// Set VITE_API_BASE only if the API lives on a different domain.
const BASE = import.meta.env.VITE_API_BASE || ''

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

const UNREACHABLE = import.meta.env.DEV
  ? 'The API is not running. Start it with "npm run dev:node" inside the worker folder.'
  : 'We could not reach our server. Please try again in a moment.'

/** JSON (or FormData) request. Always resolves to parsed JSON or throws ApiError with a customer-safe message. */
export async function api(path, { method = 'GET', json, form, signal } = {}) {
  let res
  try {
    res = await fetch(BASE + path, {
      method,
      signal,
      credentials: BASE ? 'include' : 'same-origin',
      headers: json ? { 'Content-Type': 'application/json' } : undefined,
      body: form ?? (json ? JSON.stringify(json) : undefined),
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError(UNREACHABLE, 0)
  }
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json().catch(() => null) : null
  if (!res.ok) throw new ApiError(data?.error || (isJson ? 'Something went wrong. Please try again.' : UNREACHABLE), res.status)
  if (!isJson) throw new ApiError(UNREACHABLE, res.status)
  return data
}

export const apiUrl = (path) => BASE + path
