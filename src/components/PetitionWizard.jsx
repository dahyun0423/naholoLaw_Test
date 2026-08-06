import { useMemo, useState } from 'react'
import { useToast } from '../context/ToastContext.jsx'
import { Card, Badge, cx } from './ui.jsx'
import { GenericPaper, PickList, WizardShell, CitationPicker, Note } from './docform.jsx'
import { Lightbulb } from './icons.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { won } from '../lib/complaint.js'
import { citationPolicy, suggestPrecedents, matchedIssue, petitionNeedsCitation } from '../lib/citation.js'
import {
  petitionTypes, findPetition, petitionCompleteness, petitionSummary,
  paymentOrderCost, emptyPetition, buildPetition,
} from '../lib/petition.js'

function makePetitionExtras(typeKey, cited) {
  return function petitionExtras(f, form, setField) {
  if (f.kind === 'citation') {
    const ctx = { docKind: 'petition', petitionKey: typeKey }
    return (
      <CitationPicker
        policy={{ ...citationPolicy.petition, body: petitionNeedsCitation[typeKey] || citationPolicy.petition.body }}
        suggestions={suggestPrecedents(ctx)}
        cited={cited}
        value={form.citations || []}
        onChange={(v) => setField('citations', v)}
        reasonOf={(p) => matchedIssue(p, ctx)}
      />
    )
  }
  if (f.kind === 'partyTag') {
    return (
      <div className="flex items-center gap-2 pt-1">
        <span className={cx('rounded-lg px-2.5 py-1 text-xs font-bold text-white', f.tone === 'brand' ? 'bg-brand-300' : 'bg-ink-700')}>{f.tag}</span>
        <span className="text-sm text-ink-500">{f.desc}</span>
      </div>
    )
  }

  // 지급명령은 인지대가 소장의 1/10이라, 소장과 나란히 보여준다
  if (f.kind === 'paymentCost') {
    const { suit, stamp, service, total } = paymentOrderCost(form.amount)
    const rows = [
      ['청구 금액', form.amount ? `${won(form.amount)}원` : '-', null],
      ['인지대 (소장의 1/10)', `${won(stamp)}원`, '민사소송등인지법'],
      ['송달료 (당사자 2명 · 6회분)', `${won(service)}원`, '추정'],
    ]
    return (
      <div className="rounded-xl border border-ink-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-ink-600">청구 금액을 넣으면 자동으로 계산돼요</p>
          <Badge tone="green">소장보다 저렴</Badge>
        </div>
        <div className="mt-3 space-y-2">
          {rows.map(([k, v, tag]) => (
            <div key={k} className="flex items-center justify-between border-b border-ink-100 pb-2 text-[13px]">
              <span className="flex items-center gap-1.5 text-ink-500">
                {k}
                {tag === '추정' && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">추정</span>}
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
        {form.amount > 0 && (
          <p className="mt-3 text-xs leading-relaxed text-ink-500">
            같은 금액으로 소장을 내면 인지대만 {won(suit)}원이에요. 다툼이 적은 채권이라면 지급명령이 시간·비용 모두 유리합니다.
          </p>
        )}
        <div className="mt-3">
          <Note tone="lock">
            <b className="font-semibold">참고용 계산이며 나홀로법에서 결제하지 않습니다.</b> 실제 납부는 법원 또는
            전자소송포털에서 하고, 송달료는 예납 회차·우편요금에 따라 달라질 수 있어요.
          </Note>
        </div>
      </div>
    )
  }
  return null
  }
}

function Writer({ typeKey, onBack }) {
  const toast = useToast()
  const { citedList } = useWorkspace()
  const type = findPetition(typeKey)
  const [form, setForm] = useState(emptyPetition)
  const [open, setOpen] = useState(0)

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const percent = useMemo(() => petitionCompleteness(type, form), [type, form])
  const doc = useMemo(() => buildPetition(type, form), [type, form])
  const extras = useMemo(() => makePetitionExtras(typeKey, citedList), [typeKey, citedList])

  return (
    <WizardShell
      title="신청서 작성"
      badge={type.title}
      sub="왼쪽에 입력하는 내용이 오른쪽 신청서에 바로 반영됩니다."
      stage={1}
      stageLabels={['신청 목적 선택', '정보 입력', '검토·생성']}
      steps={type.steps}
      open={open}
      setOpen={setOpen}
      form={form}
      setField={setField}
      renderExtra={extras}
      stepSummary={(i) => petitionSummary(type, i, form)}
      percent={percent}
      previewTitle="신청서 미리보기"
      preview={<GenericPaper doc={doc} />}
      printable={<GenericPaper doc={doc} />}
      onBack={onBack}
      onDone={() => toast(`${type.title} 초안이 완성되었습니다`, 'success')}
      doneLabel="신청서 완성하기"
      extraPanel={
        <Card className="flex gap-2.5 p-4">
          <Lightbulb size={16} className="mt-0.5 shrink-0 text-brand-400" />
          <p className="text-[13px] leading-relaxed text-ink-600">{type.intro}</p>
        </Card>
      }
    />
  )
}

export default function PetitionWizard({ onExit }) {
  const [typeKey, setTypeKey] = useState(null)

  if (typeKey) return <Writer typeKey={typeKey} onBack={() => setTypeKey(null)} />

  return (
    <PickList
      heading="소송 중에 무엇을 하고 싶으세요?"
      placeholder="찾으시려는 신청서를 입력해주세요."
      items={petitionTypes}
      onPick={setTypeKey}
      onBack={onExit}
      footNote={'신청서는 사건 유형이 아니라 “절차적 목적”으로 갈립니다.\n나홀로소송에서 자주 쓰는 5종부터 지원하고 순차적으로 넓혀 나갑니다.'}
    />
  )
}
