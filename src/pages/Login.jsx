import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Button, Field, inputCls, cx } from '../components/ui.jsx'
import { Logo, Eye, EyeOff } from '../components/icons.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname || '/app/dashboard'

  const [form, setForm] = useState({ username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [keep, setKeep] = useState(true)
  const [error, setError] = useState('')

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
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
    <div className="grid min-h-screen place-items-center bg-ink-50 px-5 py-12">
      <div className="w-full max-w-[420px]">
        <Link to="/" className="flex items-center justify-center gap-2">
          <Logo size={36} />
          <span className="text-2xl font-extrabold text-brand-300 tracking-tight">나홀로법에</span>
        </Link>
        <p className="mt-3 text-center text-sm text-ink-500">AI와 함께 시작하는 나홀로 소송</p>

        <form onSubmit={submit} className="mt-8 rounded-3xl border border-ink-200 bg-white p-7 shadow-sm">
          <h1 className="text-xl font-bold text-ink-900">로그인</h1>
          {error && <div className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-500">{error}</div>}

          <div className="mt-5 space-y-4">
            <Field label="아이디">
              <input className={inputCls} placeholder="abcd1234" value={form.username} onChange={onChange('username')} autoComplete="username" />
            </Field>
            <Field label="비밀번호">
              <div className="relative">
                <input
                  className={cx(inputCls, 'pr-11')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="비밀번호를 입력하세요"
                  value={form.password}
                  onChange={onChange('password')}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600" aria-label="비밀번호 표시">
                  {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </Field>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-ink-600">
            <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-brand-400 accent-brand-300" />
            로그인 상태 유지
          </label>

          <Button type="submit" className="mt-6 w-full">로그인</Button>

          <div className="mt-4 flex items-center justify-center gap-3 text-xs text-ink-400">
            <button type="button" className="hover:text-ink-600">아이디 찾기</button>
            <span className="h-3 w-px bg-ink-200" />
            <button type="button" className="hover:text-ink-600">비밀번호 찾기</button>
          </div>

          <p className="mt-5 text-center text-sm text-ink-500">
            계정이 없으신가요? <Link to="/signup" className="font-semibold text-brand-400 hover:underline">회원가입</Link>
          </p>
        </form>

        <p className="mt-5 text-center text-xs text-ink-400">데모 계정 정보는 현재 기기에만 저장됩니다.</p>
      </div>
    </div>
  )
}
