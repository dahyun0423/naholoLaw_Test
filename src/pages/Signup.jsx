import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { AuthBrand, AuthCheckbox, AuthField, AuthSubmit, PasswordField, authInputClass } from '../components/AuthForm.jsx'
import LegalDocModal from '../components/LegalDocModal.jsx'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', username: '', password: '', confirm: '' })
  const [show, setShow] = useState({ password: false, confirm: false })
  const [agree, setAgree] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [visited, setVisited] = useState({})
  const [doc, setDoc] = useState(null)

  const errors = {
    name: !form.name.trim() ? '이름을 입력해주세요.' : '',
    email: !form.email ? '이메일을 입력해주세요.' : !emailPattern.test(form.email) ? '이메일 형식이 맞지 않아요. @ 와 도메인(.com 등)을 확인해주세요.' : '',
    username: !form.username ? '아이디를 입력해주세요.' : form.username.length < 4 ? '아이디는 4자 이상 입력해주세요.' : '',
    password: !form.password ? '비밀번호를 입력해주세요.' : !passwordPattern.test(form.password) ? '8자 이상, 영문과 숫자를 함께 입력해주세요.' : '',
    confirm: !form.confirm ? '비밀번호를 다시 입력해주세요.' : form.password !== form.confirm ? '비밀번호가 일치하지 않아요.' : '',
  }
  const valid = !Object.values(errors).some(Boolean) && agree
  const visibleError = (key) => (submitted || visited[key] ? errors[key] : '')

  const onChange = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const onBlur = (key) => () => setVisited((current) => ({ ...current, [key]: true }))

  const submit = async (event) => {
    event.preventDefault()
    setSubmitted(true)
    if (!valid) return
    await signup(form)
    navigate('/app/dashboard', { replace: true })
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#f8fafc]">
      <form onSubmit={submit} className="flex w-full max-w-[460px] flex-col gap-8 px-10 py-12" noValidate>
        <div className="flex justify-center">
          <Link to="/" aria-label="나홀로법에"><AuthBrand /></Link>
        </div>

        <div className="flex flex-col gap-8">
          <AuthField label="이름" error={visibleError('name')}>
            <div className="relative flex items-center"><input className={`${authInputClass} ${visibleError('name') ? 'border-red-400 text-red-500' : ''}`} placeholder="이름을 입력해주세요" value={form.name} onChange={onChange('name')} onBlur={onBlur('name')} autoComplete="name" /></div>
          </AuthField>
          <AuthField label="이메일" error={visibleError('email')}>
            <div className="relative flex items-center"><input className={`${authInputClass} ${visibleError('email') ? 'border-red-400 text-red-500' : ''}`} placeholder="이메일을 입력해주세요" value={form.email} onChange={onChange('email')} onBlur={onBlur('email')} autoComplete="email" aria-invalid={!!visibleError('email')} /></div>
          </AuthField>
          <AuthField label="아이디" error={visibleError('username')}>
            <div className="relative flex items-center"><input className={`${authInputClass} ${visibleError('username') ? 'border-red-400 text-red-500' : ''}`} placeholder="아이디를 입력해주세요" value={form.username} onChange={onChange('username')} onBlur={onBlur('username')} autoComplete="username" /></div>
          </AuthField>
          <AuthField label="비밀번호" error={visibleError('password')}>
            <PasswordField id="signup-password" value={form.password} onChange={onChange('password')} onBlur={onBlur('password')} shown={show.password} onToggle={() => setShow((current) => ({ ...current, password: !current.password }))} placeholder="8자 이상, 영문+숫자 조합으로 입력해주세요" autoComplete="new-password" invalid={!!visibleError('password')} />
          </AuthField>
          <AuthField label="비밀번호 확인" error={visibleError('confirm')}>
            <PasswordField id="signup-password-confirm" value={form.confirm} onChange={onChange('confirm')} onBlur={onBlur('confirm')} shown={show.confirm} onToggle={() => setShow((current) => ({ ...current, confirm: !current.confirm }))} placeholder="비밀번호 재입력" autoComplete="new-password" invalid={!!visibleError('confirm')} />
          </AuthField>
        </div>

        <AuthCheckbox id="signup-agree" checked={agree} onChange={(event) => setAgree(event.target.checked)} className="text-ink-600">
          <button type="button" onClick={() => setDoc('terms')} className="text-brand-300 underline underline-offset-2">서비스 이용약관</button>
          {' 및 '}
          <button type="button" onClick={() => setDoc('privacy')} className="text-brand-300 underline underline-offset-2">개인정보처리방침</button>
          에 동의합니다 <span className="text-brand-300">(필수)</span>
        </AuthCheckbox>

        <AuthSubmit disabled={!valid}>회원가입</AuthSubmit>

        <p className="text-center text-sm text-ink-500">
          <span className="mr-[10px]">이미 계정이 있으신가요?</span>
          <Link to="/login" className="text-brand-400">로그인</Link>
        </p>
      </form>
      <LegalDocModal docKey={doc} onClose={() => setDoc(null)} />
    </main>
  )
}
