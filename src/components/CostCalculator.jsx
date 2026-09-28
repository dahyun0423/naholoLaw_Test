// sololaw.site/document의 계산기 흐름을 기준으로 맞춘 소송비용 계산기.
// 계산은 앱의 로컬 계산식을 사용하고, 하단 고지는 Figma 2721:80043을 따른다.

import { useMemo, useState } from 'react'
import { Button, Dropdown, cx } from './ui.jsx'
import Modal from './Modal.jsx'
import { won } from '../lib/complaint.js'
import { STAGES, ROUND_FEE, litigationCost } from '../lib/litigationCost.js'
import { ExternalLink } from './icons.jsx'

const CASE_OPTIONS = [
  { value: 'single', label: '단독사건', hint: '소가 3,000만원 초과 5억원 이하' },
  { value: 'panel', label: '합의사건', hint: '소가 5억원 초과' },
]

const STAGE_OPTIONS = STAGES.map((stage) => ({
  value: stage.key,
  label: stage.label,
  hint: stage.key === 'first'
    ? '항소장은 1.5배, 상고장은 2배 (인지법 제3조)'
    : `${stage.label}은 ${stage.multiplier}배 (인지법 제3조)`,
}))

const formatCost = (value) => `${won(value)}원`

const ResultRow = ({ label, value, total = false }) => (
  <div className={cx('flex items-center justify-between', total ? 'border-t border-ink-200 pt-3' : 'text-sm')}>
    <span className={total ? 'text-sm font-bold text-ink-900' : 'text-ink-600'}>{label}</span>
    <span className={cx('tabular-nums', total ? 'text-lg font-bold text-brand-500' : 'font-semibold text-ink-900')}>{value}</span>
  </div>
)

const ReferenceLink = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 text-xs font-medium leading-[1.6] text-ink-400 underline decoration-solid underline-offset-2 hover:text-ink-600"
  >
    {children}
    <ExternalLink size={20} className="shrink-0" />
  </a>
)

export default function CostCalculator({ open, onClose, initialAmount = '' }) {
  const [form, setForm] = useState(() => ({
    amount: initialAmount,
    caseKind: 'single',
    stage: 'first',
    plaintiffs: 1,
    defendants: 1,
    electronic: true,
    withAttorney: false,
  }))
  const set = (fields) => setForm((current) => ({ ...current, ...fields }))

  const sueValue = Number(form.amount) || 0
  const hasResult = sueValue > 0
  const cost = useMemo(() => litigationCost({
    sueValue,
    stage: form.stage,
    electronic: form.electronic,
    caseKind: form.caseKind,
    plaintiffs: form.plaintiffs,
    defendants: form.defendants,
    roundFee: ROUND_FEE,
    withAttorney: form.withAttorney,
  }), [form, sueValue])

  const selectedCase = CASE_OPTIONS.find((option) => option.value === form.caseKind) || CASE_OPTIONS[0]
  const selectedStage = STAGE_OPTIONS.find((option) => option.value === form.stage) || STAGE_OPTIONS[0]
  const partyCount = Math.max(1, Number(form.plaintiffs) || 1) + Math.max(1, Number(form.defendants) || 1)

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxW="max-w-xl"
      title="소송 비용 계산기"
      sub="청구금액·당사자 수·제출 방법을 넣으면 실제로 낼 금액을 계산합니다."
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="litigation-amount" className="text-sm text-ink-700">청구 금액 (소송목적의 값)</label>
          <div className="flex items-center rounded-xl border border-ink-200 px-4 py-3 focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100">
            <input
              id="litigation-amount"
              type="number"
              min="0"
              value={form.amount}
              onChange={(event) => set({ amount: event.target.value })}
              placeholder="0"
              className="w-full min-w-0 bg-transparent text-[15px] text-ink-800 outline-none placeholder:text-ink-300"
            />
            <span className="text-sm text-ink-400">원</span>
          </div>
          <p className="text-xs leading-[1.6] text-ink-400">
            원금에 이자·지연손해금을 더하지 않은 금액입니다. 소가는 민사소송법 제26조에 따라 정합니다.
            {hasResult && cost.small && ' (소액사건에 해당합니다)'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-sm text-ink-700">사건 종류</span>
            <Dropdown value={form.caseKind} onChange={(caseKind) => set({ caseKind })} options={CASE_OPTIONS} ariaLabel="사건 종류" />
            <p className="text-xs leading-[1.6] text-ink-400">{selectedCase.hint}</p>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-sm text-ink-700">심급</span>
            <Dropdown value={form.stage} onChange={(stage) => set({ stage })} options={STAGE_OPTIONS} ariaLabel="심급" />
            <p className="text-xs leading-[1.6] text-ink-400">{selectedStage.hint}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-700">당사자 수</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <label htmlFor="plaintiff-count" className="shrink-0 text-sm text-ink-600">원고</label>
              <input id="plaintiff-count" type="number" min="1" value={form.plaintiffs} onChange={(event) => set({ plaintiffs: Math.max(1, Number(event.target.value) || 1) })} className="min-w-0 max-w-20 flex-1 rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-800 outline-none focus:border-brand-300" />
              <span className="shrink-0 text-sm text-ink-600">명</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <label htmlFor="defendant-count" className="shrink-0 text-sm text-ink-600">피고</label>
              <input id="defendant-count" type="number" min="1" value={form.defendants} onChange={(event) => set({ defendants: Math.max(1, Number(event.target.value) || 1) })} className="min-w-0 max-w-20 flex-1 rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-800 outline-none focus:border-brand-300" />
              <span className="shrink-0 text-sm text-ink-600">명</span>
            </div>
          </div>
          <p className="text-xs leading-[1.6] text-ink-400">송달료는 원고·피고를 합한 인원수로 계산합니다. 인지액은 인원수와 무관합니다.</p>
        </div>

        <button
          type="button"
          onClick={() => set({ electronic: !form.electronic })}
          className={cx('flex flex-col items-start gap-1 rounded-xl border px-4 py-3.5 text-left transition-colors', form.electronic ? 'border-brand-200 bg-brand-50' : 'border-ink-200 bg-white')}
        >
          <span className={cx('flex items-center gap-2 text-sm font-semibold', form.electronic ? 'text-brand-600' : 'text-ink-700')}>
            <span className={cx('flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-white', form.electronic ? 'bg-brand-500' : 'border-2 border-ink-300')}>{form.electronic ? '✓' : ''}</span>
            전자소송으로 제출
          </span>
          <span className="text-xs leading-[1.6] text-ink-500">전자문서로 내면 인지액이 10분의 9로 줄어듭니다 (민사소송 등 인지법 제16조).</span>
        </button>

        <div className="flex flex-col gap-3 rounded-xl bg-ink-50 p-4">
          <p className="text-sm font-bold text-ink-900">비용 납부 안내</p>
          <ResultRow label="예상 인지대" value={hasResult ? formatCost(cost.stamp.value) : '-'} />
          <ResultRow label="예상 송달료" value={hasResult ? `${formatCost(cost.service.value)} (당사자 ${partyCount}인)` : '-'} />
          {form.withAttorney && hasResult && <ResultRow label="변호사보수 인정액" value={formatCost(cost.attorney?.value || 0)} />}
          <ResultRow label="합계 (본인 납부)" value={hasResult ? formatCost(cost.payNow) : '-'} total />
        </div>

        {form.withAttorney && hasResult && (
          <div className="rounded-xl bg-brand-50 px-4 py-3.5 text-xs leading-relaxed text-brand-700">
            변호사보수 인정액({formatCost(cost.attorney?.value || 0)})은 패소 시 상대방에게 부담할 수 있는 법정 인정액입니다. 실제 지출 보수와 별개로, 소송비용 확정 절차에서 산정됩니다.
          </div>
        )}

        <button type="button" onClick={() => set({ withAttorney: !form.withAttorney })} className="flex items-start gap-3 rounded-xl border border-ink-200 px-4 py-3.5 text-left">
          <span className={cx('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2', form.withAttorney ? 'border-brand-500' : 'border-ink-300')}>
            {form.withAttorney && <span className="h-2 w-2 rounded-full bg-brand-500" />}
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-ink-900">변호사보수 인정액도 계산</span>
            <span className="text-xs leading-[1.6] text-ink-500">이기면 패소자에게 물릴 수 있는 변호사보수의 한도입니다. 지금 내는 돈이 아닙니다.</span>
          </span>
        </button>

        <div className="flex flex-col gap-2 overflow-hidden rounded-lg bg-ink-50 px-4 py-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold leading-[1.6] text-ink-700">송달료는 추정값입니다.</p>
            <p className="text-xs font-medium leading-[1.6] text-ink-400">민사소송 등 인지법 기준 참고용 산출입니다. 실제 접수 금액은 대한민국 법원 전자소송 홈페이지에서 다시 확인하세요. 참고용 계산이며 [나홀로법에]에서는 결제하지 않습니다. 실제 납부는 법원 또는 전자소송포털에서 합니다.</p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <ReferenceLink href="https://ecfs.scourt.go.kr/">전자소송포털</ReferenceLink>
            <ReferenceLink href="https://www.law.go.kr/법령/민사소송등인지법">민사소송 등 인지법</ReferenceLink>
            <ReferenceLink href="https://www.law.go.kr/법령/변호사보수의소송비용산입에관한규칙">변호사 보수 산입 규칙</ReferenceLink>
          </div>
        </div>

        <Button type="button" onClick={onClose} className="self-end px-6">확인</Button>
      </div>
    </Modal>
  )
}
