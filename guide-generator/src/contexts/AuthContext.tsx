import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { Owner } from '../types'
import {
  authenticateOwner,
  getCurrentOwner,
  registerOwner,
  setCurrentOwner,
} from '../utils/auth'

interface AuthContextValue {
  owner: Owner | null
  loading: boolean
  login: (email: string, password: string) => Promise<Owner>
  register: (email: string, password: string) => Promise<Owner>
  logout: () => void
  refresh: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [owner, setOwner] = useState<Owner | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const current = getCurrentOwner()
      setOwner(current)
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const next = await authenticateOwner(email, password)
    setOwner(next)
    return next
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const next = await registerOwner(email, password)
    setOwner(next)
    return next
  }, [])

  const logout = useCallback(() => {
    setCurrentOwner(null)
    setOwner(null)
  }, [])

  const refresh = useCallback(() => {
    const current = getCurrentOwner()
    setOwner(current)
  }, [])

  return (
    <AuthContext.Provider value={{ owner, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return ctx
}
