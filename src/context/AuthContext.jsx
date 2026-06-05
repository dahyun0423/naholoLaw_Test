import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

const STORAGE_KEY = 'naholo_auth_user'

const DEMO_USER = {
  name: '김지민',
  email: 'example@gmail.com',
  username: 'abcd1234',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_KEY)
  }, [user])

  // 데모: 어떤 아이디/비밀번호든 로그인 허용 (실서비스라면 API 연동)
  const login = ({ username }) => {
    setUser({ ...DEMO_USER, username: username || DEMO_USER.username })
    return { ok: true }
  }

  const signup = (form) => {
    setUser({ name: form.name, email: form.email, username: form.username })
    return { ok: true }
  }

  const logout = () => setUser(null)

  const setProfile = (patch) => setUser((u) => (u ? { ...u, ...patch } : u))

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, setProfile, isAuthed: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
