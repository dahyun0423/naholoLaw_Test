import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

const STORAGE_KEY = 'naholo_auth_user'
const ACCOUNT_KEY = 'naholo_auth_account'

const DEMO_USER = {
  name: '김지민',
  email: 'example@gmail.com',
  username: 'abcd1234',
}

const readAccount = () => {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const createSalt = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

const hashPassword = async (password, salt) => {
  const bytes = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

const saveAccount = async (user, password) => {
  const salt = createSalt()
  const passwordHash = await hashPassword(password, salt)
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ user, salt, passwordHash }))
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

  const login = async ({ username, password }) => {
    const account = readAccount()
    if (account) {
      const passwordHash = await hashPassword(password, account.salt)
      if (account.user.username !== username || account.passwordHash !== passwordHash) {
        return { ok: false, error: '아이디 또는 비밀번호가 일치하지 않습니다.' }
      }
      setUser(account.user)
      return { ok: true }
    }

    const nextUser = { ...DEMO_USER, username: username || DEMO_USER.username }
    await saveAccount(nextUser, password)
    setUser(nextUser)
    return { ok: true }
  }

  const signup = async (form) => {
    const nextUser = { name: form.name, email: form.email, username: form.username }
    await saveAccount(nextUser, form.password)
    setUser(nextUser)
    return { ok: true }
  }

  const logout = () => setUser(null)

  const setProfile = (patch) => setUser((current) => {
    if (!current) return current
    const nextUser = { ...current, ...patch }
    const account = readAccount()
    if (account) localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ ...account, user: nextUser }))
    return nextUser
  })

  const changePassword = async ({ currentPassword, newPassword }) => {
    if (!user) return { ok: false, error: '로그인 정보를 확인할 수 없습니다.' }
    const account = readAccount()

    if (account) {
      const currentHash = await hashPassword(currentPassword, account.salt)
      if (currentHash !== account.passwordHash) {
        return { ok: false, error: '현재 비밀번호가 일치하지 않습니다.' }
      }
    }

    await saveAccount(user, newPassword)
    return { ok: true }
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, setProfile, changePassword, isAuthed: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
