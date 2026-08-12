import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Button, cx } from './ui.jsx'
import { BrandLogo, Menu, X } from './icons.jsx'

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
    <header className="relative z-40 border-b border-ink-100 bg-white">
      <div className="mx-auto flex h-[78px] max-w-[1380px] items-center justify-between px-5 sm:px-[30px]">
        <Link to="/" aria-label="나홀로법에 홈">
          <BrandLogo />
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-[42px] md:flex">
          {nav.map((n) => {
            const active = n.to === '/' ? pathname === '/' && !hash : (n.to.startsWith('/#') ? hash === n.to.slice(1) : pathname.startsWith(n.to))
            return n.to.startsWith('/#') ? (
              <a key={n.to} href={n.to} className={cx('py-2 text-[14px] font-medium transition-colors', active ? 'text-brand-500' : 'text-ink-700 hover:text-brand-500')}>{n.label}</a>
            ) : (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('py-2 text-[14px] font-medium transition-colors', isActive ? 'text-brand-500' : 'text-ink-700 hover:text-brand-500')}>{n.label}</NavLink>
            )
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthed ? (
            <Button to="/app/dashboard" variant="outline" size="sm" className="h-10 rounded-[15px] px-5">대시보드로 이동</Button>
          ) : (
            <Button to="/signup" variant="outline" size="sm" className="h-10 rounded-[15px] px-6">시작하기</Button>
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
    <footer className="border-t border-ink-200 bg-ink-50">
      <div className="mx-auto max-w-[1280px] px-5 py-12 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-[1fr_auto] sm:items-start">
          <div className="max-w-md">
            <BrandLogo />
            <p className="mt-4 text-[13px] leading-6 text-ink-500">
              혼자 소송을 준비하는 사람이 문서·증빙·판례·일정을 한 사건 안에서 정리하도록 돕는 자기소송 준비 서비스입니다.
            </p>
          </div>
          <nav aria-label="푸터 메뉴" className="grid grid-cols-2 gap-x-10 gap-y-3 text-[13px] font-medium sm:grid-cols-3">
            <Link to="/about" className="text-ink-600 hover:text-brand-500">서비스 소개</Link>
            <a href="/#features" className="text-ink-600 hover:text-brand-500">주요 기능</a>
            <a href="/#process" className="text-ink-600 hover:text-brand-500">이용 절차</a>
            <a href="/#faq" className="text-ink-600 hover:text-brand-500">자주 묻는 질문</a>
            <Link to="/login" className="text-ink-600 hover:text-brand-500">로그인</Link>
            <Link to="/signup" className="text-ink-600 hover:text-brand-500">시작하기</Link>
          </nav>
        </div>
        <div className="mt-10 border-t border-ink-200 pt-6 text-[11.5px] leading-5 text-ink-500">
          <p className="font-semibold text-ink-700">법적 고지</p>
          <p className="mt-1.5 max-w-4xl">
            나홀로법에는 변호사나 법률사무소가 아니며 법률 자문·소송 전략·소송대리를 제공하지 않습니다. 생성 문서와 검색 결과는 참고용 초안이므로 제출 전 법원 원문 및 본인의 자료와 반드시 대조하세요. 전문적인 판단은 변호사와 상담해야 합니다.
          </p>
          <p className="mt-4 text-ink-400">© 2026 나홀로법에. All rights reserved.</p>
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
