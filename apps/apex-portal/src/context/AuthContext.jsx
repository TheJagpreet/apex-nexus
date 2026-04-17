import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getMe, login as apiLogin, register as apiRegister } from '../api/identity'

const AuthContext = createContext(null)

const TOKEN_KEY = 'apex_token'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY))

  // On mount, validate stored token
  useEffect(() => {
    if (!token) { setLoading(false); return }
    getMe(token)
      .then(u => setUser(u))
      .catch(() => { localStorage.removeItem(TOKEN_KEY); setToken(null) })
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password)
    localStorage.setItem(TOKEN_KEY, data.access_token)
    setToken(data.access_token)
    const u = await getMe(data.access_token)
    setUser(u)
    return u
  }, [])

  const signup = useCallback(async (username, email, password, displayName) => {
    await apiRegister(username, email, password, displayName)
    return login(username, password)
  }, [login])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
