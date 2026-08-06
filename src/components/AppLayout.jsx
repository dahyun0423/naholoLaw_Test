import { useState } from 'react'
import { NavLink, Link, useNavigate, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { notifications } from '../data/mock.js'
import { cx } from './ui.jsx'
import {
  Logo, Grid, Scale, Book, FileText, Folder, Bell, Calendar,
  HelpCircle, LogOut, Menu, X,
} from './icons.jsx'

// Figma 200:24198 기준: 단일 '메인 메뉴' 그룹, 순서 고정
const mainMenu = [
  { to: '/app/dashboard', label: '대시보드', icon: Grid },
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

function Sidebar({ onNavigate }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="flex h-full flex-col">
      <Link to="/app/dashboard" onClick={onNavigate} className="flex items-center gap-2 px-2 h-[78px] shrink-0">
        <Logo size={32} />
        <span className="text-[19px] font-extrabold text-brand-300 tracking-tight">나홀로법에</span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-1 pb-4">
        <p className="px-3.5 pt-2 pb-2 text-xs font-semibold text-ink-400">메인 메뉴</p>
        <div className="flex flex-col gap-1">
          {mainMenu.map((m) => <NavItem key={m.to} item={m} onClick={onNavigate} />)}
        </div>
      </nav>

      <div className="border-t border-ink-100 p-1 flex flex-col gap-1">
        <NavItem item={{ to: '/app/guide', label: '가이드', icon: HelpCircle }} onClick={onNavigate} />
        <button
          onClick={() => { logout(); navigate('/') }}
          className="flex items-center gap-3 px-3.5 h-11 rounded-xl text-[15px] font-medium text-ink-600 hover:bg-ink-100 transition-colors"
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
  const [open, setOpen] = useState(false)
  const unread = notifications.filter((n) => n.unread).length
  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between gap-3 border-b border-ink-100 bg-white/90 px-4 sm:px-7 backdrop-blur">
      <button onClick={onMenu} className="lg:hidden p-2 -ml-2 text-ink-700" aria-label="메뉴 열기">
        <Menu />
      </button>
      <div className="flex-1" />
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="relative grid h-10 w-10 place-items-center rounded-full text-ink-600 hover:bg-ink-100"
          aria-label="알림"
        >
          <Bell />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">{unread}</span>
          )}
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-ink-200 bg-white p-2 shadow-xl">
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-sm font-bold">알림 {unread}</span>
                <button className="text-xs text-brand-400 font-medium">모두 읽음</button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((n, i) => (
                  <div key={i} className={cx('rounded-xl px-2.5 py-2.5 hover:bg-ink-50', n.unread && 'bg-brand-50/40')}>
                    <div className="flex items-start gap-2">
                      {n.unread && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />}
                      <div className={cx(!n.unread && 'pl-3.5')}>
                        <p className="text-[13px] font-semibold text-ink-800">{n.title}</p>
                        <p className="text-xs text-ink-500">{n.meta}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/app/notifications" onClick={() => setOpen(false)} className="mt-1 block rounded-xl bg-ink-50 px-3 py-2 text-center text-xs font-medium text-ink-600 hover:bg-ink-100">
                전체 알림 바로가기 →
              </Link>
            </div>
          </>
        )}
      </div>

      <Link to="/app/my" className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-ink-100">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-500">
          {user?.name?.[0] || '나'}
        </span>
        <span className="hidden sm:block leading-tight text-left">
          <span className="block text-sm font-semibold text-ink-800">{user?.name}</span>
          <span className="block text-xs text-ink-500">{user?.email}</span>
        </span>
      </Link>
    </header>
  )
}

export default function AppLayout() {
  const { isAuthed } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location }} />

  return (
    <div className="min-h-screen bg-ink-50">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-ink-100 bg-white px-3 lg:block">
        <Sidebar />
      </aside>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white px-3 shadow-xl">
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-6 p-1 text-ink-500"><X /></button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-7 sm:px-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
