import { useMemo, useState } from 'react'
import { useToast } from '../context/ToastContext.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { Card, Badge, cx } from './ui.jsx'
import { GenericPaper, Note, Label, WizardShell, CitationPicker } from './docform.jsx'
import { FileText, Lightbulb, Check } from './icons.jsx'
import { cases } from '../data/mock.js'
import { loadDraft, findType } from '../lib/complaint.js'
import { citationPolicy, suggestPrecedents, matchedIssue } from '../lib/citation.js'
import { briefSteps, buildBrief, briefCompleteness, briefSummary, emptyBrief, stages, defenses } from '../lib/brief.js'

/* 소장 초안 · 진행 중 사건에서 당사자 정보를 그대로 끌어온다 */
function CaseLoader({ setField, form }) {
  const draft = useMemo(() => loadDraft(), [])
  const [picked, setPicked] = useState(null)

  const fromDraft = () => {
    const t = findType(draft.typeKey)
    const f = draft.form
    setField('court', f.court || '')
    setField('caseName', t?.caseName || '')
    setField('plaintiff', f.pName || '')
    setField('defendant', f.dName || '')
    setField('side', '원고')
    setPicked('draft')
  }

  const fromCase = (c) => {
    setField('court', c.court)
    setField('caseNo', c.id)
    setField('caseName', c.title)
    setPicked(c.id)
  }

  return (
    <div>
      <Label>기존 사건 불러오기</Label>
      <div className="space-y-2">
        {draft && (
          <button
            type="button"
            onClick={fromDraft}
            className={cx(
              'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
              picked === 'draft' ? 'border-brand-300 bg-brand-50' : 'border-ink-200 hover:bg-ink-50',
            )}
          >
            <FileText size={17} className="text-brand-400" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink-900">작성한 소장에서 — {findType(draft.typeKey)?.title}</span>
              <span className="block text-xs text-ink-500">원고 {draft.form.pName || '(미입력)'} · 피고 {draft.form.dName || '(미입력)'}</span>
            </span>
            {picked === 'draft' && <Check size={16} className="shrink-0 text-brand-400" />}
          </button>
        )}
        {cases.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => fromCase(c)}
            className={cx(
              'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
              picked === c.id ? 'border-brand-300 bg-brand-50' : 'border-ink-200 hover:bg-ink-50',
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink-900">{c.title}</span>
              <span className="block text-xs text-ink-500">{c.id} · {c.court}</span>
            </span>
            <Badge tone={c.badge === '진행 중' ? 'green' : 'gray'}>{c.badge}</Badge>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-500">불러오면 아래 항목이 자동으로 채워집니다. 직접 입력해도 돼요.</p>
    </div>
  )
}

function makeBriefExtras(cited) {
  return function briefExtras(f, form, setField) {
  if (f.kind === 'caseLoader') return <CaseLoader form={form} setField={setField} />

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

export default function BriefWizard({ onExit }) {
  const toast = useToast()
  const [form, setForm] = useState(emptyBrief)
  const [open, setOpen] = useState(0)

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const { citedList } = useWorkspace()
  const extras = useMemo(() => makeBriefExtras(citedList), [citedList])
  const percent = useMemo(() => briefCompleteness(form), [form])
  const doc = useMemo(() => buildBrief(form), [form])

  return (
    <WizardShell
      title="준비서면 작성"
      badge={form.round || '준비서면'}
      sub="이미 진행 중인 사건에 대한 대응 문서예요. 상대방 주장을 정리하고 쟁점별로 반박합니다."
      stage={1}
      stageLabels={['사건·단계 확인', '주장·반박 작성', '검토·생성']}
      steps={briefSteps}
      open={open}
      setOpen={setOpen}
      form={form}
      setField={setField}
      renderExtra={extras}
      stepSummary={(i) => briefSummary(i, form)}
      percent={percent}
      previewTitle="준비서면 미리보기"
      preview={<GenericPaper doc={doc} />}
      printable={<GenericPaper doc={doc} />}
      onBack={onExit}
      onDone={() => toast('준비서면 초안이 완성되었습니다', 'success')}
      doneLabel="준비서면 완성하기"
      extraPanel={
        <Card className="p-4">
          <p className="text-sm font-bold text-ink-900">준비서면은 이렇게 씁니다</p>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-600">
            <li>· 기일 <b className="text-ink-800">1주 전까지</b> 제출하는 것이 원칙이에요.</li>
            <li>· 쟁점은 <b className="text-ink-800">3개 이내</b>로 압축하세요. 많을수록 흐려집니다.</li>
            <li>· 상대방이 <b className="text-ink-800">인정한 사실</b>은 다시 다투지 마세요.</li>
            <li>· 감정적 표현 대신 <b className="text-ink-800">사실과 법리</b>만 적습니다.</li>
          </ul>
        </Card>
      }
    />
  )
}
