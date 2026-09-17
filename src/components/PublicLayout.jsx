import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { cx } from './ui.jsx'
import { BrandLogo, Menu, X } from './icons.jsx'

// 실서비스와 같은 네 칸이다. 모두 랜딩 한 장 안의 자리로 내려간다.
const nav = [
  { id: 'home', label: '홈' },
  { id: 'service', label: '서비스 소개' },
  { id: 'guide', label: '이용 절차' },
  { id: 'faq', label: '자주 묻는 질문' },
]

/** 지금 보고 있는 자리에 밑줄이 붙는다 — 스크롤 위치로만 판단한다. */
function useActiveSection(enabled) {
  const [active, setActive] = useState('home')
  useEffect(() => {
    if (!enabled) return undefined
    const read = () => {
      const line = window.scrollY + 120
      const hit = nav.filter((n) => {
        const el = document.getElementById(n.id)
        return el && el.offsetTop <= line
      })
      setActive(hit.length ? hit[hit.length - 1].id : 'home')
    }
    read()
    window.addEventListener('scroll', read, { passive: true })
    return () => window.removeEventListener('scroll', read)
  }, [enabled])
  return enabled ? active : null
}

function Header() {
  const { isAuthed } = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const onLanding = pathname === '/'
  const active = useActiveSection(onLanding)

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-ink-100 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" aria-label="나홀로법에 홈" className="flex items-center gap-2">
          <BrandLogo markSize={32} wordmarkSize={20} gap={8} />
        </Link>

        <nav className="hidden items-center gap-8 sm:flex">
          {nav.map((n) => {
            const on = active === n.id
            return (
              <a
                key={n.id}
                href={onLanding ? `#${n.id}` : `/#${n.id}`}
                className={cx('relative pb-1 text-[15px] transition-colors', on ? 'text-brand-300' : 'text-ink-400 hover:text-ink-900')}
              >
                {n.label}
                {on && <span className="absolute -bottom-[5px] left-0 right-0 h-px rounded-full bg-brand-300" />}
              </a>
            )
          })}
        </nav>

        <Link
          to={isAuthed ? '/app/dashboard' : '/signup'}
          className="hidden rounded-[10px] border border-brand-300 px-4 py-2 text-[15px] text-brand-300 transition-colors hover:bg-brand-50 sm:inline-flex"
        >
          {isAuthed ? '대시보드로 이동' : '시작하기'}
        </Link>

        <button className="sm:hidden p-2 -mr-2 text-ink-700" onClick={() => setOpen(true)} aria-label="메뉴"><Menu /></button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-white p-5 shadow-xl">
            <button onClick={() => setOpen(false)} className="absolute right-4 top-5 text-ink-500"><X /></button>
            <div className="mt-12 flex flex-col gap-1">
              {nav.map((n) => (
                <a key={n.id} href={`/#${n.id}`} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-ink-700 hover:bg-ink-100">{n.label}</a>
              ))}
              <div className="mt-3 flex flex-col gap-2">
                {isAuthed ? (
                  <Link to="/app/dashboard" onClick={() => setOpen(false)} className="rounded-[10px] border border-brand-300 px-4 py-2.5 text-center text-[15px] text-brand-300">대시보드로 이동</Link>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setOpen(false)} className="rounded-[10px] border border-ink-200 px-4 py-2.5 text-center text-[15px] text-ink-700">로그인</Link>
                    <Link to="/signup" onClick={() => setOpen(false)} className="rounded-[10px] border border-brand-300 px-4 py-2.5 text-center text-[15px] text-brand-300">시작하기</Link>
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
      <div className="mx-auto max-w-6xl px-6 py-12 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-[1fr_auto] sm:items-start">
          <div className="max-w-md">
            <BrandLogo />
            <p className="mt-4 text-[13px] leading-6 text-ink-500">
              혼자 소송을 준비하는 사람이 문서·증빙·판례·일정을 한 사건 안에서 정리하도록 돕는 자기소송 준비 서비스입니다.
            </p>
          </div>
          <nav aria-label="푸터 메뉴" className="grid grid-cols-2 gap-x-10 gap-y-3 text-[13px] font-medium sm:grid-cols-3">
            <Link to="/about" className="text-ink-600 hover:text-brand-500">서비스 소개</Link>
            <a href="/#guide" className="text-ink-600 hover:text-brand-500">주요 기능</a>
            <a href="/#service" className="text-ink-600 hover:text-brand-500">이용 절차</a>
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
      {/* 헤더가 고정 64라 그만큼을 본문 위로 비워 둔다 */}
      <main className="flex-1 pt-16"><Outlet /></main>
      <Footer />
    </div>
  )
}
