import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, cx } from '../components/ui.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { ALERT_KINDS, DEFAULT_ALERT_PREFS, OUT_OF_SCOPE, buildAlerts } from '../lib/alerts.js'
import { Bell, Calendar, FileText, AlertTriangle, Folder } from '../components/icons.jsx'

const READ_KEY = 'naholo_alerts_read'

const icons = { hearing: Calendar, deadline: FileText, overdue: AlertTriangle, evidence: Folder }
const tones = {
  hearing: 'bg-red-50 text-red-500',
  deadline: 'bg-brand-50 text-brand-500',
  overdue: 'bg-red-50 text-red-500',
  evidence: 'bg-ink-100 text-ink-500',
}

const readRead = () => {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]')) } catch { return new Set() }
}

export default function Notifications() {
  const { rawCases } = useWorkspace()
  const [prefs, setPrefs] = useState(DEFAULT_ALERT_PREFS)
  const [read, setRead] = useState(readRead)

  const list = useMemo(() => buildAlerts(rawCases, prefs), [rawCases, prefs])
  const unread = list.filter((item) => !read.has(item.id)).length

  const persist = (next) => {
    setRead(next)
    try { localStorage.setItem(READ_KEY, JSON.stringify([...next])) } catch { /* 저장 불가 환경 */ }
  }
  const markRead = (id) => persist(new Set([...read, id]))
  const markAll = () => persist(new Set(list.map((item) => item.id)))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">알림 관리</h1>
          <p className="mt-1 text-sm text-ink-500">내가 등록한 기일·기한에서 만든 알림입니다.</p>
        </div>
        <button type="button" onClick={markAll} disabled={unread === 0} className="text-sm font-medium text-brand-400 disabled:text-ink-300">
          모두 읽음
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-2 lg:col-span-2">
          {list.length === 0 ? (
            <div className="grid place-items-center gap-2 py-16 text-center">
              <Bell size={28} className="text-ink-300" />
              <p className="text-sm font-medium text-ink-500">지금 알려드릴 것이 없습니다</p>
              <p className="text-xs leading-relaxed text-ink-400">
                일정을 등록하면 기일과 제출기한이 다가올 때 여기에 표시됩니다.
              </p>
            </div>
          ) : list.map((item) => {
            const Icon = icons[item.kind] || Bell
            const isUnread = !read.has(item.id)
            return (
              <Link
                key={item.id}
                to={item.to}
                onClick={() => markRead(item.id)}
                className={cx('flex w-full items-start gap-3 rounded-xl p-4 text-left transition-colors hover:bg-ink-50', isUnread && 'bg-brand-50/40')}
              >
                <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-full', tones[item.kind])}>
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink-800">{item.title}</span>
                    {isUnread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />}
                  </span>
                  <span className="block text-xs text-ink-500">{item.meta}</span>
                </span>
              </Link>
            )
          })}
        </Card>

        <div className="space-y-5">
          <Card className="h-fit p-5">
            <h2 className="text-sm font-bold text-ink-900">알림 설정</h2>
            <div className="mt-4 space-y-4">
              {ALERT_KINDS.map((kind) => (
                <div key={kind.key} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink-800">{kind.label}</p>
                    <p className="text-xs leading-snug text-ink-400">{kind.desc}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={prefs[kind.key]}
                    aria-label={kind.label}
                    onClick={() => setPrefs((current) => ({ ...current, [kind.key]: !current[kind.key] }))}
                    className={cx('relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300', prefs[kind.key] ? 'bg-brand-300' : 'bg-ink-200')}
                  >
                    <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', prefs[kind.key] ? 'left-[22px]' : 'left-0.5')} />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* 알려주지 못하는 것을 숨기지 않는다 — 알림이 없다고 아무 일도 없는 게 아니다 */}
          <Card className="h-fit border-ink-200 bg-ink-50 p-5">
            <h2 className="text-sm font-bold text-ink-900">이건 알려드릴 수 없어요</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              나홀로법에는 법원 전자소송이나 상대방과 연결되어 있지 않습니다. 다음은 알림으로 오지 않으니
              직접 확인하셔야 합니다.
            </p>
            <ul className="mt-3 space-y-1.5">
              {OUT_OF_SCOPE.map((text) => (
                <li key={text} className="flex gap-2 text-xs leading-relaxed text-ink-600">
                  <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-300" />
                  {text}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              법원에서 통지서를 받으셨다면 <Link to="/app/schedule" className="font-semibold text-brand-500 hover:underline">일정 관리 → 법원 통지서 등록</Link>에서
              올려 주세요. 기일과 기한을 계산해 알림으로 만들어 드립니다.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
