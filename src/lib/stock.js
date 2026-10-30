import { useEffect, useState } from 'react'
import { api } from './api'
import { sizesFor } from '../../shared/designSpec'

// Sizes that are sold out or nearly (the server only sends counts of 3 or fewer). Cached for 30 seconds.
let cache = null
let loadedAt = 0

function loadLow() {
  if (!cache || Date.now() - loadedAt > 30_000) {
    loadedAt = Date.now()
    cache = api('/api/stock')
      .then((d) => ({ low: d.low || [], enabled: d.enabled || [] }))
      .catch(() => ({ low: [], enabled: [] }))
  }
  return cache
}

/**
 * left(fit, colourHex, size) -> number of tees left when 3 or fewer (0 = sold out), otherwise null
 * (plenty, or not tracked). sizes(fit, colourHex) -> the sizes on sale (a size like white oversized S
 * only appears once the owner has stocked it). The server still checks everything when an order is placed.
 */
export function useStock() {
  const [{ low, enabled }, setData] = useState({ low: [], enabled: [] })
  useEffect(() => {
    let live = true
    loadLow().then((d) => live && setData(d))
    return () => {
      live = false
    }
  }, [])
  return {
    enabled,
    sizes: (fit, hex) => sizesFor(fit, hex, enabled),
    left: (fit, hex, size) => {
      const row = low.find((r) => r.fit === fit && r.colour.toUpperCase() === String(hex).toUpperCase() && r.size === size)
      return row ? row.qty : null
    },
  }
}
