// 리스트로 보기 — 종류로 묶은 서류 목록
//
// 노션 데이터베이스의 그룹 보기와 같은 생각이다.
//   · 줄은 종류로 묶인다 — 소장 / 증거자료 / 준비서면 / 증거목록 / 신청서
//   · 종류마다 봐야 할 값이 다르니 **열도 종류마다 다르다**
//     (소장은 법원·청구금액, 증거는 호증·입증취지, 준비서면은 몇 차인지)
//   · 모든 줄에는 어느 사건 것인지가 달려 있다 — 관계형 속성
//
// 공통으로 갖는 것은 셋이다: 사건 · 제출 상태 · 기한(제출일). 소송에서 서류를 관리한다는 건
// 결국 "무엇을, 어느 사건에, 언제까지 내는가"라서 그렇다.

import { useState, useMemo, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { DOC_GROUPS, versionInfo } from '../lib/docboard.js'
import { EVIDENCE_STATUS, DOC_STATUS } from '../lib/casebook.js'
import { ddayOf } from '../data/mock.js'
import { Card, Badge, Button, Field, Input, inputCls, cx } from './ui.jsx'
import Modal from './Modal.jsx'
import {
  FileText, Image, Folder, Scroll, Gavel, Search, ChevronDown,
  AlertTriangle, Upload, Plus, Eye, Check, Trash, X, ArrowRight,
} from './icons.jsx'

const isImage = (name = '') => /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(name)
const today = new Date().toISOString().slice(0, 10)
const PAGE_SIZE = 10

const GROUP_ICON = { complaint: Scroll, evidence: Folder, brief: FileText, evidencelist: FileText, petition: Gavel }

const STATUS_TONE = {
  '제출완료': 'bg-brand-300 text-white',
  '제출예정': 'bg-brand-50 text-brand-600',
  '작성 중': 'bg-ink-100 text-ink-600',
  '미제출': 'bg-ink-100 text-ink-600',
  '보완필요': 'bg-red-50 text-red-500',
}
const optionsFor = (group) => (group === 'evidence' ? EVIDENCE_STATUS : DOC_STATUS)
const needsLatestSubmission = (row) => row.status !== '제출완료' || versionInfo(row).hasUnsubmittedRevision
const formatMoment = (value) => {
  if (!value) return '시각 기록 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const hasTime = typeof value === 'number' || String(value).includes('T')
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    ...(hasTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  }).format(date)
}

/* ────────── 셀 조각 ────────── */

/** 어느 사건 서류인지 — 이 화면에서 가장 중요한 관계 */
const CaseChip = ({ row }) => {
  const body = (
    <>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" />
      <span className="min-w-0 truncate">{row.caseTitle}</span>
    </>
  )
  const cls = 'inline-flex max-w-full items-center gap-1.5 rounded-md bg-ink-50 px-2 py-1 text-[11.5px] font-medium text-ink-700 transition hover:bg-brand-50 hover:text-brand-600'
  return row.real
    ? <Link to={`/app/cases/${row.caseKey}`} className={cls} title={`${row.caseTitle} ${row.caseNo || ''}`}>{body}</Link>
    : <span className={cls} title={row.caseNo}>{body}</span>
}

/**
 * 상태는 그 자리에서 바꾼다.
 *
 * 커스텀 absolute 메뉴를 표의 overflow 안에 두면 메뉴가 잘리고, 열린 동안
 * 스크롤도 표 안에 갇힌다. 네이티브 select는 팝업을 브라우저가 별도 레이어에
 * 그리므로 가로·세로 스크롤 위치와 무관하게 다시 선택할 수 있다.
 */
function StatusCell({ row, onPick }) {
  const opts = optionsFor(row.group)
  return (
    <label className="relative inline-block max-w-full">
      <span className="sr-only">{row.title} 제출 상태</span>
      <select
        value={row.status}
        onChange={(e) => onPick(e.target.value)}
        className={cx(
          'h-7 max-w-full cursor-pointer appearance-none rounded-md border-0 py-1 pl-2 pr-6 text-[11.5px] font-semibold outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-1',
          STATUS_TONE[row.status] || STATUS_TONE['작성 중'],
        )}
      >
        {opts.map((st) => <option key={st} value={st}>{st}</option>)}
      </select>
      <ChevronDown size={11} aria-hidden="true" className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
    </label>
  )
}

/** 기한이면 남은 날을, 냈으면 낸 날을 */
const DueCell = ({ row, onEdit }) => {
  const label = row.status === '제출완료' && row.submittedAt
    ? `제출일 ${row.submittedAt}`
    : row.due ? `제출 기한 ${row.due}` : '제출 기한 없음'
  const body = (() => {
  if (row.status === '제출완료' && row.submittedAt) {
    return <span className="whitespace-nowrap text-[12px] tabular-nums text-ink-500">제출 {row.submittedAt}</span>
  }
  if (!row.due) return <span className="text-[12px] text-ink-300">—</span>
  const dday = ddayOf(row.due)
  const late = dday.startsWith('D+') || dday === 'D-day'
  return (
    <span className="flex items-center gap-1 whitespace-nowrap">
      <span className={cx('rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums', late ? 'bg-red-50 text-red-500' : 'bg-ink-100 text-ink-600')}>{dday}</span>
      <span className="text-[11.5px] tabular-nums text-ink-400">{row.due.slice(5)}</span>
    </span>
  )
  })()
  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={`${row.title} · ${label} 편집`}
      title="기한·제출일 편집"
      className="rounded-md px-1 py-1 text-left transition-colors hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-1"
    >
      {body}
    </button>
  )
}

const Bar = ({ value }) => (
  <span className="flex items-center gap-1.5">
    <span className="h-1.5 w-10 overflow-hidden rounded-full bg-ink-100">
      <span className="block h-full rounded-full bg-brand-300" style={{ width: `${value}%` }} />
    </span>
    <span className="text-[11px] tabular-nums text-ink-400">{value}%</span>
  </span>
)

const VersionCell = ({ row }) => {
  const info = versionInfo(row)
  const files = [...info.versions].reverse()
  return (
    <div className="max-w-full space-y-1 px-1 py-1" aria-label={`${row.title} 생성 파일 ${files.length}개`}>
      {files.length === 0 ? <span className="text-[12px] text-ink-300">생성 파일 없음</span> : files.map((item) => {
        const latest = item.id === info.latest?.id
        return (
          <div key={item.id} className="flex min-w-0 items-center gap-1.5 text-[11px] tabular-nums">
            <span className={cx('min-w-0 truncate', latest ? 'font-semibold text-ink-700' : 'text-ink-500')}>{formatMoment(item.createdAt)}</span>
            {item.submittedAt && <span className="shrink-0 rounded bg-brand-50 px-1 py-0.5 text-[10px] font-semibold text-brand-600">제출본</span>}
          </div>
        )
      })}
      {info.hasUnsubmittedRevision && <span className="block truncate text-[10.5px] font-medium text-red-500">제출본 이후 새 파일</span>}
    </div>
  )
}

function RowMenu({ row, onEdit, onDelete, onSubmit }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ left: 8, top: 8 })
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()
  const item = 'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] transition-colors'

  const updatePosition = () => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const width = 176
    const height = menuRef.current?.offsetHeight || (row.real ? 196 : 158)
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width))
    const top = rect.bottom + height + 8 <= window.innerHeight
      ? rect.bottom + 4
      : Math.max(8, rect.top - height - 4)
    setPosition({ left, top })
  }

  const close = (restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus())
  }

  useEffect(() => {
    if (!open) return undefined
    updatePosition()
    requestAnimationFrame(() => menuRef.current?.querySelector('[role="menuitem"]')?.focus())
    const onKeyDown = (e) => { if (e.key === 'Escape') close(true) }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  return (
    <span className="inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${row.title} 관리`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="grid h-7 w-7 place-items-center rounded-md text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700">
        ⋯
      </button>
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-40" aria-hidden="true" onMouseDown={() => close(true)} />
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={`${row.title} 관리`}
            className="fixed z-50 w-[176px] rounded-xl border border-ink-200 bg-white py-1.5 shadow-xl"
            style={position}
          >
            <button type="button" role="menuitem" className={cx(item, 'text-ink-700 hover:bg-ink-50 focus:bg-ink-50 focus:outline-none')} onClick={() => { close(); onEdit() }}>
              <FileText size={14} /> 수정
            </button>
            {row.status !== '제출완료' && (
              <button type="button" role="menuitem" className={cx(item, 'text-ink-700 hover:bg-ink-50 focus:bg-ink-50 focus:outline-none')} onClick={() => { close(); onSubmit() }}>
                <Upload size={14} /> 전자소송에서 제출
              </button>
            )}
            {row.real && (
              <Link role="menuitem" to={`/app/cases/${row.caseKey}`} className={cx(item, 'text-ink-700 hover:bg-ink-50 focus:bg-ink-50 focus:outline-none')} onClick={() => close()}>
                <ArrowRight size={14} /> 사건 열기
              </Link>
            )}
            <span className="my-1 block border-t border-ink-100" />
            <button type="button" role="menuitem" className={cx(item, 'text-red-500 hover:bg-red-50 focus:bg-red-50 focus:outline-none')} onClick={() => { close(); onDelete() }}>
              <Trash size={14} /> 삭제
            </button>
          </div>
        </>,
        document.body,
      )}
    </span>
  )
}

/* ────────── 종류별 열 ────────── */

const nameCell = (row, onPreview) => {
  const Icon = isImage(row.title) ? Image : FileText
  return (
    <button type="button" onClick={() => onPreview?.(row)} className="flex w-full min-w-0 items-start gap-1.5 text-left">
      <Icon size={13} className="mt-0.5 shrink-0 text-ink-400" />
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-medium text-ink-800 hover:underline">{row.title}</span>
        {row.warn && (
          <span className="mt-0.5 flex items-start gap-1 text-[11px] leading-snug text-red-500">
            <AlertTriangle size={11} className="mt-0.5 shrink-0" />{row.warn}
          </span>
        )}
      </span>
    </button>
  )
}

/** 열은 종류마다 다르다. w는 grid-template-columns 값. */
const COLUMNS = {
  complaint: [
    { label: '문서명', w: 'minmax(170px,1.5fr)', cell: (r, h) => nameCell(r, h.onPreview) },
    { label: '사건', w: 'minmax(132px,1fr)', cell: (r) => <CaseChip row={r} /> },
    { label: '관할 법원', w: '118px', cell: (r) => <span className="truncate text-[12px] text-ink-600">{r.court || '—'}</span> },
    { label: '청구금액', w: '98px', cell: (r) => <span className="whitespace-nowrap text-[12px] tabular-nums text-ink-700">{r.amount ? `${r.amount}원` : '—'}</span> },
    { label: '작성', w: '92px', cell: (r) => <Bar value={r.progress ?? 0} /> },
    { label: '생성 파일', w: '142px', cell: (r) => <VersionCell row={r} /> },
    { label: '제출 상태', w: '108px', cell: (r, h) => <StatusCell row={r} onPick={(s) => h.onStatus(r, s)} /> },
    { label: '기한 · 제출일', w: '122px', cell: (r, h) => <DueCell row={r} onEdit={() => h.onEdit(r)} /> },
    { label: '', w: '36px', right: true, cell: (r, h) => <RowMenu row={r} onEdit={() => h.onEdit(r)} onDelete={() => h.onDelete(r)} onSubmit={() => h.onSubmit(r)} /> },
  ],
  evidence: [
    { label: '호증', w: '96px', cell: (r) => (
      <span className="flex items-center gap-1.5">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-brand-50 text-[10px] font-bold text-brand-500">{r.evNo}</span>
        <span className="whitespace-nowrap text-[12px] font-bold text-ink-800">{r.code}</span>
      </span>
    ) },
    { label: '서증명', w: 'minmax(148px,1.2fr)', cell: (r, h) => nameCell(r, h.onPreview) },
    { label: '입증취지', w: 'minmax(158px,1.4fr)', cell: (r, h) => (
      <button type="button" onClick={() => h.onEdit(r)} className="w-full text-left">
        {r.purpose
          ? <span className="line-clamp-2 text-[12.5px] leading-snug text-ink-700">{r.purpose}</span>
          : <span className="text-[12.5px] text-red-500">비어 있음 — 채워야 증거목록에 들어가요</span>}
      </button>
    ) },
    { label: '사건', w: 'minmax(118px,1fr)', cell: (r) => <CaseChip row={r} /> },
    { label: '생성 파일', w: '142px', cell: (r) => <VersionCell row={r} /> },
    { label: '제출 상태', w: '108px', cell: (r, h) => <StatusCell row={r} onPick={(s) => h.onStatus(r, s)} /> },
    { label: '기한 · 제출일', w: '122px', cell: (r, h) => <DueCell row={r} onEdit={() => h.onEdit(r)} /> },
    { label: '크기', w: '68px', cell: (r) => <span className="text-[12px] tabular-nums text-ink-400">{r.size || '—'}</span> },
    { label: '', w: '36px', right: true, cell: (r, h) => <RowMenu row={r} onEdit={() => h.onEdit(r)} onDelete={() => h.onDelete(r)} onSubmit={() => h.onSubmit(r)} /> },
  ],
  brief: [
    { label: '제목', w: 'minmax(180px,1.6fr)', cell: (r, h) => nameCell(r, h.onPreview) },
    { label: '차수', w: '64px', cell: (r) => <span className="text-[12px] text-ink-600">{r.round ? `${r.round}차` : '—'}</span> },
    { label: '사건', w: 'minmax(132px,1fr)', cell: (r) => <CaseChip row={r} /> },
    { label: '작성', w: '92px', cell: (r) => <Bar value={r.progress ?? 0} /> },
    { label: '생성 파일', w: '142px', cell: (r) => <VersionCell row={r} /> },
    { label: '제출 상태', w: '108px', cell: (r, h) => <StatusCell row={r} onPick={(s) => h.onStatus(r, s)} /> },
    { label: '기한 · 제출일', w: '122px', cell: (r, h) => <DueCell row={r} onEdit={() => h.onEdit(r)} /> },
    { label: '', w: '36px', right: true, cell: (r, h) => <RowMenu row={r} onEdit={() => h.onEdit(r)} onDelete={() => h.onDelete(r)} onSubmit={() => h.onSubmit(r)} /> },
  ],
  evidencelist: [
    { label: '제목', w: 'minmax(180px,1.6fr)', cell: (r, h) => nameCell(r, h.onPreview) },
    { label: '담긴 증거', w: '92px', cell: (r) => <span className="text-[12px] text-ink-600">{r.count ? `${r.count}건` : '—'}</span> },
    { label: '사건', w: 'minmax(132px,1fr)', cell: (r) => <CaseChip row={r} /> },
    { label: '작성', w: '92px', cell: (r) => <Bar value={r.progress ?? 0} /> },
    { label: '생성 파일', w: '142px', cell: (r) => <VersionCell row={r} /> },
    { label: '제출 상태', w: '108px', cell: (r, h) => <StatusCell row={r} onPick={(s) => h.onStatus(r, s)} /> },
    { label: '기한 · 제출일', w: '122px', cell: (r, h) => <DueCell row={r} onEdit={() => h.onEdit(r)} /> },
    { label: '', w: '36px', right: true, cell: (r, h) => <RowMenu row={r} onEdit={() => h.onEdit(r)} onDelete={() => h.onDelete(r)} onSubmit={() => h.onSubmit(r)} /> },
  ],
  petition: [
    { label: '종류', w: '92px', cell: (r) => <Badge tone={r.kind === 'answer' ? 'blue' : 'gray'}>{r.kind === 'answer' ? '답변서' : '신청서'}</Badge> },
    { label: '제목', w: 'minmax(180px,1.6fr)', cell: (r, h) => nameCell(r, h.onPreview) },
    { label: '사건', w: 'minmax(132px,1fr)', cell: (r) => <CaseChip row={r} /> },
    { label: '작성', w: '92px', cell: (r) => <Bar value={r.progress ?? 0} /> },
    { label: '생성 파일', w: '142px', cell: (r) => <VersionCell row={r} /> },
    { label: '제출 상태', w: '108px', cell: (r, h) => <StatusCell row={r} onPick={(s) => h.onStatus(r, s)} /> },
    { label: '기한 · 제출일', w: '122px', cell: (r, h) => <DueCell row={r} onEdit={() => h.onEdit(r)} /> },
    { label: '', w: '36px', right: true, cell: (r, h) => <RowMenu row={r} onEdit={() => h.onEdit(r)} onDelete={() => h.onDelete(r)} onSubmit={() => h.onSubmit(r)} /> },
  ],
}

/* ────────── 그룹 하나 ────────── */

function Group({
  group, rows, totalRows, page, totalPages,
  handlers, addTo, hot, panelId, tabId, onPage,
}) {
  const cols = COLUMNS[group.key]
  const template = cols.map((c) => c.w).join(' ')
  const Icon = GROUP_ICON[group.key] || FileText
  const late = totalRows.filter((r) => r.status !== '제출완료' && r.due && r.due <= today).length
  const undone = totalRows.filter(needsLatestSubmission).length

  return (
    <section id={panelId} role="tabpanel" aria-labelledby={tabId} tabIndex={0}>
      <div className="flex flex-wrap items-center gap-2 px-1 py-2">
        <div className="flex items-center gap-1.5 text-ink-400">
          <Icon size={15} />
          <span className="text-[15px] font-bold text-ink-900">{group.label}</span>
          <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-bold text-ink-500">{totalRows.length}</span>
        </div>
        {undone > 0 && <span className="text-[11.5px] text-ink-400">최신본 미제출 {undone}</span>}
        {late > 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-500">기한 지남 {late}</span>}
        <span className="hidden text-[11.5px] text-ink-400 sm:inline">{group.hint}</span>
        {addTo && (
          <Button as={Link} to={addTo.to} size="sm" variant="ghost" className="ml-auto text-[12px]">
            <Plus size={14} /> {addTo.label}
          </Button>
        )}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto overscroll-contain">
          <div className="min-w-[820px]">
            <div className="sticky top-0 z-10 grid items-center gap-2.5 border-b border-ink-200 bg-ink-50 px-4 py-2.5 text-[11px] font-medium text-ink-500"
              style={{ gridTemplateColumns: template }}>
              {cols.map((c, i) => <span key={i} className={cx('truncate', c.right && 'text-right')}>{c.label}</span>)}
            </div>
            {rows.length === 0 ? (
              <p className="px-4 py-8 text-center text-[12.5px] text-ink-400">아직 없습니다.</p>
            ) : rows.map((r) => {
              const trouble = !!r.warn || versionInfo(r).hasUnsubmittedRevision || (r.status !== '제출완료' && r.due && r.due < today)
              return (
                <div
                  key={r.key}
                  id={`row-${r.key}`}
                  className={cx(
                    'grid items-center gap-2.5 border-b border-ink-100 px-4 py-3 transition-colors last:border-0',
                    (hot === r.key || hot === r.sourceRow?.key) ? 'bg-brand-50 ring-2 ring-inset ring-brand-300'
                      : trouble ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-ink-50/70',
                  )}
                  style={{ gridTemplateColumns: template }}
                >
                  {cols.map((c, i) => (
                    <div key={i} className={cx('min-w-0', c.right && 'flex justify-end')}>{c.cell(r, {
                      ...handlers,
                      onStatus: (_, status) => handlers.onStatus(r.sourceRow || r, status),
                      onEdit: () => handlers.onEdit(r.sourceRow || r),
                      onDelete: () => handlers.onDelete(r.sourceRow || r),
                      onSubmit: () => handlers.onSubmit(r.sourceRow || r),
                    })}</div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      <Pagination page={page} totalPages={totalPages} onPage={onPage} />
    </section>
  )
}

function Pagination({ page, totalPages, onPage }) {
  const windowStart = Math.max(1, Math.min(page - 2, totalPages - 4))
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => windowStart + index)

  return (
    <nav aria-label="증빙자료 페이지 이동" className="mt-4 flex items-center justify-center gap-1">
        <button
          type="button"
          aria-label="이전 페이지"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="grid h-9 w-9 place-items-center rounded-lg text-[15px] font-semibold text-ink-500 transition-colors hover:bg-ink-100 disabled:cursor-not-allowed disabled:text-ink-300"
        >
          &lt;
        </button>
        {pages.map((number) => (
          <button
            key={number}
            type="button"
            aria-label={`${number}페이지`}
            aria-current={number === page ? 'page' : undefined}
            onClick={() => onPage(number)}
            className={cx(
              'grid h-9 min-w-9 place-items-center rounded-lg px-2 text-[13px] font-semibold transition-colors',
              number === page ? 'bg-brand-300 text-white' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800',
            )}
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          aria-label="다음 페이지"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="grid h-9 w-9 place-items-center rounded-lg text-[15px] font-semibold text-ink-500 transition-colors hover:bg-ink-100 disabled:cursor-not-allowed disabled:text-ink-300"
        >
          &gt;
        </button>
    </nav>
  )
}

/* ────────── 보드 ────────── */

export default function DocumentBoard({ rows, cases, real, focus, onStatus, onSave, onDelete, onSubmit, onPreview }) {
  const [selectedGroup, setSelectedGroup] = useState(DOC_GROUPS[0].key)
  const [caseFilter, setCaseFilter] = useState('')   // '' = 전체
  const [q, setQ] = useState('')
  const [onlyOpen, setOnlyOpen] = useState(false)    // 아직 안 낸 것만
  const [edit, setEdit] = useState(null)             // 수정 중인 줄
  const [form, setForm] = useState({})
  const [del, setDel] = useState(null)
  const [hot, setHot] = useState(null)               // 알림에서 찾아온 줄 — 잠깐 표시해 준다
  const [page, setPage] = useState(1)
  const searchRef = useRef(null)

  // 알림에서 넘어오면 그 사건만 남기고, 해당 줄로 굴러가 잠시 밝힌다
  useEffect(() => {
    if (!focus) return
    setCaseFilter(focus.caseKey || '')
    setQ(''); setOnlyOpen(false)
    if (!focus.rowKey) return
    const target = rows.find((row) => row.key === focus.rowKey)
    if (target?.group) setSelectedGroup(target.group)
    setHot(focus.rowKey)
    const t2 = setTimeout(() => setHot(null), 2600)
    return () => clearTimeout(t2)
  }, [focus])

  const shown = useMemo(() => {
    const key = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (caseFilter && r.caseKey !== caseFilter) return false
      if (onlyOpen && r.status === '제출완료') return false
      if (!key) return true
      return [r.title, r.purpose, r.caseTitle, r.caseNo, r.code].some((v) => String(v || '').toLowerCase().includes(key))
    })
  }, [rows, caseFilter, q, onlyOpen])

  const groups = useMemo(() => DOC_GROUPS.map((g) => ({
    ...g,
    rows: shown.filter((r) => r.group === g.key).flatMap((row) => {
      const files = versionInfo(row).versions
      return files.map((file) => ({
        ...row,
        key: `${row.key}:file:${file.id}`,
        sourceRow: row,
        createdAt: file.createdAt || row.createdAt,
        updatedAt: file.createdAt || row.updatedAt,
        submittedAt: file.submittedAt || '',
        status: file.submittedAt ? '제출완료' : row.status,
        versions: [file],
      }))
    }),
  })), [shown])
  const activeGroup = groups.find((g) => g.key === selectedGroup) || groups[0]
  const activeRows = activeGroup?.rows || []
  const totalPages = Math.max(1, Math.ceil(activeRows.length / PAGE_SIZE))
  const pageRows = activeRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [selectedGroup, caseFilter, q, onlyOpen])
  useEffect(() => { setPage((current) => Math.min(current, totalPages)) }, [totalPages])
  useEffect(() => {
    if (!focus?.rowKey) return undefined
    const index = activeRows.findIndex((row) => row.key === focus.rowKey || row.sourceRow?.key === focus.rowKey)
    if (index < 0) return undefined
    const targetPage = Math.floor(index / PAGE_SIZE) + 1
    setPage(targetPage)
    const targetKey = activeRows[index]?.key
    const timer = setTimeout(() => document.getElementById(`row-${targetKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
    return () => clearTimeout(timer)
  }, [focus?.rowKey, activeRows])

  const moveGroupTab = (event, index) => {
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % groups.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + groups.length) % groups.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = groups.length - 1
    else return
    event.preventDefault()
    const group = groups[next]
    setSelectedGroup(group.key)
    requestAnimationFrame(() => document.getElementById(`document-group-tab-${group.key}`)?.focus())
  }

  const openEdit = (row) => {
    setEdit(row)
    setForm({ title: row.title, purpose: row.purpose || '', due: row.due || '', submittedAt: row.submittedAt || '' })
  }
  const saveEdit = () => {
    onSave?.(edit, { title: form.title.trim(), purpose: form.purpose, due: form.due, submittedAt: form.submittedAt })
    setEdit(null)
  }

  const handlers = {
    onStatus: (row, st) => onStatus?.(row, st),
    onEdit: openEdit,
    onDelete: (row) => setDel(row),
    onSubmit: (row) => onSubmit?.(row),
    onPreview: (row) => onPreview?.(row),
  }

  const addTo = {
    complaint: { to: '/app/documents', label: '소장 작성' },
    evidence: { to: '/app/documents', label: '증거 추가' },
    brief: { to: '/app/documents', label: '준비서면 작성' },
    evidencelist: { to: '/app/documents', label: '증거목록 작성' },
    petition: { to: '/app/documents', label: '신청서 작성' },
  }

  return (
    <div className="space-y-4">
      {/* 문서 종류와 필터는 표를 스크롤해도 곧바로 바꿀 수 있게 함께 고정한다. */}
      <div className="sticky top-[72px] z-20">
        <div role="tablist" aria-label="증빙자료 종류" className="flex items-end overflow-x-auto px-1 pt-1">
          {groups.map((group, index) => {
            const selected = selectedGroup === group.key
            return (
              <button
                key={group.key}
                id={`document-group-tab-${group.key}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`document-group-panel-${group.key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setSelectedGroup(group.key)}
                onKeyDown={(event) => moveGroupTab(event, index)}
                className={cx(
                  'relative flex h-[48px] shrink-0 items-center gap-2 rounded-t-[14px] px-5 text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-inset',
                  index > 0 && '-ml-2 pl-7',
                  selected ? 'z-[1] bg-white text-ink-900' : 'bg-ink-200 text-ink-500 hover:text-ink-700',
                )}
              >
                {group.label}
                <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-bold', selected ? 'bg-brand-50 text-brand-600' : 'bg-white/70 text-ink-500')}>
                  {group.rows.length}
                </span>
              </button>
            )
          })}
        </div>

        <div className={cx(
          'space-y-3 rounded-2xl border border-ink-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
          selectedGroup === groups[0]?.key && 'rounded-tl-none',
        )}>
          <form
            className="flex w-full items-center gap-2"
            role="search"
            onSubmit={(event) => { event.preventDefault(); setQ((value) => value.trim()) }}
          >
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">서류나 사건 검색하기</span>
              <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden="true" />
              <input
                ref={searchRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="서류나 사건 검색하기"
                className="h-12 w-full rounded-xl border border-ink-200 bg-white pl-11 pr-10 text-[14px] text-ink-900 outline-none transition placeholder:text-ink-300 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
              />
              {q && <button type="button" aria-label="검색어 지우기" onClick={() => { setQ(''); searchRef.current?.focus() }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 hover:text-ink-700"><X size={14} /></button>}
            </label>
            <button
              type="submit"
              className="h-12 shrink-0 rounded-lg bg-brand-300 px-5 text-[13px] font-semibold text-white transition hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
            >
              검색
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2" aria-label="사건 필터">
            <FilterChip on={!caseFilter} onClick={() => setCaseFilter('')}>전체 사건</FilterChip>
            {cases.map((c) => (
              <FilterChip key={c.caseKey} on={caseFilter === c.caseKey} onClick={() => setCaseFilter(c.caseKey)}>
                {c.caseTitle}
              </FilterChip>
            ))}
            <button
              type="button"
              aria-pressed={onlyOpen}
              onClick={() => setOnlyOpen((v) => !v)}
              className={cx('max-w-[190px] truncate rounded-full border px-3 py-1.5 text-[12px] font-medium transition',
                onlyOpen ? 'border-brand-300 bg-brand-50 text-brand-600' : 'border-ink-200 bg-ink-50 text-ink-500 hover:text-ink-700')}
            >
              {onlyOpen ? '✓ ' : ''}아직 안 낸 것만
            </button>
          </div>

        </div>
      </div>

      {activeGroup && (
        <Group
          key={activeGroup.key}
          group={activeGroup}
          rows={pageRows}
          totalRows={activeRows}
          page={page}
          totalPages={totalPages}
          handlers={handlers}
          addTo={addTo[activeGroup.key]}
          hot={hot}
          tabId={`document-group-tab-${activeGroup.key}`}
          panelId={`document-group-panel-${activeGroup.key}`}
          onPage={setPage}
        />
      )}

      {/* 수정 */}
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.group === 'evidence' ? '증거 정보 수정' : '서류 정보 수정'}
        sub={edit ? `${edit.caseTitle}${edit.code ? ` · ${edit.code}` : ''}` : ''}
        footer={(
          <>
            <Button variant="neutral" size="sm" onClick={() => setEdit(null)}>취소</Button>
            <Button size="sm" onClick={saveEdit}><Check size={14} /> 저장</Button>
          </>
        )}
      >
        <div className="space-y-4">
          <Field label={edit?.group === 'evidence' ? '파일명(서증명)' : '제목'}>
            <Input value={form.title || ''} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </Field>
          {edit?.group === 'evidence' && (
            <Field label="입증 취지" hint="이 증거로 무엇을 입증하려는지 적어주세요.">
              <textarea
                className="min-h-[92px] w-full resize-none rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                value={form.purpose || ''}
                onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
              />
            </Field>
          )}
          <Field label="제출 기한" hint="법원이 정해 준 날이 있으면 적어 두세요. 남은 날짜가 표시됩니다.">
            <input
              type="date"
              aria-label="제출 기한"
              className={inputCls}
              value={form.due || ''}
              onInput={(e) => {
                const { value } = e.currentTarget
                setForm((f) => ({ ...f, due: value }))
              }}
              onChange={(e) => setForm((f) => ({ ...f, due: e.target.value }))}
            />
          </Field>
          <Field label="제출일" hint={edit?.status === '제출완료' ? '실제로 법원에 제출한 날짜를 적어 두세요.' : '제출완료 상태인 서류만 제출일을 기록할 수 있어요.'}>
            <input
              type="date"
              aria-label="제출일"
              disabled={edit?.status !== '제출완료'}
              className={cx(inputCls, 'disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-400')}
              value={form.submittedAt || ''}
              onInput={(e) => {
                const { value } = e.currentTarget
                setForm((f) => ({ ...f, submittedAt: value }))
              }}
              onChange={(e) => setForm((f) => ({ ...f, submittedAt: e.target.value }))}
            />
          </Field>
          <p className="rounded-xl bg-ink-50 px-3.5 py-2.5 text-[12px] text-ink-500">
            사건: <b className="font-semibold text-ink-700">{edit?.caseTitle}</b>{edit?.caseNo ? ` · ${edit.caseNo}` : ''}
          </p>
        </div>
      </Modal>

      {/* 삭제 */}
      <Modal
        open={!!del}
        onClose={() => setDel(null)}
        title="이 서류를 지울까요?"
        sub={del ? `${del.caseTitle} · ${del.title}` : ''}
        maxW="max-w-md"
        footer={(
          <>
            <Button variant="neutral" size="sm" onClick={() => setDel(null)}>취소</Button>
            <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={() => { onDelete?.(del); setDel(null) }}>지우기</Button>
          </>
        )}
      >
        <p className="text-[13.5px] leading-relaxed text-ink-600">
          {del?.group === 'evidence'
            ? '증거를 지우면 서류함에서도 사라지고, 뒤 호증 번호가 하나씩 당겨집니다.'
            : del?.kind === 'complaint'
              ? '소장은 사건 그 자체라 지울 수 없어요. 사건을 정리하려면 사건 관리에서 사건을 지워 주세요.'
              : '지운 서류는 되돌릴 수 없어요.'}
        </p>
      </Modal>
    </div>
  )
}

const FilterChip = ({ on, onClick, children }) => (
  <button
    onClick={onClick}
    className={cx('max-w-[190px] truncate rounded-full border px-3 py-1.5 text-[12px] font-medium transition',
      on ? 'border-brand-300 bg-brand-50 text-brand-600' : 'border-ink-200 bg-white text-ink-500 hover:text-ink-700')}
  >
    {children}
  </button>
)
