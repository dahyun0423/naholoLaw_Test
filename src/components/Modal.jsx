import { X } from './icons.jsx'

export default function Modal({ open, onClose, title, sub, children, footer, maxW = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full ${maxW} max-h-[88vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-ink-900">{title}</h3>
            {sub && <p className="mt-1 text-sm text-ink-500">{sub}</p>}
          </div>
          <button onClick={onClose} className="-mr-1 -mt-1 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100"><X size={20} /></button>
        </div>
        <div className="mt-5">{children}</div>
        {footer && <div className="mt-6 flex flex-wrap items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
