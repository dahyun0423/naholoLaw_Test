import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../context/ToastContext.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { Card, Button, Badge, Progress, cx } from './ui.jsx'
import Modal from './Modal.jsx'
import { Check, ArrowRight, FileText, Lightbulb, Scale, X } from './icons.jsx'
import {
  Rich, DocHeading, DocSignature, Note, PickList, WizardShell,
  printSheet,
} from './docform.jsx'
import SubmitGuide from './SubmitGuide.jsx'
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

export function ComplaintPaper({ doc, dense, signature }) {
  const today = fmtDate(new Date().toISOString().slice(0, 10))
  return (
    <div className={cx('font-serif leading-loose text-ink-800', dense ? 'text-[11px]' : 'text-[13px]')}>
      <p className="print-lg text-center text-xl font-bold tracking-[0.4em] text-ink-900">소　장</p>
      <p className="mt-6">사건명 : <b className="font-semibold text-brand-500">{doc.caseName}</b> 청구의 소</p>
      <p>
        소송목적의 값 : 금 {doc.sueValue ? <b className="font-semibold text-brand-500">{won(doc.sueValue)}원</b> : <span className="text-ink-300">[ 1단계에서 입력 ]</span>}
        {doc.sueValueDeemed && <span className="ml-1 text-[0.9em]">(민사소송 등 인지규칙 제18조의2)</span>}
      </p>

      <div className="mt-4 space-y-0.5">
        {doc.parties.map((l, i) => <p key={i} className="whitespace-pre-wrap"><Rich text={l} /></p>)}
      </div>

      <DocHeading>청 구 취 지</DocHeading>
      {doc.claims.map((c, i) => <p key={i}><Rich text={c} /></p>)}
      <p className="mt-1">라는 판결을 구합니다.</p>

      <DocHeading>청 구 원 인</DocHeading>
      {doc.reasons.map((r, i) => <p key={i} className="whitespace-pre-wrap"><Rich text={r} /></p>)}

      <DocHeading>입 증 방 법</DocHeading>
      {doc.evidences
        ? doc.evidences.map((e, i) => <p key={e + i}>{i + 1}. 갑 제{i + 1}호증　　<b className="font-semibold text-brand-500">{e}</b></p>)
        : <p className="text-ink-300">[ 6단계에서 증거를 고르면 갑 제1호증부터 자동으로 번호가 매겨집니다 ]</p>}

      <DocHeading>첨 부 서 류</DocHeading>
      {(doc.attachments || []).map((a, i) => <p key={i}>{i + 1}. {a}</p>)}

      <DocSignature date={today} name={doc.plaintiff} court={doc.court} signature={signature} />

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

/* ══════════════════════ 전체보기 ══════════════════════ */

function FullView({ type, form, onClose, onEdit }) {
  const toast = useToast()
  const doc = buildPreview(type, form)
  const checks = requiredChecklist(type, form)
  const okCount = checks.filter((c) => c.ok).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-ink-100 px-6 py-4">
          <h3 className="text-lg font-bold text-ink-900">소장 전체보기</h3>
          <Badge tone="blue">{type.title}</Badge>
          <Badge tone="gray">전 2면</Badge>
          <div className="ml-auto flex gap-2">
            <span className="hidden text-xs text-ink-400 xl:inline">종이 제출용 완성본 · 전자소송은 내용을 붙여넣습니다</span>
            <Button variant="neutral" size="sm" onClick={onEdit}>수정하기</Button>
            <Button size="sm" onClick={printSheet}>PDF 저장 · 인쇄</Button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100"><X size={20} /></button>
          </div>
        </div>

        <div className="grid flex-1 gap-4 overflow-y-auto bg-ink-50 p-6 lg:grid-cols-[1fr_1fr_320px]">
          <div className="rounded-xl border border-ink-200 bg-white p-6">
            <ComplaintPaper doc={{ ...doc, evidences: null }} dense signature={form.signature} />
            <p className="mt-6 text-center text-[11px] text-ink-400">- 1 -</p>
          </div>
          <div className="rounded-xl border border-ink-200 bg-white p-6">
            <div className="font-serif text-[11px] leading-loose text-ink-800">
              <DocHeading>청 구 원 인</DocHeading>
              {doc.reasons.map((r, i) => <p key={i} className="whitespace-pre-wrap"><Rich text={r} /></p>)}
              <DocHeading>입 증 방 법</DocHeading>
              {doc.evidences
                ? doc.evidences.map((e, i) => <p key={e + i}>{i + 1}. 갑 제{i + 1}호증　　<b className="font-semibold text-brand-500">{e}</b></p>)
                : <p className="text-ink-300">[ 6단계에서 증거를 골라 주세요 ]</p>}
              <DocHeading>첨 부 서 류</DocHeading>
              {(doc.attachments || []).map((a, i) => <p key={i}>{i + 1}. {a}</p>)}
            </div>
            <p className="mt-6 text-center text-[11px] text-ink-400">- 2 -</p>
          </div>

          <div className="rounded-xl border border-ink-200 bg-white">
            <div className="flex items-center justify-between px-4 pt-4">
              <h4 className="font-bold text-ink-900">소장 필수 기재사항</h4>
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

            <div className="m-3 rounded-xl bg-red-50 p-3 text-xs leading-relaxed text-red-500">
              <p className="font-semibold">간인이 뭔가요?</p>
              <p className="mt-1">2장 이상일 때 페이지가 이어진다는 표시로 종이 사이에 도장을 걸쳐 찍는 거예요. 전자소송으로 내면 간인은 필요 없습니다.</p>
            </div>

            <div className="m-3 rounded-xl border border-ink-200 p-3">
              <p className="text-[13px] font-bold text-ink-900">제출 전에 이것만 확인하세요</p>
              <div className="mt-2 space-y-2.5 text-xs leading-relaxed text-ink-600">
                <div>
                  <p className="font-semibold text-ink-800">① 서명</p>
                  <p>
                    {form.signature
                      ? '올리신 서명이 제출본에 인쇄됩니다. 전자소송이면 이 PDF를 그대로 올리면 돼요.'
                      : '6단계에서 서명 이미지를 올리거나, 출력한 소장에 자필 서명·도장을 찍으세요.'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-ink-800">② 부본 — 피고 수만큼 더</p>
                  <p>법원 제출용 원본 1부 + 피고{form.dName ? ` ${form.dName}` : ''}에게 보낼 부본 1부, 모두 2부를 준비하세요. 부본에는 주민등록번호 뒷자리를 가립니다.</p>
                </div>
                <div>
                  <p className="font-semibold text-ink-800">③ 인지대·송달료 납부</p>
                  <p>접수 전에 {won(costSummary(effectiveSueValue(form), partyCount(form)).total)}원을 납부하고 영수증을 함께 냅니다.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════ 소장 고유 계산 박스 ══════════════════════ */

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

function makeComplaintExtras(type) {
  return function complaintExtras(f, form, setField) {
  // 체크는 했는데 파일을 안 올린 자료를 짚어준다.
  // 체크만으로는 갑호증이 되지 않으므로, 이 안내가 없으면 사용자가 착각한다.
  if (f.kind === 'evidenceGap') {
    const checked = form.evidenceItems || []
    if (checked.length === 0) return null
    const uploaded = (form.evidenceFiles || []).map((x) => x.name)
    const missing = checked.filter((c) => !uploaded.some((u) => u.includes(c) || c.includes(u)))
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
      const remain = (Number(form.loanAmount) || 0) - (Number(form.repaidAmount) || 0)
      return (
        <div className="flex justify-between rounded-xl bg-ink-50 px-4 py-3 text-sm">
          <span className="text-ink-600">남은 청구액</span>
          <span className="font-bold text-brand-400">{won(Math.max(0, remain))}원</span>
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

function Writer({ typeKey, form, setForm, caseId, onBack, onDone }) {
  const toast = useToast()
  const type = findType(typeKey)
  const steps = allSteps(type)
  const [open, setOpen] = useState(0)
  const [full, setFull] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const firstRender = useRef(true)
  // 사건은 소장 초안과 같은 것이다. 한 번 만들어진 사건 id를 계속 물고 간다.
  const { saveCase, activeCaseId } = useWorkspace()
  // 사건이 이미 있으면 그 사건의 소장이다. null로 두면 새 사건이 또 하나 생겨
  // 같은 분쟁이 둘로 쪼개진다.
  const caseIdRef = useRef(caseId || activeCaseId)

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const extras = useMemo(() => makeComplaintExtras(type), [type])
  const percent = useMemo(() => completeness(type, form), [type, form])
  const doc = useMemo(() => buildPreview(type, form), [type, form])

  // 입력할 때마다 자동 저장 — 새로고침해도 이어서 쓸 수 있게.
  // 동시에 '사건'으로도 저장한다. 그래야 절차 안내·증빙 자료·일정이 같은 사건을 본다.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    const t = setTimeout(() => {
      const ok = saveDraft(typeKey, form)
      const saved = saveCase(typeKey, form, caseIdRef.current)
      if (saved) caseIdRef.current = saved.id
      if (ok && saved) { setSavedAt(Date.now()); setSaveFailed(false) }
      else setSaveFailed(true)   // 저장소 한도 초과 등 — 조용히 넘기면 작업물을 잃는다
    }, 600)
    return () => clearTimeout(t)
  }, [typeKey, form, saveCase])

  const stepsWithExtras = steps.map((s, i) => ({
    ...s,
    badge: i >= 2 ? type.short : undefined,
    hint: i === 0 ? type.amountHint : undefined,
    // 소장에는 판례를 인용하지 않는다. 담아 둔 판례는 준비서면에서 쓰인다.
    append: i === steps.length - 1 ? (
      <div className="mt-5 flex items-start gap-2 rounded-xl bg-ink-50 p-3 text-[13px] leading-relaxed text-ink-600">
        <Scale size={16} className="mt-0.5 shrink-0 text-brand-400" />
        <span className="flex-1">
          소장에는 판례를 넣지 않습니다. 소장은 <b className="text-ink-800">무슨 일이 있었는지</b>를 밝히는 문서라
          사실과 증거로 씁니다. 법리 다툼은 상대방 답변서를 받은 뒤 <b className="text-ink-800">준비서면</b>에서 벌어져요.
          미리 찾아 두고 싶다면 판례 검색에서 <b className="text-ink-800">[내 문서에 인용]</b>으로 담아 두세요 —
          준비서면을 쓸 때 그 목록이 뜹니다.
        </span>
        <Link to="/app/search" className="shrink-0 font-semibold text-brand-400">판례 검색 →</Link>
      </div>
    ) : null,
  }))

  return (
    <>
      <WizardShell
        title="소장 작성"
        badge={type.title}
        sub="왼쪽에 입력하는 내용이 오른쪽 소장에 바로 반영됩니다."
        stage={1}
        steps={stepsWithExtras}
        open={open}
        setOpen={setOpen}
        form={form}
        setField={setField}
        renderExtra={extras}
        stepSummary={(i) => stepSummary(i, type, form)}
        percent={percent}
        previewTitle="소장 미리보기"
        preview={<ComplaintPaper doc={doc} signature={form.signature} />}
        printable={<ComplaintPaper doc={doc} signature={form.signature} />}
        onBack={onBack}
        onSave={() => {
          if (saveDraft(typeKey, form)) { setSavedAt(Date.now()); toast('작성 중인 소장을 저장했습니다') }
          else toast('저장에 실패했습니다. 브라우저 저장소를 확인해 주세요', 'error')
        }}
        savedLabel={saveFailed ? '⚠ 자동저장 실패 — 브라우저 저장공간을 확인하세요' : savedAt ? `${savedAgo(savedAt)} 저장됨` : ''}
        onDone={onDone}
        doneLabel="소장 완성하기"
        onFull={() => setFull(true)}
      />
      {full && <FullView type={type} form={form} onClose={() => setFull(false)} onEdit={() => setFull(false)} />}
    </>
  )
}

/* ══════════════════════ 컨테이너 ══════════════════════ */

export default function ComplaintWizard({ onExit, initialCase = null }) {
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

  if (phase === 'write' && typeKey) {
    return (
      <Writer
        typeKey={typeKey}
        form={form}
        setForm={setForm}
        caseId={initialCase?.id}
        onBack={() => { setDraft(loadDraft()); setPhase('type'); setTypeKey(null) }}
        onDone={() => { setPhase('submit'); toast('소장 초안이 완성되었습니다. 제출 방법을 안내해 드릴게요', 'success') }}
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
