import { useState } from 'react'
import { Card, Badge, cx } from '../components/ui.jsx'
import { notifications } from '../data/mock.js'
import { Bell } from '../components/icons.jsx'

const prefs = [
  { k: 'hearing', label: '변론기일 리마인더', desc: '기일 3일 전, 1일 전 알림' },
  { k: 'deadline', label: '제출 기한 알림', desc: '준비서면·증거 제출 기한 임박 시' },
  { k: 'opponent', label: '상대방 서면 제출 알림', desc: '답변서·준비서면 제출 시' },
  { k: 'precedent', label: '유사 판례 업데이트', desc: '새 판례 발견 시' },
]

export default function Notifications() {
  const [list, setList] = useState(notifications)
  const [on, setOn] = useState({ hearing: true, deadline: true, opponent: true, precedent: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">알림 관리</h1>
          <p className="mt-1 text-sm text-ink-500">소송 진행에 필요한 알림을 확인하고 설정하세요.</p>
        </div>
        <button onClick={() => setList((l) => l.map((n) => ({ ...n, unread: false })))} className="text-sm font-medium text-brand-400">모두 읽음</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-2 lg:col-span-2">
          {list.map((n, i) => (
            <button key={i} onClick={() => setList((l) => l.map((x, j) => j === i ? { ...x, unread: false } : x))} className={cx('flex w-full items-start gap-3 rounded-xl p-4 text-left hover:bg-ink-50', n.unread && 'bg-brand-50/40')}>
              <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-full', n.unread ? 'bg-brand-100 text-brand-500' : 'bg-ink-100 text-ink-400')}><Bell size={18} /></span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-ink-800">{n.title}</p>
                  {n.unread && <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />}
                </div>
                <p className="text-xs text-ink-500">{n.meta}</p>
              </div>
            </button>
          ))}
        </Card>

        <Card className="h-fit p-5">
          <h3 className="text-sm font-bold text-ink-900">알림 설정</h3>
          <div className="mt-4 space-y-4">
            {prefs.map((p) => (
              <div key={p.k} className="flex items-start justify-between gap-3">
                <div><p className="text-sm font-medium text-ink-800">{p.label}</p><p className="text-xs text-ink-400">{p.desc}</p></div>
                <button onClick={() => setOn((o) => ({ ...o, [p.k]: !o[p.k] }))} className={cx('relative h-6 w-11 shrink-0 rounded-full transition-colors', on[p.k] ? 'bg-brand-300' : 'bg-ink-200')}>
                  <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', on[p.k] ? 'left-[22px]' : 'left-0.5')} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
