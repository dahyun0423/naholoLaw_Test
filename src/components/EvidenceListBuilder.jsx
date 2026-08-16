// 증거목록 — 새로 입력받는 문서가 아니라, 이미 모은 증거를 재구성하는 문서다.
// 소장 6단계에서 고른 증거자료를 그대로 갑 제1,2,3…호증으로 번호 매겨 표로 뽑는다.
// 추가로 받아야 하는 건 딱 하나, "이 자료로 뭘 증명하려는 거예요?" = 입증취지.

import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../context/ToastContext.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { Card, Button, Badge, Progress, inputCls, cx } from './ui.jsx'
import { DocSignature, Note, Label, CourtPicker, PaperSignNote, GenerateNotice, CaseLoadedBanner, SaveDecision, DocTitle, TipCard, DocumentDoneView, PrintSheet, printSheet, FolderStepNav, prettySize, readEvidenceFile, overSize, FILE_MAX_MB } from './docform.jsx'
import { ArrowLeft, ArrowRight, Plus, X, FileText, Check, Upload } from './icons.jsx'
import { loadDraft, findType, fmtDate, evidenceLabel, spaceName } from '../lib/complaint.js'
import { lastEvidenceNo } from '../lib/casebook.js'
import { missingItems } from '../lib/evidenceMatch.js'

// 전자소송포털 「입증서류목록 > 표시기준」 그대로
//   · 제출자가 사건의 원고면 '갑호증', 피고면 '을호증'
//   · 본소가 소취하되어 병합 분리된 반소사건은 반소원고가 '을호증', 반소피고가 '갑호증'
//   · 독립당사자 참가인은 '병호증'
const MARKS = [
  { key: 'gap', code: '갑', party: '원고', label: '갑호증 — 원고' },
  { key: 'eul', code: '을', party: '피고', label: '을호증 — 피고' },
  { key: 'byung', code: '병', party: '참가인', label: '병호증 — 독립당사자 참가인' },
]

/**
 * 갑 제1호증 / 갑 제1호증의 2 — 가지번호는 한 서증이 여러 건으로 나뉠 때 쓴다.
 *
 * 번호는 '제출 순서'로 매긴다(민사소송규칙 제107조 제2항). 소장과 함께 갑1~3을 이미
 * 냈다면 이번에 추가로 내는 서증은 갑4부터다 — start가 그 시작 번호다.
 */
const evidenceNo = (code, i, branch, start = 1) =>
  `${code} 제${start + i}호증${branch ? `의 ${branch}` : ''}`

/** 표 안의 짧은 표기 — 법원 서식의 「번호」란은 갑1, 갑2… 로 적는다 */
const evidenceShort = (code, i, branch, start = 1) =>
  `${code}${start + i}${branch ? `의 ${branch}` : ''}`

// 서식의 「원본」란 — 제출하는 서증이 원본인지 사본인지를 적는다.
// 민사소송규칙 제105조 제2항에 따라 서증은 사본으로 내는 것이 원칙이다.
const COPY_KINDS = ['사본', '원본']
const statusTone = { 미제출: 'gray', 제출예정: 'blue', 제출완료: 'green', 보완필요: 'amber' }

/**
 * 소장 초안에 올린 증거 파일 → 표 행으로.
 *
 * 소장 6단계의 체크리스트(evidenceItems)는 "무엇을 준비해야 하나"를 짚어 주는 준비물 목록일
 * 뿐, 아직 파일이 아니다. 증거목록은 실제로 법원에 낼 서증의 목록이라 **업로드된 파일만** 담는다.
 * 목록에 없는 자료는 여기서 바로 올리면 된다.
 */
function rowsFromDraft(draft) {
  if (!draft) return null
  const rows = (draft.form.evidenceFiles || []).filter((x) => x?.name).map((x) => ({
    name: evidenceLabel(x.name), date: '', author: '',
    purpose: '', copyKind: '사본', status: '제출예정',
    fileName: x.fileName || x.name || '', size: x.size || 0, thumb: x.thumb || '', original: true,
  }))
  return rows.length ? rows : null
}

function rowsFromCase(caseItem) {
  if (!caseItem) return null
  const form = caseItem.form || {}
  const uploaded = (form.evidenceFiles || []).map((item) => ({
    name: evidenceLabel(item.name),
    date: item.date || '',
    author: item.author || '',
    purpose: item.purpose || '',
    copyKind: item.copyKind || '사본',
    status: item.status || '제출예정',
    // 입증취지를 적으려면 **어떤 파일인지** 보여야 한다. 서증명은 고칠 수 있는 이름이라
    // 실제 파일명과 갈라지므로, 원본 파일 정보를 행에 함께 들고 다닌다.
    fileName: item.fileName || item.name || '',
    size: item.size || 0,
    thumb: item.thumb || '',
    original: true,
  })).filter((item) => item.name)
  return uploaded.length ? uploaded : null
}

/**
 * 완성 화면.
 *
 * 문서를 만들었다고 끝이 아니다 — 저장할지 정하고, 실제로 내는 데까지 이어져야 한다.
 * 그래서 (1) 저장 여부를 먼저 묻고, (2) 저장한 뒤에 갈 곳을 준다.
 */
function EvidenceDoneView({ paper, code, startNo, rows, header, percent, caseId, caseTitle, onSave, onEdit, onExit }) {
  const lastNo = startNo + rows.length - 1
  const noPurpose = rows.filter((r) => !r.purpose).length

  return (
    <DocumentDoneView
      title="AI가 정리한 증거목록"
      badge={`${code} 제${startNo}~${lastNo}호증`}
      sub="고른 증거에 제출 순서대로 번호를 매기고 법원 서식으로 정리했습니다."
      onEdit={onEdit}
      onExit={onExit}
      aside={(
        <>
          <SaveDecision
            docName="증거목록"
            caseTitle={caseTitle}
            caseId={caseId}
            onSave={onSave}
            note={`여기서 매긴 ${code} 제${lastNo}호증까지가 기록돼, 다음에 쓸 준비서면이 제${lastNo + 1}호증부터 이어서 매깁니다.`}
            warn={noPurpose > 0 ? `입증취지가 빈 증거가 ${noPurpose}건 있어요. 그대로 저장해도 되지만 나중에 채워야 합니다.` : ''}
          />
          <TipCard
            title="이제 이렇게 하시면 돼요"
            items={[
              ['서증에 번호 적기', `각 서증 사본 첫 장의 왼쪽 또는 오른쪽 중간 상단에 «${code} 제${startNo}호증»처럼 적습니다.`],
              ['사본 준비', '종이로 낸다면 상대방 수 + 1부를 냅니다 (민사소송규칙 제105조 제2항). 사본에는 「원본과 상위 없음.」이라 적고 기명날인 또는 서명하세요.'],
              ['서증과 함께 제출', '증거목록은 서증과 같이 냅니다. 전자소송이면 서류를 올릴 때 이 문서를 함께 첨부하세요.'],
              ['제출 상태 표시', '내고 나면 증빙자료에서 「제출완료」로 바꿔 두세요. 다음 서면의 호증 번호가 여기서 이어집니다.'],
            ]}
          />
          <p className="px-1 text-[12px] leading-relaxed text-ink-400">
            입증취지 {percent}% 채움 · {header.court || '법원 미입력'}
          </p>
        </>
      )}
    >
      {paper}
    </DocumentDoneView>
  )
}

/** 단계 번호 배지 — 사이드바의 번호와 본문 제목을 잇는다 */
const StepBadge = ({ n }) => (
  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-300 text-[13px] font-bold text-white">{n}</span>
)

/** 왼쪽 사이드바에 붙는 설명 — 이 문서를 언제 왜 내는지 (Figma 2721:82894) */
const WHY_THIS_DOCUMENT = [
  ['항상 내는 서면은 아니에요.', '서증이 몇 건뿐이면 소장의 「입증방법」란만으로 충분합니다.'],
  ['재판장이 명하면 그때는 반드시', '냅니다. 서증을 이해하기 어렵거나, 수가 방대하거나, 입증취지가 불분명할 때 명할 수 있어요 (민사소송규칙 제106조 제1항).'],
  ['소장을 낸 뒤', '증거를 더 낼 때 함께 씁니다.'],
  ['번호는 제출 순서대로', '붙습니다 (제107조 제2항). 이미 갑1~3을 냈다면 이번 목록은 갑4부터예요.'],
  ['늦게 내면 각하될 수 있어요', '— 적시제출주의(민사소송법 제146조), 재판장이 정한 기간(제147조), 실기한 공격·방어방법 각하(제149조).'],
]

const EVIDENCE_FILE_TIPS = [
  ['올린 파일은', '이 브라우저에만 임시 보관됩니다. 실제 제출은 전자소송포털에 직접 올리셔야 해요.'],
  ['서증명은', '그대로 목록에 인쇄되니 무슨 서류인지 알아보게 적어 주세요.'],
]

export default function EvidenceListBuilder({ onExit }) {
  const toast = useToast()
  const { activeCaseId, activeRaw, attachDoc, addEvidence, myCases, activeCase } = useWorkspace()
  const draft = useMemo(() => loadDraft(), [])
  const draftRows = useMemo(() => rowsFromDraft(draft), [draft])
  const caseRows = useMemo(() => rowsFromCase(activeRaw), [activeRaw])
  const sourceRows = caseRows || draftRows
  const draftType = activeRaw ? findType(activeRaw.typeKey) : draft ? findType(draft.typeKey) : null
  const sourceForm = activeRaw?.form || draft?.form || {}

  const [mark, setMark] = useState('gap')
  const [header, setHeader] = useState(() => ({
    court: sourceForm.court || '',
    // 접수한 사건이면 사건번호가 이미 있다. 없으면 비워 둔다 — 접수 전에는 존재하지 않는 값이다.
    caseNo: activeRaw?.caseNo || activeCase?.caseNo || '',
    caseName: activeRaw?.title || draftType?.caseName || '',
    plaintiff: sourceForm.pName || '',
    defendant: sourceForm.dName || '',
    // 서식 말미의 「○○법원 제○민사단독 귀중」 — 배당된 재판부가 있으면 함께 적는다
    courtDept: sourceForm.courtDept || '',
  }))
  const [rows, setRows] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [stepOpen, setStepOpen] = useState(0)
  // 1단계는 "어디서 가져올까"가 아니라 "무엇을 가져올까"다.
  // 사건에 올려 둔 증빙 자료를 표로 펼쳐 두고, 이번 목록에 넣을 것만 고르게 한다.
  //
  // 고른 것은 순번이 아니라 서증명으로 기억한다 — 파일을 올리면 그 자료가
  // '미제출'에서 '제출예정'으로 옮겨 가며 표의 순서가 바뀌기 때문이다.
  const [picked, setPicked] = useState(() => new Set((sourceRows || []).map((r) => r.name)))
  const sourceLabel = activeRaw?.title || draftType?.title || ''
  const togglePick = (key) => setPicked((set) => {
    const next = new Set(set)
    if (next.has(key)) next.delete(key); else next.add(key)
    return next
  })
  const allPicked = !!sourceRows && sourceRows.every((r) => picked.has(r.name))
  // 소장 6단계에서 "가지고 있다"고 체크했지만 아직 파일이 안 올라온 자료.
  // 표에 섞으면 '파일 없는 증거'가 되어 버리니, 무엇을 올려야 하는지 짚어 주는 안내로만 쓴다.
  const todoItems = missingItems((sourceForm.evidenceItems || []).filter(Boolean), sourceForm.evidenceFiles)
  // 소장·사건에서 실제로 채워진 게 있을 때만 "불러왔어요"라고 말한다
  const autoFilled = !!(sourceForm.court || sourceForm.pName || sourceForm.dName || activeRaw?.caseNo)
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set((sourceRows || []).map((r) => r.name)))
  const [uploadErr, setUploadErr] = useState('')
  // 이미 낸 서증이 있으면 이번 목록은 그다음 번호부터다.
  // 몇 호증까지 냈는지는 사건 기록에서 세어 온다 — 사용자가 기억해서 적을 값이 아니다.
  const alreadySubmitted = lastEvidenceNo(activeRaw, 'evidence')
  const [startNo, setStartNo] = useState(() => alreadySubmitted + 1)
  const [startEdit, setStartEdit] = useState(false)

  /**
   * 파일을 올리면 곧바로 사건의 증빙자료에 적재한다.
   * 증거목록에만 남겨 두면 사건 상세의 증빙자료와 어긋나므로, 저장 위치는 한 곳뿐이다.
   * 서증명은 사용자가 이미 정한 이름을 그대로 살린다.
   */
  const attachFile = async (file, name, onRow) => {
    if (!file) return
    if (overSize(file)) { setUploadErr(`${FILE_MAX_MB}MB를 넘는 파일은 올릴 수 없어요 — ${file.name}`); return }
    setUploadErr('')
    const record = await readEvidenceFile(file, name)
    if (activeCaseId) addEvidence(activeCaseId, record)
    onRow?.(record)
    return record
  }

  /** 1단계에서 바로 올리기 — 증빙자료에 쌓이고, 표에도 선택된 상태로 나타난다 */
  const uploadToSource = async (fileList, name = '') => {
    const list = Array.from(fileList || [])
    if (!list.length) return
    const added = []
    for (const file of list) {
      // 준비물 목록에서 올린 것은 그 항목 이름이 곧 서증명이다 (파일명보다 알아보기 쉽다)
      const rec = await attachFile(file, list.length === 1 ? name : '')
      if (rec) added.push(rec)
    }
    if (!added.length) return
    setPicked((set) => new Set([...set, ...added.map((r) => evidenceLabel(r.name))]))
    toast(`${added.length}건을 증빙자료에 올렸어요`)
  }

  const code = MARKS.find((m) => m.key === mark).code
  const party = MARKS.find((m) => m.key === mark).party
  const setH = (k) => (e) => setHeader((h) => ({ ...h, [k]: e.target.value }))
  const update = (i, k, v) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)))
  const remove = (i) => setRows((rs) => rs.filter((_, idx) => idx !== i))

  // 호증 번호는 '제출 순서'로 매겨진다(민사소송규칙 제107조 제2항).
  // 그래서 순서를 바꾸면 번호도 따라 바뀐다 — 목록 자체가 번호 체계다.
  // 소장과 같은 마무리 — 「작성 중」 모달 → 「완성」 모달 → 완성 페이지
  const [phase, setPhase] = useState(null)
  useEffect(() => {
    if (phase !== 'generating' && phase !== 'ready') return undefined
    const next = phase === 'generating' ? 'ready' : 'full'
    const id = setTimeout(() => setPhase(next), phase === 'generating' ? 1600 : 1100)
    return () => clearTimeout(id)
  }, [phase])

  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)
  // 비고는 가림 처리처럼 특이사항이 있을 때만 쓴다 — 기본은 접어 둔다
  const [remarkOpen, setRemarkOpen] = useState(() => new Set())
  const openRemark = (i) => setRemarkOpen((set) => new Set([...set, i]))

  const reorder = (from, to) => {
    if (from === to || from == null || to == null) return
    setRows((rs) => {
      const next = [...rs]
      const [x] = next.splice(from, 1)
      next.splice(to, 0, x)
      return next
    })
  }

  const loadPicked = () => {
    if (!sourceRows) return
    // 표에 보이는 순서 그대로 가져온다 — 이 순서가 곧 호증 번호가 된다
    const chosen = sourceRows.filter((r) => picked.has(r.name))
    if (!chosen.length) return
    setRows(chosen)
    setLoaded(true)
    setStepOpen(1)
    toast(`증빙 자료 ${chosen.length}건을 불러왔습니다`)
  }
  const withPurpose = rows.filter((r) => r.name && r.purpose).length
  const percent = rows.length === 0 ? 0 : Math.round((withPurpose / rows.length) * 100)
  const ready = rows.length > 0 && percent === 100
  const evidenceNavItems = [
    { title: '증거 올리기', done: loaded || rows.length > 0, missing: loaded || rows.length > 0 ? 0 : 1 },
    { title: '사건 정보', done: !!(header.court && header.plaintiff && header.defendant), missing: [header.court, header.plaintiff, header.defendant].filter((value) => !value).length },
    { title: '입증취지 정리', done: ready, missing: Math.max(0, rows.length - withPurpose) || (rows.length ? 0 : 1) },
  ]

  /**
   * 사건에 저장한다. 저장해야 사건관리의 문서 목록에 남고,
   * 여기서 매긴 마지막 호증 번호가 기록되어 다음 서면이 이어서 매긴다.
   */
  const saveToCase = () => {
    if (!activeCaseId || rows.length === 0) return false
    attachDoc(activeCaseId, {
      kind: 'evidence',
      title: `증거목록 (${code} 제${startNo}~${startNo + rows.length - 1}호증)`,
      progress: percent,
      endNo: startNo + rows.length - 1,
      newVersion: true,
    })
    return true
  }

  // 화면 미리보기와 인쇄본이 같은 조판을 쓰도록 한 곳에서 만든다
  const paper = (
                <div className="font-serif text-[13px] leading-loose text-ink-800">
                  {/* 표제 — 번들 서식: 「증  거  목  록  (원고)」 */}
                  <p className="print-lg text-center text-xl font-bold tracking-[0.3em] text-ink-900">
                    증 거 목 록 <span className="tracking-normal">({party})</span>
                  </p>

                  {/* 당사자 표시 — 서식은 「사 건 / 원 고 / 피 고」 순서다 */}
                  <div className="mt-6 space-y-0.5">
                    <p>사　　　건　{header.caseNo ? <b className="font-semibold text-brand-500">{header.caseNo}</b> : <span className="text-ink-400">[ 사건번호 ]</span>}{header.caseName ? `  ${header.caseName}` : ''}</p>
                    <p>원　　　고　{header.plaintiff ? <b className="font-semibold text-brand-500">{spaceName(header.plaintiff)}</b> : <span className="text-ink-400">[ 원고 ]</span>}</p>
                    <p>피　　　고　{header.defendant ? <b className="font-semibold text-brand-500">{spaceName(header.defendant)}</b> : <span className="text-ink-400">[ 피고 ]</span>}</p>
                  </div>

                  {/* 열 순서는 서식 그대로: 번호 · 서증명 · 입증취지 · 원본 · 작성자 · 작성일.
                      제출 상태는 우리가 관리하는 값이라 제출본에는 넣지 않는다. */}
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full border-collapse text-[12px]">
                      <thead>
                        <tr className="bg-ink-100 text-ink-700">
                          <th className="border border-ink-300 px-2 py-2 font-semibold whitespace-nowrap">번호</th>
                          <th className="border border-ink-300 px-2 py-2 font-semibold">서 증 명</th>
                          <th className="border border-ink-300 px-2 py-2 font-semibold">입 증 취 지</th>
                          <th className="border border-ink-300 px-2 py-2 font-semibold whitespace-nowrap">원본</th>
                          <th className="border border-ink-300 px-2 py-2 font-semibold whitespace-nowrap">작성자</th>
                          <th className="border border-ink-300 px-2 py-2 font-semibold whitespace-nowrap">작 성 일</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 && (
                          <tr><td colSpan={6} className="border border-ink-300 px-2 py-6 text-center text-ink-400">증거를 추가하면 여기에 표로 정리됩니다</td></tr>
                        )}
                        {rows.map((r, i) => (
                          <tr key={i}>
                            <td className="border border-ink-300 px-2 py-2 text-center whitespace-nowrap">{evidenceShort(code, i, r.branch, startNo)}</td>
                            <td className="border border-ink-300 px-2 py-2">
                              {r.name ? <b className="font-semibold text-brand-500">{r.name}</b> : <span className="text-ink-400">[ 서증명 ]</span>}
                            </td>
                            <td className="border border-ink-300 px-2 py-2">
                              {r.purpose || <span className="text-ink-400">[ 입증취지를 채워 주세요 ]</span>}
                            </td>
                            <td className="border border-ink-300 px-2 py-2 text-center whitespace-nowrap">{r.copyKind || '사본'}</td>
                            <td className="border border-ink-300 px-2 py-2 text-center whitespace-nowrap">
                              {r.author || <span className="text-ink-300">[ 작성자 ]</span>}
                            </td>
                            <td className="border border-ink-300 px-2 py-2 text-center whitespace-nowrap">{r.date ? fmtDate(r.date) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 비고 — 서식에서는 가림 처리 같은 특이사항을 ※로 덧붙인다. 없으면 인쇄하지 않는다. */}
                  {rows.some((r) => r.remark) && (
                    <div className="mt-4 space-y-1">
                      {rows.map((r, i) => (r.remark ? (
                        <p key={i}>※ {evidenceNo(code, i, r.branch, startNo)}에는 {r.remark}</p>
                      ) : null))}
                    </div>
                  )}

                  <DocSignature
                    date={fmtDate(new Date().toISOString().slice(0, 10))}
                    role={`위 ${party}`}
                    name={spaceName(header.plaintiff)}
                    court={[header.court, header.courtDept].filter(Boolean).join(' ')}
                  />
                </div>
  )

  if (phase === 'full') {
    return (
      <>
        <PrintSheet>{paper}</PrintSheet>
        <EvidenceDoneView
          paper={paper}
          code={code}
          startNo={startNo}
          rows={rows}
          header={header}
          percent={percent}
          caseId={activeCaseId}
          caseTitle={sourceLabel}
          onSave={saveToCase}
          onEdit={() => setPhase(null)}
          onExit={onExit}
        />
      </>
    )
  }

  return (
    <div className="space-y-5">
      <PrintSheet>{paper}</PrintSheet>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button onClick={onExit} className="mb-2 flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-700">
            <ArrowLeft size={16} /> 문서 종류 다시 고르기
          </button>
          <DocTitle title="증거목록 작성" badge={MARKS.find((m) => m.key === mark).label} />
          <p className="mt-1 text-sm text-ink-500">새로 입력할 게 거의 없어요. 이미 모은 증거에 번호를 매기고 입증취지만 채우면 됩니다.</p>
        </div>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <FolderStepNav
          title="증거목록 작성"
          badge={MARKS.find((m) => m.key === mark).label}
          items={evidenceNavItems}
          activeIndex={stepOpen}
          onSelect={setStepOpen}
          aside={(
            <>
              <TipCard title="이 문서, 언제 왜 내나요?" items={WHY_THIS_DOCUMENT} />
              <TipCard title="파일에 대해" items={EVIDENCE_FILE_TIPS} />
            </>
          )}
        />

        {/* ── 작업 영역 ── */}
        <div className="min-w-0 flex-1 space-y-4">
          {stepOpen === 0 && <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 gap-2.5">
                <StepBadge n={1} />
                <div className="min-w-0">
                <h3 className="font-bold text-ink-900">목록에 넣을 증빙 자료를 고르세요</h3>
                <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-ink-500">
                  {sourceRows
                    ? `${sourceLabel ? `「${sourceLabel}」에 ` : ''}올려 둔 파일이에요. 체크한 것만 목록에 들어가고, 표 순서대로 ${code} 제${startNo}호증부터 번호가 매겨집니다.`
                    : '아직 이 사건에 올린 증빙 자료가 없어요.'}
                  {' '}목록에 없는 자료는 <b className="font-semibold text-ink-600">「파일 추가 업로드」</b>로 올리세요 — 표에 바로 추가되고 사건의 증빙자료에도 저장됩니다.
                </p>
                </div>
              </div>
              {/* 목록에 없는 자료는 여기서 바로 올린다 — 증빙자료 화면에서 올리는 것과 같은 동작이다 */}
              <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-brand-300 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-400">
                <Upload size={15} /> 파일 추가 업로드
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => { const files = Array.from(e.target.files || []); e.target.value = ''; uploadToSource(files) }}
                />
              </label>
            </div>

            {sourceRows ? (
              <>
                <div className="mt-4 overflow-x-auto rounded-xl border border-ink-200">
                  <table className="w-full border-collapse text-left text-[13px]">
                    <thead className="bg-ink-50 text-ink-500">
                      <tr>
                        <th className="w-10 px-3 py-2.5">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-brand-300"
                            checked={allPicked}
                            onChange={toggleAll}
                            aria-label="전체 선택"
                          />
                        </th>
                        <th className="px-3 py-2.5 font-semibold">자료</th>
                        <th className="w-24 px-3 py-2.5 font-semibold whitespace-nowrap">상태</th>
                        <th className="px-3 py-2.5 font-semibold">입증취지</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourceRows.map((r, i) => (
                        <tr
                          key={r.name || i}
                          onClick={() => togglePick(r.name)}
                          className={cx(
                            'cursor-pointer border-t border-ink-100 transition-colors',
                            picked.has(r.name) ? 'bg-brand-50/50' : 'hover:bg-ink-50',
                          )}
                        >
                          <td className="px-3 py-2.5 align-top">
                            <input
                              type="checkbox"
                              className="pointer-events-none h-4 w-4 accent-brand-300"
                              checked={picked.has(r.name)}
                              readOnly
                              tabIndex={-1}
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink-200 bg-white">
                                {r.thumb
                                  ? <img src={r.thumb} alt="" className="h-full w-full object-cover" />
                                  : <FileText size={15} className="text-ink-300" />}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate font-medium text-ink-800">{r.name}</span>
                                <span className="block truncate text-[11px] text-ink-400">
                                  {r.fileName}{r.size ? ` · ${prettySize(r.size)}` : ''}
                                </span>
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 align-top whitespace-nowrap">
                            <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                          </td>
                          <td className="px-3 py-2.5 align-top text-ink-500">
                            {r.purpose || <span className="text-ink-300">3단계에서 적어요</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {uploadErr && <p className="mt-2 text-[13px] font-medium text-red-500">{uploadErr}</p>}

                {todoItems.length > 0 && (
                  <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50/50 p-3.5">
                    <p className="text-[13px] font-bold text-brand-600">아직 안 올린 자료가 있어요</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-brand-600">
                      소장에서 「가지고 있다」고 체크한 자료예요. 눌러서 그 파일을 올리면 그 이름 그대로 서증명이 됩니다.
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {todoItems.map((item) => (
                        <label
                          key={item}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-brand-500 transition-colors hover:bg-brand-50"
                        >
                          <Upload size={12} /> {item}
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              e.target.value = ''
                              uploadToSource(file ? [file] : [], item)
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Button onClick={loadPicked} disabled={picked.size === 0}>
                    선택된 {picked.size}건 불러오기
                  </Button>
                  <span className="text-xs text-ink-400">
                    {loaded ? `현재 목록에 ${rows.length}건이 들어 있어요. 다시 고르면 목록이 교체됩니다.` : '고른 자료가 아래 단계의 호증 목록이 됩니다.'}
                  </span>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-ink-200 bg-ink-50 p-6 text-center">
                <p className="text-[13px] text-ink-400">
                  소장 6단계에서 올린 증거가 여기에 그대로 나타나요.<br />
                  아직 없다면 위 「파일 추가 업로드」로 올리면 됩니다 — 사건의 증빙자료에도 함께 저장돼요.
                </p>
                {uploadErr && <p className="mt-2 text-[13px] font-medium text-red-500">{uploadErr}</p>}
              </div>
            )}


            {!loaded && (
              <div className="mt-3">
                {!sourceRows && (
                  <div className="mb-2">
                    <Note tone="info">소장을 먼저 작성하면 거기서 고른 증거가 그대로 넘어와요. 직접 추가해도 됩니다.</Note>
                  </div>
                )}
                <div>
                  <Note tone="warn">
                    <b className="font-semibold">종이로 낼 때</b>는 서증 사본에 <b className="font-semibold">「원본과 상위 없음.」</b>이라고 적고 기명날인 또는 서명해야 합니다.
                    호증번호는 서증 첫 페이지의 <b className="font-semibold">왼쪽 또는 오른쪽 중간 상단</b>에 적고,
                    사본은 <b className="font-semibold">상대방 수 + 1</b>부를 냅니다.
                    <br /><b className="font-semibold">전자소송</b>으로 내면 입력한 서증이 최종 제출문서에 자동으로 목록화돼요.
                  </Note>
                </div>
                <div className="mt-2">
                  <Note tone="ok">
                    이 문서는 법에서 「증거설명서」라고 불러요. 민사소송규칙 제106조 제1항에 따라 <b className="font-semibold">서증이 많거나 입증취지가 불분명할 때 재판장이 제출을 명할 수 있는</b> 문서입니다.
                    항상 내야 하는 건 아니지만, 증거가 여러 건이면 처음부터 함께 내는 것이 실무예요.
                    서증을 낼 때 밝혀야 하는 것은 <b className="font-semibold">문서의 제목 · 작성자 · 작성일</b>이고(같은 규칙 제105조 제1항), 여기에 <b className="font-semibold">입증취지</b>와 <b className="font-semibold">원본·사본의 구별</b>을 더해 표로 만든 것이 이 문서예요.
                    호증 부호와 번호는 같은 규칙 제107조 제2항이 정한 방식(제출 순서대로 갑·을 제○호증)을 따릅니다.
                  </Note>
                </div>
              </div>
            )}
          </Card>}

          {stepOpen === 1 && <Card className="p-5">
            <h3 className="flex items-center gap-2.5 font-bold text-ink-900"><StepBadge n={2} /> 사건 정보</h3>
            {autoFilled && <div className="mt-3"><CaseLoadedBanner caseTitle={sourceLabel} /></div>}
            <div className="mt-3 space-y-4">
              <div><Label required>법원</Label><CourtPicker value={header.court} onChange={(c) => setHeader((h) => ({ ...h, court: c }))} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><Label required>사건번호</Label>
                  <input
                    className={inputCls}
                    placeholder="2026가단123456 (접수 전이면 비워두세요)"
                    value={header.caseNo}
                    onChange={setH('caseNo')}
                    list="case-ids"
                  />
                  {/* 접수한 내 사건에서 고른다. 접수 전 사건은 번호가 없으니 뜨지 않는다. */}
                  <datalist id="case-ids">
                    {myCases.filter((c) => c.caseNo).map((c) => <option key={c.id} value={c.caseNo}>{c.title}</option>)}
                  </datalist>
                </label>
                <label className="block"><Label>사건명</Label><input className={inputCls} placeholder="대여금" value={header.caseName} onChange={setH('caseName')} /></label>
                <label className="block"><Label required>원고</Label><input className={inputCls} placeholder="홍길동" value={header.plaintiff} onChange={setH('plaintiff')} /></label>
                <label className="block"><Label required>피고</Label><input className={inputCls} placeholder="김철수" value={header.defendant} onChange={setH('defendant')} /></label>
                {/* 배당된 재판부 — 서식 말미가 「○○법원 제○민사단독 귀중」이다 */}
                <label className="block">
                  <Label info={'사건이 배당된 재판부예요. 소장 접수 후 받은 안내문이나 나의 사건 검색에서 확인할 수 있어요.\n모르면 비워 두세요 — 법원 이름만 적힙니다.'}>재판부 (선택)</Label>
                  <input className={inputCls} placeholder="제12민사단독" value={header.courtDept} onChange={setH('courtDept')} />
                </label>
              </div>
            </div>
          </Card>}

          {stepOpen === 2 && <Card className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="flex items-center gap-2.5 font-bold text-ink-900"><StepBadge n={3} /> 증거 번호 체계</h3>
              <div className="inline-flex rounded-xl bg-ink-100 p-1">
                {MARKS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMark(m.key)}
                    className={cx('rounded-lg px-3.5 py-1.5 text-sm transition-colors', mark === m.key ? 'bg-brand-300 font-semibold text-white' : 'text-ink-500 hover:text-ink-700')}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-[13px] text-ink-500">
                <span>시작 호증 번호</span>
                {startEdit ? (
                  <input
                    type="number"
                    min={1}
                    autoFocus
                    className="h-8 w-16 rounded-lg border border-ink-200 px-2 text-sm text-ink-700"
                    value={startNo}
                    onChange={(e) => setStartNo(Math.max(1, Number(e.target.value) || 1))}
                    onBlur={() => setStartEdit(false)}
                  />
                ) : (
                  <>
                    <b className="font-semibold text-brand-500">{code} 제{startNo}호증</b>
                    <button onClick={() => setStartEdit(true)} className="text-[12px] text-ink-400 underline hover:text-brand-400">수정</button>
                  </>
                )}
              </div>
            </div>
            <p className="mt-2 text-[12px] text-ink-400">
              {alreadySubmitted > 0
                ? `이 사건에서 ${code} 제${alreadySubmitted}호증까지 이미 냈어요 — 사건 기록에서 세어 자동으로 맞췄습니다.`
                : '아직 낸 서증이 없어서 제1호증부터 매깁니다.'}
            </p>

            {uploadErr && <p className="mt-3 text-[13px] font-medium text-red-500">{uploadErr}</p>}

            <Note tone="info">
              <b className="font-semibold">끌어서 순서를 바꾸면 호증 번호가 다시 매겨져요.</b>{' '}
              번호는 제출 순서대로 붙습니다(민사소송규칙 제107조 제2항). 자료를 더 올리려면 1단계로 돌아가세요.
            </Note>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <p className="text-[13px] text-ink-500">입증취지 {withPurpose} / {rows.length}건</p>
              <div className="w-24"><Progress value={percent} /></div>
            </div>

            <div className="mt-4 space-y-3">
              {rows.length === 0 && (
                <p className="rounded-xl border border-dashed border-ink-200 bg-ink-50 p-6 text-center text-[13px] text-ink-400">
                  증거가 없어요. 위에서 불러오거나 아래 버튼으로 추가하세요.
                </p>
              )}
              {rows.map((r, i) => (
                <div
                  key={i}
                  draggable
                  onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move' }}
                  onDragOver={(e) => { e.preventDefault(); setOverIdx(i) }}
                  onDragLeave={() => setOverIdx((v) => (v === i ? null : v))}
                  onDrop={(e) => { e.preventDefault(); reorder(dragIdx, i); setDragIdx(null); setOverIdx(null) }}
                  onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
                  className={cx(
                    'rounded-xl border bg-white p-3 transition-colors',
                    dragIdx === i ? 'border-brand-300 opacity-50'
                      : overIdx === i ? 'border-brand-300 bg-brand-50/50'
                        : 'border-ink-200',
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    {/* 드래그 핸들 — 마우스로 순서를 바꾸면 호증 번호가 다시 매겨진다 */}
                    <span
                      className="cursor-grab select-none rounded-md px-1.5 py-1 text-base leading-none text-ink-300 hover:bg-ink-100 hover:text-ink-500 active:cursor-grabbing"
                      title="끌어서 순서 바꾸기 — 순서가 곧 호증 번호입니다"
                      aria-hidden
                    >⠿</span>
                    <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-500">{evidenceNo(code, i, r.branch, startNo)}</span>
                    {/* 가지번호 — 한 서증이 여러 건으로 나뉠 때 (갑 제1호증의 2) */}
                    <input
                      className="h-7 w-16 rounded-lg border border-ink-200 px-2 text-xs text-ink-700 placeholder:text-ink-300"
                      placeholder="가지"
                      title="가지번호 — 한 서증을 여러 건으로 나눌 때 (예: 갑 제1호증의 2)"
                      value={r.branch || ''}
                      onChange={(e) => update(i, 'branch', e.target.value.replace(/[^0-9]/g, ''))}
                    />
                    <input
                      className="h-7 w-28 rounded-lg border border-ink-200 px-2 text-xs text-ink-700 placeholder:text-ink-300"
                      placeholder="작성자"
                      title="문서를 작성한 사람 — 증거설명서 필수 기재사항"
                      value={r.author || ''}
                      onChange={(e) => update(i, 'author', e.target.value)}
                    />
                    <select
                      className="h-7 rounded-lg border border-ink-200 px-2 text-xs text-ink-700"
                      title="서식의 「원본」란 — 내는 서증이 원본인지 사본인지. 서증은 사본으로 내는 것이 원칙입니다 (민사소송규칙 제105조 제2항)."
                      value={r.copyKind || '사본'}
                      onChange={(e) => update(i, 'copyKind', e.target.value)}
                    >
                      {COPY_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                    <div className="ml-auto flex items-center gap-0.5">
                      <button onClick={() => remove(i)} className="rounded p-1 text-ink-400 hover:bg-ink-100" aria-label="삭제"><X size={14} /></button>
                    </div>
                  </div>
                  {/* 입증취지는 "이 파일이 무엇을 증명하는가"다. 어떤 파일인지 안 보이면 쓸 수가 없다. */}
                  <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-ink-50 px-2.5 py-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink-200 bg-white">
                      {r.thumb
                        ? <img src={r.thumb} alt="" className="h-full w-full object-cover" />
                        : <FileText size={15} className="text-ink-300" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium text-ink-700">{r.fileName}</span>
                      <span className="block text-[11px] text-ink-400">
                        {r.size ? `${prettySize(r.size)} · ` : ''}실제 파일명 — 아래 서증명은 달라도 됩니다
                      </span>
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[1fr_10rem]">
                    <input className={cx(inputCls, 'h-10 text-sm')} placeholder="서증명 (예: 차용증)" value={r.name} onChange={(e) => update(i, 'name', e.target.value)} />
                    <input type="date" className={cx(inputCls, 'h-10 text-sm')} value={r.date} onChange={(e) => update(i, 'date', e.target.value)} />
                  </div>
                  <input
                    className={cx(inputCls, 'mt-2 h-10 text-sm', !r.purpose && r.name && 'border-red-200 bg-red-50/40')}
                    placeholder="이 자료로 뭘 증명하려는 거예요?"
                    value={r.purpose}
                    onChange={(e) => update(i, 'purpose', e.target.value)}
                  />
                  {/* 비고 — 서식에서는 표 아래 「※ 갑 제○호증에는 …」 한 줄로 붙는다 */}
                  {remarkOpen.has(i) || r.remark ? (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 text-[12px] text-ink-400">※ {evidenceNo(code, i, r.branch, startNo)}에는</span>
                        <input
                          className={cx(inputCls, 'h-9 text-sm')}
                          placeholder="제3자의 전화번호가 포함되어 있어 해당 부분을 가림 처리하였습니다."
                          value={r.remark || ''}
                          onChange={(e) => update(i, 'remark', e.target.value)}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-ink-400">가림 처리·사본 상태처럼 이 서증에만 해당하는 사정을 적으면, 표 아래에 ※ 한 줄로 붙습니다.</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => openRemark(i)}
                      className="mt-2 text-[12px] font-medium text-ink-400 hover:text-brand-400"
                    >
                      ＋ 비고 (가림 처리 등 특이사항)
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4">
              <Note tone="info">
                여기서 적은 입증취지는 소장의 입증방법란과 나중에 쓸 준비서면에서도 그대로 재사용됩니다.
              </Note>
            </div>
          </Card>}

          {/* 나가기는 위쪽 「문서 종류 다시 고르기」 하나뿐이다 —
              단계를 되돌리는 자리에 화면을 닫는 버튼을 같이 두지 않는다. */}
          <Card className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 bg-white/95 p-3 backdrop-blur-sm">
            <span className="text-xs text-ink-400">입증취지 {withPurpose} / {rows.length}건</span>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              {stepOpen > 0 && <Button variant="neutral" onClick={() => setStepOpen((current) => current - 1)}>이전 단계</Button>}
              {stepOpen < evidenceNavItems.length - 1
                ? <Button onClick={() => setStepOpen((current) => current + 1)}>다음 단계 <ArrowRight size={16} /></Button>
                : <Button disabled={rows.length === 0} onClick={() => setPhase('generating')}>증거목록 완성하기 <ArrowRight size={16} /></Button>}
            </div>
          </Card>
        </div>
      </div>

      {(phase === 'generating' || phase === 'ready') && (
        <GenerateNotice
          done={phase === 'ready'}
          doc="증거목록"
          workingSub="고른 증거에 호증 번호를 매기고 법원 서식으로 정리하고 있어요"
          doneSub="번호와 입증취지를 확인해볼까요?"
        />
      )}
    </div>
  )
}
