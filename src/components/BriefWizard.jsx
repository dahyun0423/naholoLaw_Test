import { useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../context/ToastContext.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { Button, cx } from './ui.jsx'
import { GenericPaper, DocumentDoneView, GenerateNotice, CaseLoadedBanner, SaveDecision, TipCard, fileTipsFor, Note, Label, WizardShell, CitationPicker } from './docform.jsx'
import { Lightbulb, Check } from './icons.jsx'
import { findType, savedAgo } from '../lib/complaint.js'
import { saveFormDraft, loadFormDraft } from '../lib/docschema.js'
import { citationPolicy, suggestPrecedents, matchedIssue } from '../lib/citation.js'
import { briefSteps, buildBrief, briefCompleteness, briefSummary, emptyBrief, stages, defenses, detectDefenses } from '../lib/brief.js'
import { nextEvidenceNo } from '../lib/casebook.js'

const briefDefaultsFromCase = (caseItem) => {
  const source = caseItem?.form || {}
  if (!caseItem) return emptyBrief
  return {
    ...emptyBrief,
    court: source.court || '',
    caseNo: caseItem.caseNo || '',
    caseName: caseItem.title || findType(caseItem.typeKey)?.caseName || '',
    plaintiff: source.pName || '',
    defendant: source.dName || '',
    side: '원고',
    // 몇 호증까지 냈는지는 사건 기록에 있다 — 사용자가 기억해서 적을 값이 아니다
    evidenceStart: String(nextEvidenceNo(caseItem, 'brief')),
  }
}

/** 완성 뒤에 할 일 — 서면은 만드는 것보다 제때 내는 게 어렵다 */
const BRIEF_NEXT = [
  ['기일 1주 전까지', '전자소송포털에 제출하세요. 늦게 내면 재판부가 못 읽고 들어옵니다.'],
  ['상대방 수만큼 부본을', '함께 냅니다. 종이로 낼 때는 출력본에 서명·날인하고 간인하세요.'],
  ['낸 뒤에는', '증빙자료에서 새로 낸 서증을 「제출완료」로 바꿔 두세요. 다음 서면의 호증 번호가 여기서 이어집니다.'],
]

const BRIEF_RULES = [
  ['기일 1주 전까지', '제출하는 것이 원칙이에요.'],
  ['쟁점은 3개 이내로', '압축하세요. 많을수록 흐려집니다.'],
  ['인정한 사실은', '다시 다투지 마세요.'],
  ['감정적 표현 대신', '사실과 법리만 적습니다.'],
]

function BriefTips({ step }) {
  return (
    <>
      <TipCard title="준비서면은 이렇게 씁니다" items={BRIEF_RULES} />
      <TipCard title={`${step?.title || '이 단계'}에서 알아둘 것`} items={step?.tips} />
      <TipCard title="파일에 대해" items={fileTipsFor(step)} />
    </>
  )
}

/* 소장 초안 · 진행 중 사건에서 당사자 정보를 그대로 끌어온다 */
function BriefCaseLoader() {
  const { activeRaw } = useWorkspace()
  return <CaseLoadedBanner caseTitle={activeRaw?.title || findType(activeRaw?.typeKey)?.title} />
}

/**
 * 상대방 서면 분석기.
 *
 * 우리는 PDF를 읽지 못한다. 대신 포털에서 **본문을 복사해 붙여넣으면**
 * 어떤 항변이 들어 있는지 찾아 항변 체크와 반박 뼈대를 만들어 준다.
 * 읽는 척하지 않고, 실제로 세어서 보여주는 방식이다.
 */
function OpponentAnalyzer({ form, setField }) {
  const text = form.opponentText || ''
  const found = detectDefenses(text)
  const already = form.defenses || []
  const fresh = found.filter((d) => !already.includes(d))

  const apply = () => {
    setField('defenses', [...new Set([...already, ...found])])
    // 찾은 항변마다 반박 뼈대를 한 줄씩 깔아 둔다 — 빈 화면보다 고쳐 쓰는 편이 쉽다
    const rows = form.rebuttals || []
    const have = new Set(rows.map((r) => r.claim))
    const added = found
      .filter((d) => !have.has(d))
      .map((d) => ({ claim: d, answer: defenses[d] || '', evidence: '', citation: '' }))
    if (added.length) setField('rebuttals', [...rows, ...added])
  }

  return (
    <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
      <Label info={'포털에서 서면을 열고 본문을 그대로 복사해 붙여넣으세요.\n파일은 우리가 읽지 못하지만, 붙여넣은 글에서는 항변을 찾아낼 수 있어요.'}>
        상대방 서면 본문 붙여넣기
      </Label>
      <textarea
        rows={5}
        value={text}
        onChange={(e) => setField('opponentText', e.target.value)}
        placeholder="예) 피고는 원고로부터 금원을 차용한 사실이 없고, 설령 채무가 있다 하더라도 이미 소멸시효가 완성되었습니다."
        className={cx('mt-1 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-700 outline-none transition placeholder:text-ink-300 focus:border-brand-300')}
      />

      {text.trim().length >= 20 && (
        <div className="mt-3">
          {found.length === 0 ? (
            <p className="text-[12.5px] text-ink-500">
              흔한 항변 표현을 찾지 못했어요. 아래에서 직접 골라 주세요.
            </p>
          ) : (
            <>
              <p className="text-[12.5px] text-ink-600">
                항변 <b className="font-bold text-brand-500">{found.length}개</b>를 찾았어요
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {found.map((d) => (
                  <span key={d} className="rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-semibold text-brand-600">{d}</span>
                ))}
              </div>
              <Button size="sm" className="mt-3" onClick={apply} disabled={fresh.length === 0}>
                {fresh.length ? `항변 ${fresh.length}개 담고 반박 뼈대 만들기` : '이미 다 담았어요'}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function makeBriefExtras(cited) {
  return function briefExtras(f, form, setField) {
  if (f.kind === 'opponentAnalyzer') return <OpponentAnalyzer form={form} setField={setField} />

  if (f.kind === 'caseLoader') return <BriefCaseLoader />

  if (f.kind === 'citation') {
    const ctx = { docKind: 'brief', defenses: form.defenses || [] }
    return (
      <CitationPicker
        policy={citationPolicy.brief}
        suggestions={suggestPrecedents(ctx)}
        cited={cited}
        value={form.citations || []}
        onChange={(v) => setField('citations', v)}
        reasonOf={(p) => matchedIssue(p, ctx)}
      />
    )
  }

  if (f.kind === 'stageAdvice') {
    const s = stages.find((x) => x.label === form.stage)
    if (!s) return null
    return (
      <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-600"><Lightbulb size={15} /> 이 단계에서는</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-brand-600">{s.advice}</p>
        <button
          type="button"
          onClick={() => setField('round', s.round)}
          className="mt-2 text-xs font-semibold text-brand-500 underline underline-offset-2"
        >
          회차를 “{s.round}”로 채우기
        </button>
      </div>
    )
  }

  if (f.kind === 'defenseAdvice') {
    const picked = form.defenses || []
    if (picked.length === 0) return null
    return (
      <div className="space-y-2">
        {picked.map((d) => (
          <Note key={d} tone="info"><b className="font-semibold">{d}</b> — {defenses[d]}</Note>
        ))}
      </div>
    )
  }
  return null
  }
}

/**
 * 준비서면 완성 화면 — 마법사와 캡처용 화면(FigmaDocResult)이 같은 화면을 쓴다.
 * 사건 저장은 마법사에서만 일어나므로 onSave가 없으면 저장 카드도 그리지 않는다.
 */
export function BriefDoneView({ form, caseTitle, caseId, onSave, onEdit, onExit }) {
  const doc = useMemo(() => buildBrief(form), [form])
  return (
    <DocumentDoneView
      title="AI가 정리한 준비서면"
      badge={form.round || '준비서면'}
      sub="평소 말로 답한 내용을 주장·반박·근거 순서의 준비서면 문장으로 정리했습니다."
      onEdit={onEdit}
      onExit={onExit}
      aside={(
        <>
          {onSave && (
            <SaveDecision
              docName="준비서면"
              caseTitle={caseTitle}
              caseId={caseId}
              onSave={onSave}
              note="사건관리의 문서 목록에 남고, 여기서 매긴 마지막 호증 번호가 기록돼 다음 서면이 이어서 매깁니다."
            />
          )}
          <TipCard title="이제 이렇게 하시면 돼요" items={BRIEF_NEXT} />
        </>
      )}
    >
      <GenericPaper doc={doc} />
    </DocumentDoneView>
  )
}

export default function BriefWizard({ onExit }) {
  const toast = useToast()
  const { citedList, activeCaseId, activeRaw, attachDoc } = useWorkspace()
  const draftKey = `brief_${activeCaseId || 'unlinked'}`
  // 작성 중인 내용은 새로고침해도 남아야 한다 (소장과 같은 정책)
  const [form, setForm] = useState(() => loadFormDraft(draftKey)?.form || briefDefaultsFromCase(activeRaw))
  const [open, setOpen] = useState(0)
  const [savedAt, setSavedAt] = useState(loadFormDraft(draftKey)?.savedAt || null)
  const [saveFailed, setSaveFailed] = useState(false)
  // 소장·증거목록과 같은 마무리 — 「작성 중」 모달 → 「완성」 모달 → 완성 화면
  const [phase, setPhase] = useState(null)
  useEffect(() => {
    if (phase !== 'generating' && phase !== 'ready') return undefined
    const next = phase === 'generating' ? 'ready' : 'full'
    const id = setTimeout(() => setPhase(next), phase === 'generating' ? 1600 : 1100)
    return () => clearTimeout(id)
  }, [phase])

  /** 사건에 저장한다 — 이때만 새 버전을 남긴다 */
  const saveBrief = () => {
    if (!activeCaseId) return false
    const used = (form.newEvidence || []).filter((x) => x?.name).length
    const start = Math.max(1, Number(form.evidenceStart) || 1)
    attachDoc(activeCaseId, {
      kind: 'brief',
      title: form.round || '준비서면',
      progress: briefCompleteness(form),
      ...(used ? { endNo: start + used - 1 } : {}),
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
        // 이번 서면에서 매긴 마지막 호증 번호를 남긴다 — 다음 서면이 여기서 이어 붙인다
        const used = (form.newEvidence || []).filter((x) => x?.name).length
        const start = Math.max(1, Number(form.evidenceStart) || 1)
        attachDoc(activeCaseId, {
          kind: 'brief',
          title: form.round || '준비서면',
          progress: briefCompleteness(form),
          ...(used ? { endNo: start + used - 1 } : {}),
        })
      }
    }, 600)
    return () => clearTimeout(t)
  }, [form, activeCaseId, attachDoc, draftKey])

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const extras = useMemo(() => makeBriefExtras(citedList), [citedList])
  const percent = useMemo(() => briefCompleteness(form), [form])
  const doc = useMemo(() => buildBrief(form), [form])
  const stepsWithAi = useMemo(() => briefSteps.map((step, index) => ({
    ...step,
    guided: false,
    badge: index === 0 ? '사건 자동 불러옴' : 'AI가 문서화',
    aiAssist: index > 0,
  })), [])

  // 다 만들면 작성 화면 대신 완성 화면을 그린다 — 모달로 덮지 않는다
  if (phase === 'full') {
    return (
      <BriefDoneView
        form={form}
        caseTitle={activeRaw?.title}
        caseId={activeCaseId}
        onSave={saveBrief}
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
      title="준비서면 작성"
      badge={form.round || '준비서면'}
      sub={activeRaw ? `「${activeRaw.title || findType(activeRaw.typeKey)?.title}」의 사건정보를 불러왔어요. 상대방의 말을 평소 말로 정리하면 AI가 쟁점별 준비서면으로 작성합니다.` : '상대방의 말을 평소 말로 정리하면 AI가 쟁점별 준비서면으로 작성합니다.'}
      stage={1}
      stageLabels={['사건·단계 확인', '주장·반박 작성', '검토·생성']}
      steps={stepsWithAi}
      open={open}
      setOpen={setOpen}
      form={form}
      setField={setField}
      renderExtra={extras}
      stepSummary={(i) => briefSummary(i, form)}
      percent={percent}
      showPreview={false}
      splitNavigation
      previewTitle="준비서면 미리보기"
      preview={<GenericPaper doc={doc} />}
      printable={<GenericPaper doc={doc} />}
      onBack={onExit}
      onDone={() => setPhase('generating')}
      doneLabel="준비서면 완성하기"
      sideNote={<BriefTips step={stepsWithAi[open]} />}
    />
    {(phase === 'generating' || phase === 'ready') && (
      <GenerateNotice
        done={phase === 'ready'}
        doc="준비서면"
        workingSub="상대방 주장에 대한 반박을 쟁점별로 정리하고 있어요"
      />
    )}
    </>
  )
}
