import { useEffect, useId, useRef } from 'react'
import { X } from './icons.jsx'

export default function Modal({ open, onClose, title, sub, children, footer, maxW = 'max-w-lg', dismissible = true, headerAlign = 'left' }) {
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={dismissible ? onClose : undefined} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={sub ? descriptionId : undefined}
        tabIndex={-1}
        className={`relative z-10 w-full ${maxW} max-h-[88vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl outline-none`}
      >
        <div className={`flex items-start gap-4 ${headerAlign === 'center' ? 'justify-center text-center' : 'justify-between'}`}>
          <div className={headerAlign === 'center' ? 'w-full' : ''}>
            <h3 id={titleId} className={headerAlign === 'center' ? 'text-[24px] font-bold leading-[1.6] text-brand-400' : 'text-lg font-bold text-ink-900'}>{title}</h3>
            {sub && <p id={descriptionId} className="mt-1 text-sm text-ink-500">{sub}</p>}
          </div>
          {dismissible && <button type="button" aria-label="닫기" onClick={onClose} className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"><X size={20} /></button>}
        </div>
        <div className="mt-5">{children}</div>
        {footer && <div className="mt-6 flex flex-wrap items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
