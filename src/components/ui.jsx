import { Link } from 'react-router-dom'

export function cx(...c) {
  return c.filter(Boolean).join(' ')
}

const variants = {
  primary: 'bg-brand-300 text-white hover:bg-brand-400 active:bg-brand-500 shadow-sm',
  dark: 'bg-brand-700 text-white hover:bg-brand-600',
  outline: 'border border-brand-300 text-brand-300 hover:bg-brand-50',
  soft: 'bg-brand-50 text-brand-500 hover:bg-brand-100',
  ghost: 'text-ink-600 hover:bg-ink-100',
  neutral: 'border border-ink-200 text-ink-700 hover:bg-ink-50 bg-white',
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

export function Card({ className, children, ...rest }) {
  return (
    <div className={cx('bg-white rounded-2xl border border-ink-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]', className)} {...rest}>
      {children}
    </div>
  )
}

const badgeTones = {
  blue: 'bg-brand-50 text-brand-500',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-500',
  gray: 'bg-ink-100 text-ink-600',
  purple: 'bg-violet-50 text-violet-600',
}
export function Badge({ tone = 'gray', className, children }) {
  return (
    <span className={cx('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold', badgeTones[tone], className)}>
      {children}
    </span>
  )
}

export function SectionHeading({ title, sub, center }) {
  return (
    <div className={cx('flex flex-col gap-3', center && 'items-center text-center')}>
      <h2 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-ink-900">{title}</h2>
      {sub && <p className="text-ink-600 text-[17px] leading-relaxed max-w-2xl">{sub}</p>}
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

export const inputCls =
  'w-full h-11 px-3.5 rounded-xl border border-ink-200 bg-white text-[15px] text-ink-900 placeholder:text-ink-400 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100'

export function Input(props) {
  return <input className={inputCls} {...props} />
}

export function Tip({ children, title = 'AI 팁' }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-[13px] leading-relaxed text-amber-800">
      <span className="font-semibold">💡 {title}</span>
      <div className="mt-1 text-amber-700">{children}</div>
    </div>
  )
}

export function Progress({ value, tone = 'brand' }) {
  const color = tone === 'green' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-brand-300'
  return (
    <div className="h-2 w-full rounded-full bg-ink-100 overflow-hidden">
      <div className={cx('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  )
}
