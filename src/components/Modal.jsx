import { useEffect, useId, useRef } from 'react'
import { X } from './icons.jsx'

export default function Modal({
  open,
  onClose,
  title,
  sub,
  children,
  footer,
  maxW = 'max-w-lg',
  dismissible = true,
  headerAlign = 'left',
  variant = 'default',
}) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const onKeyDown = (event) => {
      if (dismissible && event.key === 'Escape') onCloseRef.current?.()
    }
    document.addEventListener('keydown', onKeyDown)
    requestAnimationFrame(() => dialogRef.current?.focus())
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [open, dismissible])

  if (!open) return null
  const subscriptionStyle = variant === 'subscription'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className={subscriptionStyle ? 'absolute inset-0 bg-black/20' : 'absolute inset-0 bg-black/40 backdrop-blur-sm'}
        onClick={dismissible ? onClose : undefined}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={sub ? descriptionId : undefined}
        tabIndex={-1}
        className={`relative z-10 w-full ${maxW} max-h-[88vh] overflow-y-auto rounded-2xl bg-white p-6 outline-none ${subscriptionStyle ? 'shadow-[0_12px_36px_rgba(25,31,40,0.12)]' : 'shadow-2xl'}`}
      >
        <div className={`flex items-start gap-4 ${headerAlign === 'center' ? 'justify-center text-center' : 'justify-between'}`}>
          <div className={headerAlign === 'center' ? 'w-full' : ''}>
            <h3
              id={titleId}
              className={headerAlign === 'center'
                ? 'text-[24px] font-bold leading-[1.6] text-brand-400'
                : subscriptionStyle
                  ? 'text-[24px] font-semibold leading-[1.6] text-[#1a1a1a]'
                  : 'text-lg font-bold text-ink-900'}
            >
              {title}
            </h3>
            {sub && (
              <p id={descriptionId} className={subscriptionStyle ? 'text-sm font-medium leading-[1.6] text-ink-500' : 'mt-1 text-sm text-ink-500'}>
                {sub}
              </p>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              aria-label="닫기"
              onClick={onClose}
              className={subscriptionStyle
                ? 'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300'
                : '-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300'}
            >
              <X size={20} />
            </button>
          )}
        </div>
        <div className={subscriptionStyle ? 'mt-[18px]' : 'mt-5'}>{children}</div>
        {footer && <div className="mt-6 flex flex-wrap items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
