import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../ui.jsx'
import { ArrowLeft, ArrowRight, X } from '../icons.jsx'
import { markTourSeen, tourStepsForPath } from './tourData.js'

const PAD = 8
const GAP = 14

function visibleTarget(selector) {
  if (!selector) return null
  try {
    return [...document.querySelectorAll(selector)].find((node) => {
      const rect = node.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < window.innerWidth
    }) || null
  } catch {
    return null
  }
}

function paddedRect(node) {
  if (!node) return null
  const rect = node.getBoundingClientRect()
  const left = Math.max(8, rect.left - PAD)
  const top = Math.max(8, rect.top - PAD)
  return {
    left,
    top,
    width: Math.min(window.innerWidth - left - 8, rect.width + PAD * 2),
    height: Math.min(window.innerHeight - top - 8, rect.height + PAD * 2),
  }
}

function tipPosition(rect, tip, preferred) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const width = Math.min(360, vw - 24)
  const height = tip?.offsetHeight || 210
  if (!rect) return { left: Math.max(12, (vw - width) / 2), top: Math.max(12, (vh - height) / 2), place: 'center', width }

  const right = rect.left + rect.width
  const bottom = rect.top + rect.height
  let place = preferred || 'bottom'
  if (place === 'bottom' && bottom + GAP + height > vh - 12) place = 'top'
  if (place === 'top' && rect.top - GAP - height < 12) place = 'bottom'
  if (place === 'right' && right + GAP + width > vw - 12) place = 'left'
  if (place === 'left' && rect.left - GAP - width < 12) place = 'right'

  let left
  let top
  if (place === 'bottom' || place === 'top') {
    left = rect.left + rect.width / 2 - width / 2
    top = place === 'bottom' ? bottom + GAP : rect.top - GAP - height
  } else {
    left = place === 'right' ? right + GAP : rect.left - GAP - width
    top = rect.top + rect.height / 2 - height / 2
  }
  return {
    left: Math.max(12, Math.min(left, vw - width - 12)),
    top: Math.max(12, Math.min(top, vh - height - 12)),
    place,
    width,
  }
}

export default function SpotlightTour({ pathname }) {
  const [tour, setTour] = useState(null)
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState(null)
  const [tipStyle, setTipStyle] = useState({ left: 12, top: 12, width: 336, place: 'center' })
  const tipRef = useRef(null)
  const headingRef = useRef(null)
  const previousFocus = useRef(null)

  const close = useCallback((completed = false) => {
    setTour((current) => {
      if (completed && current?.key) markTourSeen(current.key)
      return null
    })
    setIndex(0)
    requestAnimationFrame(() => previousFocus.current?.focus?.())
  }, [])

  const start = useCallback((requestedPath) => {
    const next = tourStepsForPath(requestedPath || pathname)
    if (!next.steps.length) return
    previousFocus.current = document.activeElement
    setIndex(0)
    setTour(next)
  }, [pathname])

  useEffect(() => {
    const onStart = (event) => start(event.detail?.pathname)
    window.addEventListener('naholo:start-tour', onStart)
    return () => window.removeEventListener('naholo:start-tour', onStart)
  }, [start])

  useEffect(() => {
    if (tour) close(false)
  // 라우트가 바뀌면 이전 화면의 대상을 계속 가리키지 않는다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const step = tour?.steps[index]
  const measure = useCallback(() => {
    if (!step) return
    const node = visibleTarget(step.target)
    const nextRect = paddedRect(node)
    setRect(nextRect)
    setTipStyle(tipPosition(nextRect, tipRef.current, step.place))
  }, [step])

  useLayoutEffect(() => {
    if (!step) return undefined
    const node = visibleTarget(step.target)
    if (node) {
      const raw = node.getBoundingClientRect()
      if (raw.top < 88 || raw.bottom > window.innerHeight - 88) node.scrollIntoView({ block: 'center', behavior: 'auto' })
    }
    const frame = requestAnimationFrame(() => {
      measure()
      headingRef.current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [step, measure])

  useEffect(() => {
    if (!tour) return undefined
    const sync = () => measure()
    window.addEventListener('resize', sync)
    window.addEventListener('scroll', sync, true)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('scroll', sync, true)
    }
  }, [tour, measure])

  const last = Boolean(tour && index === tour.steps.length - 1)
  const next = () => last ? close(true) : setIndex((value) => value + 1)
  const prev = () => setIndex((value) => Math.max(0, value - 1))

  useEffect(() => {
    if (!tour) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(false); return }
      if (event.key === 'ArrowRight' && !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) { event.preventDefault(); next() }
      if (event.key === 'ArrowLeft' && !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) { event.preventDefault(); prev() }
      if (event.key !== 'Tab' || !tipRef.current) return
      const focusable = [...tipRef.current.querySelectorAll('button:not([disabled]), a[href]')]
      if (!focusable.length) return
      const first = focusable[0]
      const end = focusable[focusable.length - 1]
      if (!tipRef.current.contains(document.activeElement)) { event.preventDefault(); first.focus() }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) { event.preventDefault(); end.focus() }
      else if (!event.shiftKey && document.activeElement === end) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [tour, index, last, close])

  if (!tour || !step) return null

  const overlays = rect ? [
    { left: 0, top: 0, right: 0, height: rect.top },
    { left: 0, top: rect.top, width: rect.left, height: rect.height },
    { left: rect.left + rect.width, top: rect.top, right: 0, height: rect.height },
    { left: 0, top: rect.top + rect.height, right: 0, bottom: 0 },
  ] : [{ inset: 0 }]

  return createPortal(
    <div className="fixed inset-0 z-[100]" aria-live="polite">
      {overlays.map((style, overlayIndex) => (
        <div
          key={overlayIndex}
          aria-hidden="true"
          className="fixed bg-ink-900/60"
          style={style}
        />
      ))}
      {rect && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-xl ring-2 ring-brand-300 ring-offset-2 ring-offset-white/70 transition-[left,top,width,height] duration-200 motion-reduce:transition-none"
          style={rect}
        />
      )}
      <section
        ref={tipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-tour-title"
        aria-describedby="product-tour-body"
        data-place={tipStyle.place}
        className="fixed rounded-2xl border border-ink-200 bg-white p-5 shadow-2xl"
        style={{ left: tipStyle.left, top: tipStyle.top, width: tipStyle.width }}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tabular-nums text-brand-500">{index + 1} / {tour.steps.length}</p>
            <h2 ref={headingRef} tabIndex={-1} id="product-tour-title" className="mt-1 text-[17px] font-bold text-ink-900 outline-none">{step.title}</h2>
          </div>
          <button type="button" onClick={() => close(false)} aria-label="사용가이드 닫기" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
            <X size={18} />
          </button>
        </div>
        <p id="product-tour-body" className="mt-2 text-[14px] leading-relaxed text-ink-600">{step.body}</p>
        {!rect && <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">현재 화면 상태에는 강조할 항목이 없어 설명으로 안내합니다.</p>}
        <div className="mt-5 flex items-center gap-2">
          <button type="button" onClick={() => close(false)} className="mr-auto min-h-10 rounded-lg px-2 text-[13px] font-medium text-ink-500 hover:bg-ink-50 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">건너뛰기</button>
          <button type="button" onClick={prev} disabled={index === 0} className={cx('inline-flex min-h-10 items-center gap-1 rounded-lg border border-ink-200 px-3 text-sm font-semibold text-ink-700 hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300', index === 0 && 'invisible')}>
            <ArrowLeft size={14} /> 이전
          </button>
          <button type="button" onClick={next} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-brand-300 px-4 text-sm font-semibold text-white hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2">
            {last ? '완료' : '다음'} {!last && <ArrowRight size={14} />}
          </button>
        </div>
        <p className="mt-3 text-[11px] text-ink-400">Esc로 닫기 · ← → 키로 이동</p>
      </section>
    </div>,
    document.body,
  )
}
