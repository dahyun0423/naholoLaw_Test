import { Eye, EyeOff, Logo } from './icons.jsx'

export function AuthBrand() {
  return (
    <span className="flex items-center gap-2">
      <Logo size={40} />
      <span
        className="text-3xl font-bold text-brand-300"
        style={{ fontFamily: 'Paperlogy, Pretendard, sans-serif' }}
      >
        나홀로법에
      </span>
    </span>
  )
}

export const authInputClass = [
  'w-full border-0 border-b border-ink-200 bg-transparent py-2 px-0',
  'text-base font-semibold text-ink-800 outline-none',
  'placeholder:text-ink-500 focus:border-brand-400',
].join(' ')

export function AuthField({ label, error = '', children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-semibold text-ink-400">{label}</span>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
    </div>
  )
}

export function PasswordField({ id, value, onChange, onBlur, shown, onToggle, placeholder, autoComplete, invalid = false }) {
  return (
    <div className="relative flex items-center">
      <input
        id={id}
        className={`${authInputClass} pr-8 ${invalid ? 'border-red-400 text-red-500 focus:border-red-400' : ''}`}
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-0 text-ink-400 hover:text-ink-600"
        aria-label={shown ? '비밀번호 숨기기' : '비밀번호 표시'}
        tabIndex={-1}
      >
        {shown ? <Eye size={20} strokeWidth={1.5} /> : <EyeOff size={20} strokeWidth={1.5} />}
      </button>
    </div>
  )
}

export function AuthCheckbox({ id, checked, onChange, children, className = '' }) {
  return (
    <label htmlFor={id} className={`flex cursor-pointer items-center gap-2 text-sm ${className || 'text-ink-500'}`}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-brand-400" />
      <span>{children}</span>
    </label>
  )
}

export function AuthSubmit({ children, disabled = false }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full rounded-xl bg-brand-400 px-4 py-4 text-base text-white transition-colors disabled:bg-brand-500 disabled:opacity-50"
    >
      {children}
    </button>
  )
}
