import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { AuthBrand, AuthCheckbox, AuthField, AuthSubmit, PasswordField, authInputClass } from '../components/AuthForm.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname || '/app/dashboard'

  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [keep, setKeep] = useState(false)
  const [error, setError] = useState('')

  const onChange = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
    if (error) setError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!form.username || !form.password) {
      setError('아이디와 비밀번호를 모두 입력해주세요.')
      return
    }
    const result = await login(form)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate(redirectTo, { replace: true })
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#f8fafc]">
      <form onSubmit={submit} className="flex w-full max-w-[460px] flex-col gap-8 px-10 py-12" noValidate>
        <div className="flex justify-center">
          <Link to="/" aria-label="나홀로법에"><AuthBrand /></Link>
        </div>

        <div className="flex flex-col gap-8">
          <AuthField label="아이디">
            <div className="relative flex items-center">
              <input className={authInputClass} placeholder="아이디를 입력해주세요" value={form.username} onChange={onChange('username')} autoComplete="username" />
            </div>
          </AuthField>
          <AuthField label="비밀번호">
            <PasswordField id="login-password" value={form.password} onChange={onChange('password')} shown={showPassword} onToggle={() => setShowPassword((current) => !current)} placeholder="비밀번호를 입력해주세요" autoComplete="current-password" />
          </AuthField>
        </div>

        {error && <p role="alert" className="-my-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-500">{error}</p>}

        <div className="flex items-center justify-between">
          <AuthCheckbox id="keep-login" checked={keep} onChange={(event) => setKeep(event.target.checked)}>로그인 상태 유지</AuthCheckbox>
        </div>

        <AuthSubmit>로그인</AuthSubmit>

        <p className="text-center text-sm text-ink-500">
          <span className="mr-[10px]">계정이 없으신가요?</span>
          <Link to="/signup" className="text-brand-400">회원가입</Link>
        </p>
      </form>
    </main>
  )
}
