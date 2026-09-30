import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { SITE } from '../config/site'
import { getProductById } from '../data/products'

/**
 * Cart + wishlist state, persisted to localStorage.
 * Cart line = { key, productId, size, color (hex), colorName, qty }
 */
const CART_KEY = 'tc_cart_v1'
const WISH_KEY = 'tc_wishlist_v1'

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable (private mode etc.) – state still works in memory */
  }
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const { line } = action
      const found = state.find((l) => l.key === line.key)
      if (found) return state.map((l) => (l.key === line.key ? { ...l, qty: Math.min(10, l.qty + line.qty) } : l))
      return [...state, line]
    }
    case 'qty':
      return state.map((l) => (l.key === action.key ? { ...l, qty: Math.max(1, Math.min(10, l.qty + action.delta)) } : l))
    case 'remove':
      return state.filter((l) => l.key !== action.key)
    case 'clear':
      return []
    default:
      return state
  }
}

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, null, () => read(CART_KEY, []))
  const [wishlist, setWishlist] = useState(() => read(WISH_KEY, []))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  useEffect(() => write(CART_KEY, cart), [cart])
  useEffect(() => write(WISH_KEY, wishlist), [wishlist])

  const showToast = useCallback((message) => {
    setToast({ message, id: Date.now() })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  const addToCart = useCallback(
    ({ productId, size = 'M', color, colorName, qty = 1 }, { openDrawer = true } = {}) => {
      const product = getProductById(productId)
      if (!product) return
      const c = color || product.colors[0].hex
      const cn = colorName || product.colors.find((x) => x.hex === c)?.name || product.colors[0].name
      dispatch({ type: 'add', line: { key: `${productId}|${size}|${c}`, productId, size, color: c, colorName: cn, qty } })
      if (openDrawer) setDrawerOpen(true)
    },
    [],
  )

  const toggleWishlist = useCallback(
    (productId) => {
      setWishlist((w) => {
        const has = w.includes(productId)
        showToast(has ? 'Removed from wishlist' : 'Saved to wishlist')
        return has ? w.filter((x) => x !== productId) : [...w, productId]
      })
    },
    [showToast],
  )

  const value = useMemo(() => {
    const lines = cart
      .map((l) => ({ ...l, product: getProductById(l.productId) }))
      .filter((l) => l.product)
    const count = lines.reduce((n, l) => n + l.qty, 0)
    const subtotal = lines.reduce((n, l) => n + l.product.price * l.qty, 0)
    const { freeShippingThreshold, shippingFee, gstRate } = SITE.policy
    const shipping = subtotal === 0 || subtotal >= freeShippingThreshold ? 0 : shippingFee
    // Prices are treated as GST-inclusive (standard for Indian B2C pricing)
    const gstIncluded = Math.round(subtotal - subtotal / (1 + gstRate))
    return {
      lines,
      count,
      subtotal,
      shipping,
      gstIncluded,
      total: subtotal + shipping,
      freeShippingRemaining: Math.max(0, freeShippingThreshold - subtotal),
      wishlist,
      isWished: (id) => wishlist.includes(id),
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      addToCart,
      updateQty: (key, delta) => dispatch({ type: 'qty', key, delta }),
      removeLine: (key) => dispatch({ type: 'remove', key }),
      clearCart: () => dispatch({ type: 'clear' }),
      toggleWishlist,
      toast,
      showToast,
    }
  }, [cart, wishlist, drawerOpen, toast, addToCart, toggleWishlist, showToast])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
