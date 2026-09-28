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
  const scheduleStyle = variant === 'schedule' || variant === 'scheduleResult'
  const casePickerStyle = variant === 'casePicker'
  const resultStyle = variant === 'scheduleResult'
  const templateViewerStyle = variant === 'templateViewer'
  const calmStyle = subscriptionStyle || scheduleStyle || casePickerStyle

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className={templateViewerStyle
          ? 'absolute inset-0 bg-[#111827]/45'
          : calmStyle ? 'absolute inset-0 bg-black/25' : 'absolute inset-0 bg-black/40 backdrop-blur-sm'}
        onClick={dismissible ? onClose : undefined}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={sub ? descriptionId : undefined}
        tabIndex={-1}
        className={templateViewerStyle
          ? `relative z-10 flex h-[min(952px,calc(100vh-32px))] w-full ${maxW} flex-col overflow-hidden rounded-2xl bg-white outline-none shadow-[0_16px_18px_rgba(17,24,39,0.18)]`
          : `relative z-10 w-full ${maxW} max-h-[88vh] overflow-y-auto rounded-2xl bg-white p-6 outline-none ${calmStyle ? 'shadow-[0_12px_36px_rgba(25,31,40,0.12)]' : 'shadow-2xl'}`}
      >
        <div className={`${templateViewerStyle ? 'h-[100px] shrink-0 border-b border-[#e4e7ec] px-7 py-[22px]' : ''} flex items-start gap-4 ${resultStyle ? 'justify-end' : headerAlign === 'center' ? 'justify-center text-center' : 'justify-between'}`}>
          <div className={resultStyle ? 'sr-only' : headerAlign === 'center' ? 'w-full' : ''}>
            <h3
              id={titleId}
              className={templateViewerStyle
                ? 'text-[24px] font-semibold leading-9 text-[#1c2430]'
                : headerAlign === 'center'
                ? 'text-[24px] font-bold leading-[1.6] text-brand-400'
                : calmStyle
                  ? 'text-[24px] font-semibold leading-[1.6] text-[#1a1a1a]'
                  : 'text-lg font-bold text-ink-900'}
            >
              {title}
            </h3>
            {sub && (
              <p id={descriptionId} className={templateViewerStyle
                ? 'text-[13px] font-medium leading-5 text-[#667085]'
                : calmStyle ? 'text-sm font-medium leading-[1.6] text-ink-500' : 'mt-1 text-sm text-ink-500'}>
                {sub}
              </p>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              aria-label="닫기"
              onClick={onClose}
              className={templateViewerStyle
                ? 'grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] bg-[#f2f4f7] text-[#475467] hover:bg-[#e4e7ec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300'
                : calmStyle
                ? 'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300'
                : '-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300'}
            >
              <X size={20} />
            </button>
          )}
        </div>
        <div className={templateViewerStyle
          ? 'min-h-0 flex-1 overflow-y-auto p-6 sm:overflow-hidden'
          : resultStyle ? 'mt-1' : calmStyle ? 'mt-[18px]' : 'mt-5'}>{children}</div>
        {footer && <div className={templateViewerStyle
          ? 'flex h-[62px] w-full shrink-0 items-center justify-end gap-3 border-t border-[#e4e7ec] px-7'
          : `${calmStyle ? 'mt-[18px]' : 'mt-6'} flex w-full flex-wrap items-center justify-end gap-2`}>{footer}</div>}
      </div>
    </div>
  )
}
