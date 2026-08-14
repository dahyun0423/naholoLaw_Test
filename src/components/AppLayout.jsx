import { useEffect, useMemo, useState } from 'react'
import { NavLink, Link, useNavigate, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { buildAlerts } from '../lib/alerts.js'
import { Button, cx } from './ui.jsx'
import SpotlightTour from './guide/SpotlightTour.jsx'
import Modal from './Modal.jsx'
import { requestProductTour, tourKeyForPath } from './guide/tourData.js'
import {
  BrandLogo, Logo, Scale, FileText, Bell, Calendar, HelpCircle, LogOut, Menu, X,
  LayoutDashboard, BookOpen, FolderOpen, CaseNew, BookMarked,
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

// Figma 293:62148 기준: '메인 메뉴'와 '부가 메뉴' 두 묶음, 순서 고정
const menuGroups = [
  {
    label: '메인 메뉴',
    items: [
      { to: '/app/dashboard', label: '대시보드', icon: LayoutDashboard },
      { to: '/app/documents', label: '문서 생성', icon: FileText },
      { to: '/app/search', label: '판례 검색', icon: Scale },
      { to: '/app/procedure', label: '절차 안내', icon: BookOpen },
    ],
  },
  {
    label: '부가 메뉴',
    items: [
      { to: '/app/cases', label: '사건 관리', icon: CaseNew },
      { to: '/app/evidence', label: '증빙 자료', icon: FolderOpen },
      // Figma는 '스케줄 관리'지만 화면 제목·투어와 맞춰 '일정 관리'로 통일한다.
      { to: '/app/schedule', label: '일정 관리', icon: Calendar },
    ],
  },
]

/**
 * 두 묶음의 칸과 아래쪽 보조 칸이 같은 모양을 쓴다 — 글자 크기만 다르다.
 * 접힌 상태에서는 글자를 빼고 아이콘만 가운데 둔다.
 */
const itemCls = (isActive, small, collapsed) => cx(
  'flex w-full items-center rounded-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
  collapsed
    ? 'justify-center px-0 py-3'
    : small ? 'gap-[7px] px-6 py-3 text-[14px] tracking-[-0.28px]' : 'gap-2.5 px-4 py-3 text-[16px] tracking-[-0.32px]',
  isActive ? 'bg-brand-300 font-semibold text-ink-50' : 'font-medium text-ink-500 hover:bg-ink-100',
)

function NavItem({ item, onClick, small, collapsed }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      data-tour={`nav-${item.to.split('/').pop()}`}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={({ isActive }) => itemCls(isActive, small, collapsed)}
    >
      <Icon size={20} className="shrink-0" />
      {!collapsed && item.label}
    </NavLink>
  )
}

function Sidebar({ onNavigate, onStartGuide, collapsed = false, onToggle }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="flex h-full flex-col">
      {/* 로고가 접기 버튼을 겸한다 — 대시보드로 가는 길은 첫 메뉴 칸에 있다. */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
        aria-expanded={!collapsed}
        title={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
        className="flex h-20 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        {collapsed ? <Logo size={40} /> : <BrandLogo markSize={52.8} wordmarkSize={25} gap={11.52} />}
      </button>

      <nav
        data-tour="main-nav"
        aria-label="앱 주요 메뉴"
        className={cx('flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden pt-4', collapsed ? 'px-3' : 'px-5')}
      >
        {menuGroups.map((group, groupIndex) => (
          <div
            key={group.label}
            className={cx(
              'flex flex-col gap-4',
              collapsed ? cx('gap-1', groupIndex > 0 && 'border-t border-ink-100 pt-4') : 'px-3',
            )}
          >
            {!collapsed && <p className="text-[14px] font-medium leading-[1.4] text-ink-500">{group.label}</p>}
            <div className="flex flex-col gap-1">
              {group.items.map((m) => <NavItem key={m.to} item={m} onClick={onNavigate} collapsed={collapsed} />)}
            </div>
          </div>
        ))}
      </nav>

      <div className={cx('flex flex-col gap-3 py-6', collapsed ? 'px-3' : 'px-4')}>
        <button
          type="button"
          data-tour="guide-trigger"
          onClick={onStartGuide}
          title={collapsed ? '사용가이드' : undefined}
          aria-label={collapsed ? '사용가이드' : undefined}
          className={itemCls(false, true, collapsed)}
        >
          <HelpCircle size={20} className="shrink-0" />
          {!collapsed && '사용가이드'}
        </button>
        <NavItem item={{ to: '/app/guide', label: '가이드 모음', icon: BookMarked }} onClick={onNavigate} small collapsed={collapsed} />
        <button
          type="button"
          onClick={() => { logout(); navigate('/') }}
          title={collapsed ? '로그아웃' : undefined}
          aria-label={collapsed ? '로그아웃' : undefined}
          className={itemCls(false, true, collapsed)}
        >
          <LogOut size={20} className="shrink-0" />
          {!collapsed && '로그아웃'}
        </button>
      </div>
    </div>
  )
}

const ALERT_READ_KEY = 'naholo_alerts_read'
const readAlertIds = () => {
  try { return new Set(JSON.parse(localStorage.getItem(ALERT_READ_KEY) || '[]')) } catch { return new Set() }
}

function Topbar({ onMenu }) {
  const { user } = useAuth()
  const { rawCases } = useWorkspace()
  const displayUser = user || { name: '김지민', email: 'example@gmail.com' }
  const [open, setOpen] = useState(false)
  // 알림은 따로 저장하지 않는다 — 사건에 적힌 기일·기한에서 그때그때 만든다.
  // 알림 관리 화면과 같은 함수를 쓰므로 종 배지와 목록이 어긋나지 않는다.
  const [read, setRead] = useState(readAlertIds)
  const notificationList = useMemo(() => buildAlerts(rawCases), [rawCases])
  const unread = notificationList.filter((item) => !read.has(item.id)).length

  const persist = (next) => {
    setRead(next)
    try { localStorage.setItem(ALERT_READ_KEY, JSON.stringify([...next])) } catch { /* 저장 불가 환경 */ }
  }
  const markAllRead = () => persist(new Set(notificationList.map((item) => item.id)))
  const markRead = (id) => persist(new Set([...read, id]))
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
            <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-300 px-1 text-[12px] font-bold leading-none text-white">{unread}</span>
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
                {notificationList.length === 0 ? (
                  <p className="px-2.5 py-6 text-center text-xs leading-relaxed text-ink-400">
                    지금 알려드릴 것이 없습니다.<br />일정을 등록하면 기한이 다가올 때 알려드려요.
                  </p>
                ) : notificationList.map((n) => {
                  const isUnread = !read.has(n.id)
                  return (
                    <Link
                      key={n.id}
                      to={n.to}
                      onClick={() => { markRead(n.id); setOpen(false) }}
                      className={cx('block rounded-xl px-2.5 py-2.5 hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300', isUnread && 'bg-brand-50/40')}
                    >
                      <div className="flex items-start gap-2">
                        {isUnread && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />}
                        <div className={cx(!isUnread && 'pl-3.5')}>
                          <p className="text-[13px] font-semibold text-ink-800">{n.title}</p>
                          <p className="text-xs text-ink-500">{n.meta}</p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
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
          <span className="block text-[20px] font-semibold leading-[1.4] text-ink-900">{displayUser.name}</span>
          <span className="block text-[14px] leading-[1.4] text-ink-500">{displayUser.email}</span>
        </span>
      </Link>
    </header>
  )
}

const COLLAPSE_KEY = 'naholo_sidebar_collapsed'

export default function AppLayout() {
  const { isAuthed } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1')
  const location = useLocation()
  const navigate = useNavigate()
  const figmaPreview = import.meta.env.DEV && new URLSearchParams(location.search).get('figma') === '1'

  const startCurrentGuide = () => {
    setMobileOpen(false)
    window.setTimeout(() => requestProductTour(location.pathname), 80)
  }

  const toggleCollapsed = () => setCollapsed((value) => {
    const next = !value
    try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch { /* 저장 불가 환경 */ }
    return next
  })

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
      {/* desktop sidebar — 로고를 눌러 접고 편다 */}
      <aside className={cx('fixed inset-y-0 left-0 z-40 hidden border-r border-ink-100 bg-white transition-[width] duration-200 lg:block', collapsed ? 'w-[84px]' : 'w-[285px]')}>
        <Sidebar onStartGuide={startCurrentGuide} collapsed={collapsed} onToggle={toggleCollapsed} />
      </aside>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[285px] bg-white shadow-xl">
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-6 p-1 text-ink-500"><X /></button>
            {/* 서랍은 항상 펼친 모습으로 — 좁은 화면에서 아이콘만 남길 이유가 없다 */}
            <Sidebar onNavigate={() => setMobileOpen(false)} onStartGuide={startCurrentGuide} onToggle={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className={cx('transition-[padding] duration-200', collapsed ? 'lg:pl-[84px]' : 'lg:pl-[285px]')}>
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
