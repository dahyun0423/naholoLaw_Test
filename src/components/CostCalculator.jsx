// 소송비용 계산기.
//
// 소장을 내기 전에 실제로 궁금한 것은 셋이다.
//   · 지금 통장에서 얼마가 나가나 (인지액 + 송달료)
//   · 전자소송으로 내면 얼마나 아끼나 (인지법 제16조 — 10분의 9)
//   · 이기면 상대에게 얼마까지 물릴 수 있나 (변호사보수 산입액)
//
// 청구금액만 받아 인지대를 보여주던 예전 화면은 첫 번째 질문에도 제대로 답하지
// 못했다. 송달료는 당사자 수와 사건 종류로 정해지는데 둘 다 묻지 않았기 때문이다.

import { useMemo, useState } from 'react'
import { Badge, Button, cx, inputCls } from './ui.jsx'
import Modal from './Modal.jsx'
import { won } from '../lib/complaint.js'
import {
  CASE_KINDS, STAGES, ATTORNEY_HALVED, ROUND_FEE,
  litigationCost, suggestCaseKind, caseKindOf,
} from '../lib/litigationCost.js'
import { AlertTriangle, ExternalLink } from './icons.jsx'

const label = 'mb-1.5 block text-sm font-medium text-ink-700'
const hint = 'mt-1 block text-xs text-ink-400'

const Money = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <input
      className={cx(inputCls, 'pr-10 tabular-nums')}
      inputMode="numeric"
      placeholder={placeholder}
      value={value ? Number(value).toLocaleString('ko-KR') : ''}
      onChange={(event) => onChange(event.target.value.replace(/[^0-9]/g, ''))}
    />
    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-400">원</span>
  </div>
)

const Row = ({ name, note, value, strong, tone }) => (
  <div className="flex items-start justify-between gap-3 text-sm">
    <span className="min-w-0">
      <span className={strong ? 'font-semibold text-ink-800' : 'text-ink-600'}>{name}</span>
      {note && <span className="mt-0.5 block text-xs leading-snug text-ink-400">{note}</span>}
    </span>
    <span className={cx('shrink-0 tabular-nums', strong ? 'text-[16px] font-bold' : 'font-semibold', tone === 'brand' ? 'text-brand-500' : 'text-ink-800')}>
      {won(value)}원
    </span>
  </div>
)

export default function CostCalculator({ open, onClose, initialAmount = '' }) {
  const [form, setForm] = useState(() => ({
    amount: initialAmount,
    stage: 'first',
    caseKind: suggestCaseKind(initialAmount),
    electronic: true,
    plaintiffs: 1,
    defendants: 1,
    roundFee: ROUND_FEE,
    withAttorney: false,
    attorneyPaid: '',
    attorneyReduce: 'none',
  }))
  const set = (fields) => setForm((current) => ({ ...current, ...fields }))

  // 금액을 바꾸면 사건 종류를 다시 짐작해 준다. 사용자가 직접 고른 뒤에는 건드리지 않는다.
  const [kindTouched, setKindTouched] = useState(false)
  const onAmount = (amount) => set({
    amount,
    ...(kindTouched ? {} : { caseKind: suggestCaseKind(amount) }),
  })

  const sueValue = Number(form.amount) || 0
  const cost = useMemo(() => litigationCost({
    sueValue,
    stage: form.stage,
    electronic: form.electronic,
    caseKind: form.caseKind,
    plaintiffs: form.plaintiffs,
    defendants: form.defendants,
    roundFee: form.roundFee,
    withAttorney: form.withAttorney,
    attorneyPaid: Number(form.attorneyPaid) || 0,
    attorneyReduce: form.attorneyReduce,
  }), [sueValue, form])

  const kind = caseKindOf(form.caseKind)

  return (
    <Modal
      open={open} onClose={onClose} maxW="max-w-[640px]"
      title="소송 비용 계산기"
      sub="청구금액·당사자 수·제출 방법을 넣으면 실제로 낼 금액을 계산합니다."
      footer={<Button onClick={onClose}>확인</Button>}
    >
      <div className="space-y-5">
        <label className="block">
          <span className={label}>청구 금액 (소송목적의 값)</span>
          <Money value={form.amount} onChange={onAmount} placeholder="10,000,000" />
          <span className={hint}>
            원금에 이자·지연손해금을 더하지 않은 금액입니다. 소가는 민사소송법 제26조에 따라 정합니다.
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={label}>사건 종류</span>
            <select
              value={form.caseKind}
              onChange={(event) => { setKindTouched(true); set({ caseKind: event.target.value }) }}
              className={inputCls}
            >
              {CASE_KINDS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
            <span className={hint}>{kind.hint}</span>
          </label>

          <label className="block">
            <span className={label}>심급</span>
            <select value={form.stage} onChange={(event) => set({ stage: event.target.value })} className={inputCls}>
              {STAGES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
            <span className={hint}>항소장은 1.5배, 상고장은 2배 (인지법 제3조)</span>
          </label>
        </div>

        <div>
          <span className={label}>당사자 수</span>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2.5">
              <span className="w-10 shrink-0 text-sm text-ink-600">원고</span>
              <input type="number" min="1" max="20" value={form.plaintiffs} onChange={(event) => set({ plaintiffs: Number(event.target.value) })} className={cx(inputCls, 'tabular-nums')} />
              <span className="shrink-0 text-sm text-ink-500">명</span>
            </label>
            <label className="flex items-center gap-2.5">
              <span className="w-10 shrink-0 text-sm text-ink-600">피고</span>
              <input type="number" min="1" max="20" value={form.defendants} onChange={(event) => set({ defendants: Number(event.target.value) })} className={cx(inputCls, 'tabular-nums')} />
              <span className="shrink-0 text-sm text-ink-500">명</span>
            </label>
          </div>
          <span className={hint}>송달료는 원고·피고를 합한 인원수로 계산합니다. 인지액은 인원수와 무관합니다.</span>
        </div>

        <label className={cx('flex cursor-pointer items-start gap-2.5 rounded-xl border p-3.5 transition-colors', form.electronic ? 'border-brand-300 bg-brand-50' : 'border-ink-200')}>
          <input type="checkbox" checked={form.electronic} onChange={(event) => set({ electronic: event.target.checked })} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-300" />
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-ink-800">전자소송으로 제출</span>
            <span className="mt-0.5 block text-xs leading-snug text-ink-500">
              전자문서로 내면 인지액이 <b className="font-semibold">10분의 9</b>로 줄어듭니다 (민사소송 등 인지법 제16조).
              {cost.stamp.saved > 0 && <> 지금 조건에서 <b className="font-semibold text-brand-600">{won(cost.stamp.saved)}원</b> 절약됩니다.</>}
            </span>
          </span>
        </label>

        {/* ── 지금 낼 돈 ── */}
        <div className="space-y-2.5 rounded-xl bg-brand-50 p-4">
          <p className="text-[13px] font-bold text-ink-800">지금 낼 돈</p>
          <Row
            name="인지액"
            note={`민사소송 등 인지법 제2조${form.stage !== 'first' ? ` · ${STAGES.find((s) => s.key === form.stage).label} ${STAGES.find((s) => s.key === form.stage).multiplier}배` : ''}${form.electronic ? ' · 전자소송 10분의 9' : ''}`}
            value={cost.stamp.value}
          />
          <Row
            name={<>송달료 <Badge tone="red">추정</Badge></>}
            note={`${cost.service.parties}명 × ${cost.service.rounds}회분 × ${won(cost.service.roundFee)}원`}
            value={cost.service.value}
          />
          <div className="border-t border-brand-200 pt-2.5">
            <Row name="합계" value={cost.payNow} strong tone="brand" />
          </div>
          {cost.refund > 0 && (
            <p className="text-xs leading-relaxed text-ink-500">
              소를 취하하거나 조정·화해가 성립하면 인지액의 절반인 <b className="font-semibold text-ink-700">{won(cost.refund)}원</b>을
              돌려받을 수 있습니다 (같은 법 제14조).
            </p>
          )}
          {cost.small && <p className="text-xs font-medium text-brand-600">✓ 소가 3,000만원 이하 — 소액사건으로 간이 절차가 적용됩니다 (소액사건심판규칙 제1조의2).</p>}
          {cost.panel && <p className="text-xs font-medium text-brand-600">✓ 소가 5억원 초과 — 지방법원 합의부 사건입니다 (사물관할규칙 제2조).</p>}
        </div>

        {/* ── 변호사보수 ── */}
        <div className="rounded-xl border border-ink-200 p-4">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input type="checkbox" checked={form.withAttorney} onChange={(event) => set({ withAttorney: event.target.checked })} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-300" />
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-ink-800">변호사보수 인정액도 계산</span>
              <span className="mt-0.5 block text-xs leading-snug text-ink-500">
                이기면 패소자에게 물릴 수 있는 변호사보수의 한도입니다. <b className="font-semibold">지금 내는 돈이 아닙니다.</b>
              </span>
            </span>
          </label>

          {form.withAttorney && (
            <div className="mt-3.5 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={label}>실제 지급한 보수 (선택)</span>
                  <Money value={form.attorneyPaid} onChange={(attorneyPaid) => set({ attorneyPaid })} placeholder="3,300,000" />
                  <span className={hint}>실제 지급액을 넘겨 산입할 수 없습니다 (규칙 제3조 제1항).</span>
                </label>
                <label className="block">
                  <span className={label}>감액 사유</span>
                  <select value={form.attorneyReduce} onChange={(event) => set({ attorneyReduce: event.target.value })} className={inputCls}>
                    {ATTORNEY_HALVED.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                  </select>
                  <span className={hint}>해당하면 별표 금액의 1/2만 산입됩니다.</span>
                </label>
              </div>

              <div className="space-y-2 rounded-xl bg-ink-50 p-3.5">
                <Row name="별표 기준액" note="변호사보수의 소송비용 산입에 관한 규칙 [별표]" value={cost.attorney.table} />
                {cost.attorney.halved && <p className="text-xs text-ink-500">→ {cost.attorney.halvedBasis}에 따라 1/2로 줄었습니다.</p>}
                {cost.attorney.cappedByPaid && <p className="text-xs text-ink-500">→ 실제 지급한 보수액이 더 적어 그 금액까지만 산입됩니다.</p>}
                <div className="border-t border-ink-200 pt-2">
                  <Row name="소송비용 산입액" value={cost.attorney.value} strong />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-xl bg-ink-50 p-3.5">
          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-500">
            <AlertTriangle size={12} className="mt-0.5 shrink-0 text-red-400" />
            <span>
              <b className="font-semibold text-ink-700">송달료는 추정값입니다.</b> 사건 종류별 예납 회차([별표 1])와 1회 단가는
              우편요금에 연동돼 개정될 때마다 바뀌는데, 별표가 첨부파일이라 대조하지 못했습니다.
              접수 전에 반드시 확인하세요.
            </span>
          </p>
          <p className="text-[11px] leading-relaxed text-ink-500">
            참고용 계산이며 나홀로법에에서 결제하지 않습니다. 실제 납부는 법원 또는 전자소송포털에서 합니다.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-brand-600">
            <a href="https://ecfs.scourt.go.kr/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">전자소송포털 <ExternalLink size={11} /></a>
            <a href="https://www.law.go.kr/법령/민사소송등인지법" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">민사소송 등 인지법 <ExternalLink size={11} /></a>
            <a href="https://www.law.go.kr/법령/변호사보수의소송비용산입에관한규칙" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">변호사보수 산입 규칙 <ExternalLink size={11} /></a>
          </div>
        </div>
      </div>
    </Modal>
  )
}
