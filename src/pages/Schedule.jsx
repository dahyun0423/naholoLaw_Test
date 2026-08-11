import { useState } from 'react'
import { Card, Badge, Button, cx } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import { upcoming, dayOffset } from '../data/mock.js'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { caseUpcoming, caseTitle } from '../lib/casebook.js'
import { fmtDate } from '../lib/complaint.js'
import { Calendar, Upload, Plus, ChevronRight } from '../components/icons.jsx'

// 날짜는 오늘 기준 상대일. 고정해 두면 시연할 때마다 달력이 과거로 열린다.
const events = {
  [dayOffset(-11)]: [{ t: '소장 제출 기한', tone: 'amber' }],
  [dayOffset(0)]: [{ t: '준비서면 작성', tone: 'brand' }],
  [dayOffset(3)]: [{ t: '제1회 변론기일', tone: 'red' }],
  [dayOffset(6)]: [{ t: '준비서면 제출 기한', tone: 'amber' }],
  [dayOffset(17)]: [{ t: '증거목록 제출 기한', tone: 'brand' }],
}
const dotTone = { red: 'bg-red-300', amber: 'bg-red-300', brand: 'bg-brand-400' }
const weekdays = ['일', '월', '화', '수', '목', '금', '토']

function ymd(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function Schedule() {
  const today = dayOffset(0)
  const [cur, setCur] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [selected, setSelected] = useState(today)
  const [auto, setAuto] = useState(false)
  const [add, setAdd] = useState(false)
  const [toast, setToast] = useState('')
  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 1800) }

  const first = new Date(cur.y, cur.m, 1).getDay()
  const days = new Date(cur.y, cur.m + 1, 0).getDate()
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const monthLabel = `${cur.y}년 ${cur.m + 1}월`

  const move = (delta) => setCur((c) => {
    let m = c.m + delta, y = c.y
    if (m < 0) { m = 11; y-- } if (m > 11) { m = 0; y++ }
    return { y, m }
  })

  const selDate = new Date(selected)
  const selLabel = selDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })
  const { rawCases } = useWorkspace()
  // 사건에 적어 둔 기한이 진짜 내 일정이다. mock은 그 아래 예시로 남긴다.
  const mine = rawCases
    .flatMap((c) => caseUpcoming(c).map((t) => ({ ...t, caseName: caseTitle(c) })))
    .sort((a, b) => a.dday - b.dday)
    .slice(0, 5)

  const selEvents = events[selected] || []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">일정 관리</h1>
          <p className="mt-1 text-sm text-ink-500">법률 기한을 놓치지 마세요.</p>
        </div>
        <Button size="sm" onClick={() => setAuto(true)}><Upload size={15} /> 기일통지서로 자동 등록</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* calendar */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink-900">{monthLabel}</h3>
            <div className="flex gap-1">
              <button onClick={() => move(-1)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100">‹</button>
              <button onClick={() => move(1)} className="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100">›</button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center">
            {weekdays.map((w, i) => <div key={w} className={cx('py-2 text-xs font-semibold', i === 0 ? 'text-red-400' : i === 6 ? 'text-brand-400' : 'text-ink-400')}>{w}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div key={i} />
              const key = ymd(cur.y, cur.m, d)
              const evs = events[key] || []
              const isSel = key === selected
              const isToday = key === today
              return (
                <button key={i} onClick={() => setSelected(key)} className={cx('relative aspect-square rounded-xl p-1.5 text-sm transition-colors', isSel ? 'bg-brand-300 text-white' : cx('hover:bg-ink-100 text-ink-700', isToday && 'ring-1 ring-inset ring-brand-300 font-bold text-brand-500'))}>
                  <span className={cx(i % 7 === 0 && !isSel && 'text-red-400')}>{d}</span>
                  {evs.length > 0 && (
                    <span className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-0.5">
                      {evs.map((e, j) => <span key={j} className={cx('h-1.5 w-1.5 rounded-full', isSel ? 'bg-white' : dotTone[e.tone])} />)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </Card>

        {/* side */}
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-900">{selLabel}</h3>
              <Button size="sm" variant="soft" onClick={() => setAdd(true)}><Plus size={14} /> 일정 추가</Button>
            </div>
            <div className="mt-3 space-y-2">
              {selEvents.length === 0 ? (
                <div className="grid place-items-center py-8 text-center text-sm text-ink-400">
                  <Calendar size={28} className="mb-2 text-ink-300" />일정이 없습니다
                </div>
              ) : selEvents.map((e, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl border border-ink-100 p-3">
                  <span className={cx('h-2 w-2 rounded-full', dotTone[e.tone])} />
                  <span className="text-sm font-medium text-ink-700">{e.t}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-ink-900">다가오는 일정</h3>
              {mine.length === 0 && <Badge tone="gray">예시</Badge>}
            </div>

            {/* 내 사건의 기한부터 — 예시보다 앞에 둔다 */}
            {mine.length > 0 && (
              <div className="mt-3 space-y-3">
                {mine.map((u) => (
                  <div key={u.id} className="flex items-start gap-3">
                    <span className={cx('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', u.dday < 0 ? 'bg-red-300' : u.dday <= 3 ? 'bg-brand-300' : 'bg-ink-300')} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-semibold text-ink-800">{u.text}</p>
                        <Badge tone={u.dday < 0 ? 'red' : 'blue'}>
                          {u.dday < 0 ? `D+${-u.dday}` : u.dday === 0 ? 'D-DAY' : `D-${u.dday}`}
                        </Badge>
                      </div>
                      <p className="text-xs text-ink-400">{fmtDate(u.due)} · {u.caseName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={cx('space-y-3', mine.length ? 'mt-4 border-t border-ink-100 pt-4' : 'mt-3')}>
              {mine.length > 0 && <p className="text-[11px] text-ink-400">아래는 화면 구성을 보여주는 예시예요</p>}
              {upcoming.map((u) => (
                <div key={u.title} className="flex items-start gap-3">
                  <span className={cx('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', dotTone[u.tone])} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-ink-800">{u.title}</p>
                      <Badge tone={u.tone === 'red' ? 'red' : u.tone === 'amber' ? 'amber' : 'blue'}>{u.dday}</Badge>
                    </div>
                    <p className="text-xs text-ink-400">{u.date} · {u.case}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* auto register modal */}
      <Modal
        open={auto} onClose={() => setAuto(false)}
        title="법원 기일통지서로 자동 등록" sub="법원에서 받은 기일통지서를 업로드하면 AI가 자동으로 일정을 추출하여 등록합니다."
        footer={<><Button variant="neutral" onClick={() => setAuto(false)}>취소</Button><Button onClick={() => { setAuto(false); flash('일정이 자동 등록되었습니다') }}>업로드 및 분석</Button></>}
      >
        <div className="grid place-items-center rounded-xl border-2 border-dashed border-ink-200 bg-ink-50 py-10 text-center">
          <Upload size={28} className="text-ink-400" /><p className="mt-2 text-sm font-medium text-ink-600">클릭하여 파일 선택</p><p className="text-xs text-ink-400">PDF, JPG, PNG 파일 지원</p>
        </div>
        <div className="mt-4 rounded-xl bg-red-50 p-3.5">
          <p className="text-xs font-bold text-red-500">⏱ AI가 자동으로 추출하는 정보</p>
          <ul className="mt-2 space-y-1 text-[13px] text-red-500">
            <li>• 사건번호 및 사건명</li><li>• 변론기일 날짜 및 시간</li>
            <li>• 법원 정보 (관할 법원, 재판부)</li><li>• 제출 기한 (답변서, 준비서면 등)</li>
          </ul>
        </div>
      </Modal>

      {/* add event modal */}
      <Modal open={add} onClose={() => setAdd(false)} title="일정 추가"
        footer={<><Button variant="neutral" onClick={() => setAdd(false)}>취소</Button><Button onClick={() => { setAdd(false); flash('일정이 추가되었습니다') }}>저장</Button></>}>
        <div className="space-y-4">
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">일정 제목</span><input className="w-full h-11 px-3.5 rounded-xl border border-ink-200 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100" placeholder="예: 준비서면 제출" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">날짜</span><input type="date" defaultValue={selected} className="w-full h-11 px-3.5 rounded-xl border border-ink-200 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100" /></label>
        </div>
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>}
    </div>
  )
}
