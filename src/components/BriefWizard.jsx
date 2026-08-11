import { useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../context/ToastContext.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { Card, Badge, Button, cx } from './ui.jsx'
import { GenericPaper, Note, Label, WizardShell, CitationPicker } from './docform.jsx'
import { FileText, Lightbulb, Check } from './icons.jsx'
import { loadDraft, findType, savedAgo } from '../lib/complaint.js'
import { saveFormDraft, loadFormDraft } from '../lib/docschema.js'
import { citationPolicy, suggestPrecedents, matchedIssue } from '../lib/citation.js'
import { briefSteps, buildBrief, briefCompleteness, briefSummary, emptyBrief, stages, defenses, detectDefenses } from '../lib/brief.js'

/* 소장 초안 · 진행 중 사건에서 당사자 정보를 그대로 끌어온다 */
function CaseLoader({ setField, form }) {
  const draft = useMemo(() => loadDraft(), [])
  const { myCases } = useWorkspace()          // 데모 목록이 아니라 내가 만든 사건
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
    // 사건번호는 접수해야 나온다. 없으면 비워 두고 사용자가 채우게 한다 —
    // 내부 id(case_xxxx)를 넣으면 준비서면에 그대로 찍힌다.
    setField('caseNo', c.caseNo || '')
    setField('caseName', c.title)
    setField('plaintiff', c.plaintiff || '')
    setField('defendant', c.defendant || '')
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
        {myCases.map((c) => (
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
              <span className="block text-xs text-ink-500">
                {[c.caseNo || '사건번호 없음', c.court].filter(Boolean).join(' · ')}
              </span>
            </span>
            <Badge tone={c.status === '진행 중' ? 'green' : 'gray'}>{c.status}</Badge>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-500">
        불러오면 아래 항목이 자동으로 채워집니다.
        <b className="text-ink-700"> 사건번호는 접수해야 나오므로</b>, 아직 없으면 비워 두고 나중에 채우세요.
      </p>
    </div>
  )
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
  // 작성 중인 내용은 새로고침해도 남아야 한다 (소장과 같은 정책)
  const [form, setForm] = useState(() => loadFormDraft('brief')?.form || emptyBrief)
  const [open, setOpen] = useState(0)
  const [savedAt, setSavedAt] = useState(loadFormDraft('brief')?.savedAt || null)
  const [saveFailed, setSaveFailed] = useState(false)
  const first = useRef(true)

  const { citedList, activeCaseId, attachDoc } = useWorkspace()

  useEffect(() => {
    if (first.current) { first.current = false; return }
    const t = setTimeout(() => {
      if (saveFormDraft('brief', form)) { setSavedAt(Date.now()); setSaveFailed(false) }
      else setSaveFailed(true)
      // 사건관리에서 "이 사건의 문서"로 보이도록 붙여 둔다
      if (activeCaseId) {
        attachDoc(activeCaseId, { kind: 'brief', title: form.round || '준비서면', progress: briefCompleteness(form) })
      }
    }, 600)
    return () => clearTimeout(t)
  }, [form, activeCaseId, attachDoc])

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const extras = useMemo(() => makeBriefExtras(citedList), [citedList])
  const percent = useMemo(() => briefCompleteness(form), [form])
  const doc = useMemo(() => buildBrief(form), [form])

  return (
    <WizardShell
      onSave={() => {
        if (saveFormDraft('brief', form)) { setSavedAt(Date.now()); toast('작성 중인 내용을 저장했습니다') }
        else toast('저장에 실패했습니다. 브라우저 저장공간을 확인해 주세요', 'error')
      }}
      savedLabel={saveFailed ? '⚠ 자동저장 실패 — 브라우저 저장공간을 확인하세요' : savedAt ? `${savedAgo(savedAt)} 저장됨` : ''}
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
