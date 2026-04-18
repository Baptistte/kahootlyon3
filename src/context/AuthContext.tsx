import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AuthUser { id: number; username: string }
interface AuthCtx {
  user: AuthUser | null
  token: string | null
  login: (token: string, username: string, id: number) => void
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const t = localStorage.getItem('token')
    const u = localStorage.getItem('user')
    if (t && u) {
      setToken(t)
      setUser(JSON.parse(u) as AuthUser)
    }
  }, [])

  const login = (t: string, username: string, id: number) => {
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify({ id, username }))
    setToken(t)
    setUser({ id, username })
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return <Ctx.Provider value={{ user, token, login, logout }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
