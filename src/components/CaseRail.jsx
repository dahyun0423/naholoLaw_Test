// 사건 고르기 — 선반
//
// 사건을 얇은 막대로 세워 두고, **가리키는 하나만 넓게 펼친다.**
// 펼쳐진 칸은 카드가 되어 그 사건의 숫자를 전부 보여주고,
// 나머지는 폭 44px짜리 막대로 물러나 "몇 건이 있는지"만 말한다.
//
// 이 방식이 표보다 나은 이유: 사건은 동시에 여러 건을 비교하는 물건이 아니다.
// 하나를 붙잡고 몇 달을 간다. 그래서 하나를 크게 보여주고 나머지는 곁에 두는 편이 맞다.
//
// 움직이는 값은 폭 하나뿐이다. 레이아웃이 흔들리지 않게 컨테이너 높이는 고정한다.

import { useEffect, useRef, useState } from 'react'
import { cx } from './ui.jsx'
import { Plus, ArrowRight, FileText, Folder } from './icons.jsx'

const BAR = 44          // 접힌 막대 폭
const CARD = 330        // 펼친 카드 폭
const GAP = 10
const H = 236           // 선반 높이

const STATUS_TONE = {
  '작성 중': 'bg-ink-100 text-ink-600',
  '제출 준비': 'bg-ink-100 text-ink-700',
  '접수함': 'bg-brand-50 text-brand-600',
  '진행 중': 'bg-brand-50 text-brand-600',
  '종결': 'bg-ink-100 text-ink-500',
}

export default function CaseRail({ items, onOpen, onNew }) {
  const [active, setActive] = useState(0)
  const ref = useRef(null)
  const slots = items.length + 1                 // 마지막 칸은 「새 사건」

  useEffect(() => { setActive((a) => Math.min(a, slots - 1)) }, [slots])

  const onKeyDown = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const next = Math.min(slots - 1, Math.max(0, active + (e.key === 'ArrowRight' ? 1 : -1)))
    setActive(next)
    ref.current?.querySelectorAll('.rail-item')[next]?.focus()
  }

  return (
    <div
      ref={ref}
      onKeyDown={onKeyDown}
      className="flex select-none items-end overflow-x-auto pb-2"
      style={{ height: H + 8, gap: GAP }}
    >
      {items.map((c, i) => (
        <RailItem
          key={c.id}
          c={c}
          open={active === i}
          onFocus={() => setActive(i)}
          onOpen={() => onOpen(c.id)}
        />
      ))}
      <NewItem open={active === items.length} onFocus={() => setActive(items.length)} onOpen={onNew} />
    </div>
  )
}

/* ────────────────────── 사건 한 칸 ────────────────────── */

function RailItem({ c, open, onFocus, onOpen }) {
  return (
    <button
      type="button"
      aria-label={`${c.title} — ${c.status}`}
      aria-expanded={open}
      onMouseEnter={onFocus}
      onFocus={onFocus}
      onClick={() => (open ? onOpen() : onFocus())}
      className={cx(
        'rail-item group relative shrink-0 overflow-hidden rounded-2xl text-left outline-none',
        'focus-visible:ring-4 focus-visible:ring-brand-100',
        open ? 'border border-ink-200 bg-white shadow-[0_16px_36px_-18px_rgba(23,36,54,0.35)]' : 'shadow-[0_6px_16px_-10px_rgba(23,36,54,0.4)]',
      )}
      style={{ width: open ? CARD : BAR, height: H, background: open ? undefined : c.spine.cover }}
    >
      {/* ── 접힌 모습: 세로 이름 ── */}
      <span
        className={cx(
          'absolute inset-0 flex flex-col items-center justify-between py-4 transition-opacity duration-200',
          open ? 'pointer-events-none opacity-0' : 'opacity-100 delay-150',
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
        {/* 접힌 폭은 44px뿐이라 긴 제목은 두 줄로 접혀 읽히지 않는다. 짧은 이름만 쓴다. */}
        <span className="text-[12.5px] font-bold tracking-tight text-white" style={{ writingMode: 'vertical-rl' }}>
          {c.short || c.title}
        </span>
        <span className="text-[10px] font-bold tabular-nums text-white/80">{c.progress}%</span>
      </span>

      {/* ── 펼친 모습: 카드 ── */}
      <span
        className={cx(
          'absolute inset-0 flex flex-col p-5 transition-opacity duration-200',
          open ? 'opacity-100 delay-150' : 'pointer-events-none opacity-0',
        )}
      >
        <span className="absolute inset-x-0 top-0 h-1" style={{ background: c.spine.cover }} />

        <span className="flex items-start gap-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] font-bold text-ink-900">{c.title}</span>
            <span className="mt-0.5 block truncate text-[12px] text-ink-500">
              {[c.caseNo || '사건번호 없음', c.parties].filter(Boolean).join(' · ')}
            </span>
          </span>
          <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS_TONE[c.status] || 'bg-ink-100 text-ink-600')}>
            {c.status}
          </span>
        </span>

        <span className="mt-5 flex items-end gap-5">
          <Metric label="남은 준비" value={c.todoLeft} alert={c.overdue > 0} />
          <Metric label="문서" value={c.docs} icon={FileText} />
          <Metric label="증빙" value={c.evidence} icon={Folder} />
          <span className="ml-auto text-right">
            <span className="block text-[11px] text-ink-500">소장 작성</span>
            <span className="block text-[20px] font-bold leading-none tabular-nums text-ink-900">{c.progress}%</span>
          </span>
        </span>

        <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-ink-100">
          <span className="block h-full rounded-full bg-brand-300 transition-[width] duration-500" style={{ width: `${Math.min(100, c.progress)}%` }} />
        </span>

        <span className="mt-auto flex items-center gap-2 border-t border-ink-100 pt-3">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" />
          <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink-700">{c.stage}</span>
          <span className="shrink-0 text-[11px] text-ink-400">{c.agoLabel}</span>
          <ArrowRight size={14} className="shrink-0 text-brand-300 transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </button>
  )
}

function Metric({ label, value, alert, icon: Icon }) {
  return (
    <span>
      <span className="flex items-center gap-1 text-[11px] text-ink-500">
        {Icon && <Icon size={11} className="text-ink-400" />}{label}
      </span>
      <span className={cx('mt-0.5 block text-[20px] font-bold leading-none tabular-nums', alert ? 'text-red-500' : 'text-ink-900')}>{value}</span>
    </span>
  )
}

/* ────────────────────── 새 사건 ────────────────────── */

function NewItem({ open, onFocus, onOpen }) {
  return (
    <button
      type="button"
      aria-label="새 사건 시작"
      onMouseEnter={onFocus}
      onFocus={onFocus}
      onClick={() => (open ? onOpen() : onFocus())}
      className={cx(
        'rail-item group relative shrink-0 overflow-hidden rounded-2xl border-2 border-dashed bg-white outline-none transition-colors',
        'focus-visible:ring-4 focus-visible:ring-brand-100',
        open ? 'border-brand-300' : 'border-ink-200',
      )}
      style={{ width: open ? 220 : BAR, height: H }}
    >
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid place-items-center gap-2 px-4 text-center">
          <span className={cx('grid h-9 w-9 place-items-center rounded-full transition-colors', open ? 'bg-brand-300 text-white' : 'bg-ink-100 text-ink-400')}>
            <Plus size={18} />
          </span>
          <span className={cx('text-[12px] font-semibold transition-opacity duration-200', open ? 'text-ink-700 opacity-100 delay-150' : 'opacity-0')}>
            새 사건 시작
          </span>
          <span className={cx('text-[11px] text-ink-400 transition-opacity duration-200', open ? 'opacity-100 delay-150' : 'hidden opacity-0')}>
            다툼이 생겼다면 먼저 등록하세요
          </span>
        </span>
      </span>
    </button>
  )
}
