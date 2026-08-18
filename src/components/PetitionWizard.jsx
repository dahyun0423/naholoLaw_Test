import { useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../context/ToastContext.jsx'
import { Card, Badge, cx } from './ui.jsx'
import { GenericPaper, DocumentDoneView, GenerateNotice, SaveDecision, TipCard, fileTipsFor, josa, PickList, WizardShell, CitationPicker, Note } from './docform.jsx'
import { Lightbulb } from './icons.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { won, savedAgo } from '../lib/complaint.js'
import { saveFormDraft, loadFormDraft } from '../lib/docschema.js'
import { citationPolicy, suggestPrecedents, matchedIssue, petitionNeedsCitation } from '../lib/citation.js'
import {
  petitionTypes, findPetition, petitionCompleteness, petitionSummary,
  paymentOrderCost, emptyPetition, buildPetition,
} from '../lib/petition.js'

const addressFrom = (form, key) => [form?.[key], form?.[`${key}Detail`]].filter(Boolean).join(' ')

const petitionDefaultsFromCase = (caseItem) => {
  const source = caseItem?.form || {}
  if (!caseItem) return emptyPetition
  return {
    ...emptyPetition,
    court: source.court || '',
    caseNo: caseItem.caseNo || '',
    caseName: caseItem.title || '',
    amount: source.amount || '',
    aName: source.pName || '',
    aRrn: source.pRrn || '',
    aAddr: addressFrom(source, 'pAddr'),
    aTel: source.pTel || '',
    aEmail: source.pEmail || '',
    bName: source.dName || '',
    bRrn: source.dRrn || '',
    bAddr: addressFrom(source, 'dAddr'),
    bTel: source.dTel || '',
    propertyDesc: addressFrom(source, 'propertyAddr'),
    deposit: source.depositAmount || '',
    rent: source.rent || source.monthlyRent || '',
    contractDate: source.contractDate || '',
    moveIn: source.leaseStart || '',
    endDate: source.leaseEnd || '',
    endWay: source.endWay || '',
    reason: source.refuseDetail || '',
  }
}

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

/** 완성 뒤에 할 일 — 신청서는 접수처와 비용이 문서마다 다르다 */
const PETITION_NEXT = [
  ['전자소송포털에서', '「민사 → 신청서」로 접수합니다. 그 사건에 전자소송 동의를 이미 했어야 해요.'],
  ['첨부서류는', '체크한 목록 그대로 함께 올립니다. 빠지면 보정명령이 옵니다.'],
  ['종이로 낼 때는', '출력본 말미 「(인)」 자리에 서명하거나 도장을 찍고, 2장 이상이면 간인하세요.'],
]

/**
 * 신청서 완성 화면 — 마법사와 캡처용 화면(FigmaDocResult)이 같은 화면을 쓴다.
 * 사건 저장은 마법사에서만 일어나므로 onSave가 없으면 저장 카드도 그리지 않는다.
 */
export function PetitionDoneView({ type, form, caseTitle, caseId, onSave, onEdit, onExit }) {
  const doc = useMemo(() => buildPetition(type, form), [type, form])
  return (
    <DocumentDoneView
      title={`AI가 정리한 ${type.title}`}
      badge={type.title}
      sub="답한 사실을 이 신청서의 신청취지·신청이유와 법원 제출 양식으로 정리했습니다."
      onEdit={onEdit}
      onExit={onExit}
      aside={(
        <>
          {onSave && (
            <SaveDecision
              docName={type.title}
              caseTitle={caseTitle}
              caseId={caseId}
              onSave={onSave}
            />
          )}
          <TipCard title="이제 이렇게 하시면 돼요" items={PETITION_NEXT} />
        </>
      )}
    >
      <GenericPaper doc={doc} />
    </DocumentDoneView>
  )
}

function Writer({ typeKey, onBack, onExit }) {
  const toast = useToast()
  const { citedList, activeCaseId, activeRaw, attachDoc } = useWorkspace()
  const type = findPetition(typeKey)
  const draftKey = `petition_${typeKey}_${activeCaseId || 'unlinked'}`
  // 신청서도 종류별로 초안을 남긴다
  const [form, setForm] = useState(() => loadFormDraft(draftKey)?.form || petitionDefaultsFromCase(activeRaw))
  const [open, setOpen] = useState(0)
  const [savedAt, setSavedAt] = useState(loadFormDraft(draftKey)?.savedAt || null)
  const [saveFailed, setSaveFailed] = useState(false)
  // 소장·준비서면·증거목록과 같은 마무리
  const [phase, setPhase] = useState(null)
  useEffect(() => {
    if (phase !== 'generating' && phase !== 'ready') return undefined
    const next = phase === 'generating' ? 'ready' : 'full'
    const id = setTimeout(() => setPhase(next), phase === 'generating' ? 1600 : 1100)
    return () => clearTimeout(id)
  }, [phase])

  /** 사건에 저장한다 — 이때만 새 버전을 남긴다 */
  const savePetition = () => {
    if (!activeCaseId) return false
    attachDoc(activeCaseId, {
      kind: 'petition', docId: `petition_${typeKey}`,
      title: type.title, progress: petitionCompleteness(type, form),
      newVersion: true,
    })
    return true
  }
  const first = useRef(true)

  useEffect(() => {
    if (first.current) { first.current = false; return }
    const t = setTimeout(() => {
      if (saveFormDraft(draftKey, form, { caseId: activeCaseId })) { setSavedAt(Date.now()); setSaveFailed(false) }
      else setSaveFailed(true)
      // 사건관리에서 "이 사건의 문서"로 보이도록 붙여 둔다
      if (activeCaseId) {
        attachDoc(activeCaseId, {
          kind: 'petition', docId: `petition_${typeKey}`,
          title: type.title, progress: petitionCompleteness(type, form),
        })
      }
    }, 600)
    return () => clearTimeout(t)
  }, [form, typeKey, type, activeCaseId, attachDoc, draftKey])

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const percent = useMemo(() => petitionCompleteness(type, form), [type, form])
  const doc = useMemo(() => buildPetition(type, form), [type, form])
  const extras = useMemo(() => makePetitionExtras(typeKey, citedList), [typeKey, citedList])
  const stepsWithAi = useMemo(() => type.steps.map((step, index) => ({
    ...step,
    guided: false,
    badge: index === 0 ? '사건 정보 자동 채움' : 'AI가 문서화',
    aiAssist: index > 0,
  })), [type])

  // 다 만들면 작성 화면 대신 완성 화면을 그린다 — 모달로 덮지 않는다
  if (phase === 'full') {
    return (
      <PetitionDoneView
        type={type}
        form={form}
        caseTitle={activeRaw?.title}
        caseId={activeCaseId}
        onSave={savePetition}
        onEdit={() => setPhase(null)}
        onExit={onExit}
      />
    )
  }

  return (
    <>
    <WizardShell
      onSave={() => {
        if (saveFormDraft(draftKey, form, { caseId: activeCaseId })) { setSavedAt(Date.now()); toast('작성 중인 내용을 저장했습니다') }
        else toast('저장에 실패했습니다. 브라우저 저장공간을 확인해 주세요', 'error')
      }}
      savedLabel={saveFailed ? '⚠ 자동저장 실패 — 브라우저 저장공간을 확인하세요' : savedAt ? `${savedAgo(savedAt)} 저장됨` : ''}
      title="신청서 작성"
      badge={type.title}
      sub={activeRaw ? `「${activeRaw.title || '선택한 사건'}」의 법원·당사자 정보를 불러왔어요. 남은 사실만 평소 말로 답하면 AI가 신청서 형식으로 정리합니다.` : '필요한 사실만 평소 말로 답하면 AI가 신청서 형식으로 정리합니다.'}
      stage={1}
      stageLabels={['신청 목적 선택', '정보 입력', '검토·생성']}
      steps={stepsWithAi}
      open={open}
      setOpen={setOpen}
      form={form}
      setField={setField}
      renderExtra={extras}
      stepSummary={(i) => petitionSummary(type, i, form)}
      percent={percent}
      showPreview={false}
      splitNavigation
      previewTitle="신청서 미리보기"
      preview={<GenericPaper doc={doc} />}
      printable={<GenericPaper doc={doc} />}
      onBack={onBack}
      onDone={() => setPhase('generating')}
      doneLabel="신청서 완성하기"
      sideNote={(
        <>
          <TipCard title={`${type.title}${josa(type.title, '은', '는')} 이런 문서예요`} items={[['', type.intro]]} />
          <TipCard title={`${type.steps[open]?.title || '이 단계'}에서 알아둘 것`} items={type.steps[open]?.tips} />
          <TipCard title="파일에 대해" items={fileTipsFor(type.steps[open])} />
        </>
      )}
    />
    {(phase === 'generating' || phase === 'ready') && (
      <GenerateNotice
        done={phase === 'ready'}
        doc={type.title}
        workingSub="답한 사실을 신청취지·신청이유로 정리하고 있어요"
      />
    )}
    </>
  )
}

export default function PetitionWizard({ onExit }) {
  const [typeKey, setTypeKey] = useState(null)

  if (typeKey) return <Writer typeKey={typeKey} onBack={() => setTypeKey(null)} onExit={onExit} />

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
