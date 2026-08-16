import { useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../context/ToastContext.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { Card, Button, Badge, Progress, cx } from './ui.jsx'
import Modal from './Modal.jsx'
import { Check, ArrowLeft, ArrowRight, FileText, Lightbulb, Sparkles } from './icons.jsx'
import {
  Rich, DocHeading, DocSignature, GenerateNotice, Note, PaperSignNote, PickList, WizardShell,
  TipCard, fileTipsFor, printSheet,
} from './docform.jsx'
import SubmitGuide from './SubmitGuide.jsx'
import { caseTitle } from '../lib/casebook.js'
import { missingItems } from '../lib/evidenceMatch.js'
import {
  complaintTypes, findType, allSteps, completeness, stepSummary,
  buildPreview, requiredChecklist, costSummary, effectiveSueValue, partyCount, won, fmtDate, emptyComplaint,
  saveDraft, loadDraft, clearDraft, savedAgo,
} from '../lib/complaint.js'

/* ══════════════════════ 자가진단 모달 ══════════════════════ */

function DiagnosisModal({ typeKey, onClose, onGo }) {
  const type = findType(typeKey)
  const [picked, setPicked] = useState(0)
  if (!type) return null
  const { options, tips, prepare } = type.diagnosis

  return (
    <Modal open onClose={onClose} title={`소장(${type.short})`} maxW="max-w-xl">
      <p className="-mt-2 text-sm text-ink-500">지금 상황을 선택하면 소장이 맞는 절차인지와 무엇을 준비해야 하는지 알려드려요.</p>

      <div className="mt-4 space-y-2">
        {options.map((o, i) => (
          <button
            key={o.label}
            onClick={() => setPicked(i)}
            className={cx(
              'w-full rounded-full border px-5 py-3 text-left text-sm transition-colors',
              picked === i ? 'border-brand-300 bg-brand-50 font-semibold text-brand-500' : 'border-ink-200 text-ink-500 hover:bg-ink-50',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-ink-50 p-4 text-[13px] leading-relaxed text-ink-700">{options[picked].advice}</div>

      <p className="mt-4 text-sm font-medium text-ink-600">미리 알아두면 좋은 정보</p>
      <div className="mt-2 space-y-1 rounded-xl bg-ink-50 p-4 text-[13px] leading-relaxed text-ink-600">
        {tips.map((t) => <p key={t}>{t}</p>)}
      </div>

      <p className="mt-4 text-sm font-medium text-ink-600">준비할 항목</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {prepare.map((p) => <span key={p} className="rounded-full border border-ink-200 px-3 py-1 text-xs text-ink-500">{p}</span>)}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => onGo(options[picked].label)}>문서 생성으로 보내기 <ArrowRight size={16} /></Button>
      </div>
    </Modal>
  )
}

/* ══════════════════════ 소장 본문 ══════════════════════ */

export function ComplaintPaper({ doc, dense }) {
  const today = fmtDate(new Date().toISOString().slice(0, 10))
  return (
    <div className={cx('font-serif leading-loose text-ink-800', dense ? 'text-[11px]' : 'text-[13px]')}>
      <p className="print-lg text-center text-xl font-bold tracking-[0.4em] text-ink-900">소　장</p>

      {/* 법원 소장 양식은 **당사자를 먼저** 적고, 그 아래에 사건명과 소가를 둔다.
          사건명·소가를 위로 올리면 서식이 아니라 표지처럼 읽힌다. */}
      <div className="mt-6 space-y-0.5">
        {doc.parties.map((l, i) => <p key={i} className="whitespace-pre-wrap"><Rich text={l} /></p>)}
      </div>
      {/* 작성자에게 하는 말 — 법원 서식에는 없는 줄이라 인쇄본에서는 빠진다 */}
      {doc.partyNote && <p className="no-print mt-2 text-[0.88em] text-ink-400">※ {doc.partyNote}</p>}

      <p className="mt-6"><b className="font-semibold text-brand-500">{doc.caseName}</b> 청구의 소</p>

      <div className="mt-3 space-y-0.5">
        <p>
          소송목적의 값　　{doc.sueValue ? <b className="font-semibold text-brand-500">{won(doc.sueValue)}원</b> : <span className="text-ink-300">[ 1단계에서 입력 ]</span>}
          {doc.sueValueDeemed && <span className="ml-1 text-[0.9em]">(민사소송 등 인지규칙 제18조의2)</span>}
        </p>
        <p>첩부할 인지액　　{doc.sueValue ? <b className="font-semibold text-brand-500">{won(doc.stamp)}원</b> : <span className="text-ink-300">[ 소가를 입력하면 계산됩니다 ]</span>}</p>
      </div>
      {doc.smallClaim && (
        <p className="mt-3 text-[0.92em] text-ink-600">
          ※ 소송목적의 값이 3,000만원 이하이므로 「소액사건심판법」이 적용되는 소액사건입니다.
        </p>
      )}

      <DocHeading>청 구 취 지</DocHeading>
      {doc.claims.map((c, i) => <p key={i}><Rich text={c} /></p>)}
      <p className="mt-1">라는 판결을 구합니다.</p>

      <DocHeading>청 구 원 인</DocHeading>
      {doc.reasons.map((r, i) => <p key={i} className="whitespace-pre-wrap"><Rich text={r} /></p>)}

      {/* 법원 서식은 입증방법·첨부서류의 항목 번호를 모두 「1.」로 적는다.
          순번은 갑호증 번호가 이미 나타내므로, 앞의 숫자는 올려 세지 않는다. */}
      <DocHeading>입 증 방 법</DocHeading>
      {doc.evidences
        ? doc.evidences.map((e, i) => <p key={e + i}>1. 갑 제{i + 1}호증　　<b className="font-semibold text-brand-500">{e}</b></p>)
        : <p className="text-ink-300">[ 6단계에서 증거를 고르면 갑 제1호증부터 자동으로 번호가 매겨집니다 ]</p>}

      <DocHeading>첨 부 서 류</DocHeading>
      {(doc.attachments || []).map((a, i) => <p key={i}>1. {a}</p>)}

      <DocSignature date={today} name={doc.plaintiff} court={doc.court} />

      {/* 별지 목록 — 명도 사건은 이게 없으면 판결 주문의 목적물이 특정되지 않는다 */}
      {doc.appendix && (
        <div className="mt-8 border-t border-dashed border-ink-300 pt-6">
          <p className="text-center text-[15px] font-bold tracking-[0.3em] text-ink-900">별　지</p>
          <p className="mt-3 text-center text-ink-600">{doc.appendix.title}</p>
          {doc.appendix.body
            ? <p className="mt-3 whitespace-pre-wrap"><b className="font-semibold text-brand-500">{doc.appendix.body}</b></p>
            : <p className="mt-3 text-ink-300">[ 3단계에서 부동산의 표시를 등기부 기재대로 입력해 주세요 ]</p>}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════ 완성된 소장 ══════════════════════
   Figma 「AI가 정리한 소장」(2666:227104).

   모달이 아니라 **한 페이지**다. 소장은 한 번 보고 닫는 알림이 아니라 읽고 고치고
   인쇄하는 문서라, 뒤 화면이 비치는 창에 가둬 두면 스크롤도 인쇄도 어색해진다.

   본문도 한 장으로 이어 붙인다. 전에는 1면·2면으로 잘라 두 칸에 넣었는데,
   실제 종이는 내용이 흘러가는 대로 나뉘지 화면 칸에 맞춰 나뉘지 않는다. */

export function FullView({
  type,
  form,
  onClose,
  onEdit,
  onSubmit,
  actionLabel = '전자소송 제출 안내',
  captureMode = false,
}) {
  const doc = buildPreview(type, form)
  const checks = requiredChecklist(type, form)
  const okCount = checks.filter((c) => c.ok).length

  return (
    <div className={cx('space-y-5', captureMode && 'min-h-screen bg-ink-50 p-8')}>
      {!captureMode && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 text-sm font-medium text-ink-500 transition-colors hover:text-ink-700"
        >
          <ArrowLeft size={16} /> 이전으로 돌아가기
        </button>
      )}

      <Card className="flex flex-wrap items-center gap-x-4 gap-y-3 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold text-ink-900">AI가 정리한 소장</h1>
            <Badge tone="blue">{type.title}</Badge>
          </div>
          <p className="mt-1 text-[13px] text-ink-500">입력한 사실을 법원 제출 문장과 소장 순서에 맞춰 정리했습니다.</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="hidden text-xs text-ink-400 xl:inline">종이 제출용 완성본 · 전자소송은 내용을 붙여넣습니다</span>
          {onEdit && <Button variant="neutral" onClick={onEdit}>답변 수정하기</Button>}
          <Button onClick={printSheet}>PDF 저장 · 인쇄</Button>
          {onSubmit && <Button onClick={onSubmit}>{actionLabel} <ArrowRight size={15} /></Button>}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Card className="px-6 py-8 sm:px-12 sm:py-12">
          <ComplaintPaper doc={doc} />
        </Card>

        <Card className="p-0">
          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="font-bold text-ink-900">소장 필수 기재사항</h2>
            <span className="text-sm font-bold text-brand-400">{okCount} / {checks.length}</span>
          </div>
          <div className="px-4 pb-3 pt-2"><Progress value={(okCount / checks.length) * 100} /></div>
          <div className="divide-y divide-ink-100">
            {checks.map((c) => (
              <div key={c.no} className="flex gap-2.5 px-4 py-3">
                <span className={cx('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md text-white', c.ok ? 'bg-brand-300' : c.warn ? 'bg-red-300' : 'bg-ink-200')}>
                  {c.ok ? <Check size={13} /> : c.warn ? <span className="text-[11px] font-bold">!</span> : <span className="text-[11px]">-</span>}
                </span>
                <div className="min-w-0">
                  <p className={cx('text-[13px] font-semibold', c.ok === null ? 'text-ink-400' : 'text-ink-900')}>{c.no} {c.label}</p>
                  <p className={cx('text-xs', c.warn ? 'text-red-500' : 'text-ink-500')}>{c.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="m-3"><PaperSignNote /></div>
          <div className="m-3 rounded-xl bg-ink-50 p-3 text-xs leading-relaxed text-ink-500">
            <p className="font-semibold text-ink-700">간인이 뭔가요?</p>
            <p className="mt-1">2장 이상일 때 페이지가 이어진다는 표시로 종이 사이에 도장을 걸쳐 찍는 거예요. 전자소송으로 내면 간인은 필요 없습니다.</p>
          </div>

          <div className="m-3 rounded-xl border border-ink-200 p-3.5">
            <p className="text-[13px] font-bold text-ink-900">제출 전에 이것만 확인하세요</p>
            <div className="mt-2.5 space-y-3 text-xs leading-relaxed text-ink-600">
              {[
                ['기명날인 — 종이로 낼 때', '출력한 소장 말미 「(인)」 자리에 서명하거나 도장을 찍고, 2장 이상이면 간인하세요. 전자소송은 제출할 때 공동인증서 전자서명으로 갈음합니다.'],
                ['부본 — 피고 수만큼 더', `법원 제출용 원본 1부 + 피고${form.dName ? ` ${form.dName}` : ''}에게 보낼 부본 1부, 모두 2부를 준비하세요. 부본에는 주민등록번호 뒷자리를 가립니다.`],
                ['인지대·송달료 납부', `접수 전에 ${won(costSummary(effectiveSueValue(form), partyCount(form)).total)}원을 납부하고 영수증을 함께 냅니다.`],
              ].map(([title, body], i) => (
                <div key={title} className="flex gap-2">
                  <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md bg-brand-50 text-[11px] font-bold text-brand-500">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink-800">{title}</span>
                    <span className="block">{body}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ══════════════════════ 소장 고유 계산 박스 ══════════════════════ */

function AiReviewNote() {
  return (
    <div className="rounded-2xl bg-ink-900 p-4 text-white">
      <p className="flex items-center gap-2 text-sm font-bold"><Sparkles size={16} /> 답변이 끝나면 AI가 소장을 완성해요</p>
      <div className="mt-3 grid gap-2 text-[12px] leading-relaxed text-ink-200 sm:grid-cols-2">
        <p>✓ 사용자 표현을 원고·피고 중심 문장으로 변경</p>
        <p>✓ 청구원인을 사건 순서대로 문단 구성</p>
        <p>✓ 청구취지와 지연손해금 문구 작성</p>
        <p>✓ 증거 파일을 갑 제1호증부터 정리</p>
      </div>
      <p className="mt-3 border-t border-white/10 pt-3 text-[11px] leading-relaxed text-ink-300">AI가 새로운 사실을 만들어 넣지는 않습니다. 마지막 화면에서 금액·날짜·사실관계를 직접 확인해 주세요.</p>
    </div>
  )
}

function VenueGuide() {
  const rows = [
    ['기본', '상대방(피고)이 사는 곳의 법원'],
    ['돈을 청구할 때', '내가 사는 곳의 법원도 가능 (의무이행지)'],
    ['부동산 사건', '그 건물이 있는 곳의 법원만 가능'],
  ]
  return (
    <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-600"><Lightbulb size={15} /> 어느 법원에 내야 하나요?</p>
      <div className="mt-2 space-y-1.5">
        {rows.map(([k, v]) => (
          <p key={k} className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="rounded-md bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-600">{k}</span>
            <span className="text-brand-600">{v}</span>
          </p>
        ))}
      </div>
    </div>
  )
}

function CostBox({ form }) {
  // 인지대는 청구금액이 아니라 '소가'로 계산한다.
  // 비재산권상 청구·소가 산출 불가면 인지규칙 제18조의2에 따라 5천만원으로 본다.
  const sue = effectiveSueValue(form)
  const deemed = sue !== (Number(form.amount) || 0)
  const parties = partyCount(form)
  const { stamp, service, total, small, estimate } = costSummary(sue, parties)
  const rows = [
    ['소송목적의 값 (소가)', sue ? `${won(sue)}원` : '-', deemed ? '인지규칙 제18조의2' : null],
    ['인지대', `${won(stamp)}원`, '민사소송등인지법 제2조'],
    [`송달료 (당사자 ${parties}명)`, `${won(service)}원`, estimate ? '추정' : null],
  ]
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-ink-600">청구 금액을 넣으면 자동으로 계산돼요</p>
        {small && <Badge tone="green">소액사건</Badge>}
      </div>
      <div className="mt-3 space-y-2">
        {rows.map(([k, v, tag]) => (
          <div key={k} className="flex items-center justify-between border-b border-ink-100 pb-2 text-[13px]">
            <span className="flex items-center gap-1.5 text-ink-500">
              {k}
              {tag === '추정' && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-500">추정</span>}
              {tag && tag !== '추정' && <span className="text-[11px] text-ink-400">{tag}</span>}
            </span>
            <span className="font-medium text-ink-800">{v}</span>
          </div>
        ))}
        <div className="flex justify-between pt-1 text-sm">
          <span className="font-bold text-ink-900">접수할 때 낼 돈 (예상)</span>
          <span className="font-bold text-brand-400">약 {won(total)}원</span>
        </div>
      </div>

      {/* 이 서비스는 결제를 받지 않는다 — 오해 방지 */}
      <div className="mt-3">
        <Note tone="lock">
          <b className="font-semibold">이 금액은 참고용 계산이고, 나홀로법에서 결제하지 않습니다.</b> 실제 납부는 법원 또는
          전자소송포털에서 직접 하며, 접수 시점의 기준에 따라 금액이 달라질 수 있어요.
          {estimate && ' 특히 송달료는 사건 종류별 예납 회차와 우편요금에 따라 바뀌므로 접수 전에 꼭 확인하세요.'}
        </Note>
      </div>

      {small && <div className="mt-3"><Note tone="ok">3,000만원 이하라 소액사건으로 진행돼요. 재판이 원칙적으로 한 번에 끝나고 절차도 간단합니다.</Note></div>}
    </div>
  )
}

/** 왼쪽에 늘 붙는 소장 작성 원칙 — 본문에 흩어 두면 입력 흐름을 끊는다 */
const COMPLAINT_RULES = [
  ['판례보다', '실제로 있었던 일과 이를 보여주는 자료가 중요합니다.'],
  ['AI는', '답변 밖의 사실을 덧붙이지 않고, 입력한 내용을 소장 형식으로만 정리해요.'],
  ['날짜와 금액은', '기억에 의존하지 말고 계약서·이체내역을 보고 적어 주세요.'],
  ['마지막 화면에서', '금액·날짜·사실관계를 직접 확인한 뒤 내세요.'],
]

function makeComplaintExtras(type) {
  return function complaintExtras(f, form, setField) {
  // 체크는 했는데 파일을 안 올린 자료를 짚어준다.
  // 체크만으로는 갑호증이 되지 않으므로, 이 안내가 없으면 사용자가 착각한다.
  if (f.kind === 'evidenceGap') {
    const checked = form.evidenceItems || []
    if (checked.length === 0) return null
    const missing = missingItems(checked, form.evidenceFiles)
    if (missing.length === 0) {
      return <Note tone="ok">체크하신 자료를 모두 올리셨어요. 올린 순서대로 갑 제1호증부터 번호가 매겨집니다.</Note>
    }
    return (
      <Note tone="warn">
        체크하신 자료 중 <b className="font-semibold">{missing.join(', ')}</b>이(가) 아직 파일로 올라오지 않았어요.
        <b className="font-semibold"> 파일을 올려야 갑호증이 됩니다.</b> 지금 없다면 나중에 증거목록에서 &lsquo;미제출&rsquo;로 관리할 수 있어요.
      </Note>
    )
  }

  switch (f.kind) {
    case 'aiReview':
      return <AiReviewNote />
    case 'venue':
      return <VenueGuide />
    case 'cost':
      return <CostBox form={form} />
    case 'partyTag':
      return (
        <div className="flex items-center gap-2 pt-1">
          <span className={cx('rounded-lg px-2.5 py-1 text-xs font-bold text-white', f.tone === 'brand' ? 'bg-brand-300' : 'bg-ink-700')}>{f.tag}</span>
          <span className="text-sm text-ink-500">{f.desc}</span>
        </div>
      )
    case 'remain': {
      if (!form.loanAmount) return null
      const remain = Math.max(0, (Number(form.loanAmount) || 0) - (Number(form.repaidAmount) || 0))
      // 1단계에 적은 청구금액(소가)과 어긋나면 짚어 준다.
      // 받은 돈을 빼지 않고 청구하면 인지대를 더 내고 그만큼 기각된다.
      const claimed = Number(form.amount) || 0
      const off = claimed > 0 && remain > 0 && claimed !== remain
      return (
        <div className="space-y-2">
          <div className="flex justify-between rounded-xl bg-ink-50 px-4 py-3 text-sm">
            <span className="text-ink-600">남은 청구액</span>
            <span className="font-bold text-brand-400">{won(remain)}원</span>
          </div>
          {off && (
            <Note tone="warn">
              1단계에 적은 청구금액은 <b className="font-semibold">{won(claimed)}원</b>인데, 받은 돈을 빼면{' '}
              <b className="font-semibold">{won(remain)}원</b>이에요.
              {claimed > remain
                ? ' 받은 돈을 빼지 않고 청구하면 그만큼 기각되고, 인지대도 더 냅니다.'
                : ' 청구금액이 남은 금액보다 적어요.'}
              {' '}1단계로 돌아가 금액을 맞춰 주세요.
            </Note>
          )}
        </div>
      )
    }
    case 'sum': {
      const sum = f.keys.reduce((a, k) => a + (Number(form[k]) || 0), 0)
      const target = Number(form[f.compare]) || 0
      return (
        <div className="rounded-xl bg-ink-50 px-4 py-3">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-ink-700">{f.label}</span>
            <span className="font-bold text-brand-400">{won(sum)}원</span>
          </div>
          {target > 0 && sum > 0 && sum !== target && (
            <p className="mt-1.5 text-xs text-red-500">청구 금액({won(target)}원)과 {won(Math.abs(target - sum))}원 차이가 있어요. 확인해 주세요.</p>
          )}
        </div>
      )
    }
    case 'evictCalc': {
      const rent = Number(form.rent) || 0
      const months = Number(form.unpaidMonths) || 0
      if (!rent || !months) return null
      const need = form.leaseKind === '상가' ? 3 : 2
      const { stamp } = costSummary(effectiveSueValue(form))
      return (
        <div className="rounded-xl border border-ink-200 bg-white p-4">
          <p className="text-[13px] font-medium text-ink-600">자동 계산</p>
          <div className="mt-3 space-y-2 text-[13px]">
            <div className="flex justify-between border-b border-ink-100 pb-2">
              <span className="text-ink-500">총 미납액 ({won(rent)} × {months})</span>
              <span className="font-medium text-ink-800">{won(rent * months)}원</span>
            </div>
            <div className="flex justify-between border-b border-ink-100 pb-2">
              <span className="text-ink-500">소송목적의 값</span>
              <span className="font-medium text-ink-800">{form.amount ? `${won(form.amount)}원` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">인지대</span>
              <span className="font-medium text-ink-800">{won(stamp)}원</span>
            </div>
          </div>
          <div className="mt-3">
            {months >= need
              ? <Note tone="ok">{form.leaseKind === '상가' ? '상가는 3기' : '주택은 2기(2개월분)'} 이상 밀리면 계약을 해지할 수 있어요. 현재 {months}개월 연체로 요건을 충족합니다.</Note>
              : <Note tone="warn">{form.leaseKind === '상가' ? '상가는 3기' : '주택은 2기'} 이상 연체해야 해지 사유가 돼요. 현재 {months}개월이라 요건이 부족합니다.</Note>}
          </div>
        </div>
      )
    }
    default:
      return null
  }
  }
}

/* ══════════════════════ 작성 화면 ══════════════════════ */

function CaseLinkScreen({ typeKey, form, onBack, onDone }) {
  const toast = useToast()
  const type = findType(typeKey)
  const { rawCases, saveCase, setActiveCaseId } = useWorkspace()
  const [mode, setMode] = useState('new')
  const [pickedCaseId, setPickedCaseId] = useState(rawCases[0]?.id || '')
  const [title, setTitle] = useState(`${type?.title || '소장'}${form.dName ? ` · ${form.dName}` : ''}`)

  const finish = (saved, message) => {
    if (!saved) {
      toast('사건 저장에 실패했습니다. 브라우저 저장공간을 확인해 주세요', 'error')
      return
    }
    setActiveCaseId(saved.id)
    toast(message, 'success')
    onDone()
  }

  const saveNew = () => finish(
    saveCase(typeKey, form, null, title),
    '완성된 소장을 새 사건에 저장했습니다',
  )

  const saveExisting = () => {
    const picked = rawCases.find((item) => item.id === pickedCaseId)
    if (!picked) return
    finish(saveCase(typeKey, form, picked.id), `「${caseTitle(picked)}」 사건에 소장을 연결했습니다`)
  }

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <button type="button" onClick={onBack} className="mb-5 text-sm font-semibold text-ink-500 hover:text-ink-800">
        ← 답변 화면으로 돌아가기
      </button>

      <div className="text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-400"><Check size={24} /></span>
        <h1 className="mt-4 text-2xl font-bold text-ink-900">소장이 완성됐어요</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">사건에 저장하면 이후 증거·일정·준비서면을 이 소장과 함께 관리할 수 있어요.</p>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode('new')}
          className={cx(
            'rounded-2xl border p-5 text-left transition-colors',
            mode === 'new' ? 'border-brand-300 bg-brand-50' : 'border-ink-200 bg-white hover:border-ink-300',
          )}
        >
          <span className="flex items-center justify-between gap-3">
            <span className="text-base font-bold text-ink-900">새 사건으로 저장</span>
            <Badge tone="blue">추천</Badge>
          </span>
          <span className="mt-2 block text-[13px] leading-relaxed text-ink-500">처음 시작하는 소송이라면 새 사건을 만들어요.</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('existing')}
          disabled={!rawCases.length}
          className={cx(
            'rounded-2xl border p-5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
            mode === 'existing' ? 'border-brand-300 bg-brand-50' : 'border-ink-200 bg-white hover:border-ink-300',
          )}
        >
          <span className="text-base font-bold text-ink-900">기존 사건에 추가</span>
          <span className="mt-2 block text-[13px] leading-relaxed text-ink-500">이미 등록한 사건의 소장으로 연결해요.</span>
        </button>
      </div>

      <Card className="mt-4 p-5">
        {mode === 'new' ? (
          <label className="block">
            <span className="text-[13px] font-bold text-ink-800">사건 이름</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 대여금 반환 · 김민수"
              className="mt-2 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm text-ink-900 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100/60"
            />
            <span className="mt-2 block text-xs text-ink-400">내 사건 목록에서 알아보기 위한 이름이에요. 법원에 제출되지는 않아요.</span>
          </label>
        ) : (
          <div>
            <p className="text-[13px] font-bold text-ink-800">연결할 사건</p>
            <div className="mt-2 space-y-2">
              {rawCases.map((item) => (
                <label key={item.id} className={cx(
                  'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3',
                  pickedCaseId === item.id ? 'border-brand-300 bg-brand-50' : 'border-ink-200',
                )}>
                  <input
                    type="radio"
                    name="complaint-case"
                    checked={pickedCaseId === item.id}
                    onChange={() => setPickedCaseId(item.id)}
                    className="accent-brand-400"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink-900">{caseTitle(item)}</span>
                    <span className="block truncate text-xs text-ink-500">{[item.caseNo || '사건번호 없음', item.form?.court, item.status].filter(Boolean).join(' · ')}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onDone} className="text-sm font-semibold text-ink-500 underline underline-offset-4 hover:text-ink-800">
          나중에 사건에 저장하기
        </button>
        <Button
          disabled={mode === 'new' ? !title.trim() : !pickedCaseId}
          onClick={mode === 'new' ? saveNew : saveExisting}
        >
          {mode === 'new' ? '새 사건으로 저장' : '이 사건에 추가'} <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  )
}

export function Writer({ typeKey, form, setForm, caseId, deferCaseLink, onBack, onDone, initialStep = 0, captureMode = false }) {
  const toast = useToast()
  const type = findType(typeKey)
  const steps = allSteps(type)
  const [open, setOpen] = useState(initialStep)
  // 완성 흐름: null → 'generating'(작성 중 알림) → 'ready'(완성 알림) → 'full'(완성 페이지)
  const [phase, setPhase] = useState(null)
  const [savedAt, setSavedAt] = useState(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const firstRender = useRef(true)
  const { saveCase } = useWorkspace()
  // 새 소장은 완성되기 전까지 사건을 만들지 않는다. 기존 사건에서 연 소장만 그 사건에 자동 저장한다.
  const caseIdRef = useRef(caseId || null)

  // 알림 두 장을 순서대로 지나가게 한다. 화면을 떠나면 타이머도 함께 정리한다.
  useEffect(() => {
    if (phase !== 'generating' && phase !== 'ready') return undefined
    const next = phase === 'generating' ? 'ready' : 'full'
    const id = setTimeout(() => setPhase(next), phase === 'generating' ? 1600 : 1100)
    return () => clearTimeout(id)
  }, [phase])

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const extras = useMemo(() => makeComplaintExtras(type), [type])
  const percent = useMemo(() => completeness(type, form), [type, form])

  // 입력할 때마다 자동 저장 — 새로고침해도 이어서 쓸 수 있게.
  // 기존 사건에서 연 소장만 사건에도 저장한다. 새 소장은 우선 독립 초안으로 남긴다.
  useEffect(() => {
    if (captureMode) return undefined
    if (firstRender.current) { firstRender.current = false; return }
    const t = setTimeout(() => {
      const ok = saveDraft(typeKey, form)
      const saved = caseIdRef.current ? saveCase(typeKey, form, caseIdRef.current) : true
      if (saved?.id) caseIdRef.current = saved.id
      if (ok && saved) { setSavedAt(Date.now()); setSaveFailed(false) }
      else setSaveFailed(true)   // 저장소 한도 초과 등 — 조용히 넘기면 작업물을 잃는다
    }, 600)
    return () => clearTimeout(t)
  }, [captureMode, typeKey, form, saveCase])

  // 완성된 소장은 작성 화면을 덮는 창이 아니라 그 자리를 넘겨받는 페이지다
  if (phase === 'full') {
    return (
      <FullView
        type={type}
        form={form}
        onClose={() => setPhase(null)}
        onEdit={() => setPhase(null)}
        onSubmit={onDone}
        actionLabel={deferCaseLink ? '다음' : '전자소송 제출 안내'}
      />
    )
  }

  const stepsWithExtras = steps.map((s, i) => ({
    ...s,
    guided: false,
    badge: i >= 2 ? 'AI가 정리' : undefined,
    aiAssist: i >= 2,
    hint: i === 0 ? type.amountHint : undefined,
  }))

  return (
    <>
      <WizardShell
        title="소장 작성"
        badge={type.title}
        sub="중요한 날짜와 금액만 확인하고, 나머지는 평소 말로 답하세요. AI가 마지막에 소장으로 정리합니다."
        stage={1}
        stageLabels={['소장유형 선택 완료', '사건정보 입력', '완성된 소장 확인']}
        sideNote={(
          <>
            <TipCard title="소장은 이렇게 씁니다" items={COMPLAINT_RULES} />
            <TipCard title="파일에 대해" items={fileTipsFor(stepsWithExtras[open])} />
          </>
        )}
        steps={stepsWithExtras}
        open={open}
        setOpen={setOpen}
        form={form}
        setField={setField}
        renderExtra={extras}
        stepSummary={(i) => stepSummary(i, type, form)}
        percent={percent}
        showPreview={false}
        splitNavigation
        requireStepCompletion
        onBack={onBack}
        onSave={() => {
          if (saveDraft(typeKey, form)) { setSavedAt(Date.now()); toast('작성 중인 소장을 저장했습니다') }
          else toast('저장에 실패했습니다. 브라우저 저장소를 확인해 주세요', 'error')
        }}
        savedLabel={saveFailed ? '⚠ 자동저장 실패 — 브라우저 저장공간을 확인하세요' : savedAt ? `${savedAgo(savedAt)} 저장됨` : ''}
        onDone={() => setPhase('generating')}
        doneLabel="완성된 소장 보기"
      />
      {(phase === 'generating' || phase === 'ready') && <GenerateNotice done={phase === 'ready'} />}
    </>
  )
}

/* ══════════════════════ 컨테이너 ══════════════════════ */

export default function ComplaintWizard({ onExit, initialCase = null, deferCaseLink = !initialCase }) {
  const toast = useToast()
  const initialTypeKey = initialCase?.typeKey && findType(initialCase.typeKey) ? initialCase.typeKey : null
  const [phase, setPhase] = useState(initialTypeKey ? 'write' : 'type')
  const [typeKey, setTypeKey] = useState(initialTypeKey)
  const [diagFor, setDiagFor] = useState(null)
  const [form, setForm] = useState(() => initialTypeKey ? { ...emptyComplaint, ...(initialCase.form || {}) } : emptyComplaint)
  const [draft, setDraft] = useState(() => loadDraft())

  const start = (situation) => {
    setTypeKey(diagFor)
    setForm({ ...emptyComplaint, ...(initialCase?.form || {}), situation })
    setDiagFor(null)
    setPhase('write')
  }
  const resume = () => { setTypeKey(draft.typeKey); setForm(draft.form); setPhase('write') }
  const discard = () => { clearDraft(); setDraft(null); toast('저장된 초안을 지웠습니다') }

  if (phase === 'submit' && typeKey) {
    return (
      <SubmitGuide
        type={findType(typeKey)}
        form={form}
        onBack={() => setPhase('write')}
        onEditDoc={() => setPhase('write')}
      />
    )
  }

  if (phase === 'link' && typeKey) {
    return (
      <CaseLinkScreen
        typeKey={typeKey}
        form={form}
        onBack={() => setPhase('write')}
        onDone={() => { setPhase('submit'); toast('소장 제출 방법을 이어서 안내해 드릴게요', 'success') }}
      />
    )
  }

  if (phase === 'write' && typeKey) {
    return (
      <Writer
        typeKey={typeKey}
        form={form}
        setForm={setForm}
        caseId={initialCase?.id}
        deferCaseLink={deferCaseLink}
        onBack={() => {
          // 사건에서 시작한 소장은 사건 유형이 이미 정해져 있다.
          // 뒤로 갔을 때 다른 소장 유형을 다시 노출하지 않고 문서 홈으로 돌아간다.
          if (initialTypeKey) { onExit(); return }
          setDraft(loadDraft())
          setPhase('type')
          setTypeKey(null)
        }}
        onDone={() => {
          if (deferCaseLink && !initialCase?.id) setPhase('link')
          else {
            setPhase('submit')
            toast('소장 초안이 완성되었습니다. 제출 방법을 안내해 드릴게요', 'success')
          }
        }}
      />
    )
  }

  return (
    <>
      <PickList
        heading="어떤 유형의 소장을 작성할까요?"
        placeholder="찾으시려는 유형의 소장을 입력해주세요."
        items={complaintTypes}
        onPick={setDiagFor}
        onBack={onExit}
        footNote={'현재 지원하는 소장 유형은 계속 확대되고 있습니다.\n필요한 소장 유형을 순차적으로 추가해 나갈 예정입니다.'}
        banner={!initialCase && draft && (
          <Card className="mb-5 flex flex-wrap items-center gap-3 border-brand-200 bg-brand-50/50 p-4">
            <FileText size={18} className="text-brand-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink-900">작성하던 소장이 있어요 — {findType(draft.typeKey)?.title}</p>
              <p className="text-xs text-ink-500">{savedAgo(draft.savedAt)} 저장 · 이어서 쓰면 입력한 내용이 그대로 복원됩니다.</p>
            </div>
            <Button size="sm" onClick={resume}>이어서 쓰기</Button>
            <Button size="sm" variant="neutral" onClick={discard}>새로 시작</Button>
          </Card>
        )}
      />
      {diagFor && <DiagnosisModal typeKey={diagFor} onClose={() => setDiagFor(null)} onGo={start} />}
    </>
  )
}
