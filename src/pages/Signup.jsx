import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Button, Field, inputCls, cx } from '../components/ui.jsx'
import { Logo, Eye, EyeOff, Check } from '../components/icons.jsx'
import LegalDocModal from '../components/LegalDocModal.jsx'

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', username: '', password: '', confirm: '' })
  const [show, setShow] = useState({ pw: false, confirm: false })
  const [agree, setAgree] = useState(false)
  const [touched, setTouched] = useState(false)
  const [doc, setDoc] = useState(null)   // 'terms' | 'privacy'

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const errs = {
    name: !form.name ? '이름을 입력해주세요.' : '',
    email: !form.email ? '이메일을 입력해주세요.' : !emailRe.test(form.email) ? '올바른 이메일 형식이 아닙니다.' : '',
    username: !form.username ? '아이디를 입력해주세요.' : form.username.length < 4 ? '아이디는 4자 이상이어야 합니다.' : '',
    password: !form.password ? '비밀번호를 입력해주세요.' : form.password.length < 6 ? '비밀번호는 6자 이상이어야 합니다.' : '',
    confirm: !form.confirm ? '비밀번호를 다시 입력해주세요.' : form.password !== form.confirm ? '비밀번호가 일치하지 않습니다.' : '',
  }
  const matchOk = form.confirm && form.password === form.confirm
  const valid = !Object.values(errs).some(Boolean) && agree

  const submit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (!valid) return
    await signup(form)
    navigate('/app/dashboard', { replace: true })
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 px-5 py-12">
      <div className="w-full max-w-[460px]">
        <Link to="/" className="flex items-center justify-center gap-2">
          <Logo size={36} />
          <span className="text-2xl font-extrabold text-brand-300 tracking-tight">나홀로법에</span>
        </Link>

        <form onSubmit={submit} className="mt-7 rounded-3xl border border-ink-200 bg-white p-7 shadow-sm">
          <h1 className="text-xl font-bold text-ink-900">회원가입</h1>
          <p className="mt-1 text-sm text-ink-500">몇 가지 정보만 입력하면 바로 시작할 수 있어요.</p>

          <div className="mt-5 space-y-4">
            <Field label="이름" required error={touched ? errs.name : ''}>
              <input className={inputCls} placeholder="김지민" value={form.name} onChange={onChange('name')} />
            </Field>
            <Field label="이메일" required error={touched ? errs.email : ''}>
              <input className={inputCls} placeholder="example@gmail.com" value={form.email} onChange={onChange('email')} />
            </Field>
            <Field label="아이디" required error={touched ? errs.username : ''} hint={!touched ? '4자 이상의 영문/숫자' : ''}>
              <input className={inputCls} placeholder="abcd1234" value={form.username} onChange={onChange('username')} />
            </Field>

            <Field label="비밀번호" required error={touched ? errs.password : ''}>
              <div className="relative">
                <input
                  className={cx(inputCls, 'pr-11')}
                  type={show.pw ? 'text' : 'password'}
                  placeholder="6자 이상 입력"
                  value={form.password}
                  onChange={onChange('password')}
                />
                <button type="button" onClick={() => setShow((s) => ({ ...s, pw: !s.pw }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
                  {show.pw ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </Field>

            <Field
              label="비밀번호 확인"
              error={touched && errs.confirm ? errs.confirm : ''}
            >
              <div className="relative">
                <input
                  className={cx(inputCls, 'pr-11', matchOk && 'border-brand-300 focus:border-brand-400 focus:ring-brand-100')}
                  type={show.confirm ? 'text' : 'password'}
                  placeholder="비밀번호를 다시 입력"
                  value={form.confirm}
                  onChange={onChange('confirm')}
                />
                <button type="button" onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
                  {show.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {matchOk && <span className="mt-1 flex items-center gap-1 text-xs text-brand-600"><Check size={14} /> 비밀번호가 일치합니다</span>}
            </Field>
          </div>

          {/* 동의를 받으려면 그 자리에서 읽을 수 있어야 한다 — 체크박스 밖의 버튼으로 뺀다. */}
          <div className="mt-5 flex items-start gap-2 text-sm text-ink-600">
            <input id="signup-agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-ink-300 accent-brand-300" />
            <label htmlFor="signup-agree" className="cursor-pointer">
              <button type="button" onClick={() => setDoc('terms')} className="font-medium text-brand-400 underline underline-offset-2">서비스 이용약관</button>
              {' 및 '}
              <button type="button" onClick={() => setDoc('privacy')} className="font-medium text-brand-400 underline underline-offset-2">개인정보처리방침</button>
              에 동의합니다. <span className="text-brand-400">(필수)</span>
            </label>
          </div>
          {touched && !agree && <p className="mt-1 text-xs text-red-500">약관에 동의해주세요.</p>}

          <Button type="submit" className="mt-6 w-full" disabled={touched && !valid}>회원가입</Button>

          <p className="mt-5 text-center text-sm text-ink-500">
            이미 계정이 있으신가요? <Link to="/login" className="font-semibold text-brand-400 hover:underline">로그인</Link>
          </p>
        </form>
      </div>
      <LegalDocModal docKey={doc} onClose={() => setDoc(null)} />
    </div>
  )
}
