import { useMemo, useRef, useState } from 'react'
import { Card, Badge, Button, KebabMenu, cx } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { caseUpcoming, caseTitle } from '../lib/casebook.js'
import { fmtDate } from '../lib/complaint.js'
import {
  extractCourtNotice, readCourtNoticeFile, resolveCounted, deemedServedOn,
  SCHEDULE_TYPES, scheduleType, REMIND_DAYS, remindLabel,
} from '../lib/courtNotice.js'
import { Calendar, Upload, Plus, ExternalLink, FileText, CheckCircle, Trash, Bell, AlertTriangle } from '../components/icons.jsx'

const dotTone = { red: 'bg-red-300', brand: 'bg-brand-400', gray: 'bg-ink-300' }
// 달력 칸에 들어가는 띠 — 점 대신 제목을 보여준다
const chipTone = {
  red: 'bg-red-50 text-red-500',
  brand: 'bg-brand-50 text-brand-600',
  gray: 'bg-ink-100 text-ink-600',
}
const CHIPS_PER_DAY = 3
const weekdays = ['일', '월', '화', '수', '목', '금', '토']
const todayValue = () => new Date().toISOString().slice(0, 10)
const inputClass = 'h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-sm text-ink-700 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100'

function ymd(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const weekdayOf = (value) => weekdays[new Date(`${value}T12:00:00`).getDay()]

const blankManual = (date, caseId) => ({
  title: '', date, time: '', caseId, typeKey: '', remindOn: true, remindDays: 1,
})

/** 폼 값 → 저장할 알림 값(며칠 전). 꺼져 있으면 null이다. */
const remindOf = (form) => (form.remindOn ? Number(form.remindDays) : null)

/**
 * 통지서에서 뽑아낸 일정 한 건 — Figma 2241:113398의 결과 카드.
 *
 * 읽는 게 먼저다. 분석 결과는 요약으로 보여주고, 고칠 일이 있을 때만
 * 「수정하기」로 입력칸을 펼친다. 처음부터 입력칸을 늘어놓으면 무엇이
 * 읽혔는지 확인하기 어렵다.
 */
function NoticeResultCard({ item, caseName, caseNo, editing, selected, onSelect, onChange }) {
  const type = scheduleType(item.typeKey)
  const rows = [
    ['날짜', item.date ? `${fmtDate(item.date)} ${weekdayOf(item.date)}요일${item.time ? ` ${item.time}` : ''}` : '—'],
    item.place && ['장소', item.place],
    ['관련 사건', caseName],
    caseNo && ['사건번호', caseNo],
    ['알림', `기일 ${remindLabel(type.remind)} · 1일 전`],
  ].filter(Boolean)

  return (
    <div
      className={cx(
        'w-full rounded-2xl p-0 text-left outline-none transition-shadow',
        selected && 'ring-2 ring-brand-200 ring-offset-2',
      )}
    >
      <button type="button" onClick={onSelect} className="w-full rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[18px] font-semibold leading-[1.6] text-ink-900">{item.title}</p>
            <p className="text-[13px] font-medium leading-[1.6] text-ink-400">{item.date ? fmtDate(item.date) : '날짜 미정'}</p>
          </div>
          <span className={cx(
            'inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1',
            type.tone === 'red' ? 'bg-red-50 text-red-500' : type.tone === 'brand' ? 'bg-brand-50 text-brand-500' : 'bg-ink-100 text-ink-600',
          )}>
            <span className="h-1 w-1 rounded-full bg-current" aria-hidden="true" />
            <span className="text-[12px] font-semibold leading-[1.6]">{type.label}</span>
          </span>
        </div>

        <dl className="mt-3 space-y-3 rounded-xl bg-ink-50 p-4">
          {rows.map(([label, value]) => (
            <div key={label} className="flex gap-2.5">
              <dt className="w-[72px] shrink-0 text-[13px] font-medium leading-[1.6] text-ink-400">{label}</dt>
              <dd className="min-w-0 text-[14px] font-medium leading-[1.6] text-ink-700">{value}</dd>
            </div>
          ))}
        </dl>
      </button>

      {item.note && <p className="mt-2 text-xs font-medium text-ink-500">{item.note}</p>}
      {item.basis && (
        <p className="mt-1 text-xs font-medium text-ink-400">
          근거: {item.basis}
          {item.basisUrl && <a href={item.basisUrl} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-0.5 font-semibold text-brand-500 hover:underline">원문 <ExternalLink size={10} /></a>}
        </p>
      )}
      {item.warn && (
        <p className="mt-1.5 flex items-start gap-1 text-xs font-medium text-red-500">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />{item.warn}
        </p>
      )}

      {editing && (
        <div className="mt-3 grid gap-2 rounded-xl border border-ink-200 p-3 sm:grid-cols-[minmax(0,1fr)_140px_110px]" onClick={(event) => event.stopPropagation()}>
          <input value={item.title} onChange={(event) => onChange({ title: event.target.value })} className="h-10 min-w-0 rounded-lg border border-ink-200 px-3 text-sm font-medium outline-none focus:border-brand-300" aria-label="일정 제목" />
          <input type="date" value={item.date} onChange={(event) => onChange({ date: event.target.value })} className="h-10 rounded-lg border border-ink-200 px-2 text-sm font-medium outline-none focus:border-brand-300" aria-label="일정 날짜" />
          <input type="time" value={item.time || ''} onChange={(event) => onChange({ time: event.target.value })} className="h-10 rounded-lg border border-ink-200 px-2 text-sm font-medium outline-none focus:border-brand-300" aria-label="일정 시간" />
        </div>
      )}
    </div>
  )
}

export default function Schedule() {
  const fileInputRef = useRef(null)
  const today = todayValue()
  const {
    rawCases, activeRaw, setActiveCaseId, addTodo, updateTodo, removeTodo,
  } = useWorkspace()
  const [cur, setCur] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [selected, setSelected] = useState(today)
  const [auto, setAuto] = useState(false)
  const [add, setAdd] = useState(false)
  const [editing, setEditing] = useState(null)   // { caseId, todoId } — 없으면 새로 추가
  const [del, setDel] = useState(null)           // 삭제 확인 중인 일정
  const [toast, setToast] = useState('')
  const [manual, setManual] = useState(() => blankManual(today, activeRaw?.id || rawCases[0]?.id || ''))
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ stage: 'idle', value: 0 })
  const [importFile, setImportFile] = useState(null)
  const [importError, setImportError] = useState('')
  const [notice, setNotice] = useState(null)
  const [pasted, setPasted] = useState('')
  const [importCaseId, setImportCaseId] = useState(activeRaw?.id || rawCases[0]?.id || '')
  const [servedOn, setServedOn] = useState(today)   // 통지서 기한을 세는 기산일
  const [editingRow, setEditingRow] = useState(null) // 결과 카드 중 입력칸을 펼친 것
  const [selectedNoticeRowId, setSelectedNoticeRowId] = useState('')
  const [noticeDel, setNoticeDel] = useState(null)

  const flash = (message) => { setToast(message); window.setTimeout(() => setToast(''), 2200) }
  const allSchedule = useMemo(() => rawCases.flatMap((c) => caseUpcoming(c).map((item) => ({
    ...item,
    caseId: c.id,
    caseName: caseTitle(c),
    // 유형을 적어 둔 일정은 그 색을 쓰고, 예전에 만든 일정은 제목으로 짐작한다
    tone: item.typeKey
      ? scheduleType(item.typeKey).tone
      : (item.source === 'court-notice' || /기일/.test(item.text) ? 'red' : 'brand'),
  }))), [rawCases])
  const eventMap = useMemo(() => allSchedule.reduce((map, item) => {
    ;(map[item.due] ||= []).push(item)
    return map
  }, {}), [allSchedule])
  const upcoming = [...allSchedule].sort((a, b) => a.dday - b.dday).slice(0, 8)

  const first = new Date(cur.y, cur.m, 1).getDay()
  const days = new Date(cur.y, cur.m + 1, 0).getDate()
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const monthLabel = `${cur.y}년 ${cur.m + 1}월`
  const selDate = new Date(`${selected}T12:00:00`)
  const selLabel = selDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })
  const selEvents = eventMap[selected] || []

  const move = (delta) => setCur((current) => {
    let m = current.m + delta
    let y = current.y
    if (m < 0) { m = 11; y -= 1 }
    if (m > 11) { m = 0; y += 1 }
    return { y, m }
  })

  const openManual = () => {
    setEditing(null)
    setManual(blankManual(selected, activeRaw?.id || rawCases[0]?.id || ''))
    setAdd(true)
  }

  const openEdit = (item) => {
    setEditing({ caseId: item.caseId, todoId: item.id })
    setManual({
      title: item.text,
      date: item.due,
      time: item.time || '',
      caseId: item.caseId,
      typeKey: item.typeKey || (/기일/.test(item.text) ? 'hearing' : 'prepare'),
      remindOn: Number(item.remind) > 0,
      remindDays: Number(item.remind) > 0 ? item.remind : 1,
    })
    setAdd(true)
  }

  const saveManual = () => {
    if (!manual.caseId || !manual.title.trim() || !manual.typeKey || !manual.date) {
      flash('사건, 제목, 유형, 날짜를 모두 입력해 주세요.')
      return
    }
    const meta = {
      time: manual.time,
      typeKey: manual.typeKey || 'etc',
      remind: remindOf(manual),
    }
    if (editing) {
      // 사건을 옮겼으면 같은 사건 안에서 고칠 수 없다 — 원래 사건에서 지우고 새 사건에 넣는다.
      if (editing.caseId === manual.caseId) {
        updateTodo(editing.caseId, editing.todoId, { text: manual.title.trim(), due: manual.date, ...meta })
      } else {
        removeTodo(editing.caseId, editing.todoId)
        addTodo(manual.caseId, manual.title, manual.date, { ...meta, source: 'manual' })
      }
    } else {
      addTodo(manual.caseId, manual.title, manual.date, { ...meta, source: 'manual' })
    }
    setActiveCaseId(manual.caseId)
    setSelected(manual.date)
    setAdd(false)
    flash(editing ? '일정을 수정했습니다.' : '사건 일정에 저장했습니다.')
    setEditing(null)
  }

  const confirmDelete = () => {
    if (!del) return
    removeTodo(del.caseId, del.id)
    setDel(null)
    flash('일정을 삭제했습니다.')
  }

  const applyExtracted = (text, meta = {}) => {
    const result = extractCourtNotice(text)
    setNotice({ ...result, importMeta: meta })
    setSelectedNoticeRowId(result.events[0]?.id || result.counted[0]?.id || '')
    setEditingRow(null)
    if (result.caseNo) {
      const matched = rawCases.find((item) => String(item.caseNo || '').replace(/\s/g, '') === result.caseNo.replace(/\s/g, ''))
      if (matched) setImportCaseId(matched.id)
    }
    // 전자송달이고 등재일이 보이면, 확인하지 않았을 때의 송달간주일을 먼저 채워 둔다.
    // 어디까지나 초깃값이다 — 실제로 확인한 날은 사용자만 안다.
    setServedOn(result.serviceMode === 'electronic' && result.issuedAt
      ? deemedServedOn(result.issuedAt)
      : today)
    if (!result.events.length && !result.counted.length) {
      setImportError('통지서에서 기일이나 기한을 찾지 못했습니다. 아래 텍스트를 확인하거나 일정 추가로 직접 등록해 주세요.')
    }
  }

  const analyzeFile = async (source) => {
    const file = source?.target?.files?.[0] || source
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setImportError('10MB 이하 파일만 선택해 주세요.')
      return
    }
    setImporting(true)
    setImportFile({ name: file.name, size: file.size })
    setImportProgress({ stage: 'extract', value: 0 })
    setImportError('')
    setNotice(null)
    try {
      const parsed = await readCourtNoticeFile(file, {
        onProgress: ({ stage, progress }) => setImportProgress({ stage, value: Math.round(Number(progress || 0) * 100) }),
      })
      const text = parsed.text
      if (text.replace(/\s/g, '').length < 20) throw new Error('파일에서 글자를 충분히 읽지 못했습니다. 더 선명한 파일을 선택하거나 아래에 텍스트를 붙여 넣어 주세요.')
      setPasted(text)
      applyExtracted(text, { method: parsed.method, pages: parsed.pages, fileName: file.name })
      setImportProgress({ stage: 'done', value: 100 })
    } catch (error) {
      setImportError(error?.message || '통지서를 읽지 못했습니다.')
      setImportProgress({ stage: 'error', value: 0 })
    } finally {
      setImporting(false)
      if (source?.target) source.target.value = ''
    }
  }

  const closeNotice = () => {
    setAuto(false)
    setNotice(null)
    setImportFile(null)
    setImportError('')
    setImportProgress({ stage: 'idle', value: 0 })
    setPasted('')
    setEditingRow(null)
    setSelectedNoticeRowId('')
    setNoticeDel(null)
  }

  const openNotice = () => {
    setAuto(true)
    setImportError('')
    setNotice(null)
    setImportFile(null)
    setImportProgress({ stage: 'idle', value: 0 })
    setImportCaseId(activeRaw?.id || rawCases[0]?.id || '')
    setEditingRow(null)
    setSelectedNoticeRowId('')
    setNoticeDel(null)
  }

  const updateNoticeEvent = (id, fields) => setNotice((current) => ({
    ...current,
    events: current.events.map((item) => item.id === id ? { ...item, ...fields } : item),
    counted: current.counted.map((item) => item.id === id ? { ...item, ...fields } : item),
  }))

  /** 결과 카드에서 뺀다 — 저장하지 않을 항목 */
  const dropNoticeRow = (id) => setNotice((current) => ({
    ...current,
    events: current.events.filter((item) => item.id !== id),
    counted: current.counted.filter((item) => item.id !== id),
  }))

  /**
   * 통지서에서 뽑은 것 = 문서에 날짜가 적힌 기일 + 송달일로 계산한 기한.
   * 기한은 송달일이 정해져야 날짜가 생기므로 여기서 합친다.
   */
  const noticeRows = useMemo(() => {
    if (!notice) return []
    const counted = notice.counted
      .map((item) => resolveCounted(item, servedOn))
      .filter(Boolean)
    return [...notice.events, ...counted]
  }, [notice, servedOn])

  const selectedNoticeRow = noticeRows.find((item) => item.id === selectedNoticeRowId) || noticeRows[0] || null

  const confirmNoticeDelete = () => {
    if (!noticeDel) return
    const remaining = noticeRows.filter((item) => item.id !== noticeDel.id)
    dropNoticeRow(noticeDel.id)
    setSelectedNoticeRowId(remaining[0]?.id || '')
    setEditingRow(null)
    setNoticeDel(null)
    if (!remaining.length) {
      setNotice(null)
      setImportFile(null)
      setImportProgress({ stage: 'idle', value: 0 })
    }
  }

  const saveNotice = () => {
    if (!importCaseId) { setImportError('일정을 저장할 사건을 선택해 주세요.'); return }
    const chosen = noticeRows.filter((item) => item.checked && item.title.trim() && item.date)
    if (!chosen.length) { setImportError('저장할 일정을 하나 이상 확인해 주세요.'); return }
    chosen.forEach((item) => addTodo(importCaseId, item.title.trim(), item.date, {
      time: item.time,
      typeKey: item.typeKey,
      remind: scheduleType(item.typeKey).remind,
      place: item.place || '',
      basis: item.basis || '',
      servedOn: item.span ? servedOn : '',
      source: 'court-notice',
      noticeName: notice.noticeName,
      court: notice.court,
      caseNo: notice.caseNo,
    }))
    setActiveCaseId(importCaseId)
    setSelected(chosen[0].date)
    closeNotice()
    flash(`${chosen.length}개 일정을 사건에 등록했습니다.`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">일정 관리</h1>
          <p className="mt-1 text-sm text-ink-500">내 사건의 실제 기한과 법원 통지서 일정을 한곳에서 관리하세요.</p>
        </div>
        <Button data-guide="schedule-notice" size="sm" onClick={openNotice}>
          <Upload size={15} /> 법원 통지서 등록
        </Button>
      </div>

      <Card className="border-brand-200 bg-brand-50 p-4">
        <p className="text-sm font-semibold text-ink-800">소장을 제출했다고 준비서면 기한이 자동으로 생기지는 않아요.</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-600">
          법원은 사건에 따라 답변서 부본, 기일통지서, 석명준비명령·보정명령 등을 보냅니다. 피고의 답변서 30일은 소장 제출일이 아니라 소장 부본을 송달받은 날부터 계산합니다. 이 화면은 통지서에 실제로 적힌 날짜만 후보로 추출하고, 확인한 뒤 등록합니다.
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-brand-600">
          <a href="https://www.law.go.kr/법령/민사소송법/제256조" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">답변서 제출의무 <ExternalLink size={12} /></a>
          <a href="https://www.law.go.kr/법령/민사소송법/제280조" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">준비절차의 기간 지정 <ExternalLink size={12} /></a>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card data-guide="schedule-calendar" className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink-900">{monthLabel}</h2>
            <div className="flex gap-1">
              <button type="button" aria-label="이전 달" onClick={() => move(-1)} className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">‹</button>
              <button type="button" aria-label="다음 달" onClick={() => move(1)} className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">›</button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center">
            {weekdays.map((weekday, index) => <div key={weekday} className={cx('py-2 text-xs font-semibold', index === 0 ? 'text-red-400' : index === 6 ? 'text-brand-400' : 'text-ink-400')}>{weekday}</div>)}
            {cells.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="min-h-[104px]" />
              const key = ymd(cur.y, cur.m, day)
              const dayEvents = eventMap[key] || []
              const isSelected = key === selected
              const isToday = key === today
              const shown = dayEvents.slice(0, CHIPS_PER_DAY)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  aria-label={`${key}, 일정 ${dayEvents.length}건`}
                  className={cx(
                    'flex min-h-[104px] flex-col gap-1 rounded-xl p-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
                    isSelected ? 'bg-brand-50 ring-1 ring-inset ring-brand-300' : 'hover:bg-ink-50',
                  )}
                >
                  <span className={cx(
                    'grid h-6 w-6 shrink-0 place-items-center justify-self-center rounded-full text-[13px] tabular-nums',
                    isToday ? 'bg-brand-300 font-bold text-white' : cx('font-medium', index % 7 === 0 ? 'text-red-400' : 'text-ink-700'),
                  )}>
                    {day}
                  </span>
                  {/* 애플 캘린더처럼 제목이 보이는 띠 — 점만 찍으면 무슨 일정인지 열어봐야 안다 */}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {shown.map((item) => (
                      <span
                        key={item.id}
                        title={`${item.time ? `${item.time} ` : ''}${item.text}`}
                        className={cx('flex min-w-0 items-center gap-1 rounded px-1 py-0.5 text-[11px] font-medium leading-[1.35]', chipTone[item.tone] || chipTone.gray)}
                      >
                        <span className="h-1 w-1 shrink-0 rounded-full bg-current" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{item.text}</span>
                      </span>
                    ))}
                    {dayEvents.length > shown.length && (
                      <span className="px-1 text-[11px] font-semibold text-ink-400">+{dayEvents.length - shown.length}개 더</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </Card>

        <div data-guide="schedule-list" className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-ink-900">{selLabel}</h2>
              <Button size="sm" variant="soft" onClick={openManual}><Plus size={14} /> 일정 추가</Button>
            </div>
            <div className="mt-3 space-y-2">
              {selEvents.length === 0 ? (
                <div className="grid place-items-center py-8 text-center text-sm text-ink-400"><Calendar size={28} className="mb-2 text-ink-300" />등록된 일정이 없습니다</div>
              ) : selEvents.map((item) => (
                <div key={item.id} className="rounded-xl border border-ink-100 p-3">
                  <div className="flex items-start gap-2">
                    <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', dotTone[item.tone])} />
                    <span className="min-w-0 flex-1 text-sm font-semibold text-ink-700">{item.text}</span>
                    <KebabMenu
                      className="-mr-1 -mt-1 shrink-0"
                      label={`${item.text} 관리`}
                      items={[
                        { key: 'edit', label: '수정', icon: <FileText size={14} />, onClick: () => openEdit(item) },
                        { key: 'delete', label: '삭제', icon: <Trash size={14} />, tone: 'danger', divider: true, onClick: () => setDel(item) },
                      ]}
                    />
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 pl-4 text-xs text-ink-400">
                    {item.typeKey && <Badge tone={scheduleType(item.typeKey).tone === 'red' ? 'red' : 'blue'}>{scheduleType(item.typeKey).label}</Badge>}
                    <span>{item.time ? `${item.time} · ` : ''}{item.caseName}{item.place ? ` · ${item.place}` : ''}{item.source === 'court-notice' ? ' · 법원 통지서' : ''}</span>
                    {item.remind && <span className="inline-flex items-center gap-0.5"><Bell size={11} />{remindLabel(item.remind)}</span>}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-bold text-ink-900">다가오는 일정</h2>
            {upcoming.length === 0 ? <p className="mt-3 rounded-xl bg-ink-50 px-3 py-5 text-center text-sm text-ink-400">아직 등록된 사건 일정이 없습니다.</p> : (
              <div className="mt-3 space-y-3">
                {upcoming.map((item) => (
                  <div key={`${item.caseId}-${item.id}`} className="flex items-start gap-1">
                    <button type="button" onClick={() => { setSelected(item.due); setCur({ y: Number(item.due.slice(0, 4)), m: Number(item.due.slice(5, 7)) - 1 }) }} className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
                      <span className={cx('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', item.dday < 0 ? 'bg-red-300' : dotTone[item.tone])} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-ink-800">{item.text}</span><Badge tone={item.dday < 0 ? 'red' : 'blue'}>{item.dday < 0 ? `D+${-item.dday}` : item.dday === 0 ? 'D-DAY' : `D-${item.dday}`}</Badge></span>
                        <span className="block text-xs text-ink-400">{fmtDate(item.due)}{item.time ? ` ${item.time}` : ''} · {item.caseName}</span>
                      </span>
                    </button>
                    <KebabMenu
                      className="-mt-1 shrink-0"
                      label={`${item.text} 관리`}
                      items={[
                        { key: 'edit', label: '수정', icon: <FileText size={14} />, onClick: () => openEdit(item) },
                        { key: 'delete', label: '삭제', icon: <Trash size={14} />, tone: 'danger', divider: true, onClick: () => setDel(item) },
                      ]}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={auto}
        onClose={closeNotice}
        maxW="max-w-[560px]"
        variant={notice ? 'scheduleResult' : 'schedule'}
        title={notice ? '기일통지서 분석 결과' : '법원 통지서에서 일정 자동 등록'}
        sub={notice ? undefined : 'PDF·JPG·PNG의 글자를 이 기기에서 읽고, 분석된 일정을 사건에 저장합니다.'}
        footer={noticeRows.length > 0 ? (
          <div className="flex w-full items-center justify-between gap-3">
            <Button size="sm" variant="danger" onClick={() => setNoticeDel(selectedNoticeRow)} disabled={!selectedNoticeRow}>
              <Trash size={15} /> 삭제
            </Button>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="neutral" onClick={() => setEditingRow(editingRow === selectedNoticeRow?.id ? null : selectedNoticeRow?.id)} disabled={!selectedNoticeRow}>
                수정하기
              </Button>
              <Button size="sm" onClick={saveNotice}><CheckCircle size={15} /> 등록하기</Button>
            </div>
          </div>
        ) : !notice ? (
          <Button className="w-full" disabled={importing || !importCaseId} onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> {importing ? '분석 중이에요' : '통지서 선택하기'}
          </Button>
        ) : null}
      >
        {!notice ? (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink-700">등록할 사건</span>
              <select value={importCaseId} onChange={(event) => setImportCaseId(event.target.value)} className={inputClass}>
                <option value="">사건을 선택하세요</option>
                {rawCases.map((item) => <option key={item.id} value={item.id}>{caseTitle(item)}{item.caseNo ? ` · ${item.caseNo}` : ''}</option>)}
              </select>
            </label>

            <label
              className={cx(
                'grid min-h-[132px] cursor-pointer place-items-center rounded-[10px] border border-dashed px-4 py-6 text-center transition-colors',
                importing ? 'border-brand-200 bg-brand-50' : 'border-ink-200 bg-ink-50 hover:border-brand-200 hover:bg-brand-50',
              )}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => { event.preventDefault(); if (!importing) analyzeFile(event.dataTransfer.files?.[0]) }}
            >
              <span className="flex flex-col items-center">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-ink-400 shadow-sm"><Upload size={22} /></span>
                <span className="mt-3 text-base font-semibold text-ink-600">
                  {importing
                    ? importProgress.stage === 'ocr' ? `OCR로 글자를 읽는 중 ${importProgress.value}%` : '문서에서 글자를 찾는 중…'
                    : importFile?.name || 'PDF 또는 이미지 올리기'}
                </span>
                <span className="mt-1 text-xs font-medium text-ink-400">PDF, JPG, PNG, TXT · 최대 10MB</span>
                {importing && <span className="mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-white"><span className="block h-full rounded-full bg-brand-300 transition-[width]" style={{ width: `${Math.max(8, importProgress.value)}%` }} /></span>}
              </span>
              <input ref={fileInputRef} type="file" accept="application/pdf,text/plain,image/png,image/jpeg,.pdf,.txt,.png,.jpg,.jpeg" className="sr-only" disabled={importing} onChange={analyzeFile} />
            </label>

            <div className="rounded-xl bg-brand-50 px-4 py-3.5 text-[13px] font-medium leading-[1.65] text-brand-500">
              <p className="font-bold">자동으로 추출하는 정보</p>
              <ul className="mt-1 space-y-0.5">
                <li>· 사건번호 및 사건명</li>
                <li>· 변론기일 날짜 및 시간</li>
                <li>· 법원 정보와 재판부</li>
                <li>· 답변서·준비서면 등의 제출 기한</li>
              </ul>
            </div>

            <details className="group">
              <summary className="cursor-pointer list-none text-center text-xs font-medium text-ink-400 hover:text-ink-600">직접 텍스트를 붙여넣을게요</summary>
              <textarea value={pasted} onChange={(event) => setPasted(event.target.value)} rows={4} placeholder="사건번호, 통지서 종류, 날짜와 시간이 포함된 부분을 붙여 넣으세요." className="mt-3 w-full rounded-xl border border-ink-200 p-3 text-sm font-medium outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100" />
              <Button size="sm" variant="soft" className="mt-2 w-full" disabled={!pasted.trim()} onClick={() => { setImportError(''); applyExtracted(pasted, { method: 'pasted', pages: 1 }) }}>붙여넣은 내용 분석하기</Button>
            </details>

            {importError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-500">{importError}</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-300 text-white"><CheckCircle size={25} /></span>
              <h4 className="mt-3 text-[20px] font-semibold leading-[1.6] text-brand-400">{notice.noticeName || '기일통지서'}가 분석되었어요</h4>
              {notice.importMeta?.method === 'ocr' && <p className="mt-1 text-xs font-medium text-ink-400">OCR 결과이므로 원문과 날짜·시간을 꼭 대조해 주세요.</p>}
            </div>

            {notice.counted.length > 0 && (
              <div className="rounded-xl bg-brand-50 p-4">
                <p className="text-sm font-semibold text-ink-800">기한을 계산할 송달일을 확인해 주세요</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-ink-500">발송일이 아니라 전자소송 문서를 실제로 확인한 날을 입력합니다.</p>
                <input type="date" value={servedOn} onChange={(event) => setServedOn(event.target.value)} className="mt-3 h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm font-medium outline-none focus:border-brand-300" />
                {notice.serviceMode === 'electronic' && notice.issuedAt && <p className="mt-2 text-xs font-medium text-ink-500">확인하지 않았다면 {fmtDate(deemedServedOn(notice.issuedAt))}이 송달간주일입니다.</p>}
              </div>
            )}

            <div className="space-y-4">
              {noticeRows.map((item) => (
                <NoticeResultCard
                  key={item.id}
                  item={item}
                  caseName={caseTitle(rawCases.find((c) => c.id === importCaseId)) || '사건을 선택하세요'}
                  caseNo={notice.caseNo}
                  editing={editingRow === item.id}
                  selected={selectedNoticeRow?.id === item.id}
                  onSelect={() => setSelectedNoticeRowId(item.id)}
                  onChange={(fields) => updateNoticeEvent(item.id, fields)}
                />
              ))}
            </div>

            <p className="text-center text-xs font-medium text-ink-400">분석된 일정이 모두 선택한 사건에 등록됩니다.</p>
            {importError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-500">{importError}</p>}
          </div>
        )}
      </Modal>

      <Modal
        open={add}
        onClose={() => { setAdd(false); setEditing(null) }}
        maxW="max-w-[560px]"
        variant="schedule"
        title={editing ? '일정 수정' : '일정 추가'}
        sub={editing ? '바뀐 내용은 선택한 사건의 일정에 바로 반영됩니다.' : '사건과 날짜를 정하면 달력과 다가오는 일정에 함께 표시됩니다.'}
        footer={<><Button size="sm" variant="neutral" onClick={() => { setAdd(false); setEditing(null) }}>취소</Button><Button size="sm" onClick={saveManual}>{editing ? '수정하기' : '일정 추가하기'}</Button></>}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">사건</span>
            <select value={manual.caseId} onChange={(event) => setManual((current) => ({ ...current, caseId: event.target.value }))} className={inputClass}>
              <option value="">사건 선택</option>
              {rawCases.map((item) => <option key={item.id} value={item.id}>{caseTitle(item)}{item.caseNo ? ` · ${item.caseNo}` : ''}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">일정 제목</span>
            <input value={manual.title} onChange={(event) => setManual((current) => ({ ...current, title: event.target.value }))} className={inputClass} placeholder="예: 준비서면 제출" />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">일정 유형</span>
            <select
              value={manual.typeKey}
              onChange={(event) => {
                const typeKey = event.target.value
                // 유형마다 적당한 시점이 다르다 — 고르면 기본값을 맞춰 주고, 그 뒤엔 사용자가 바꾼다
                setManual((current) => ({ ...current, typeKey, remindDays: typeKey ? scheduleType(typeKey).remind : current.remindDays }))
              }}
              className={inputClass}
            >
              <option value="">선택하세요</option>
              {SCHEDULE_TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
            </select>
            {manual.typeKey && <span className="mt-1 block text-xs text-ink-400">{scheduleType(manual.typeKey).hint}</span>}
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">날짜</span><input type="date" value={manual.date} onChange={(event) => setManual((current) => ({ ...current, date: event.target.value }))} className={inputClass} /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">시간 <span className="font-medium text-ink-400">(선택)</span></span><input type="time" value={manual.time} onChange={(event) => setManual((current) => ({ ...current, time: event.target.value }))} className={inputClass} /></label>
          </div>

          <div className="border-t border-ink-100 pt-4">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 rounded accent-brand-300"
                checked={manual.remindOn}
                onChange={(event) => setManual((current) => ({ ...current, remindOn: event.target.checked }))}
              />
              <span className="text-sm font-semibold text-ink-800">알림 설정</span>
            </label>

            {manual.remindOn && (
              <label className="mt-3 block">
                <span className="mb-1.5 block text-sm font-medium text-ink-700">알림시간</span>
                <select
                  value={manual.remindDays}
                  onChange={(event) => setManual((current) => ({ ...current, remindDays: Number(event.target.value) }))}
                  className={inputClass}
                >
                  {REMIND_DAYS.map((days) => <option key={days} value={days}>{days}일 전</option>)}
                </select>
              </label>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={!!noticeDel}
        onClose={() => setNoticeDel(null)}
        maxW="max-w-[420px]"
        variant="schedule"
        title="분석 결과에서 삭제할까요?"
        sub="이 항목만 제외되고, 원본 통지서 파일과 다른 분석 결과는 그대로 유지됩니다."
        footer={<><Button size="sm" variant="neutral" onClick={() => setNoticeDel(null)}>취소</Button><Button size="sm" variant="danger" onClick={confirmNoticeDelete}><Trash size={15} /> 삭제</Button></>}
      >
        <div className="rounded-xl bg-ink-50 p-4">
          <p className="text-sm font-semibold text-ink-800">{noticeDel?.title}</p>
          <p className="mt-1 text-xs font-medium text-ink-500">{noticeDel?.date ? `${fmtDate(noticeDel.date)}${noticeDel.time ? ` ${noticeDel.time}` : ''}` : '날짜 미정'}</p>
        </div>
      </Modal>

      <Modal
        open={!!del} onClose={() => setDel(null)} maxW="max-w-[420px]" variant="schedule"
        title="일정을 삭제할까요?"
        sub="삭제하면 달력과 다가오는 일정에서 함께 사라집니다."
        footer={<><Button size="sm" variant="neutral" onClick={() => setDel(null)}>취소</Button><Button size="sm" variant="danger" onClick={confirmDelete}><Trash size={15} /> 삭제</Button></>}
      >
        <div className="rounded-xl bg-ink-50 p-4">
          <p className="text-sm font-semibold text-ink-800">{del?.text}</p>
          <p className="mt-1 text-xs font-medium text-ink-500">{del?.due ? `${fmtDate(del.due)}${del.time ? ` ${del.time}` : ''}` : '날짜 미정'}</p>
        </div>
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>}
    </div>
  )
}
