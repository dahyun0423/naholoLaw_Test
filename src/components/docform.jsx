// 문서 작성 화면 공용 부품
//
// 소장 · 준비서면 · 신청서가 모두 같은 구조를 쓴다.
//   [유형/사건 선택] → [단계 아코디언 입력]  |  [실시간 미리보기]
// 각 문서는 lib/*.js에 "단계 + 필드 스키마"만 선언하고, 렌더링은 여기서 처리한다.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import Modal from './Modal.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { Card, Button, IconButton, Badge, Progress, inputCls, cx } from './ui.jsx'
import {
  Search, Star, ChevronRight, ChevronDown, Check, ArrowLeft, ArrowRight,
  Upload, Eye, AlertTriangle, Lightbulb, Shield, HelpCircle, Trash, Plus, X, FileText, Printer, Sparkles,
} from './icons.jsx'
import { won, courts } from '../lib/complaint.js'
import { missingItems } from '../lib/evidenceMatch.js'

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
export function DocSignature({ date, role = '위 원고', name, court }) {
  return (
    <>
      <p className="mt-6 text-center">{date}</p>
      <div className="mt-3 flex items-center justify-end gap-2">
        <span>{role}</span>
        <span className="min-w-[7rem] border-b border-ink-300 pb-0.5 text-center">
          {name ? <b className="font-semibold text-brand-500">{name}</b> : <span className="text-ink-300">[ 이름 ]</span>}
        </span>
        {/* 서식의 「(인)」 자리 — 종이로 낼 때 여기에 직접 서명하거나 도장을 찍는다 */}
        <span className="shrink-0">(인)</span>
      </div>
      {/* 작성 화면용 안내 — 인쇄본에는 나오지 않는다 */}
      <p className="no-print mt-1 text-right text-[11px] text-ink-400">
        출력한 뒤 (인) 자리에 서명하거나 도장을 찍으세요
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

      <DocSignature date={doc.date} role={doc.role} name={doc.name} court={doc.court} />

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

/**
 * 문서 완성 화면 — 네 종류 문서가 모두 이 껍데기를 쓴다.
 *
 * 모달이 아니라 **화면**이다. 다 만든 문서는 읽고, 고치고, 저장할지 정하고, 다음으로
 * 넘어가는 자리인데 모달은 그걸 담지 못한다. 뒤가 비쳐서 문서에 집중이 안 되고,
 * 옆에 「저장할까요?」 같은 결정을 붙일 자리도 없다.
 *
 * 왼쪽이 문서, 오른쪽이 다음에 할 일이다.
 */
export function DocumentDoneView({ title, sub, badge, children, aside, onEdit, onExit, editLabel = '내용 수정하기' }) {
  return (
    <div className="space-y-5">
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 text-sm font-medium text-ink-500 transition-colors hover:text-ink-700"
        >
          <ArrowLeft size={16} /> 이전으로 돌아가기
        </button>
      )}

      <Card className="flex flex-wrap items-center gap-x-4 gap-y-3 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold text-ink-900">{title}</h1>
            {badge && <Badge tone="blue">{badge}</Badge>}
          </div>
          {sub && <p className="mt-1 text-[13px] text-ink-500">{sub}</p>}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {onEdit && <Button variant="neutral" onClick={onEdit}>{editLabel}</Button>}
          <Button onClick={printSheet}><FileText size={16} /> PDF 저장 · 인쇄</Button>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Card className="px-6 py-8 sm:px-12 sm:py-12">{children}</Card>

        <div className="space-y-4">
          {aside}
          <div><PaperSignNote /></div>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="w-full rounded-xl border border-ink-200 bg-white py-2.5 text-[13px] font-medium text-ink-500 transition-colors hover:bg-ink-50"
            >
              다른 문서 만들기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────── 안내 박스 · 라벨 · 선택칩 ─────────────────── */

const noteTone = {
  info: 'border-brand-100 bg-brand-50/60 text-brand-600',
  warn: 'border-red-200 bg-red-50/70 text-red-500',
  ok: 'border-brand-200 bg-brand-50/70 text-brand-700',
  lock: 'border-ink-200 bg-ink-50 text-ink-600',
}
const noteIcon = { info: Lightbulb, warn: AlertTriangle, ok: Check, lock: Shield }

export function Note({ tone = 'info', children }) {
  const Icon = noteIcon[tone] || Lightbulb
  return (
    <div className={cx('flex gap-2 rounded-xl border p-3 text-[13px] leading-relaxed', noteTone[tone])}>
      <Icon size={15} className="mt-0.5 shrink-0" />
      <span>{emph(children)}</span>
    </div>
  )
}

/**
 * 라벨 옆 (i) 버튼 — 눌러야 설명이 열린다.
 *
 * 안내를 전부 펼쳐 두면 화면이 안내로 뒤덮여 정작 입력칸이 안 보인다.
 * 필요한 사람만 열어보게 하고, 기본은 접어 둔다.
 */
/**
 * 안내 문구 안의 **강조**를 굵게 만든다.
 *
 * 스키마 문자열에 `<b>`를 적으면 React가 이스케이프해 화면에 태그가 글자로 찍힌다.
 * HTML 대신 마크다운식 표시를 쓰고 여기서 한 번에 바꾼다.
 */
export function emph(text) {
  if (typeof text !== 'string') return text
  return text.split('**').map((part, i) => (i % 2 ? <b key={i} className="font-semibold">{part}</b> : part))
}

export function InfoTip({ children, label = '설명 보기' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-expanded={open}
        className={cx(
          'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border text-[11px] font-bold transition-colors',
          open ? 'border-brand-300 bg-brand-300 text-white' : 'border-ink-300 text-ink-400 hover:border-brand-300 hover:text-brand-400',
        )}
      >
        i
      </button>
      {open && (
        <div className="order-last mt-1.5 w-full whitespace-pre-line rounded-xl border border-brand-100 bg-brand-50/60 px-3.5 py-2.5 text-[12px] leading-relaxed text-brand-600">
          {emph(children)}
        </div>
      )}
    </>
  )
}

export function Label({ children, required, right, info }) {
  return (
    <span className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0">
      <span className="flex items-center gap-1.5 text-sm font-medium text-ink-700">
        {children}{required && <span className="ml-0.5 text-brand-400">*</span>}
        {info && <InfoTip>{info}</InfoTip>}
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
      <Label required={f.required} info={f.info}>{f.label}</Label>

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
      {/* 폭은 감싼 칸이 정한다 — inputCls의 w-full은 클래스를 덧붙여도 이기지 못해
          (같은 width 계열끼리는 스타일시트 순서가 정한다) 인풋이 줄을 다 먹고
          [주소 검색] 버튼이 카드 밖으로 밀려났다. */}
      <div className="flex gap-2">
        <span className="w-28 shrink-0">
          <input
            className={cx(inputCls, 'bg-ink-50')}
            placeholder="우편번호"
            value={zip}
            readOnly
          />
        </span>
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

/**
 * 서증명이 아직 '파일 이름 그대로'인지.
 * 확장자를 뗀 파일명과 같거나, 숫자·영문 나열이면 사람이 읽을 서증명이 아니다.
 * 이 이름이 소장에 그대로 인쇄되므로 바꾸라고 짚어 준다.
 */
export function looksLikeRawFileName(x) {
  const name = String(x?.name || '').trim()
  if (!name) return true
  const stem = String(x?.fileName || '').replace(/\.[^.]+$/, '')
  if (stem && name === stem) return true
  return !/[가-힣]{2,}/.test(name)
}

export const prettySize = (b) => (b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`)

/** 파일명에서 확장자를 뗀 것 — 서증명 기본값으로 쓴다 */
const baseName = (n) => n.replace(/\.[^.]+$/, '')

export const FILE_MAX_MB = MAX_MB
export const overSize = (file) => file.size > MAX_MB * 1024 * 1024

/**
 * 파일 하나를 서증 레코드로 만든다.
 * 소장 6단계(FileField)와 증거목록이 같은 모양을 쓰도록 여기 한 곳에서만 만든다.
 */
export async function readEvidenceFile(file, name) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name || baseName(file.name),
    fileName: file.name,
    size: file.size,
    type: file.type,
    thumb: await makeThumb(file),
  }
}

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
  // 이 칸에 올린 파일이 내가 내는 서증(갑·을호증)이 되는지. 기본은 서증이고,
  // 상대방 서면(reference)·신청서 첨부(attachment)는 호증으로 매기지 않는다.
  const isEvidence = !f.role || f.role === 'evidence'
  const mark = form?.side === '피고' ? '을' : '갑'
  // 준비서면은 소장에서 이미 낸 호증 다음 번호부터 이어서 매긴다
  const startNo = Math.max(1, Number(f.startFrom ? form?.[f.startFrom] : 1) || 1)

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

  // 호증 번호는 '제출 순서'로 매겨진다(민사소송규칙 제107조 제2항).
  // 그래서 목록 순서를 바꾸면 갑 제1호증부터 번호가 다시 붙는다.
  const [startEdit, setStartEdit] = useState(false)
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)
  const reorder = (from, to) => {
    if (from == null || to == null || from === to) return
    const next = [...files]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setField(f.key, next)
  }

  return (
    <div>
      <Label info={f.info}>{f.label}</Label>

      {/* 이어서 매길 호증 번호 — 번호가 붙는 자리에서 바로 보이고 고칠 수 있어야 한다.
          별도 입력칸으로 떼어 두면 이 목록과 무슨 상관인지 알 수 없다. */}
      {isEvidence && f.startFrom && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-ink-50 px-3 py-2 text-[13px]">
          <span className="text-ink-500">시작 호증 번호</span>
          {startEdit ? (
            <input
              type="number"
              min={1}
              autoFocus
              className="h-8 w-16 rounded-lg border border-ink-200 px-2 text-sm text-ink-700"
              value={form?.[f.startFrom] ?? ''}
              onChange={(e) => setField(f.startFrom, String(Math.max(1, Number(e.target.value) || 1)))}
              onBlur={() => setStartEdit(false)}
            />
          ) : (
            <>
              <b className="font-semibold text-brand-500">{mark} 제{startNo}호증</b>
              <button type="button" onClick={() => setStartEdit(true)} className="text-[12px] text-ink-400 underline hover:text-brand-400">수정</button>
            </>
          )}
          <span className="w-full text-[11px] text-ink-400 sm:ml-auto sm:w-auto">
            {startNo > 1
              ? `이 사건에서 ${mark} 제${startNo - 1}호증까지 이미 냈어요 — 사건 기록에서 세어 맞췄습니다.`
              : '아직 낸 서증이 없어서 제1호증부터 매깁니다.'}
          </span>
        </div>
      )}

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
            <div
              key={x.id}
              draggable
              onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move' }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOverIdx(i) }}
              onDragLeave={() => setOverIdx((v) => (v === i ? null : v))}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); reorder(dragIdx, i); setDragIdx(null); setOverIdx(null) }}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
              className={cx(
                'flex items-center gap-2 rounded-xl border bg-white p-2.5 transition-colors',
                dragIdx === i ? 'border-brand-300 opacity-50'
                  : overIdx === i ? 'border-brand-300 bg-brand-50/50'
                    : 'border-ink-200',
              )}
            >
              {/* 끌기 손잡이 — 여기를 잡고 옮기면 호증 번호가 다시 매겨진다 */}
              <span
                className="cursor-grab select-none rounded-md px-1 py-1.5 text-base leading-none text-ink-300 hover:bg-ink-100 hover:text-ink-500 active:cursor-grabbing"
                title={isEvidence ? '끌어서 순서 바꾸기 — 순서가 곧 호증 번호입니다' : '끌어서 순서 바꾸기'}
                aria-hidden
              >⠿</span>
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-100">
                {x.thumb
                  ? <img src={x.thumb} alt="" className="h-full w-full object-cover" />
                  : <FileText size={18} className="text-ink-400" />}
              </span>
              <span className="min-w-0 flex-1">
                {/* 호증 번호는 **내가 내는 서증**에만 붙는다.
                    상대방이 보낸 서면이나 신청서 첨부는 호증이 아니고,
                    서증이더라도 부호는 내가 원고면 「갑」, 피고면 「을」이다. */}
                <span className={cx('mb-1 block text-[11px] font-semibold', isEvidence ? 'text-brand-500' : 'text-ink-400')}>
                  {isEvidence ? `${mark} 제${startNo + i}호증` : f.role === 'attachment' ? `첨부 ${i + 1}` : `파일 ${i + 1}`}
                </span>
                <input
                  className="w-full rounded-lg border border-ink-200 px-2.5 py-1.5 text-sm text-ink-900 outline-none focus:border-brand-300"
                  value={x.name}
                  onChange={(e) => rename(x.id, e.target.value)}
                  placeholder={isEvidence ? '서증명 (예: 차용증)' : '파일 이름 (알아보기 쉽게)'}
                />
                {/* 파일명이 기본값으로 들어와 있다. 이 이름이 그대로 문서에 인쇄되므로,
                    바꿔야 한다는 것을 이름칸 바로 아래에서 알려 준다. */}
                <span className="mt-1 block truncate text-[11px] text-ink-400">
                  파일 {x.fileName} · {prettySize(x.size)}
                </span>
                {/* 서증이든 첨부서류든 이 이름이 그대로 문서에 인쇄된다.
                    reference(상대방 서면 등)만 문서에 안 실리므로 안내하지 않는다. */}
                {(isEvidence || f.role === 'attachment') && (
                  <span className={cx(
                    'mt-0.5 block text-[11px]',
                    looksLikeRawFileName(x) ? 'font-medium text-red-500' : 'text-ink-400',
                  )}>
                    {looksLikeRawFileName(x)
                      ? `파일 이름 그대로예요 — 이 이름이 ${isEvidence ? '입증방법란' : '첨부서류란'}에 인쇄됩니다. 「${isEvidence ? '차용증' : '법인등기부등본'}」처럼 무슨 서류인지 적어 주세요.`
                      : `위 이름이 ${isEvidence ? '입증방법란' : '첨부서류란'}에 그대로 인쇄됩니다.`}
                  </span>
                )}
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

      {/* 파일 칸이라고 다 갑호증이 되는 게 아니다. 상대방이 보낸 서면·신청서 첨부·
          준비서면 파일 자체는 내가 내는 서증이 아니라서, 같은 안내를 붙이면 거짓말이 된다.
          서증이 되는 자리에서도 부호는 내가 원고면 「갑」, 피고면 「을」이다. */}
      <div className="mt-2">
        <Note tone="info">
          {f.role === 'reference' ? (
            <>
              올린 파일은 <b className="font-semibold">사건에 함께 보관만</b> 됩니다 — 서증(호증)으로 매겨지지 않아요.
            </>
          ) : f.role === 'attachment' ? (
            <>
              올린 파일의 <b className="font-semibold">이름이 그대로 「첨부서류」란</b>에 «○○○　1통»으로 들어갑니다 —
              서증(호증)으로 매겨지지는 않아요.
            </>
          ) : (
            <>
              올린 파일의 <b className="font-semibold">이름이 곧 서증명</b>이 되어 입증방법란에
              «{mark} 제{startNo}호증 …» 순서로 들어갑니다. 끌어서 순서를 바꾸면 번호도 따라 바뀝니다.
            </>
          )}
        </Note>
      </div>
    </div>
  )
}

/**
 * 「사건 정보를 불러왔어요」 배너.
 * 소장에서 가져온 값으로 칸이 미리 채워졌다는 사실은 어느 문서에서나 똑같이 알려야 한다.
 */
export function CaseLoadedBanner({ caseTitle, what = '법원·사건번호·원고·피고' }) {
  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-brand-600"><Check size={15} /> 사건 정보를 불러왔어요</p>
      <p className="mt-1 text-[13px] leading-relaxed text-brand-600">
        {caseTitle
          ? `「${caseTitle}」에 이미 작성한 소장이 있어 ${what}를 그대로 채웠습니다. 틀린 곳만 고치면 돼요.`
          : `문서 생성 화면에서 사건을 고르면 ${what}를 자동으로 채웁니다.`}
      </p>
    </div>
  )
}

/**
 * 완성 화면의 「이 문서를 저장할까요?」.
 *
 * 문서를 만들었다고 끝이 아니다 — 저장할지 정하고, 저장한 뒤에 갈 곳을 줘야 한다.
 * 네 종류 문서가 모두 같은 마무리를 쓴다.
 */
export function SaveDecision({ docName, caseTitle, caseId, onSave, warn, note }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [state, setState] = useState('ask')

  const save = () => {
    if (onSave()) {
      setState('saved')
      toast(`${docName}을(를) 사건에 저장했어요`)
    } else {
      toast('저장할 사건이 없어요. PDF로 저장해 두세요')
      setState('skipped')
    }
  }

  if (state === 'saved') {
    return (
      <Card className="p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-brand-600"><Check size={15} /> 사건에 저장했어요</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">사건관리의 문서 목록에서 다시 열어볼 수 있어요.</p>
        <div className="mt-4 grid gap-2">
          {caseId && (
            <Button className="justify-center" onClick={() => navigate(`/app/cases/${caseId}`)}>
              사건 관리로 가기 <ArrowRight size={15} />
            </Button>
          )}
          <Button variant="neutral" className="justify-center" onClick={printSheet}>PDF 저장 · 인쇄</Button>
        </div>
      </Card>
    )
  }

  if (state === 'skipped') {
    return (
      <Card className="p-5">
        <p className="text-sm font-bold text-ink-800">저장하지 않았어요</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
          이 화면을 벗어나면 사라집니다. 필요하면 지금 PDF로 저장하거나, 아래에서 다시 저장하세요.
        </p>
        <div className="mt-4 grid gap-2">
          <Button className="justify-center" onClick={save}>역시 저장할게요</Button>
          <Button variant="neutral" className="justify-center" onClick={printSheet}>PDF로만 저장</Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <h2 className="font-bold text-ink-900">이 문서를 저장할까요?</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
        저장하면 {caseTitle ? `「${caseTitle}」` : '이 사건'}의 문서 목록에 남습니다.{note ? ` ${note}` : ''}
      </p>
      {warn && <p className="mt-2 text-[12px] font-medium text-red-500">{warn}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button className="flex-1 justify-center" onClick={save}>저장하기</Button>
        <Button variant="neutral" className="flex-1 justify-center" onClick={() => setState('skipped')}>저장하지 않기</Button>
      </div>
    </Card>
  )
}

/**
 * 왼쪽에 붙는 안내 카드 (Figma 2721:100789).
 *
 * 안내를 입력칸 사이사이에 흩어 놓으면 채워야 할 것과 읽을 것이 섞여 손이 멈춘다.
 * 그래서 여러 단계에서 되풀이되는 말은 본문에서 빼고 왼쪽 한 곳에 모은다.
 * 항목은 굵게 표시할 부분을 앞에 두는 [강조, 나머지] 짝으로 적는다.
 */
export function TipCard({ title, items }) {
  if (!items?.length) return null
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4">
      <p className="text-[13px] font-bold text-ink-900">{title}</p>
      <ul className="mt-2.5 space-y-2">
        {items.map(([strong, rest]) => (
          <li key={strong} className="flex gap-2 text-[12px] leading-relaxed text-ink-500">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-300" />
            <span>{strong && <b className="font-semibold text-brand-500">{strong} </b>}{rest}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * 파일을 올리는 단계면 보관 방식을 한 번만 알려 준다.
 * 이 문장은 파일 칸마다 되풀이되던 것이라 칸에서 빼고 여기로 모았다.
 */
export function fileTipsFor(step) {
  const hasFiles = (step?.fields || []).some((f) => f.kind === 'files')
  if (!hasFiles) return null
  return [
    ['올린 파일은', '이 브라우저에만 임시 보관됩니다. 실제 제출은 전자소송포털에 직접 올리셔야 해요.'],
    ['파일에 붙인 이름이', '그대로 문서에 인쇄되니 알아보기 쉽게 고쳐 주세요.'],
  ]
}

/* ══════════════════════ 생성 알림 ══════════════════════
   Figma 2491:221633(작성 중) · 2666:223580(완성). 두 장이 이어서 지나간다.

   AI가 문장을 만드는 일이라 결과가 즉시 튀어나오면 "정말 내 답을 읽었나" 싶어진다.
   무엇을 하고 있는지 한 박자 보여 주고 넘긴다. 모든 문서가 같은 마무리를 쓴다. */

/** 받침 유무로 조사를 고른다 — 「소장이」/「신청서가」 */
export const josa = (word, withBatchim, without) => {
  const last = String(word || '').trim().slice(-1)
  const code = last.charCodeAt(0)
  if (!(code >= 0xac00 && code <= 0xd7a3)) return without
  return (code - 0xac00) % 28 ? withBatchim : without
}

export function GenerateNotice({ done, doc = '소장', workingSub, doneSub }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 backdrop-blur-[2px]">
      <div
        role="status"
        aria-live="polite"
        className="w-full max-w-[420px] rounded-2xl bg-white px-8 py-12 text-center shadow-2xl"
      >
        {done ? (
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-300 text-white">
            <Check size={26} />
          </span>
        ) : (
          <span className="mx-auto block h-11 w-11 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-400" />
        )}
        <p className="mt-6 text-[19px] font-bold text-brand-500">
          {done ? `${doc}${josa(doc, '이', '가')} 완성되었어요!` : `AI가 ${doc}${josa(doc, '을', '를')} 작성하고 있어요`}
        </p>
        <p className="mt-2 text-[13px] text-ink-500">
          {done
            ? (doneSub || '작성된 내용을 함께 확인해볼까요?')
            : (workingSub || `입력한 내용을 바탕으로 ${doc}${josa(doc, '을', '를')} 완성하고 있어요`)}
        </p>
      </div>
    </div>
  )
}

/**
 * 종이로 낼 때의 기명날인 안내.
 *
 * 우리는 서명 이미지를 받지 않는다 — 전자소송은 제출할 때 공동인증서 전자서명으로 갈음하고,
 * 종이 제출은 출력본에 손으로 하는 것이 원본이기 때문이다. 대신 그 사실을 문서가 만들어지는
 * 자리마다 같은 문장으로 반복해 알린다.
 */
export function PaperSignNote({ tone = 'warn' }) {
  return (
    <Note tone={tone}>
      <b className="font-semibold">종이로 내신다면 출력한 뒤 「(인)」 자리에 서명하거나 도장을 찍어야 합니다.</b>{' '}
      법원은 기명날인 또는 서명을 서면의 기재사항으로 정하고 있어요(민사소송법 제274조 제1항, 민사소송규칙 제2조 제1항).
      여러 장이면 간인도 필요합니다. <b className="font-semibold">전자소송</b>으로 내면 제출할 때 공동인증서 전자서명으로 갈음하므로 따로 서명하지 않아도 됩니다.
    </Note>
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

/**
 * 「함께 낼 서류」 체크와 실제 올린 파일의 간극을 짚어 준다.
 * 체크만으로는 제출되지 않는다 — 증거(evidenceGap)와 같은 이유로 필요한 안내다.
 */
export function AttachGap({ form, listKey = 'attachExtra', filesKey = 'attachFiles' }) {
  const checked = form?.[listKey] || []
  if (checked.length === 0) return null
  const missing = missingItems(checked, form?.[filesKey])
  if (missing.length === 0) {
    return <Note tone="ok">체크하신 서류를 모두 올리셨어요. 문서 말미 「첨부서류」란에 그대로 들어갑니다.</Note>
  }
  return (
    <Note tone="warn">
      체크하신 서류 중 <b className="font-semibold">{missing.join(', ')}</b>의 파일이 아직 올라오지 않았어요.
      <b className="font-semibold"> 첨부서류란에는 적히지만 실제 제출은 파일이 있어야 합니다.</b>{' '}
      발급받아야 하는 서류라면 접수 전까지 준비해 두세요.
    </Note>
  )
}

export const isVisible = (field, form) => (field.when ? !!field.when(form) : true)

/** 값이 들어 있는지 — 배열은 길이로 본다 */
const filled = (v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '')

const fieldMissing = (field, form) => {
  if (!field.required || !field.key || !isVisible(field, form)) return false
  if (field.kind === 'address' && form[`${field.key}Unknown`]) return false
  if ((field.kind === 'radio' || field.kind === 'select') && field.options && !field.options.includes(form[field.key])) return true
  return !filled(form[field.key])
}

/** 여러 문서가 공유하는 기본 입력 종류. 문서 고유 계산 박스는 renderExtra로 넘긴다. */
/**
 * 구어체로 받는 칸 — 소장·준비서면·신청서가 함께 쓴다.
 *
 * 날짜·금액·분류는 폼으로 골라 받고, 여기서는 **고를 수 없는 것**만 받는다.
 * 상대방이 실제로 한 말, 그동안 오간 정황. 예시 칩은 답을 대신 써 주는 게 아니라
 * 무엇을 적어야 할지 몰라 빈칸 앞에서 멈추는 것을 막는 마중물이다.
 */
export function AiPromptField({ field, value, onChange }) {
  const addExample = (example) => {
    if (String(value || '').includes(example)) return
    onChange(value ? `${String(value).trim()} ${example}` : example)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
      <div className="border-b border-ink-100 px-5 py-4">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-500">
          <FileText size={14} /> {field.eyebrow || '평소 말로 답해주세요'}
        </p>
        <p className="mt-1.5 text-[16px] font-bold leading-relaxed text-brand-500">
          {field.question}{field.required && <span className="ml-1">*</span>}
        </p>
        {field.why && <p className="mt-1 text-[12.5px] leading-relaxed text-ink-400">{field.why}</p>}
      </div>

      <div className="px-5 py-4">
        {field.exampleGroups?.length > 0 && (
          <div className="mb-4 space-y-3">
            {field.exampleGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 text-[12px] font-medium text-ink-500">{group.label}</p>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => addExample(example)}
                      className="rounded-full bg-ink-100 px-3 py-1.5 text-left text-[12px] leading-5 text-ink-600 transition-colors hover:bg-brand-100 hover:text-brand-600"
                    >
                      + {example}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <label className="block">
          <span className="sr-only">{field.question}</span>
          <textarea
            rows={5}
            value={value || ''}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder}
            className="w-full resize-y rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm leading-7 text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-brand-300 focus:ring-4 focus:ring-brand-100/60"
          />
        </label>
        <p className="mt-2 text-[12px] text-ink-400">
          문장을 잘 쓰지 않아도 괜찮아요. 실제 있었던 일을 평소 말하듯 적으세요.
        </p>
      </div>
    </div>
  )
}

export function FieldOne({ field: f, form, setField, renderExtra }) {
  const v = f.key ? form[f.key] ?? '' : ''
  const set = (val) => setField(f.key, val)

  switch (f.kind) {
    case 'text':
      return (
        <label className="block">
          <Label
            required={f.required}
            info={f.info}
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
          <Label required={f.required} info={f.info}>{f.label}</Label>
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
          <Label required={f.required} info={f.info}>{f.label}</Label>
          <div className="relative">
            <input className={cx(inputCls, f.unit && 'pr-12')} inputMode="numeric" value={v} onChange={(e) => set(e.target.value.replace(/[^0-9.]/g, ''))} />
            {f.unit && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-400">{f.unit}</span>}
          </div>
          {/* text·money와 달리 여기만 hint를 안 그려서, 스키마에 적어 둔 안내가 조용히 사라지고 있었다 */}
          {f.hint && <span className="mt-1 block text-xs text-ink-500">{f.hint}</span>}
        </label>
      )
    case 'date':
      return <label className="block"><Label required={f.required} info={f.info}>{f.label}</Label><input type="date" className={inputCls} value={v} onChange={(e) => set(e.target.value)} /></label>
    case 'area':
      return <label className="block"><Label required={f.required} info={f.info}>{f.label}</Label><textarea rows={f.rows || 3} className={cx(inputCls, 'h-auto py-2.5 leading-relaxed')} placeholder={f.placeholder} value={v} onChange={(e) => set(e.target.value)} /></label>
    case 'select':
      return (
        <label className="block">
          <Label required={f.required} info={f.info}>{f.label}</Label>
          <select className={inputCls} value={v} onChange={(e) => set(e.target.value)}>
            <option value="">선택하세요</option>
            {f.options.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
      )
    case 'radio':
      return <div><Label required={f.required} info={f.info}>{f.label}</Label><Pills options={f.options} value={v} onChange={set} /></div>
    case 'checks':
      return <div><Label required={f.required} info={f.info}>{f.label}</Label><Pills options={f.options} value={form[f.key] || []} onChange={set} multi /></div>
    case 'note':
      return <Note tone={f.tone}>{f.body}</Note>
    case 'aiPrompt':
      return <AiPromptField field={f} value={form[f.key] || ''} onChange={(v) => setField(f.key, v)} />
    case 'court':
      return <div><Label required={f.required} info={f.info}>{f.label}</Label><CourtPicker value={form[f.key] ?? ''} onChange={set} /></div>
    case 'address':
      return <AddressField field={f} form={form} setField={setField} />
    case 'attachGap':
      return <AttachGap form={form} listKey={f.listKey} filesKey={f.filesKey} />
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
      <Label required={f.required} info={f.info}>{f.label}</Label>
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
                  {c.kind === 'area' ? (
                    <textarea rows={c.rows || 2} className={cx(inputCls, 'h-auto py-2 text-sm leading-relaxed')} placeholder={c.placeholder} value={row[c.key] || ''} onChange={(e) => update(i, c.key, e.target.value)} />
                  ) : c.kind === 'pick' ? (
                    // 이미 담아 둔 것에서 고른다 — 같은 이름을 다시 타이핑하면 서면과 증거가 어긋난다
                    (() => {
                      const opts = (typeof c.options === 'function' ? c.options(form) : c.options) || []
                      return opts.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-ink-200 bg-ink-50 px-3 py-2 text-xs leading-relaxed text-ink-400">{c.empty}</p>
                      ) : (
                        <select className={cx(inputCls, 'h-10 text-sm')} value={row[c.key] || ''} onChange={(e) => update(i, c.key, e.target.value)}>
                          <option value="">{c.placeholder || '선택하세요'}</option>
                          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      )
                    })()
                  ) : (
                    <input className={cx(inputCls, 'h-10 text-sm')} placeholder={c.placeholder} value={row[c.key] || ''} onChange={(e) => update(i, c.key, e.target.value)} />
                  )}
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
function FieldList({ list, form, setField, renderExtra, grouped }) {
  const out = []
  for (let i = 0; i < list.length; i += 1) {
    const f = list[i]

    // fold가 같은 필드끼리 묶어 접는다 — 자주 안 쓰는 항목을 기본으로 감춘다.
    // 이미 그룹 안이면 다시 묶지 않는다 (묶으면 자기 자신을 무한히 다시 그린다).
    if (f.fold && !grouped) {
      const group = []
      while (i < list.length && list[i].fold === f.fold) { group.push(list[i]); i += 1 }
      i -= 1
      out.push(
        <FoldGroup key={`fold-${f.fold}`} label={f.fold} fields={group} form={form} setField={setField} renderExtra={renderExtra} />,
      )
      continue
    }

    if (f.half && list[i + 1]?.half && (grouped || !list[i + 1].fold)) {
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
          <FieldList list={fields} form={form} setField={setField} renderExtra={renderExtra} grouped />
        </div>
      )}
    </div>
  )
}

export function Fields({ fields, form, setField, renderExtra }) {
  const visible = fields.filter((f) => isVisible(f, form))
  // 단계 안에서는 입력을 다시 탭으로 숨기지 않는다.
  // 원고·피고처럼 성격이 다른 묶음은 제목으로만 나누고 한 화면에 이어서 보여준다.
  const tabs = [...new Set(visible.map((f) => f.tab).filter(Boolean))]

  if (tabs.length === 0) return <FieldList list={visible} form={form} setField={setField} renderExtra={renderExtra} />

  const lead = visible.filter((f) => !f.tab)
  return (
    <div className="space-y-7">
      {lead.length > 0 && <FieldList list={lead} form={form} setField={setField} renderExtra={renderExtra} />}
      {tabs.map((tabLabel) => {
        const group = visible.filter((f) => f.tab === tabLabel)
        const need = group.filter((f) => f.required && f.key && !filled(form[f.key])).length
        return (
          <section key={tabLabel} className="border-t border-ink-100 pt-5">
            <div className="mb-4 flex items-center gap-2">
              <h4 className="text-sm font-bold text-ink-800">{tabLabel}</h4>
              {need > 0
                ? <Badge tone="gray">필수 {need}개 남음</Badge>
                : <Badge tone="blue">입력 완료</Badge>}
            </div>
            <FieldList list={group} form={form} setField={setField} renderExtra={renderExtra} />
          </section>
        )
      })}
    </div>
  )
}

/**
 * 한 단계의 질문을 한꺼번에 펼치지 않고 관련 항목 한 묶음씩만 보여준다.
 * guideGroup이 같은 항목은 날짜+금액처럼 한 질문에서 함께 답한다.
 */
function GuidedFields({ fields, form, setField, renderExtra, onPrevious, onNext, onFinish, isLastStep, canFinish }) {
  const visible = fields.filter((field) => isVisible(field, form))
  const notes = visible.filter((field) => field.kind === 'note')
  const questions = visible.filter((field) => field.kind !== 'note')
  const pages = []

  questions.forEach((field, index) => {
    const key = field.guideGroup || field.key || `${field.kind}-${index}`
    const last = pages[pages.length - 1]
    if (last?.key === key) last.fields.push(field)
    else pages.push({ key, fields: [field] })
  })

  const firstIncomplete = pages.findIndex((page) => page.fields.some((field) => fieldMissing(field, form)))
  const [cursor, setCursor] = useState(() => (firstIncomplete < 0 ? 0 : firstIncomplete))
  const pageIndex = Math.min(cursor, Math.max(0, pages.length - 1))
  const page = pages[pageIndex]
  const missing = page?.fields.filter((field) => fieldMissing(field, form)).length || 0
  const hasRequired = page?.fields.some((field) => field.required) || false
  const hasAnswer = page?.fields.some((field) => field.key && filled(form[field.key])) || false
  const isInfoOnly = page?.fields.every((field) => !field.key) || false

  if (!page) return null

  const goBack = () => {
    if (pageIndex > 0) setCursor(pageIndex - 1)
    else onPrevious?.()
  }
  const goForward = () => {
    if (pageIndex < pages.length - 1) setCursor(pageIndex + 1)
    else if (isLastStep) onFinish?.()
    else onNext?.()
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <span className="text-xs font-bold text-brand-500">질문 {pageIndex + 1} / {pages.length}</span>
        <div className="flex flex-1 gap-1" aria-label={`질문 ${pageIndex + 1} / ${pages.length}`}>
          {pages.map((item, index) => (
            <span key={item.key} className={cx('h-1.5 flex-1 rounded-full', index <= pageIndex ? 'bg-brand-300' : 'bg-ink-100')} />
          ))}
        </div>
      </div>

      {pageIndex === 0 && notes.length > 0 && (
        <div className="mb-4">
          <Fields fields={notes} form={form} setField={setField} renderExtra={renderExtra} />
        </div>
      )}

      <div className="min-h-52 rounded-2xl border border-ink-100 bg-ink-50/45 p-4 sm:p-5">
        <Fields fields={page.fields} form={form} setField={setField} renderExtra={renderExtra} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button variant="neutral" size="sm" onClick={goBack}>{pageIndex > 0 ? '이전 질문' : '이전 단계'}</Button>
        <div className="flex flex-col items-end gap-1.5">
          {missing > 0 && <span className="text-xs text-red-500">이 답변이 필요해요.</span>}
          {isLastStep && !canFinish && missing === 0 && <span className="text-xs text-red-500">앞 질문에 답변이 남아 있어요.</span>}
          <Button size="sm" disabled={missing > 0 || (isLastStep && !canFinish)} onClick={goForward}>
            {pageIndex < pages.length - 1
              ? hasRequired || hasAnswer || isInfoOnly ? '다음 질문' : '건너뛰고 다음'
              : isLastStep ? '완성된 소장 보기' : '다음 단계'}
            <ArrowRight size={15} />
          </Button>
        </div>
      </div>
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
              className={cx('shrink-0 p-1 transition-colors', faves.includes(t.key) ? 'text-red-400' : 'text-ink-300 hover:text-ink-400')}
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

/* ─────────────────── 작성 화면 껍데기 (단계 탐색 + 입력 패널) ─────────────────── */

export function FolderStepNav({ title, badge, items, activeIndex, onSelect, aside }) {
  const completed = items.filter((item) => item.done).length

  return (
    <aside className="w-full lg:w-60 lg:shrink-0">
      <div className="lg:sticky lg:top-4">
      <Card className="p-3">
        <div className="px-1 pb-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-semibold text-ink-400">{title}</span>
            <span className="text-[11px] tabular-nums text-ink-400">완료 {completed} / {items.length}</span>
          </div>
          <div className="mt-1.5"><Progress value={items.length ? (completed / items.length) * 100 : 0} /></div>
        </div>

        <nav aria-label={`${title} 단계`} className="border-t border-ink-100 pt-2">
          <div className="flex items-center gap-1 rounded-lg bg-ink-50 pr-2">
            <span className="grid h-7 w-6 shrink-0 place-items-center text-ink-400"><ChevronDown size={14} /></span>
            <span className="min-w-0 flex-1 truncate py-1.5 text-[13px] font-bold text-ink-700">{badge || title}</span>
            <span className="shrink-0 text-[11px] tabular-nums text-ink-400">{items.length}</span>
          </div>

          <div className="ml-6 mt-0.5 space-y-0.5 border-l border-ink-100 pl-2">
            {items.map((item, index) => {
              const isActive = index === activeIndex
              return (
                <button
                  key={`${index}-${item.title}`}
                  type="button"
                  aria-current={isActive ? 'step' : undefined}
                  title={item.summary || item.title}
                  onClick={() => onSelect(index)}
                  className={cx(
                    'flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-left transition-colors',
                    isActive ? 'bg-brand-50' : 'hover:bg-ink-100/70',
                  )}
                >
                  <span className={cx(
                    'grid h-5 w-5 shrink-0 place-items-center rounded-md text-[10px] font-bold',
                    isActive ? 'bg-brand-300 text-white' : item.done ? 'bg-brand-50 text-brand-500' : 'bg-ink-100 text-ink-500',
                  )}>{index + 1}</span>
                  <span className={cx('min-w-0 flex-1 truncate text-[12.5px]', isActive ? 'font-bold text-brand-600' : 'text-ink-600')}>
                    {index + 1}단계 · {item.title}
                  </span>
                  {!isActive && item.done
                    ? <Check size={12} className="shrink-0 text-brand-500" />
                    : item.missing > 0 && <span className="shrink-0 text-[10px] tabular-nums text-red-400">{item.missing}</span>}
                </button>
              )
            })}
          </div>
        </nav>
      </Card>
      {/* 단계 목록 아래 — 이 문서를 왜 쓰는지 같은, 읽어 두면 좋지만 본문을 밀어내면 안 되는 것들 */}
      {aside && <div className="mt-3 space-y-3">{aside}</div>}
      <p className="mt-3 px-1 text-[11px] leading-relaxed text-ink-400">
        정확한 법적 판단이 필요한 경우, 변호사 등 법률 전문가의 자문을 권장드립니다.
      </p>
      </div>
    </aside>
  )
}

/**
 * 작성 화면 아래에 붙어 있는 한 줄 — 저장과 단계 이동이 여기 다 있다.
 *
 * 나가기(onBack)는 여기에 두지 않는다. 「이전」이라고 적힌 버튼이 화면을 닫아 버리면
 * 되돌아간 것이 아니라 작업을 잃은 것처럼 읽힌다. 나가기는 제목 옆 화살표가 맡는다.
 */
function StepFooter({
  onSave, savedLabel, index, count, setOpen,
  blocked, blockedCount, doneBlocked, totalMissing, onDone, doneLabel, className,
}) {
  const last = index >= count - 1
  return (
    <div className={cx(
      'sticky bottom-0 z-10 flex flex-wrap items-center gap-2 rounded-b-2xl border-t border-ink-100 bg-white/95 px-4 py-3 backdrop-blur-sm',
      className,
    )}>
      {onSave && <Button variant="neutral" onClick={onSave}>임시저장</Button>}
      {savedLabel && <span className="hidden text-xs text-ink-400 sm:inline">{savedLabel}</span>}

      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {/* 버튼이 왜 잠겼는지 같은 줄에서 말해 준다 */}
        {last
          ? totalMissing > 0 && <span className="text-xs font-medium text-red-500">필수 {totalMissing}개 남음</span>
          : blocked && <span className="text-xs font-medium text-red-500">이 단계 필수 {blockedCount}개를 채워주세요</span>}
        {index > 0 && <Button variant="neutral" onClick={() => setOpen(index - 1)}>이전 단계</Button>}
        {last
          ? <Button disabled={doneBlocked} onClick={onDone}>{doneLabel} <ArrowRight size={16} /></Button>
          : <Button disabled={blocked} onClick={() => setOpen(index + 1)}>다음 단계 <ArrowRight size={16} /></Button>}
      </div>
    </div>
  )
}

function SplitWizardBody({
  badge, steps, open, setOpen, form, setField, renderExtra, stepSummary,
  onBack, onSave, savedLabel, onDone, doneLabel,
  extraPanel, sideNote, requireStepCompletion,
}) {
  const missingInStep = (step) => step.fields.filter((field) => fieldMissing(field, form)).length
  const totalMissing = steps.reduce((sum, step) => sum + missingInStep(step), 0)
  const activeStep = steps[open] || steps[0]
  const activeIndex = Math.max(0, steps.indexOf(activeStep))
  const activeMissing = missingInStep(activeStep)
  const navItems = steps.map((step, index) => {
    const missing = missingInStep(step)
    return {
      title: step.title,
      summary: stepSummary ? stepSummary(index) : '',
      missing,
      done: missing === 0,
    }
  })

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <FolderStepNav
        title="문서 작성"
        badge={badge}
        items={navItems}
        activeIndex={activeIndex}
        onSelect={setOpen}
        aside={sideNote}
      />

      <Card className="min-w-0 flex-1 p-0">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-ink-100 px-5 py-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-300 text-sm font-bold text-white">{activeIndex + 1}</span>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-ink-900">{activeStep.title}</h3>
            <p className="mt-0.5 text-xs text-ink-400">{activeIndex + 1} / {steps.length}단계</p>
          </div>
          {activeStep.badge && <Badge tone="blue">{activeStep.badge}</Badge>}
          {requireStepCompletion && activeMissing > 0 && <Badge tone="gray">필수 {activeMissing}개 남음</Badge>}
        </div>

        <div className="px-5 py-5 sm:px-6 sm:py-6">
          {activeStep.hint && <p className="mb-4 text-[13px] leading-relaxed text-ink-500">{activeStep.hint}</p>}
          {activeStep.aiAssist && (
            <div className="mb-5 flex gap-2 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3">
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-300 text-[10px] font-bold leading-none text-white">!</span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-brand-600">평소 말로 답해도 괜찮아요</span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-brand-600/80">AI가 입력한 사실을 빠뜨리지 않고, 이 문서의 법원 제출 순서와 문장으로 정리합니다.</span>
              </span>
            </div>
          )}

          <Fields fields={activeStep.fields} form={form} setField={setField} renderExtra={renderExtra} />

          {activeStep.append}
          {extraPanel}
        </div>

        {/* 단계를 넘기는 버튼은 아래 바 하나로 모은다. 본문 끝에 따로 두면
            긴 단계에서는 끝까지 스크롤해야 보이고, 짧은 단계에서는 바로 위에
            같은 버튼이 두 번 나온다. */}
        <StepFooter
          onSave={onSave}
          savedLabel={savedLabel}
          index={activeIndex}
          count={steps.length}
          setOpen={setOpen}
          blocked={requireStepCompletion && activeMissing > 0}
          blockedCount={activeMissing}
          doneBlocked={requireStepCompletion && totalMissing > 0}
          totalMissing={requireStepCompletion ? totalMissing : 0}
          onDone={onDone}
          doneLabel={doneLabel}
        />
      </Card>
    </div>
  )
}

/**
 * 작성 화면의 제목 — 「신청서 작성 › 지급명령신청서」.
 *
 * 문서 종류는 회색, 그 안의 세부 유형은 파랑 밑줄. 네 종류 문서가 같은 모양을 쓴다.
 * 세부 유형이 없으면 제목 하나만 나온다.
 */
export function DocTitle({ title, badge }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <h1 className="text-2xl font-bold text-ink-700">{title}</h1>
      {badge && (
        <>
          <ChevronRight size={20} className="shrink-0 text-ink-300" />
          <span className="truncate text-2xl font-bold text-brand-500 underline decoration-brand-300 decoration-2 underline-offset-[6px]">
            {badge}
          </span>
        </>
      )}
    </div>
  )
}

export function WizardShell({
  title, badge, sub, stage, stageLabels,
  steps, open, setOpen, form, setField, renderExtra, stepSummary,
  percent, preview, previewTitle = '미리보기',
  onBack, onSave, savedLabel, onDone, doneLabel = '완성하기',
  onFull, extraPanel, sideNote, printable, showPreview = true, requireStepCompletion = false,
  splitNavigation = false,
}) {
  const missingInStep = (step) => step.fields.filter((field) => fieldMissing(field, form)).length
  const totalMissing = steps.reduce((sum, step) => sum + missingInStep(step), 0)

  return (
    <>
      {/* 인쇄·PDF 저장용 — 화면에는 안 보이고 12pt·200%로만 나온다 */}
      {showPreview && printable && <PrintSheet>{printable}</PrintSheet>}
    <div className="space-y-5">
      {/* 화면을 나가는 문(onBack)은 제목 옆 화살표 하나다.
          아래 바에 [이전]으로 두면 단계를 되돌리는 버튼으로 읽혀, 누르면 작성 화면이
          통째로 닫혀 버린다 — 되돌리기와 나가기는 같은 자리에 있으면 안 된다. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-2">
          {onBack && (
            <IconButton label="문서 생성으로 나가기" onClick={onBack} className="mt-0.5 shrink-0">
              <ArrowLeft size={18} />
            </IconButton>
          )}
          <div className="min-w-0">
            <DocTitle title={title} badge={badge} />
            {sub && <p className="mt-1 text-sm text-ink-500">{sub}</p>}
          </div>
        </div>
        {!splitNavigation && <StageBar stage={stage} labels={stageLabels} />}
      </div>

      {splitNavigation ? (
        <SplitWizardBody
          badge={badge}
          steps={steps}
          open={open}
          setOpen={setOpen}
          form={form}
          setField={setField}
          renderExtra={renderExtra}
          stepSummary={stepSummary}
          onBack={onBack}
          onSave={onSave}
          savedLabel={savedLabel}
          onDone={onDone}
          doneLabel={doneLabel}
          extraPanel={extraPanel}
          sideNote={sideNote}
          requireStepCompletion={requireStepCompletion}
        />
      ) : <div className={cx('grid gap-5', showPreview ? 'lg:grid-cols-2' : 'mx-auto w-full max-w-4xl')}>
        <div className="space-y-3">
          {steps.map((s, i) => {
            const isOpen = open === i
            const summary = stepSummary ? stepSummary(i) : ''
            const missing = missingInStep(s)
            const done = !isOpen && summary && (!requireStepCompletion || missing === 0)

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
                    : requireStepCompletion && missing > 0
                      ? <span className="shrink-0 text-xs font-medium text-red-500">필수 {missing}개 남음</span>
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
                  {requireStepCompletion && missing > 0 && <Badge tone="gray">필수 {missing}개 남음</Badge>}
                  <span className="text-xs text-ink-400">{i + 1} / {steps.length}</span>
                  <ChevronDown size={16} className="rotate-180 text-ink-400" />
                </div>
                {s.hint && <p className="mb-3 text-[13px] text-ink-500">{s.hint}</p>}

                {s.guided ? (
                  <GuidedFields
                    fields={s.fields}
                    form={form}
                    setField={setField}
                    renderExtra={renderExtra}
                    onPrevious={() => i > 0 && setOpen(i - 1)}
                    onNext={() => i < steps.length - 1 && setOpen(i + 1)}
                    onFinish={onDone}
                    isLastStep={i === steps.length - 1}
                    canFinish={totalMissing === 0}
                  />
                ) : (
                  <Fields fields={s.fields} form={form} setField={setField} renderExtra={renderExtra} />
                )}

                {s.append}
              </Card>
            )
          })}

          {extraPanel}

          {/* 안내형(guided) 단계는 질문 카드가 자기 안에서 앞뒤로 넘긴다 —
              같은 일을 하는 버튼을 아래에 또 두지 않는다. */}
          {steps[open]?.guided ? (
            <Card className="sticky bottom-0 flex flex-wrap items-center gap-2 p-3">
              {onSave && <Button variant="neutral" onClick={onSave}>임시저장</Button>}
              {savedLabel && <span className="hidden text-xs text-ink-400 sm:inline">{savedLabel}</span>}
              {requireStepCompletion && totalMissing > 0 && (
                <span className="ml-auto text-xs font-medium text-red-500">필수 {totalMissing}개 남음</span>
              )}
            </Card>
          ) : (
            <Card className="p-0">
              <StepFooter
                className="rounded-2xl border-t-0"
                onSave={onSave}
                savedLabel={savedLabel}
                index={open}
                count={steps.length}
                setOpen={setOpen}
                blocked={requireStepCompletion && missingInStep(steps[open] || steps[0]) > 0}
                blockedCount={missingInStep(steps[open] || steps[0])}
                doneBlocked={requireStepCompletion && totalMissing > 0}
                totalMissing={requireStepCompletion ? totalMissing : 0}
                onDone={onDone}
                doneLabel={doneLabel}
              />
            </Card>
          )}
        </div>

        {showPreview && <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-6rem)]">
          <Card className="flex h-full flex-col p-0">
            <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-5 py-3.5">
              <h3 className="font-bold text-ink-900">{previewTitle}</h3>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> 실시간 반영 중
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
        </div>}
        </div>}
      </div>
    </>
  )
}
