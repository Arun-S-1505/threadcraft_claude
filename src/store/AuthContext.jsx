import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

/**
 * Who is signed in. The session lives in an HttpOnly cookie set by the server, so nothing secret is
 * kept in the browser; this context only mirrors /api/me.
 * user: undefined while loading, null when signed out, otherwise { email, name, phone, address, ... }
 */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    const ctrl = new AbortController()
    api('/api/me', { signal: ctrl.signal })
      .then((d) => setUser(d.user))
      .catch((e) => e.name !== 'AbortError' && setUser(null))
    return () => ctrl.abort()
  }, [])

  const signOut = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST', json: {} }).catch(() => {})
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading: user === undefined, setUser, signOut }), [user, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
