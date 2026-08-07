// 문서 작성 화면 공용 부품
//
// 소장 · 준비서면 · 신청서가 모두 같은 구조를 쓴다.
//   [유형/사건 선택] → [단계 아코디언 입력]  |  [실시간 미리보기]
// 각 문서는 lib/*.js에 "단계 + 필드 스키마"만 선언하고, 렌더링은 여기서 처리한다.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Modal from './Modal.jsx'
import { Card, Button, Badge, Progress, inputCls, cx } from './ui.jsx'
import {
  Search, Star, ChevronRight, ChevronDown, Check, ArrowLeft, ArrowRight,
  Upload, Eye, AlertTriangle, Lightbulb, Shield, HelpCircle, Trash, Plus, X, FileText, Printer,
} from './icons.jsx'
import { won, courts } from '../lib/complaint.js'

/* ─────────────────── 미리보기 텍스트 (⟨입력값⟩ / ⟦안내⟧) ─────────────────── */

export function Rich({ text, className }) {
  const parts = String(text).split(/(⟨[^⟩]*⟩|⟦[^⟧]*⟧)/g).filter(Boolean)
  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (p.startsWith('⟨')) return <b key={i} className="font-semibold text-brand-500">{p.slice(1, -1)}</b>
        if (p.startsWith('⟦')) return <span key={i} className="print-muted text-ink-300">[ {p.slice(1, -1)} ]</span>
        return <span key={i}>{p}</span>
      })}
    </span>
  )
}

/** 인쇄·PDF 전용 시트.
 *  화면에는 안 보이고, 인쇄할 때만 body 직속으로 나온다.
 *  법원 안내 기준(글자 12pt · 줄간격 200% · A4)은 index.css의 @media print가 건다. */
export function PrintSheet({ children }) {
  if (typeof document === 'undefined') return null
  return createPortal(<div className="print-root"><div className="print-doc">{children}</div></div>, document.body)
}

/** 브라우저 인쇄 대화상자를 연다 — 여기서 "PDF로 저장"을 고르면 그대로 제출용 PDF가 된다 */
export const printSheet = () => window.print()

export function DocHeading({ children }) {
  return <p className="mt-5 mb-2 text-center text-[15px] font-bold tracking-[0.35em] text-ink-900">{children}</p>
}

/** 문서 말미 — 작성일 · 기명날인 · 법원 표시 */
export function DocSignature({ date, role = '위 원고', name, court, signature }) {
  return (
    <>
      <p className="mt-6 text-center">{date}</p>
      <div className="mt-3 flex items-center justify-end gap-2">
        <span>{role}</span>
        <span className="min-w-[7rem] border-b border-ink-300 pb-0.5 text-center">
          {name ? <b className="font-semibold text-brand-500">{name}</b> : <span className="text-ink-300">[ 이름 ]</span>}
        </span>
        {signature
          ? <img src={signature} alt="서명" className="sig-stamp h-10 w-auto max-w-[5rem] object-contain" />
          : (
            <span className="sig-stamp grid h-9 w-9 shrink-0 place-items-center rounded-full border border-dashed border-ink-300 text-[9px] leading-tight text-ink-400">
              서명<br />날인
            </span>
          )}
      </div>
      {/* 작성 화면용 안내 — 인쇄본에는 나오지 않는다 */}
      <p className="no-print mt-1 text-right text-[11px] text-ink-400">
        {signature ? '올리신 서명이 제출본에 그대로 인쇄됩니다' : '서명 이미지를 올리거나, 출력 후 직접 서명하세요'}
      </p>
      <p className="mt-5 text-center font-semibold tracking-[0.15em]">
        {court ? <b className="text-brand-500">{court}</b> : <span className="text-ink-300">[ 법원 ]</span>}　귀중
      </p>
    </>
  )
}

/**
 * 준비서면 · 신청서 공용 본문 렌더러.
 * lib/*.js의 build()가 돌려주는 { docTitle, header, sections, attach, ... }를 그대로 그린다.
 */
export function GenericPaper({ doc, dense }) {
  return (
    <div className={cx('font-serif leading-loose text-ink-800', dense ? 'text-[11px]' : 'text-[13px]')}>
      <p className={cx('print-lg text-center font-bold tracking-[0.3em] text-ink-900', dense ? 'text-base' : 'text-xl')}>{doc.docTitle}</p>

      {doc.header?.length > 0 && (
        <div className="mt-6 space-y-0.5">
          {doc.header.map((l, i) => <p key={i} className="whitespace-pre-wrap"><Rich text={l} /></p>)}
        </div>
      )}

      {doc.lead && <p className="mt-5"><Rich text={doc.lead} /></p>}

      {doc.sections.map((s) => (
        <div key={s.heading}>
          <DocHeading>{s.heading}</DocHeading>
          {s.lines.length === 0
            ? <p className="text-ink-300">[ 입력하면 여기에 표시됩니다 ]</p>
            : s.lines.map((l, i) => <p key={i} className="whitespace-pre-wrap"><Rich text={l} /></p>)}
        </div>
      ))}

      {doc.attach?.length > 0 && (
        <div>
          <DocHeading>첨 부 서 류</DocHeading>
          {doc.attach.map((a, i) => <p key={i}>{i + 1}. {a}</p>)}
        </div>
      )}

      <DocSignature date={doc.date} role={doc.role} name={doc.name} court={doc.court} signature={doc.signature} />

      {/* 함께 내야 하는 별개 서면 (가압류신청 진술서 등) — 같은 미리보기에서 이어 보여준다 */}
      {doc.extraDoc && (
        <div className="mt-10 border-t-2 border-dashed border-ink-300 pt-8 print-page-before">
          <p className="no-print mb-3 text-center text-[11px] font-semibold text-brand-500">
            ↓ 여기부터는 별개의 서면입니다. 신청서와 함께 제출하세요.
          </p>
          <GenericPaper doc={doc.extraDoc} dense={dense} />
        </div>
      )}

      {/* 별지 목록 — 목적물이 특정되어야 하는 신청서에 붙는다 */}
      {doc.appendix && (
        <div className="mt-8 border-t border-dashed border-ink-300 pt-6">
          <p className="text-center text-[15px] font-bold tracking-[0.3em] text-ink-900">별　지</p>
          <p className="mt-3 text-center text-ink-600">{doc.appendix.title}</p>
          {doc.appendix.body
            ? <p className="mt-3 whitespace-pre-wrap"><b className="font-semibold text-brand-500">{doc.appendix.body}</b></p>
            : <p className="mt-3 text-ink-300">[ 부동산의 표시를 등기부 기재대로 입력해 주세요 ]</p>}
        </div>
      )}
    </div>
  )
}

/* ─────────────────── 안내 박스 · 라벨 · 선택칩 ─────────────────── */

const noteTone = {
  info: 'border-brand-100 bg-brand-50/60 text-brand-600',
  warn: 'border-amber-200 bg-amber-50/70 text-amber-700',
  ok: 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
  lock: 'border-ink-200 bg-ink-50 text-ink-600',
}
const noteIcon = { info: Lightbulb, warn: AlertTriangle, ok: Check, lock: Shield }

export function Note({ tone = 'info', children }) {
  const Icon = noteIcon[tone] || Lightbulb
  return (
    <div className={cx('flex gap-2 rounded-xl border p-3 text-[13px] leading-relaxed', noteTone[tone])}>
      <Icon size={15} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

export function Label({ children, required, right }) {
  return (
    <span className="mb-1.5 flex items-center justify-between gap-2">
      <span className="text-sm font-medium text-ink-700">
        {children}{required && <span className="ml-0.5 text-brand-400">*</span>}
      </span>
      {right}
    </span>
  )
}

/**
 * 「소장 표시」 토글 — 개인정보를 법원에만 알리고 상대방 부본에서는 빼는 스위치.
 * 주민등록번호는 법정 필수기재사항이 아니므로 기본값이 '표시 안 함'이다.
 */
/** 작은 체크 토글 — 주소 예외 상황 표시용 */
export function Toggle({ on, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        on ? 'border-brand-300 bg-brand-50 text-brand-500' : 'border-ink-200 bg-white text-ink-500 hover:bg-ink-50',
      )}
    >
      <span className={cx('grid h-3.5 w-3.5 place-items-center rounded border', on ? 'border-brand-300 bg-brand-300 text-white' : 'border-ink-300')}>
        {on && <Check size={9} />}
      </span>
      {label}
    </button>
  )
}

export function ShowInDocToggle({ on, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
        on ? 'border-brand-200 bg-brand-50 text-brand-500' : 'border-ink-200 bg-white text-ink-400 hover:bg-ink-50',
      )}
      title={on ? '제출하는 서면에 표시됩니다' : '법원에만 알리고 상대방이 받는 부본에는 표시하지 않습니다'}
    >
      <span className={cx('grid h-3.5 w-3.5 place-items-center rounded border', on ? 'border-brand-300 bg-brand-300 text-white' : 'border-ink-300')}>
        {on && <Check size={9} />}
      </span>
      제출문서에 보임
    </button>
  )
}

export function Pills({ options, value, onChange, multi }) {
  const on = (o) => (multi ? (value || []).includes(o) : value === o)
  const pick = (o) => {
    if (!multi) return onChange(o)
    const cur = value || []
    onChange(cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => pick(o)}
          className={cx(
            'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm transition-colors',
            on(o) ? 'border-brand-300 bg-brand-50 font-semibold text-brand-500' : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50',
          )}
        >
          <span className={cx(
            'grid h-4 w-4 place-items-center border',
            multi ? 'rounded-[5px]' : 'rounded-full',
            on(o) ? 'border-brand-300 bg-brand-300 text-white' : 'border-ink-300',
          )}>
            {on(o) && <Check size={10} />}
          </span>
          {o}
        </button>
      ))}
    </div>
  )
}

/* ─────────────────── 법원 검색 셀렉트 ─────────────────── */

export function CourtPicker({ value, onChange, placeholder = '법원 이름을 검색하세요' }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const list = courts.filter((c) => c.includes(q.trim()))
  return (
    <div className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          className={cx(inputCls, 'pl-9 pr-9')}
          placeholder={placeholder}
          value={open ? q : value}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => { setQ(''); setOpen(true) }}
        />
        <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-ink-200 bg-white py-1 shadow-lg">
            {list.length === 0 && <p className="px-4 py-3 text-sm text-ink-400">검색 결과가 없어요</p>}
            {list.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { onChange(c); setOpen(false) }}
                className={cx('block w-full px-4 py-2.5 text-left text-sm hover:bg-brand-50/60', c === value ? 'font-semibold text-brand-500' : 'text-ink-700')}
              >
                {c}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ─────────────────── 주소 검색 (카카오 우편번호 서비스) ─────────────────── */

// 다음(카카오) 우편번호 서비스. API 키 불필요, 무료.
// 소장의 당사자 주소는 송달이 되는 곳이어야 하므로 직접 타이핑보다 검색이 안전하다.
const POSTCODE_SRC = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

let postcodeLoader = null
function loadPostcode() {
  if (typeof window !== 'undefined' && window.daum?.Postcode) return Promise.resolve()
  if (!postcodeLoader) {
    postcodeLoader = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = POSTCODE_SRC
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => { postcodeLoader = null; reject(new Error('우편번호 서비스를 불러오지 못했습니다')) }
      document.head.appendChild(s)
    })
  }
  return postcodeLoader
}

/**
 * 주소 입력 — 우편번호 검색 + 상세주소.
 * 하나의 논리 필드(key)가 세 값을 쓴다: `${key}Zip` / `${key}` / `${key}Detail`
 */
export function AddressField({ field: f, form, setField }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const boxRef = useRef(null)
  const detailRef = useRef(null)

  const zipKey = `${f.key}Zip`
  const detailKey = `${f.key}Detail`
  const overseasKey = `${f.key}Overseas`   // 국내 주소가 아님 → 직접 입력
  const unknownKey = `${f.key}Unknown`     // 피고 주소를 모름
  const overseas = !!form[overseasKey]
  const unknown = !!form[unknownKey]

  const openSearch = async () => {
    setError('')
    setOpen(true)
    try {
      await loadPostcode()
    } catch (e) {
      setError(e.message)
      return
    }
    // 모달이 그려진 뒤 임베드
    requestAnimationFrame(() => {
      if (!boxRef.current) return
      boxRef.current.innerHTML = ''
      new window.daum.Postcode({
        width: '100%',
        height: '100%',
        oncomplete: (data) => {
          // 사용자가 고른 표기(도로명/지번)를 그대로 따른다
          const base = data.userSelectedType === 'J' ? data.jibunAddress : data.roadAddress
          // 참고항목(법정동명·건물명)은 괄호로 덧붙이는 게 우편번호 서비스 권장 표기
          let extra = ''
          if (data.userSelectedType === 'R') {
            const parts = []
            if (data.bname && /[동로가]$/g.test(data.bname)) parts.push(data.bname)
            if (data.buildingName && data.apartment === 'Y') parts.push(data.buildingName)
            if (parts.length) extra = ` (${parts.join(', ')})`
          }
          setField(zipKey, data.zonecode)
          setField(f.key, base + extra)
          setOpen(false)
          setTimeout(() => detailRef.current?.focus(), 50)
        },
      }).embed(boxRef.current)
    })
  }

  const zip = form[zipKey] || ''
  const base = form[f.key] || ''
  const detail = form[detailKey] || ''

  return (
    <div>
      <Label required={f.required}>{f.label}</Label>

      {/* 주소를 못 넣는 두 가지 사정을 먼저 처리한다 */}
      <div className="mb-2 flex flex-wrap gap-2">
        <Toggle
          on={overseas}
          onChange={(v) => setField(overseasKey, v)}
          label="국내 주소가 아니에요"
        />
        {f.allowUnknown && (
          <Toggle
            on={unknown}
            onChange={(v) => setField(unknownKey, v)}
            label="주소를 모르겠어요"
          />
        )}
      </div>

      {unknown ? (
        <Note tone="warn">
          주소를 몰라도 소장은 접수할 수 있어요. 송달이 안 되면 법원이 <b className="font-semibold">주소보정명령</b>을 내리고,
          그때 <b className="font-semibold">피고의 휴대전화번호·계좌번호</b> 등을 단서로 사실조회를 신청하거나
          보정명령서를 주민센터에 제출해 주민등록초본을 발급받아 주소를 확인할 수 있습니다.
          아는 단서가 있으면 5단계 증거에 함께 올려두세요.
        </Note>
      ) : overseas ? (
        <>
          <textarea
            rows={2}
            className={cx(inputCls, 'h-auto py-2.5 leading-relaxed')}
            placeholder="국가명을 포함해 전체 주소를 적어주세요"
            value={base}
            onChange={(e) => setField(f.key, e.target.value)}
          />
          <div className="mt-2">
            <Note tone="info">국외 주소는 우편번호 검색이 되지 않아 직접 적습니다. 송달에 시간이 오래 걸릴 수 있어요.</Note>
          </div>
        </>
      ) : (
      <>
      <div className="flex gap-2">
        <input
          className={cx(inputCls, 'w-28 shrink-0 bg-ink-50')}
          placeholder="우편번호"
          value={zip}
          readOnly
        />
        <Button type="button" variant="neutral" onClick={openSearch}>
          <Search size={15} /> 주소 검색
        </Button>
      </div>

      <input
        className={cx(inputCls, 'mt-2 bg-ink-50')}
        placeholder={f.placeholder || '주소 검색을 눌러 도로명주소를 선택하세요'}
        value={base}
        readOnly
      />
      <input
        ref={detailRef}
        className={cx(inputCls, 'mt-2')}
        placeholder="상세주소 — 동·호수 (모르면 비워두세요)"
        value={detail}
        onChange={(e) => setField(detailKey, e.target.value)}
      />
      </>
      )}

      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      {f.hint && <p className="mt-1.5 text-xs text-ink-500">{f.hint}</p>}

      {/* 상세주소를 모를 때 어떻게 하는지 — 안 알려주면 여기서 막힌다 */}
      {f.detailNote && base && !detail && (
        <div className="mt-2">
          <Note tone={f.detailNoteTone || 'info'}>{f.detailNote}</Note>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="주소 검색"
        sub="도로명 + 건물번호, 동/리 + 번지, 동/리 + 건물명 조합으로 검색하면 정확해요."
        maxW="max-w-xl"
      >
        <div ref={boxRef} className="h-[28rem] w-full overflow-hidden rounded-xl border border-ink-200" />
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </Modal>
    </div>
  )
}

/** 미리보기용 — 우편번호·기본주소·상세주소를 한 줄로 합친다 */
export function joinAddress(form, key) {
  const zip = form[`${key}Zip`]
  const base = form[key]
  const detail = form[`${key}Detail`]
  if (!base) return ''
  return [zip ? `(${zip})` : '', base, detail].filter(Boolean).join(' ')
}

/* ─────────────────── 증거 파일 첨부 ─────────────────── */

const ACCEPT = '.pdf,.jpg,.jpeg,.png,image/*,application/pdf'
const MAX_MB = 10

const prettySize = (b) => (b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`)

/** 파일명에서 확장자를 뗀 것 — 서증명 기본값으로 쓴다 */
const baseName = (n) => n.replace(/\.[^.]+$/, '')

/** 이미지면 작은 미리보기를 만든다 (원본은 메모리에만 두고 초안에는 저장하지 않는다) */
function makeThumb(file) {
  if (!file.type.startsWith('image/')) return Promise.resolve('')
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const ratio = Math.min(160 / img.width, 160 / img.height, 1)
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * ratio)
        c.height = Math.round(img.height * ratio)
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', 0.6))
      }
      img.onerror = () => resolve('')
      img.src = reader.result
    }
    reader.onerror = () => resolve('')
    reader.readAsDataURL(file)
  })
}

/**
 * 증거 파일 첨부 — 클릭 · 드래그 · 붙여넣기(캡처본).
 * 업로드한 파일은 그대로 갑호증 항목이 되므로, 서증명을 수정할 수 있어야 한다.
 *
 * 주의: 백엔드가 없으므로 파일 내용은 이 브라우저 메모리에만 있다.
 *       초안(localStorage)에는 이름·크기 같은 메타데이터만 저장한다.
 */
export function FileField({ field: f, form, setField }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const files = form[f.key] || []

  // 붙여넣은 캡처는 브라우저가 'image.png' 같은 이름을 붙인다 — 알아볼 수 있게 바꿔준다
  const GENERIC = /^(image|screenshot|스크린샷|화면 캡처)[-_ ]?\d*$/i
  const captureName = (existing) => {
    const n = existing.filter((x) => /^화면 캡처 \d+$/.test(x.name)).length + 1
    return `화면 캡처 ${n}`
  }

  const add = async (incoming) => {
    const list = Array.from(incoming || []).filter(Boolean)
    if (!list.length) return
    const tooBig = list.filter((x) => x.size > MAX_MB * 1024 * 1024)
    if (tooBig.length) {
      setError(`${MAX_MB}MB를 넘는 파일은 올릴 수 없어요 — ${tooBig.map((x) => x.name).join(', ')}`)
    } else {
      setError('')
    }
    const ok = list.filter((x) => x.size <= MAX_MB * 1024 * 1024)
    const made = []
    for (let i = 0; i < ok.length; i += 1) {
      const file = ok[i]
      const stem = baseName(file.name)
      made.push({
        id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        name: !stem || GENERIC.test(stem) ? captureName([...files, ...made]) : stem,
        fileName: file.name,
        size: file.size,
        type: file.type,
        thumb: await makeThumb(file),
      })
    }
    setField(f.key, [...files, ...made])
  }

  // 붙여넣기 — 캡처본을 바로 넣을 수 있게. 글자 입력 중에는 가로채지 않는다.
  useEffect(() => {
    const onPaste = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const pasted = e.clipboardData?.files
      if (pasted?.length) { e.preventDefault(); add(pasted) }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  })

  const rename = (id, name) => setField(f.key, files.map((x) => (x.id === id ? { ...x, name } : x)))
  const remove = (id) => setField(f.key, files.filter((x) => x.id !== id))

  return (
    <div>
      <Label>{f.label}</Label>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className={cx(
          'grid cursor-pointer place-items-center rounded-xl border-2 border-dashed py-8 text-center transition-colors',
          dragging ? 'border-brand-300 bg-brand-50' : 'border-ink-200 bg-ink-50 hover:border-brand-200',
        )}
      >
        <Upload size={24} className={dragging ? 'text-brand-400' : 'text-ink-400'} />
        <p className="mt-2 text-sm font-medium text-ink-600">
          파일을 드래그하거나 클릭해서 올리세요
        </p>
        <p className="text-xs text-ink-400">PDF · JPG · PNG — 캡처한 이미지는 <b className="text-ink-500">Ctrl+V</b>로 바로 붙여넣기</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => { add(e.target.files); e.target.value = '' }}
      />

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((x, i) => (
            <div key={x.id} className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white p-2.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-100">
                {x.thumb
                  ? <img src={x.thumb} alt="" className="h-full w-full object-cover" />
                  : <FileText size={18} className="text-ink-400" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="mb-1 block text-[11px] font-semibold text-brand-500">갑 제{i + 1}호증</span>
                <input
                  className="w-full rounded-lg border border-ink-200 px-2.5 py-1.5 text-sm text-ink-900 outline-none focus:border-brand-300"
                  value={x.name}
                  onChange={(e) => rename(x.id, e.target.value)}
                  placeholder="서증명 (예: 차용증)"
                />
                <span className="mt-1 block truncate text-[11px] text-ink-400">{x.fileName} · {prettySize(x.size)}</span>
              </span>
              <button
                type="button"
                onClick={() => remove(x.id)}
                className="shrink-0 rounded-lg p-2 text-ink-400 hover:bg-ink-100"
                aria-label="삭제"
              >
                <Trash size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2">
        <Note tone="info">
          올린 파일의 <b className="font-semibold">이름이 곧 서증명</b>이 되어 입증방법란에 «갑 제1호증 …» 순서로 들어갑니다.
          알아보기 쉬운 이름으로 고쳐 주세요. 파일은 이 브라우저에만 임시 보관되니,
          실제 제출은 전자소송포털에 직접 올리셔야 합니다.
        </Note>
      </div>
    </div>
  )
}

/* ─────────────────── 서명 업로드 ─────────────────── */

// 서명은 초안과 함께 localStorage에 담기므로, 원본 사진을 그대로 두면 저장 한도를 넘긴다.
// 인쇄에 필요한 크기(가로 600px)로 줄여서 보관한다.
const MAX_W = 600
const MAX_H = 240

function downscale(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(MAX_W / img.width, MAX_H / img.height, 1)
      if (ratio === 1) return resolve(dataUrl)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

export function SignatureUpload({ value, onChange }) {
  const inputRef = useRef(null)
  const read = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => onChange(await downscale(reader.result))
    reader.readAsDataURL(file)
  }
  return (
    <div>
      <Label>서명 · 도장 이미지</Label>
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white p-3">
          <img src={value} alt="업로드한 서명" className="h-14 w-auto max-w-[8rem] object-contain" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink-800">서명이 등록되었습니다</p>
            <p className="text-xs text-ink-500">문서 말미 기명날인란에 자동으로 들어갑니다.</p>
          </div>
          <button type="button" onClick={() => onChange('')} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100" aria-label="서명 삭제">
            <Trash size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="grid w-full place-items-center rounded-xl border-2 border-dashed border-ink-200 bg-ink-50 py-7 text-center transition-colors hover:border-brand-200"
        >
          <Upload size={22} className="text-ink-400" />
          <span className="mt-2 text-sm font-medium text-ink-600">서명이나 도장 이미지를 올려주세요</span>
          <span className="text-xs text-ink-400">흰 종이에 서명한 뒤 촬영해도 됩니다 · PNG, JPG</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => read(e.target.files?.[0])} />
      <div className="mt-2">
        <Note tone="info">
          <b className="font-semibold">종이로 낼 때만 필요해요.</b> 법원은 소장의 기명날인·간인을 「종이로 제출하는 경우」의 기재사항으로 정하고 있어요.
          전자소송은 제출할 때 공동인증서로 전자서명을 하므로 서명 이미지가 없어도 됩니다.
          여기 올려두면 출력본에 미리 찍혀 나와 편해요.
        </Note>
      </div>
    </div>
  )
}

/* ─────────────────── 인용 판례 고르기 ─────────────────── */

/**
 * 문서마다 판례를 넣는 자리와 강도가 다르다(lib/citation.js 참고).
 * 그래서 정책 문구를 먼저 보여주고, 맥락에 맞는 추천만 올린다.
 */
export function CitationPicker({ policy, suggestions, cited, value = [], onChange, reasonOf }) {
  const toggle = (no) => onChange(value.includes(no) ? value.filter((x) => x !== no) : [...value, no])
  const overMax = policy.max && value.length > policy.max

  // 판례 검색에서 담아둔 것 중 추천에 없는 것도 후보로 올린다
  const extra = (cited || []).filter((c) => !suggestions.some((s) => s.no === c.no))
  const list = [...suggestions, ...extra]

  return (
    <div>
      <Label>인용할 판례 {value.length > 0 && <span className="text-brand-400">({value.length})</span>}</Label>

      <div className={cx('rounded-xl border p-3.5 text-[13px] leading-relaxed', policy.level === 'core' ? noteTone.info : noteTone.lock)}>
        <p className="font-semibold">{policy.headline}</p>
        <p className="mt-1">{policy.body}</p>
        {policy.where && <p className="mt-1.5 text-xs opacity-80">들어가는 자리 · {policy.where}</p>}
      </div>

      {list.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-ink-200 bg-ink-50 p-4 text-center text-[13px] text-ink-400">
          아직 추천할 판례가 없어요. 쟁점을 먼저 고르거나, 판례 검색에서 <b className="text-ink-500">[내 문서에 인용]</b>으로 담아 오세요.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {list.map((p) => {
            const on = value.includes(p.no)
            const reason = reasonOf?.(p)
            return (
              <button
                key={p.no}
                type="button"
                onClick={() => toggle(p.no)}
                className={cx(
                  'flex w-full gap-3 rounded-xl border p-3 text-left transition-colors',
                  on ? 'border-brand-300 bg-brand-50' : 'border-ink-200 bg-white hover:bg-ink-50',
                )}
              >
                <span className={cx('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border', on ? 'border-brand-300 bg-brand-300 text-white' : 'border-ink-300')}>
                  {on && <Check size={12} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold text-ink-900">{p.title}</span>
                    {reason && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-600">{reason}</span>}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-400">{p.court} {p.no} · {p.date}</span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-ink-600">{p.point}</span>
                  {on && p.apply && (
                    <span className="mt-1.5 block rounded-lg bg-white/70 px-2.5 py-1.5 text-xs leading-relaxed text-brand-600">
                      이렇게 씁니다 · {p.apply}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {overMax && (
        <div className="mt-2">
          <Note tone="warn">이 문서에는 {policy.max}개 이내를 권합니다. 많이 넣을수록 핵심이 흐려져요.</Note>
        </div>
      )}
    </div>
  )
}

/* ─────────────────── 필드 렌더러 ─────────────────── */

export const isVisible = (field, form) => (field.when ? !!field.when(form) : true)

/** 값이 들어 있는지 — 배열은 길이로 본다 */
const filled = (v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '')

/** 여러 문서가 공유하는 기본 입력 종류. 문서 고유 계산 박스는 renderExtra로 넘긴다. */
export function FieldOne({ field: f, form, setField, renderExtra }) {
  const v = f.key ? form[f.key] ?? '' : ''
  const set = (val) => setField(f.key, val)

  switch (f.kind) {
    case 'text':
      return (
        <label className="block">
          <Label
            required={f.required}
            right={f.showKey ? (
              <ShowInDocToggle
                on={form[f.showKey] ?? f.showDefault ?? true}
                onChange={(on) => setField(f.showKey, on)}
              />
            ) : null}
          >
            {f.label}
          </Label>
          <input className={inputCls} placeholder={f.placeholder} value={v} onChange={(e) => set(e.target.value)} />
          {f.hint && <span className="mt-1 block text-xs text-ink-500">{f.hint}</span>}
        </label>
      )
    case 'money':
      return (
        <label className="block">
          <Label required={f.required}>{f.label}</Label>
          <div className="relative">
            <input className={cx(inputCls, 'pr-9')} inputMode="numeric" placeholder={f.placeholder || '0'} value={v ? won(v) : ''} onChange={(e) => set(e.target.value.replace(/[^0-9]/g, ''))} />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-400">원</span>
          </div>
          {f.hint && <span className="mt-1 block text-xs text-ink-500">{f.hint}</span>}
        </label>
      )
    case 'num':
      return (
        <label className="block">
          <Label required={f.required}>{f.label}</Label>
          <div className="relative">
            <input className={cx(inputCls, f.unit && 'pr-12')} inputMode="numeric" value={v} onChange={(e) => set(e.target.value.replace(/[^0-9.]/g, ''))} />
            {f.unit && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-400">{f.unit}</span>}
          </div>
        </label>
      )
    case 'date':
      return <label className="block"><Label required={f.required}>{f.label}</Label><input type="date" className={inputCls} value={v} onChange={(e) => set(e.target.value)} /></label>
    case 'area':
      return <label className="block"><Label required={f.required}>{f.label}</Label><textarea rows={f.rows || 3} className={cx(inputCls, 'h-auto py-2.5 leading-relaxed')} placeholder={f.placeholder} value={v} onChange={(e) => set(e.target.value)} /></label>
    case 'select':
      return (
        <label className="block">
          <Label required={f.required}>{f.label}</Label>
          <select className={inputCls} value={v} onChange={(e) => set(e.target.value)}>
            <option value="">선택하세요</option>
            {f.options.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
      )
    case 'radio':
      return <div><Label required={f.required}>{f.label}</Label><Pills options={f.options} value={v} onChange={set} /></div>
    case 'checks':
      return <div><Label required={f.required}>{f.label}</Label><Pills options={f.options} value={form[f.key] || []} onChange={set} multi /></div>
    case 'note':
      return <Note tone={f.tone}>{f.body}</Note>
    case 'court':
      return <div><Label required={f.required}>{f.label}</Label><CourtPicker value={form[f.key] ?? ''} onChange={set} /></div>
    case 'address':
      return <AddressField field={f} form={form} setField={setField} />
    case 'signature':
      return <SignatureUpload value={v} onChange={set} />
    case 'files':
      return <FileField field={f} form={form} setField={setField} />
    case 'repeat':
      return <RepeatField field={f} form={form} setField={setField} />
    default:
      return renderExtra ? renderExtra(f, form, setField) : null
  }
}

/** 반박 포인트처럼 개수가 정해지지 않은 묶음 입력 */
function RepeatField({ field: f, form, setField }) {
  const rows = form[f.key] || []
  const update = (i, key, val) => setField(f.key, rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)))
  const add = () => setField(f.key, [...rows, Object.fromEntries(f.columns.map((c) => [c.key, '']))])
  const remove = (i) => setField(f.key, rows.filter((_, idx) => idx !== i))

  return (
    <div>
      <Label required={f.required}>{f.label}</Label>
      <div className="space-y-3">
        {rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-ink-200 bg-ink-50 p-4 text-center text-[13px] text-ink-400">
            {f.empty || '아래 버튼으로 추가하세요.'}
          </p>
        )}
        {rows.map((row, i) => (
          <div key={i} className="rounded-xl border border-ink-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-500">{f.itemLabel || '항목'} {i + 1}</span>
              <button type="button" onClick={() => remove(i)} className="rounded-lg p-1 text-ink-400 hover:bg-ink-100" aria-label="삭제"><X size={14} /></button>
            </div>
            <div className="space-y-2.5">
              {f.columns.map((c) => (
                <label key={c.key} className="block">
                  <span className="mb-1 block text-xs font-medium text-ink-600">{c.label}</span>
                  {c.kind === 'area'
                    ? <textarea rows={c.rows || 2} className={cx(inputCls, 'h-auto py-2 text-sm leading-relaxed')} placeholder={c.placeholder} value={row[c.key] || ''} onChange={(e) => update(i, c.key, e.target.value)} />
                    : <input className={cx(inputCls, 'h-10 text-sm')} placeholder={c.placeholder} value={row[c.key] || ''} onChange={(e) => update(i, c.key, e.target.value)} />}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="mt-2 flex items-center gap-1 text-sm font-medium text-brand-400 hover:text-brand-500">
        <Plus size={15} /> {f.addLabel || '추가'}
      </button>
    </div>
  )
}

/** 절반 너비 필드는 두 개씩 한 줄에 묶는다 */
/** half 짝맞춤 + 접이식 그룹까지 한 덩어리를 그린다 */
function FieldList({ list, form, setField, renderExtra }) {
  const out = []
  for (let i = 0; i < list.length; i += 1) {
    const f = list[i]

    // fold가 같은 필드끼리 묶어 접는다 — 자주 안 쓰는 항목을 기본으로 감춘다
    if (f.fold) {
      const group = []
      while (i < list.length && list[i].fold === f.fold) { group.push(list[i]); i += 1 }
      i -= 1
      out.push(
        <FoldGroup key={`fold-${f.fold}`} label={f.fold} fields={group} form={form} setField={setField} renderExtra={renderExtra} />,
      )
      continue
    }

    if (f.half && list[i + 1]?.half && !list[i + 1].fold) {
      out.push(
        <div key={f.key || i} className="grid gap-4 sm:grid-cols-2">
          <FieldOne field={f} form={form} setField={setField} renderExtra={renderExtra} />
          <FieldOne field={list[i + 1]} form={form} setField={setField} renderExtra={renderExtra} />
        </div>,
      )
      i += 1
      continue
    }
    out.push(<FieldOne key={f.key || `${f.kind}-${i}`} field={f} form={form} setField={setField} renderExtra={renderExtra} />)
  }
  return <div className="space-y-4">{out}</div>
}

/** 접이식 그룹 — 값이 들어 있으면 처음부터 펼쳐 둔다 (숨겨진 입력을 놓치지 않게) */
function FoldGroup({ label, fields, form, setField, renderExtra }) {
  const hasValue = fields.some((f) => f.key && filled(form[f.key]))
  const [open, setOpen] = useState(hasValue)
  return (
    <div className={cx('rounded-xl border', open ? 'border-brand-200 bg-brand-50/40' : 'border-ink-200 bg-white')}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <ChevronRight size={15} className={cx('shrink-0 text-ink-400 transition-transform', open && 'rotate-90')} />
        <span className={cx('text-sm font-medium', open ? 'text-brand-600' : 'text-ink-600')}>{label}</span>
        {!open && hasValue && <Badge tone="blue" className="ml-auto">입력됨</Badge>}
        {!open && !hasValue && <span className="ml-auto text-xs text-ink-400">해당하면 펼치기</span>}
      </button>
      {open && (
        <div className="border-t border-ink-100 px-4 py-4">
          <FieldList list={fields} form={form} setField={setField} renderExtra={renderExtra} />
        </div>
      )}
    </div>
  )
}

export function Fields({ fields, form, setField, renderExtra }) {
  const visible = fields.filter((f) => isVisible(f, form))
  // tab이 붙은 필드가 있으면 탭으로 나눠 한 번에 한 쪽만 보여준다 (당사자 입력이 길어져서)
  const tabs = [...new Set(visible.map((f) => f.tab).filter(Boolean))]
  const [tab, setTab] = useState(tabs[0])
  const active = tabs.includes(tab) ? tab : tabs[0]

  if (tabs.length < 2) return <FieldList list={visible} form={form} setField={setField} renderExtra={renderExtra} />

  const lead = visible.filter((f) => !f.tab)
  return (
    <div className="space-y-4">
      {lead.length > 0 && <FieldList list={lead} form={form} setField={setField} renderExtra={renderExtra} />}
      <div className="flex gap-1 rounded-xl bg-ink-100 p-1">
        {tabs.map((t) => {
          const group = visible.filter((f) => f.tab === t)
          const need = group.filter((f) => f.required && f.key && !filled(form[f.key])).length
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cx(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors',
                active === t ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700',
              )}
            >
              {t}
              {need > 0
                ? <span className="rounded-full bg-amber-100 px-1.5 text-[11px] font-bold text-amber-600">{need}</span>
                : <Check size={13} className="text-emerald-500" />}
            </button>
          )
        })}
      </div>
      <FieldList list={visible.filter((f) => f.tab === active)} form={form} setField={setField} renderExtra={renderExtra} />
    </div>
  )
}

/* ─────────────────── 진행 표시 · 유형 목록 ─────────────────── */

export function StageBar({ stage, labels = ['유형·자가진단', '정보 입력', '검토·생성'] }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-2 py-1.5">
      {labels.map((l, i) => (
        <span key={l} className="flex items-center gap-1.5">
          <span className={cx('grid h-6 w-6 place-items-center rounded-full text-xs font-bold', i <= stage ? 'bg-brand-300 text-white' : 'bg-ink-100 text-ink-400')}>
            {i < stage ? <Check size={13} /> : i + 1}
          </span>
          <span className={cx('text-[13px] font-medium', i <= stage ? 'text-ink-800' : 'text-ink-400')}>{l}</span>
          {i < labels.length - 1 && <ChevronRight size={13} className="mx-0.5 text-ink-300" />}
        </span>
      ))}
    </div>
  )
}

/** 소장 유형 · 신청서 유형처럼 "무엇을 만들지" 고르는 목록 화면 */
export function PickList({ heading, placeholder, items, onPick, onBack, backLabel, footNote, banner }) {
  const [q, setQ] = useState('')
  const [faves, setFaves] = useState([])
  const list = items.filter((t) => !q.trim() || t.title.includes(q) || t.desc.includes(q) || (t.short || '').includes(q))
  const toggleFave = (key) => setFaves((f) => (f.includes(key) ? f.filter((k) => k !== key) : [...f, key]))

  return (
    <div className="mx-auto max-w-4xl">
      {onBack && (
        <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-700">
          <ArrowLeft size={16} /> {backLabel || '문서 종류 다시 고르기'}
        </button>
      )}

      {banner}

      <h2 className="text-center text-2xl font-bold text-ink-900">{heading}</h2>

      <div className="relative mx-auto mt-6 max-w-2xl">
        <input className={cx(inputCls, 'h-14 pr-12 text-base')} placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
        <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400" />
      </div>

      <Card className="mt-6 p-2">
        {list.length === 0 && <p className="py-14 text-center text-sm text-ink-400">“{q}” 유형은 아직 준비 중이에요. 다른 검색어로 찾아보세요.</p>}
        {list.map((t, i) => (
          <div key={t.key} className={cx('flex items-center gap-3 px-4 py-4 transition-colors hover:bg-brand-50/40', i > 0 && 'border-t border-ink-100')}>
            <button
              onClick={() => toggleFave(t.key)}
              aria-label="즐겨찾기"
              className={cx('shrink-0 p-1 transition-colors', faves.includes(t.key) ? 'text-amber-400' : 'text-ink-300 hover:text-ink-400')}
            >
              <Star size={20} />
            </button>
            <button onClick={() => onPick(t.key)} className="flex flex-1 items-center gap-3 text-left">
              <span className="flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-ink-900">{t.title}</span>
                  <HelpCircle size={15} className="text-ink-300" />
                </span>
                <span className="mt-0.5 block text-sm text-ink-500">{t.desc}</span>
              </span>
              <ChevronRight size={22} className="shrink-0 text-ink-300" />
            </button>
          </div>
        ))}
      </Card>

      {footNote && <p className="mt-6 whitespace-pre-line text-center text-[13px] leading-relaxed text-ink-400">{footNote}</p>}
    </div>
  )
}

/* ─────────────────── 작성 화면 껍데기 (아코디언 + 미리보기) ─────────────────── */

export function WizardShell({
  title, badge, sub, stage, stageLabels,
  steps, open, setOpen, form, setField, renderExtra, stepSummary,
  percent, preview, previewTitle = '미리보기',
  onBack, onSave, savedLabel, onDone, doneLabel = '완성하기',
  onFull, extraPanel, printable,
}) {
  return (
    <>
      {/* 인쇄·PDF 저장용 — 화면에는 안 보이고 12pt·200%로만 나온다 */}
      {printable && <PrintSheet>{printable}</PrintSheet>}
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
            {badge && <Badge tone="blue">{badge}</Badge>}
          </div>
          {sub && <p className="mt-1 text-sm text-ink-500">{sub}</p>}
        </div>
        <StageBar stage={stage} labels={stageLabels} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          {steps.map((s, i) => {
            const isOpen = open === i
            const summary = stepSummary ? stepSummary(i) : ''
            const done = !isOpen && summary

            if (!isOpen) {
              return (
                <button
                  key={s.title}
                  onClick={() => setOpen(i)}
                  className={cx(
                    'flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors',
                    done ? 'border-brand-200 bg-brand-50/50' : 'border-ink-200 bg-white hover:bg-ink-50',
                  )}
                >
                  <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-bold', done ? 'bg-brand-300 text-white' : 'bg-ink-100 text-ink-500')}>
                    {done ? <Check size={15} /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink-900">{s.title}</span>
                    {summary && <span className="mt-0.5 block truncate text-[13px] text-ink-500">{summary}</span>}
                  </span>
                  {done
                    ? <span className="shrink-0 text-sm font-medium text-brand-400">수정</span>
                    : <span className="shrink-0 text-xs text-ink-400">{i + 1} / {steps.length}</span>}
                </button>
              )
            }

            return (
              <Card key={s.title} className="border-brand-300 p-5 ring-4 ring-brand-100/60">
                <div className="mb-4 flex items-center gap-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-300 text-sm font-bold text-white">{i + 1}</span>
                  <h3 className="flex-1 font-bold text-ink-900">{s.title}</h3>
                  {s.badge && <Badge tone="blue">{s.badge}</Badge>}
                  <span className="text-xs text-ink-400">{i + 1} / {steps.length}</span>
                  <ChevronDown size={16} className="rotate-180 text-ink-400" />
                </div>
                {s.hint && <p className="mb-3 text-[13px] text-ink-500">{s.hint}</p>}

                <Fields fields={s.fields} form={form} setField={setField} renderExtra={renderExtra} />

                {s.append}

                <div className="mt-5 flex justify-end gap-2">
                  {i > 0 && <Button variant="neutral" size="sm" onClick={() => setOpen(i - 1)}>이전 단계</Button>}
                  {i < steps.length - 1 && <Button size="sm" onClick={() => setOpen(i + 1)}>다음 단계 <ArrowRight size={15} /></Button>}
                </div>
              </Card>
            )
          })}

          {extraPanel}

          <Card className="sticky bottom-0 flex items-center gap-2 p-3">
            <Button variant="neutral" onClick={onBack}><ArrowLeft size={16} /> 이전</Button>
            {onSave && <Button variant="neutral" onClick={onSave}>임시저장</Button>}
            {savedLabel && <span className="hidden text-xs text-ink-400 sm:inline">{savedLabel}</span>}
            <Button className="ml-auto" onClick={onDone}>{doneLabel} <ArrowRight size={16} /></Button>
          </Card>
        </div>

        <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-6rem)]">
          <Card className="flex h-full flex-col p-0">
            <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-5 py-3.5">
              <h3 className="font-bold text-ink-900">{previewTitle}</h3>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 실시간 반영 중
              </span>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-ink-500">완성도</span>
                <div className="w-20"><Progress value={percent} /></div>
                <span className="text-sm font-bold text-brand-400">{percent}%</span>
                {onFull && (
                  <button onClick={onFull} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100" aria-label="전체보기"><Eye size={17} /></button>
                )}
                {printable && (
                  <button onClick={printSheet} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100" aria-label="인쇄 · PDF 저장" title="인쇄 · PDF 저장 (12pt · 줄간격 200%)"><Printer size={17} /></button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-ink-50 p-4">
              <div className="rounded-xl border border-ink-200 bg-white p-6 sm:p-8">{preview}</div>
            </div>
          </Card>
        </div>
        </div>
      </div>
    </>
  )
}
