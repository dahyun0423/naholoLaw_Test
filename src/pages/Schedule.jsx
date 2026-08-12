import { useMemo, useState } from 'react'
import { Card, Badge, Button, cx } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { caseUpcoming, caseTitle } from '../lib/casebook.js'
import { fmtDate } from '../lib/complaint.js'
import { extractCourtNotice, readCourtNoticeFile } from '../lib/courtNotice.js'
import { Calendar, Upload, Plus, ExternalLink, FileText, CheckCircle } from '../components/icons.jsx'

const dotTone = { red: 'bg-red-300', brand: 'bg-brand-400', gray: 'bg-ink-300' }
const weekdays = ['일', '월', '화', '수', '목', '금', '토']
const todayValue = () => new Date().toISOString().slice(0, 10)
const inputClass = 'h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-sm text-ink-700 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100'

function ymd(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function Schedule() {
  const today = todayValue()
  const {
    rawCases, activeRaw, setActiveCaseId, addTodo,
  } = useWorkspace()
  const [cur, setCur] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() } })
  const [selected, setSelected] = useState(today)
  const [auto, setAuto] = useState(false)
  const [add, setAdd] = useState(false)
  const [toast, setToast] = useState('')
  const [manual, setManual] = useState({ title: '', date: today, time: '', caseId: activeRaw?.id || rawCases[0]?.id || '' })
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [notice, setNotice] = useState(null)
  const [pasted, setPasted] = useState('')
  const [importCaseId, setImportCaseId] = useState(activeRaw?.id || rawCases[0]?.id || '')

  const flash = (message) => { setToast(message); window.setTimeout(() => setToast(''), 2200) }
  const allSchedule = useMemo(() => rawCases.flatMap((c) => caseUpcoming(c).map((item) => ({
    ...item,
    caseId: c.id,
    caseName: caseTitle(c),
    tone: item.source === 'court-notice' || /기일/.test(item.text) ? 'red' : 'brand',
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
    setManual({ title: '', date: selected, time: '', caseId: activeRaw?.id || rawCases[0]?.id || '' })
    setAdd(true)
  }

  const saveManual = () => {
    if (!manual.caseId || !manual.title.trim() || !manual.date) {
      flash('사건, 제목, 날짜를 모두 입력해 주세요.')
      return
    }
    addTodo(manual.caseId, manual.title, manual.date, { time: manual.time, source: 'manual' })
    setActiveCaseId(manual.caseId)
    setSelected(manual.date)
    setAdd(false)
    flash('사건 일정에 저장했습니다.')
  }

  const applyExtracted = (text) => {
    const result = extractCourtNotice(text)
    setNotice(result)
    if (result.caseNo) {
      const matched = rawCases.find((item) => String(item.caseNo || '').replace(/\s/g, '') === result.caseNo.replace(/\s/g, ''))
      if (matched) setImportCaseId(matched.id)
    }
    if (!result.events.length) setImportError('통지서에서 일정 날짜를 찾지 못했습니다. 아래 텍스트를 확인하거나 일정 추가로 직접 등록해 주세요.')
  }

  const analyzeFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportError('')
    setNotice(null)
    try {
      const text = await readCourtNoticeFile(file)
      if (text.replace(/\s/g, '').length < 20) throw new Error('PDF에 읽을 수 있는 텍스트가 없습니다. 스캔본이면 아래에 내용을 붙여 넣어 주세요.')
      setPasted(text)
      applyExtracted(text)
    } catch (error) {
      setImportError(error?.message || '통지서를 읽지 못했습니다.')
    } finally {
      setImporting(false)
      event.target.value = ''
    }
  }

  const updateNoticeEvent = (id, fields) => setNotice((current) => ({
    ...current,
    events: current.events.map((item) => item.id === id ? { ...item, ...fields } : item),
  }))

  const saveNotice = () => {
    if (!importCaseId) { setImportError('일정을 저장할 사건을 선택해 주세요.'); return }
    const chosen = (notice?.events || []).filter((item) => item.checked && item.title.trim() && item.date)
    if (!chosen.length) { setImportError('저장할 일정을 하나 이상 확인해 주세요.'); return }
    chosen.forEach((item) => addTodo(importCaseId, item.title.trim(), item.date, {
      time: item.time,
      source: 'court-notice',
      noticeName: notice.noticeName,
      court: notice.court,
      caseNo: notice.caseNo,
    }))
    setActiveCaseId(importCaseId)
    setSelected(chosen[0].date)
    setAuto(false)
    setNotice(null)
    setPasted('')
    flash(`${chosen.length}개 일정을 사건에 등록했습니다.`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">일정 관리</h1>
          <p className="mt-1 text-sm text-ink-500">내 사건의 실제 기한과 법원 통지서 일정을 한곳에서 관리하세요.</p>
        </div>
        <Button data-guide="schedule-notice" size="sm" onClick={() => { setAuto(true); setImportError(''); setNotice(null); setImportCaseId(activeRaw?.id || rawCases[0]?.id || '') }}>
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
              if (!day) return <div key={`empty-${index}`} />
              const key = ymd(cur.y, cur.m, day)
              const dayEvents = eventMap[key] || []
              const isSelected = key === selected
              const isToday = key === today
              return (
                <button key={key} type="button" onClick={() => setSelected(key)} aria-label={`${key}, 일정 ${dayEvents.length}건`} className={cx('relative aspect-square rounded-xl p-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300', isSelected ? 'bg-brand-300 text-white' : cx('text-ink-700 hover:bg-ink-100', isToday && 'font-bold text-brand-500 ring-1 ring-inset ring-brand-300'))}>
                  <span className={cx(index % 7 === 0 && !isSelected && 'text-red-400')}>{day}</span>
                  {dayEvents.length > 0 && <span className="absolute bottom-1.5 left-1/2 flex max-w-[80%] -translate-x-1/2 gap-0.5">{dayEvents.slice(0, 4).map((item) => <span key={item.id} className={cx('h-1.5 w-1.5 rounded-full', isSelected ? 'bg-white' : dotTone[item.tone])} />)}</span>}
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
                  <div className="flex items-start gap-2"><span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', dotTone[item.tone])} /><span className="text-sm font-semibold text-ink-700">{item.text}</span></div>
                  <p className="mt-1 pl-4 text-xs text-ink-400">{item.time ? `${item.time} · ` : ''}{item.caseName}{item.source === 'court-notice' ? ' · 법원 통지서' : ''}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-bold text-ink-900">다가오는 일정</h2>
            {upcoming.length === 0 ? <p className="mt-3 rounded-xl bg-ink-50 px-3 py-5 text-center text-sm text-ink-400">아직 등록된 사건 일정이 없습니다.</p> : (
              <div className="mt-3 space-y-3">
                {upcoming.map((item) => (
                  <button type="button" key={`${item.caseId}-${item.id}`} onClick={() => { setSelected(item.due); setCur({ y: Number(item.due.slice(0, 4)), m: Number(item.due.slice(5, 7)) - 1 }) }} className="flex w-full items-start gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
                    <span className={cx('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', item.dday < 0 ? 'bg-red-300' : dotTone[item.tone])} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-ink-800">{item.text}</span><Badge tone={item.dday < 0 ? 'red' : 'blue'}>{item.dday < 0 ? `D+${-item.dday}` : item.dday === 0 ? 'D-DAY' : `D-${item.dday}`}</Badge></span>
                      <span className="block text-xs text-ink-400">{fmtDate(item.due)}{item.time ? ` ${item.time}` : ''} · {item.caseName}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={auto} onClose={() => setAuto(false)} maxW="max-w-[720px]"
        title="법원 통지서에서 일정 등록"
        sub="텍스트 PDF·TXT를 이 기기에서 읽고, 선택한 일정만 사건에 저장합니다."
        footer={<><Button variant="neutral" onClick={() => setAuto(false)}>취소</Button>{notice?.events?.length > 0 && <Button onClick={saveNotice}>확인한 일정 등록</Button>}</>}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">등록할 사건</span>
            <select value={importCaseId} onChange={(event) => setImportCaseId(event.target.value)} className={inputClass}>
              <option value="">사건을 선택하세요</option>
              {rawCases.map((item) => <option key={item.id} value={item.id}>{caseTitle(item)}{item.caseNo ? ` · ${item.caseNo}` : ''}</option>)}
            </select>
          </label>

          <label className="grid cursor-pointer place-items-center rounded-xl border-2 border-dashed border-ink-200 bg-ink-50 py-8 text-center hover:border-brand-200 hover:bg-brand-50">
            <Upload size={28} className="text-ink-400" />
            <span className="mt-2 text-sm font-semibold text-ink-600">{importing ? '통지서를 읽고 있습니다…' : 'PDF 또는 TXT 선택'}</span>
            <span className="mt-1 text-xs text-ink-400">파일은 외부로 전송되지 않습니다 · 스캔 PDF는 텍스트 붙여넣기 사용</span>
            <input type="file" accept="application/pdf,text/plain,.pdf,.txt" className="sr-only" disabled={importing} onChange={analyzeFile} />
          </label>

          <details className="rounded-xl border border-ink-200 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-ink-600">스캔본이거나 추출이 안 되나요? 통지서 텍스트 붙여넣기</summary>
            <textarea value={pasted} onChange={(event) => setPasted(event.target.value)} rows={5} placeholder="사건번호, 통지서 종류, 날짜와 시간이 포함된 부분을 붙여 넣으세요." className="mt-3 w-full rounded-xl border border-ink-200 p-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100" />
            <Button size="sm" variant="soft" className="mt-2" disabled={!pasted.trim()} onClick={() => { setImportError(''); applyExtracted(pasted) }}>붙여넣은 내용 분석</Button>
          </details>

          {importError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-500">{importError}</p>}

          {notice && (
            <div className="rounded-xl border border-ink-200 p-4">
              <div className="flex items-start gap-3">
                <FileText size={20} className="mt-0.5 shrink-0 text-brand-500" />
                <div><p className="font-semibold text-ink-800">{notice.noticeName}</p><p className="text-xs text-ink-400">{[notice.court, notice.caseNo].filter(Boolean).join(' · ') || '법원·사건번호는 파일에서 확인되지 않았습니다.'}</p></div>
              </div>
              {notice.events.length > 0 && <div className="mt-4 space-y-3">{notice.events.map((item) => (
                <div key={item.id} className="grid gap-2 rounded-xl bg-ink-50 p-3 sm:grid-cols-[28px_minmax(0,1fr)_140px_100px]">
                  <label className="grid place-items-center"><input type="checkbox" checked={item.checked} onChange={(event) => updateNoticeEvent(item.id, { checked: event.target.checked })} className="h-4 w-4 accent-[#3182f6]" aria-label={`${item.title} 등록`} /></label>
                  <input value={item.title} onChange={(event) => updateNoticeEvent(item.id, { title: event.target.value })} className="h-10 min-w-0 rounded-lg border border-ink-200 px-3 text-sm" aria-label="일정 제목" />
                  <input type="date" value={item.date} onChange={(event) => updateNoticeEvent(item.id, { date: event.target.value })} className="h-10 rounded-lg border border-ink-200 px-2 text-sm" aria-label="일정 날짜" />
                  <input type="time" value={item.time} onChange={(event) => updateNoticeEvent(item.id, { time: event.target.value })} className="h-10 rounded-lg border border-ink-200 px-2 text-sm" aria-label="일정 시간" />
                </div>
              ))}</div>}
              {notice.events.length > 0 && <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-ink-500"><CheckCircle size={14} className="mt-0.5 shrink-0 text-brand-500" />원문과 날짜·시간을 대조한 뒤 체크된 항목만 등록하세요.</p>}
            </div>
          )}
        </div>
      </Modal>

      <Modal open={add} onClose={() => setAdd(false)} title="사건 일정 추가" footer={<><Button variant="neutral" onClick={() => setAdd(false)}>취소</Button><Button onClick={saveManual}>저장</Button></>}>
        <div className="space-y-4">
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">사건</span><select value={manual.caseId} onChange={(event) => setManual((current) => ({ ...current, caseId: event.target.value }))} className={inputClass}><option value="">사건 선택</option>{rawCases.map((item) => <option key={item.id} value={item.id}>{caseTitle(item)}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">일정 제목</span><input value={manual.title} onChange={(event) => setManual((current) => ({ ...current, title: event.target.value }))} className={inputClass} placeholder="예: 준비서면 제출" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">날짜</span><input type="date" value={manual.date} onChange={(event) => setManual((current) => ({ ...current, date: event.target.value }))} className={inputClass} /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">시간(선택)</span><input type="time" value={manual.time} onChange={(event) => setManual((current) => ({ ...current, time: event.target.value }))} className={inputClass} /></label>
          </div>
        </div>
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>}
    </div>
  )
}
