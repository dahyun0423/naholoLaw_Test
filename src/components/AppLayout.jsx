import { useEffect, useState } from 'react'
import { NavLink, Link, useNavigate, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { notifications } from '../data/mock.js'
import { Button, cx } from './ui.jsx'
import SpotlightTour from './guide/SpotlightTour.jsx'
import Modal from './Modal.jsx'
import { requestProductTour, tourKeyForPath } from './guide/tourData.js'
import {
  BrandLogo, Grid, Scale, Book, FileText, Folder, Bell, Calendar,
  HelpCircle, LogOut, Menu, X,
} from './icons.jsx'

const SCOPE_ACK_KEY = 'naholo_service_scope_ack_v2'

function ServiceScopeNotice() {
  const [checked, setChecked] = useState(false)
  const [open, setOpen] = useState(() => localStorage.getItem(SCOPE_ACK_KEY) !== '1')
  const agree = () => {
    if (!checked) return
    localStorage.setItem(SCOPE_ACK_KEY, '1')
    setOpen(false)
  }
  return (
    <Modal
      open={open}
      onClose={() => {}}
      dismissible={false}
      maxW="max-w-[560px]"
      headerAlign="center"
      title="시작하기 전에 꼭 확인하세요"
      sub={<>나홀로법에는 변호사의 <b className="font-semibold text-brand-400">법률 자문을 대체하지 않는 자기소송 지원 도구</b>입니다.</>}
      footer={(
        <div className="flex w-full items-center gap-2">
          <Button to="/about" size="sm" variant="neutral">이용 범위 보기</Button>
          <span className="flex-1" />
          <Button onClick={agree} size="sm" disabled={!checked}>동의하고 시작하기</Button>
        </div>
      )}
    >
      <div className="rounded-[12px] bg-ink-50 p-4">
        {[
          '생성되는 문서와 정보는 법률 자문이 아니라 참고용 초안입니다.',
          '제출 전 사건번호·당사자·금액·청구 내용은 반드시 검토하고 수정해야 합니다.',
          '관할 법원과 제출 기한은 법원 원문 및 본인의 통지서로 직접 확인해야 합니다.',
          '복잡하거나 결과의 영향이 큰 사안은 반드시 변호사 등 전문가와 상담하세요.',
        ].map((text) => (
          <div key={text} className="flex items-start gap-2.5 py-1.5">
            <span aria-hidden="true" className="mt-[3px] text-[13px] font-bold text-brand-400">✓</span>
            <p className="text-[14px] font-semibold leading-[1.6] text-ink-700">{text}</p>
          </div>
        ))}
      </div>
      <label className="mt-5 flex cursor-pointer items-center gap-2.5 text-[16px] font-semibold text-ink-800">
        <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} className="h-5 w-5 rounded-[5px] accent-brand-300" />
        <span>위 내용을 모두 이해했으며 이에 동의합니다.</span>
      </label>
    </Modal>
  )
}

// Figma 200:24198 기준: 단일 '메인 메뉴' 그룹, 순서 고정
const mainMenu = [
  { to: '/app/dashboard', label: '대시보드', icon: Grid },
  { to: '/app/cases', label: '사건 관리', icon: Folder },
  { to: '/app/documents', label: '문서 생성', icon: FileText },
  { to: '/app/search', label: '판례 검색', icon: Scale },
  { to: '/app/procedure', label: '절차 안내', icon: Book },
  { to: '/app/evidence', label: '증빙 자료', icon: Folder },
  { to: '/app/schedule', label: '일정 관리', icon: Calendar },
]

function NavItem({ item, onClick }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      data-tour={`nav-${item.to.split('/').pop()}`}
      className={({ isActive }) =>
        cx(
          'flex items-center gap-3 px-3.5 h-11 rounded-xl text-[15px] font-medium transition-colors',
          isActive ? 'bg-brand-300 text-white shadow-sm' : 'text-ink-600 hover:bg-ink-100',
        )
      }
    >
      <Icon size={19} />
      {item.label}
    </NavLink>
  )
}

function Sidebar({ onNavigate, onStartGuide }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="flex h-full flex-col">
      <Link to="/app/dashboard" onClick={onNavigate} aria-label="나홀로법에 대시보드" className="flex h-[78px] shrink-0 items-center px-2">
        <BrandLogo markSize={32} wordmarkSize={19} />
      </Link>

      <nav data-tour="main-nav" aria-label="앱 주요 메뉴" className="flex-1 overflow-y-auto px-1 pb-4">
        <p className="px-3.5 pt-2 pb-2 text-xs font-semibold text-ink-400">메인 메뉴</p>
        <div className="flex flex-col gap-1">
          {mainMenu.map((m) => <NavItem key={m.to} item={m} onClick={onNavigate} />)}
        </div>
      </nav>

      <div className="border-t border-ink-100 p-1 flex flex-col gap-1">
        <button
          type="button"
          data-tour="guide-trigger"
          onClick={onStartGuide}
          className="flex h-11 items-center gap-3 rounded-xl px-3.5 text-[15px] font-medium text-ink-600 transition-colors hover:bg-brand-50 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          <HelpCircle size={19} />
          사용가이드
        </button>
        <NavItem item={{ to: '/app/guide', label: '가이드 모음', icon: Book }} onClick={onNavigate} />
        <button
          type="button"
          onClick={() => { logout(); navigate('/') }}
          className="flex h-11 items-center gap-3 rounded-xl px-3.5 text-[15px] font-medium text-ink-600 transition-colors hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          <LogOut size={19} />
          로그아웃
        </button>
      </div>
    </div>
  )
}

function Topbar({ onMenu }) {
  const { user } = useAuth()
  const displayUser = user || { name: '김지민', email: 'example@gmail.com' }
  const [open, setOpen] = useState(false)
  const [notificationList, setNotificationList] = useState(notifications)
  const unread = notificationList.filter((n) => n.unread).length

  const markAllRead = () => setNotificationList((list) => list.map((item) => ({ ...item, unread: false })))
  const markRead = (index) => setNotificationList((list) => list.map((item, itemIndex) => (
    itemIndex === index ? { ...item, unread: false } : item
  )))
  return (
    <header data-tour="topbar" className="sticky top-0 z-30 flex h-[72px] items-center justify-between gap-3 border-b border-ink-100 bg-white/90 px-4 sm:px-7 backdrop-blur">
      <button onClick={onMenu} className="lg:hidden p-2 -ml-2 text-ink-700" aria-label="메뉴 열기">
        <Menu />
      </button>
      <div className="flex-1" />
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          data-tour="notifications"
          className="relative grid h-10 w-10 place-items-center rounded-full text-ink-600 hover:bg-ink-100"
          aria-label="알림"
        >
          <Bell />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-red-300 text-[10px] font-bold text-white">{unread}</span>
          )}
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-ink-200 bg-white p-2 shadow-xl">
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-sm font-bold">알림 {unread}</span>
                <button
                  type="button"
                  disabled={unread === 0}
                  onClick={markAllRead}
                  className="rounded-md px-2 py-1 text-xs font-medium text-brand-500 hover:bg-brand-50 disabled:cursor-default disabled:text-ink-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                >
                  모두 읽음
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notificationList.map((n, i) => (
                  <Link
                    key={`${n.title}-${i}`}
                    to="/app/notifications"
                    onClick={() => { markRead(i); setOpen(false) }}
                    className={cx('block rounded-xl px-2.5 py-2.5 hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300', n.unread && 'bg-brand-50/40')}
                  >
                    <div className="flex items-start gap-2">
                      {n.unread && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />}
                      <div className={cx(!n.unread && 'pl-3.5')}>
                        <p className="text-[13px] font-semibold text-ink-800">{n.title}</p>
                        <p className="text-xs text-ink-500">{n.meta}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <Link to="/app/notifications" onClick={() => setOpen(false)} className="mt-1 block rounded-xl bg-ink-50 px-3 py-2 text-center text-xs font-medium text-ink-600 hover:bg-ink-100">
                전체 알림 바로가기 →
              </Link>
            </div>
          </>
        )}
      </div>

      <Link data-tour="profile" to="/app/my" className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-500">
          {displayUser.name?.[0] || '나'}
        </span>
        <span className="hidden sm:block leading-tight text-left">
          <span className="block text-sm font-semibold text-ink-800">{displayUser.name}</span>
          <span className="block text-xs text-ink-500">{displayUser.email}</span>
        </span>
      </Link>
    </header>
  )
}

export default function AppLayout() {
  const { isAuthed } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const figmaPreview = import.meta.env.DEV && new URLSearchParams(location.search).get('figma') === '1'

  const startCurrentGuide = () => {
    setMobileOpen(false)
    window.setTimeout(() => requestProductTour(location.pathname), 80)
  }

  useEffect(() => {
    if (!location.state?.startTour) return undefined
    const timer = window.setTimeout(() => {
      requestProductTour(location.pathname)
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
    }, 120)
    return () => window.clearTimeout(timer)
  }, [location.pathname, location.search, location.state, navigate])

  if (!isAuthed && !figmaPreview) return <Navigate to="/login" replace state={{ from: location }} />

  return (
    <div className="min-h-screen bg-ink-50">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-ink-100 bg-white px-3 lg:block">
        <Sidebar onStartGuide={startCurrentGuide} />
      </aside>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white px-3 shadow-xl">
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-6 p-1 text-ink-500"><X /></button>
            <Sidebar onNavigate={() => setMobileOpen(false)} onStartGuide={startCurrentGuide} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main data-app-route={tourKeyForPath(location.pathname)} className="mx-auto max-w-7xl px-4 py-7 sm:px-7">
          <Outlet />
        </main>
      </div>
      <SpotlightTour pathname={location.pathname} />
      {!figmaPreview && <ServiceScopeNotice />}
    </div>
  )
}
