import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Button, cx } from './ui.jsx'
import { Logo, Menu, X } from './icons.jsx'

const nav = [
  { to: '/', label: '홈', end: true },
  { to: '/about', label: '서비스 소개' },
  { to: '/#process', label: '이용 절차' },
  { to: '/#faq', label: '자주 묻는 질문' },
]

function Header() {
  const { isAuthed } = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname, hash } = useLocation()
  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2">
          <Logo size={30} />
          <span className="text-lg font-extrabold text-brand-300 tracking-tight">나홀로법에</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((n) => {
            const active = n.to === '/' ? pathname === '/' && !hash : (n.to.startsWith('/#') ? hash === n.to.slice(1) : pathname.startsWith(n.to))
            return n.to.startsWith('/#') ? (
              <a key={n.to} href={n.to} className={cx('rounded-lg px-3.5 py-2 text-sm font-medium transition-colors', active ? 'text-brand-400' : 'text-ink-500 hover:text-ink-800')}>{n.label}</a>
            ) : (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('rounded-lg px-3.5 py-2 text-sm font-medium transition-colors', isActive ? 'text-brand-400' : 'text-ink-500 hover:text-ink-800')}>{n.label}</NavLink>
            )
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthed ? (
            <Button to="/app/dashboard" size="sm">대시보드로 이동</Button>
          ) : (
            <>
              <Button to="/login" variant="ghost" size="sm">로그인</Button>
              <Button to="/signup" variant="outline" size="sm">시작하기</Button>
            </>
          )}
        </div>

        <button className="md:hidden p-2 -mr-2 text-ink-700" onClick={() => setOpen(true)} aria-label="메뉴"><Menu /></button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-white p-5 shadow-xl">
            <button onClick={() => setOpen(false)} className="absolute right-4 top-5 text-ink-500"><X /></button>
            <div className="mt-12 flex flex-col gap-1">
              {nav.map((n) => (
                <a key={n.to} href={n.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-ink-700 hover:bg-ink-100">{n.label}</a>
              ))}
              <div className="mt-3 flex flex-col gap-2">
                {isAuthed ? <Button to="/app/dashboard" onClick={() => setOpen(false)}>대시보드로 이동</Button> : (
                  <>
                    <Button to="/login" variant="neutral" onClick={() => setOpen(false)}>로그인</Button>
                    <Button to="/signup" onClick={() => setOpen(false)}>시작하기</Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-ink-50">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <Logo size={26} />
              <span className="text-base font-extrabold text-brand-300">나홀로법에</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">
              변호사 없이 진행하는 나홀로 소송을 위한 AI 기반 법률 지원 플랫폼.
              절차 안내부터 문서 작성, 판례 분석까지 한곳에서.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <Link to="/about" className="text-ink-600 hover:text-brand-400">서비스 소개</Link>
            <a href="/#features" className="text-ink-600 hover:text-brand-400">주요 기능</a>
            <a href="/#process" className="text-ink-600 hover:text-brand-400">이용 절차</a>
            <a href="/#faq" className="text-ink-600 hover:text-brand-400">자주 묻는 질문</a>
            <Link to="/login" className="text-ink-600 hover:text-brand-400">로그인</Link>
            <Link to="/signup" className="text-ink-600 hover:text-brand-400">회원가입</Link>
          </div>
        </div>
        <div className="mt-10 border-t border-ink-200 pt-6 text-xs leading-relaxed text-ink-400">
          <p className="font-semibold text-ink-500">⚠️ 법적 고지</p>
          <p className="mt-1">
            본 서비스가 제공하는 모든 정보와 생성된 문서는 법률 자문이 아니며, 참고 자료로만 활용하시기 바랍니다.
            최종적인 법적 판단과 책임은 이용자 본인의 검토와 판단에 따릅니다. 복잡한 사안은 반드시 법률 전문가와 상담하세요.
          </p>
          <p className="mt-3">© 2026 나홀로법에 (NaholoBeobe). 캡스톤 디자인 프로젝트.</p>
        </div>
      </div>
    </footer>
  )
}

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  )
}
