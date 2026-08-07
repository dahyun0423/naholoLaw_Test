// 공용 UI 부품 — Figma 「컴포넌트」 페이지 기준
//
// ── 색상 규칙 (한 곳에서만 정한다) ────────────────────────────
//   메인      brand-300 (#64a8ff, Figma bluee300)  — 주요 버튼·강조 면·진행바
//   배경      *-50                                  — 카드 안쪽, soft 버튼, 태그 바탕
//   외곽선    *-200 (#e5e8eb, Figma grey200)        — 카드·인풋·구분선
//   플레이스홀더  ink-300 (#d1d6db, Figma grey300)
//   입력된 값     ink-700
//
// 텍스트 강조만 brand-500을 쓴다. brand-300은 흰 배경 위 글자로 쓰면
// 대비가 부족해 읽기 어렵다. 면(배경)은 300, 글자는 500이 짝이다.

import { Link } from 'react-router-dom'

export function cx(...c) {
  return c.filter(Boolean).join(' ')
}

/* ─────────────────────────── 버튼 ─────────────────────────── */

const variants = {
  primary: 'bg-brand-300 text-white hover:bg-brand-400 active:bg-brand-500 shadow-sm',
  dark: 'bg-brand-700 text-white hover:bg-brand-600',
  outline: 'border border-brand-300 text-brand-500 hover:bg-brand-50',
  soft: 'bg-brand-50 text-brand-500 hover:bg-brand-100',
  ghost: 'text-ink-600 hover:bg-ink-100',
  neutral: 'border border-ink-200 bg-white text-ink-700 hover:bg-ink-50',
  danger: 'border border-red-200 bg-white text-red-500 hover:bg-red-50',
  glass: 'bg-white/10 text-white border border-white/50 backdrop-blur hover:bg-white/20',
}
const sizes = {
  sm: 'h-9 px-3.5 text-sm rounded-lg gap-1.5',
  md: 'h-11 px-5 text-[15px] rounded-xl gap-2',
  lg: 'h-13 px-7 text-base rounded-xl gap-2',
}

export function Button({ as, to, href, variant = 'primary', size = 'md', className, children, ...rest }) {
  const cls = cx(
    'inline-flex items-center justify-center font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap select-none',
    variants[variant], sizes[size], className,
  )
  if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>
  if (href) return <a href={href} className={cls} {...rest}>{children}</a>
  const Comp = as || 'button'
  return <Comp className={cls} {...rest}>{children}</Comp>
}

/** 아이콘만 있는 버튼 — 여기저기서 제각각 만들던 것을 하나로 */
export function IconButton({ label, size = 'md', tone = 'ghost', className, children, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-grid shrink-0 place-items-center rounded-lg transition-colors',
        size === 'sm' ? 'h-7 w-7' : 'h-9 w-9',
        tone === 'ghost' ? 'text-ink-400 hover:bg-ink-100 hover:text-ink-700' : 'border border-ink-200 bg-white text-ink-600 hover:bg-ink-50',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ─────────────────────────── 면 ─────────────────────────── */

export function Card({ className, children, ...rest }) {
  return (
    <div className={cx('rounded-2xl border border-ink-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]', className)} {...rest}>
      {children}
    </div>
  )
}

/** 안내·강조용 옅은 면 — 배경 50 / 외곽선 200 */
const panelTones = {
  brand: 'border-brand-200 bg-brand-50',
  gray: 'border-ink-200 bg-ink-50',
  amber: 'border-amber-200 bg-amber-50',
  green: 'border-emerald-200 bg-emerald-50',
  red: 'border-red-200 bg-red-50',
}
export function Panel({ tone = 'brand', className, children, ...rest }) {
  return (
    <div className={cx('rounded-xl border p-4', panelTones[tone], className)} {...rest}>{children}</div>
  )
}

/* ─────────────────────────── 태그 ─────────────────────────── */
// Figma 「Tag」에 pill·사각형·회색 변형이 있어 shape로 받는다

const badgeTones = {
  blue: 'bg-brand-50 text-brand-500',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-500',
  gray: 'bg-ink-100 text-ink-600',
  purple: 'bg-violet-50 text-violet-600',
  outline: 'border border-ink-200 bg-white text-ink-600',
}
export function Badge({ tone = 'gray', shape = 'pill', className, children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold',
        shape === 'square' ? 'rounded-md' : 'rounded-full',
        badgeTones[tone], className,
      )}
    >
      {children}
    </span>
  )
}

/* ─────────────────────────── 번호 ─────────────────────────── */
// Figma 「numbering」 — 기본 / 완료 / gray

export function Numbering({ n, state = 'default', className }) {
  const tone = {
    default: 'bg-brand-300 text-white',
    done: 'bg-emerald-500 text-white',
    gray: 'bg-ink-200 text-ink-500',
  }[state]
  return (
    <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold', tone, className)}>
      {n}
    </span>
  )
}

/* ─────────────────────────── 선택 ─────────────────────────── */
// Figma 「opt」 — 라디오_기본/체크, 첵박_기본/체크

export function Opt({ type = 'radio', checked, onChange, label, disabled, className }) {
  return (
    <button
      type="button"
      role={type === 'radio' ? 'radio' : 'checkbox'}
      aria-checked={!!checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cx(
        'inline-flex items-center gap-2 text-left text-sm transition-colors disabled:opacity-50',
        checked ? 'text-ink-700 font-medium' : 'text-ink-600 hover:text-ink-700',
        className,
      )}
    >
      <span
        className={cx(
          'grid h-[18px] w-[18px] shrink-0 place-items-center border transition-colors',
          type === 'radio' ? 'rounded-full' : 'rounded-[5px]',
          checked ? 'border-brand-300 bg-brand-300 text-white' : 'border-ink-300 bg-white',
        )}
      >
        {checked && (type === 'radio'
          ? <span className="h-1.5 w-1.5 rounded-full bg-white" />
          : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>)}
      </span>
      {label}
    </button>
  )
}

/* ─────────────────────────── 선택바 ─────────────────────────── */
// Figma 「선택바」 — 탭처럼 쓰는 세그먼트

export function SegmentedBar({ options, value, onChange, className }) {
  return (
    <div className={cx('inline-flex gap-1 rounded-xl bg-ink-100 p-1', className)}>
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value
        const label = typeof o === 'string' ? o : o.label
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange?.(v)}
            className={cx(
              'rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors',
              value === v ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700',
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

/* ─────────────────────────── 메시지 ─────────────────────────── */
// Figma 「message」 — 한 줄 안내. 아이콘 유무 두 가지

export function Message({ tone = 'gray', icon, className, children }) {
  const t = {
    gray: 'text-ink-500',
    brand: 'text-brand-500',
    amber: 'text-amber-600',
    red: 'text-red-500',
  }[tone]
  return (
    <p className={cx('flex items-start gap-1.5 text-[13px] leading-relaxed', t, className)}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <span>{children}</span>
    </p>
  )
}

/* ─────────────────────────── 글·입력 ─────────────────────────── */

export function SectionHeading({ title, sub, center }) {
  return (
    <div className={cx('flex flex-col gap-3', center && 'items-center text-center')}>
      <h2 className="text-[28px] font-bold tracking-tight text-ink-900 sm:text-[32px]">{title}</h2>
      {sub && <p className="max-w-2xl text-[17px] leading-relaxed text-ink-600">{sub}</p>}
    </div>
  )
}

export function Field({ label, hint, error, required, children }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 inline-flex items-center gap-1 text-sm font-medium text-ink-700">
          {label}{required && <span className="text-brand-400">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-500">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-ink-500">{hint}</span>
      ) : null}
    </label>
  )
}

// 입력 전 = ink-300(플레이스홀더), 입력 후 = ink-700
export const inputCls =
  'w-full h-11 px-3.5 rounded-xl border border-ink-200 bg-white text-[15px] text-ink-700 placeholder:text-ink-300 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100'

export function Input(props) {
  return <input className={inputCls} {...props} />
}

/** Figma 「드롭다운 과 검색바」 — 왼쪽 아이콘 + 인풋 */
export function SearchInput({ icon, className, ...rest }) {
  return (
    <div className={cx('relative', className)}>
      {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300">{icon}</span>}
      <input className={cx(inputCls, icon && 'pl-10')} {...rest} />
    </div>
  )
}

/** Figma 「리스트」 — 드롭다운 안의 한 줄 */
export function ListRow({ active, onClick, className, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm transition-colors',
        active ? 'bg-brand-50 font-medium text-brand-500' : 'text-ink-700 hover:bg-ink-50',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Tip({ children, title = 'AI 팁' }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[13px] leading-relaxed text-amber-800">
      <span className="font-semibold">💡 {title}</span>
      <div className="mt-1 text-amber-700">{children}</div>
    </div>
  )
}

export function Progress({ value, tone = 'brand' }) {
  const color = tone === 'green' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-brand-300'
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
      <div className={cx('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  )
}
