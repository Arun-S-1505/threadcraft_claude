import { useEffect, useState } from 'react'
import { api } from './api'

// Sizes that are sold out or nearly (the server only sends counts of 3 or fewer). Cached for 30 seconds.
let cache = null
let loadedAt = 0

function loadLow() {
  if (!cache || Date.now() - loadedAt > 30_000) {
    loadedAt = Date.now()
    cache = api('/api/stock')
      .then((d) => d.low || [])
      .catch(() => [])
  }
  return cache
}

/**
 * left(fit, colourHex, size) -> number of tees left when 3 or fewer (0 = sold out), otherwise null
 * (plenty, or not tracked). The server still checks stock when an order is placed.
 */
export function useStock() {
  const [low, setLow] = useState([])
  useEffect(() => {
    let live = true
    loadLow().then((rows) => live && setLow(rows))
    return () => {
      live = false
    }
  }, [])
  return {
    left: (fit, hex, size) => {
      const row = low.find((r) => r.fit === fit && r.colour.toUpperCase() === String(hex).toUpperCase() && r.size === size)
      return row ? row.qty : null
    },
  }
}
