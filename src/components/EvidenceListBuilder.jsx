// 증거목록 — 새로 입력받는 문서가 아니라, 이미 모은 증거를 재구성하는 문서다.
// 소장 6단계에서 고른 증거자료를 그대로 갑 제1,2,3…호증으로 번호 매겨 표로 뽑는다.
// 추가로 받아야 하는 건 딱 하나, "이 자료로 뭘 증명하려는 거예요?" = 입증취지.

import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../context/ToastContext.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { Card, Button, Badge, Progress, inputCls, cx } from './ui.jsx'
import { DocSignature, Note, Label, CourtPicker, SignatureUpload, PrintSheet, printSheet } from './docform.jsx'
import { ArrowLeft, Plus, X, FileText, Sparkles, Upload } from './icons.jsx'
import { evidenceList } from '../data/mock.js'
import { loadDraft, findType, fmtDate } from '../lib/complaint.js'

// 전자소송포털 「입증서류목록 > 표시기준」 그대로
//   · 제출자가 사건의 원고면 '갑호증', 피고면 '을호증'
//   · 본소가 소취하되어 병합 분리된 반소사건은 반소원고가 '을호증', 반소피고가 '갑호증'
//   · 독립당사자 참가인은 '병호증'
const MARKS = [
  { key: 'gap', code: '갑', label: '갑호증 — 원고' },
  { key: 'eul', code: '을', label: '을호증 — 피고' },
  { key: 'byung', code: '병', label: '병호증 — 독립당사자 참가인' },
]

/** 갑 제1호증 / 갑 제1호증의 2 — 가지번호는 한 서증이 여러 건으로 나뉠 때 쓴다 */
const evidenceNo = (code, i, branch) =>
  `${code} 제${i + 1}호증${branch ? `의 ${branch}` : ''}`

const STATUS = ['미제출', '제출예정', '제출완료', '보완필요']
const statusTone = { 미제출: 'gray', 제출예정: 'blue', 제출완료: 'green', 보완필요: 'amber' }

/** 소장 초안의 증거 체크 → 표 행으로 */
function rowsFromDraft(draft) {
  if (!draft) return null
  // 올린 파일은 제출예정, 체크만 하고 아직 안 올린 자료는 미제출로 구분해 가져온다
  const uploaded = (draft.form.evidenceFiles || []).map((x) => x.name).filter(Boolean)
  const pending = (draft.form.evidenceItems || []).filter((x) => !uploaded.includes(x))
  const rows = [
    ...uploaded.map((name) => ({ name, date: '', author: '', purpose: '', hasOriginal: '있음', status: '제출예정', original: true })),
    ...pending.map((name) => ({ name, date: '', author: '', purpose: '', hasOriginal: '있음', status: '미제출', original: true })),
  ]
  return rows.length ? rows : null
}

/** 증거 이름만 보고 입증취지 초안을 제안한다 */
const PURPOSE_HINTS = [
  [/차용증|금전소비대차/, '원·피고 간 금전 대여 약정이 있었던 사실'],
  [/계좌이체|입금|통장/, '원고가 피고에게 금원을 실제로 지급한 사실'],
  [/문자|카톡|카카오/, '당사자 사이의 대화로 채무 존재를 인정한 사실'],
  [/내용증명/, '원고가 피고에게 이행을 최고한 사실과 그 도달일'],
  [/임대차계약서/, '임대차계약의 체결과 보증금 액수'],
  [/전입세대|확정일자/, '대항력과 우선변제권을 갖춘 사실'],
  [/근로계약서/, '근로관계의 성립과 약정 임금'],
  [/급여명세서|임금대장/, '약정 임금과 미지급 금액'],
  [/출퇴근|근태/, '실제 근로시간과 연장근로 사실'],
  [/체불금품확인원/, '고용노동청이 확인한 체불 금액'],
  [/진단서|소견서/, '상해의 부위와 정도, 치료 기간'],
  [/영수증|견적서/, '실제 지출한 손해액'],
  [/등기부|등기사항/, '부동산의 표시와 소유관계'],
  [/사진|영상/, '사고 현장과 손해의 상태'],
  [/녹취/, '상대방이 채무를 인정한 진술'],
]
const suggestPurpose = (name) => PURPOSE_HINTS.find(([re]) => re.test(name))?.[1] || ''

export default function EvidenceListBuilder({ onExit }) {
  const toast = useToast()
  const { activeCaseId, attachDoc, myCases, activeCase } = useWorkspace()
  const draft = useMemo(() => loadDraft(), [])
  const draftRows = useMemo(() => rowsFromDraft(draft), [draft])
  const draftType = draft ? findType(draft.typeKey) : null

  const [mark, setMark] = useState('gap')
  const [header, setHeader] = useState(() => ({
    court: draft?.form.court || '',
    // 접수한 사건이면 사건번호가 이미 있다. 없으면 비워 둔다 — 접수 전에는 존재하지 않는 값이다.
    caseNo: activeCase?.caseNo || '',
    caseName: draftType?.caseName || '',
    plaintiff: draft?.form.pName || '',
    defendant: draft?.form.dName || '',
    signature: '',
  }))
  const [rows, setRows] = useState(() => draftRows || [])
  const [loaded, setLoaded] = useState(!!draftRows)

  const code = MARKS.find((m) => m.key === mark).code
  const setH = (k) => (e) => setHeader((h) => ({ ...h, [k]: e.target.value }))
  const update = (i, k, v) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)))
  const remove = (i) => setRows((rs) => rs.filter((_, idx) => idx !== i))
  const add = () => setRows((rs) => [...rs, { name: '', date: '', author: '', purpose: '', hasOriginal: '있음', status: '미제출' }])

  // 호증 번호는 '제출 순서'로 매겨진다(민사소송규칙 제107조 제2항).
  // 그래서 순서를 바꾸면 번호도 따라 바뀐다 — 목록 자체가 번호 체계다.
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)

  const reorder = (from, to) => {
    if (from === to || from == null || to == null) return
    setRows((rs) => {
      const next = [...rs]
      const [x] = next.splice(from, 1)
      next.splice(to, 0, x)
      return next
    })
  }
  const move = (i, dir) => setRows((rs) => {
    const to = i + dir
    if (to < 0 || to >= rs.length) return rs
    const copy = [...rs]
    ;[copy[i], copy[to]] = [copy[to], copy[i]]
    return copy
  })

  const loadFromComplaint = () => {
    if (!draftRows) return
    setRows(draftRows)
    setLoaded(true)
    toast(`소장에서 증거 ${draftRows.length}건을 불러왔습니다`)
  }
  const loadFromEvidence = () => {
    setRows(evidenceList.map((e) => ({
      name: e.file.replace(/\.[a-z]+$/i, '').replace(/_/g, ' '),
      date: e.date,
      purpose: e.purpose,
      status: e.status,
    })))
    setLoaded(true)
    toast(`증빙 자료에서 ${evidenceList.length}건을 불러왔습니다`)
  }
  const fillPurposes = () => {
    let n = 0
    setRows((rs) => rs.map((r) => {
      if (r.purpose || !r.name) return r
      const s = suggestPurpose(r.name)
      if (s) n += 1
      return s ? { ...r, purpose: s } : r
    }))
    setTimeout(() => toast(n ? `입증취지 ${n}건을 채웠습니다. 내용을 확인해 주세요` : '제안할 입증취지를 찾지 못했어요'), 0)
  }

  const withPurpose = rows.filter((r) => r.name && r.purpose).length
  const percent = rows.length === 0 ? 0 : Math.round((withPurpose / rows.length) * 100)
  const submitted = rows.filter((r) => r.status === '제출완료').length

  // 사건관리에서 "이 사건의 문서"로 보이도록 붙여 둔다
  useEffect(() => {
    if (!activeCaseId || rows.length === 0) return
    const t = setTimeout(() => {
      attachDoc(activeCaseId, { kind: 'evidence', title: `증거목록 (${code}호증 ${rows.length}건)`, progress: percent })
    }, 600)
    return () => clearTimeout(t)
  }, [activeCaseId, attachDoc, rows.length, percent, code])

  // 화면 미리보기와 인쇄본이 같은 조판을 쓰도록 한 곳에서 만든다
  const paper = (
                <div className="font-serif text-[13px] leading-loose text-ink-800">
                  <p className="print-lg text-center text-xl font-bold tracking-[0.3em] text-ink-900">증 거 목 록</p>
                  <p className="mt-1 text-center text-ink-500">({header.plaintiff ? '원고' : '제출자'} 제출 {code}호증)</p>

                  <div className="mt-6 space-y-0.5">
                    <p>사건번호　{header.caseNo ? <b className="font-semibold text-brand-500">{header.caseNo}</b> : <span className="text-ink-400">[ 사건번호 ]</span>} {header.caseName}</p>
                    <p>원　　고　{header.plaintiff ? <b className="font-semibold text-brand-500">{header.plaintiff}</b> : <span className="text-ink-400">[ 원고 ]</span>}</p>
                    <p>피　　고　{header.defendant ? <b className="font-semibold text-brand-500">{header.defendant}</b> : <span className="text-ink-400">[ 피고 ]</span>}</p>
                  </div>

                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full border-collapse text-[12px]">
                      <thead>
                        <tr className="bg-ink-100 text-ink-700">
                          <th className="border border-ink-300 px-2 py-2 font-semibold whitespace-nowrap">호증번호</th>
                          <th className="border border-ink-300 px-2 py-2 font-semibold">서증명</th>
                          <th className="border border-ink-300 px-2 py-2 font-semibold whitespace-nowrap">작성일</th>
                          <th className="border border-ink-300 px-2 py-2 font-semibold whitespace-nowrap">작성자</th>
                          <th className="border border-ink-300 px-2 py-2 font-semibold whitespace-nowrap">원본</th>
                          <th className="border border-ink-300 px-2 py-2 font-semibold">입증취지</th>
                          <th className="border border-ink-300 px-2 py-2 font-semibold whitespace-nowrap">제출</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 && (
                          <tr><td colSpan={7} className="border border-ink-300 px-2 py-6 text-center text-ink-400">증거를 추가하면 여기에 표로 정리됩니다</td></tr>
                        )}
                        {rows.map((r, i) => (
                          <tr key={i}>
                            <td className="border border-ink-300 px-2 py-2 text-center whitespace-nowrap">{evidenceNo(code, i, r.branch)}</td>
                            <td className="border border-ink-300 px-2 py-2">
                              {r.name ? <b className="font-semibold text-brand-500">{r.name}</b> : <span className="text-ink-400">[ 서증명 ]</span>}
                            </td>
                            <td className="border border-ink-300 px-2 py-2 text-center whitespace-nowrap">{r.date ? fmtDate(r.date) : '-'}</td>
                            <td className="border border-ink-300 px-2 py-2 text-center whitespace-nowrap">
                              {r.author || <span className="text-ink-300">[ 작성자 ]</span>}
                            </td>
                            <td className="border border-ink-300 px-2 py-2 text-center whitespace-nowrap">{r.hasOriginal || '있음'}</td>
                            <td className="border border-ink-300 px-2 py-2">
                              {r.purpose || <span className="text-ink-400">[ 입증취지를 채워 주세요 ]</span>}
                            </td>
                            <td className="border border-ink-300 px-2 py-2 text-center whitespace-nowrap">
                              <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="mt-4 text-ink-500">※ 각 호증은 위 「원본」란 기재와 같으며, 필요 시 법원에 제출하겠습니다.</p>

                  <DocSignature
                    date={fmtDate(new Date().toISOString().slice(0, 10))}
                    name={header.plaintiff}
                    court={header.court}
                    signature={header.signature}
                  />
                </div>
  )

  return (
    <div className="space-y-5">
      <PrintSheet>{paper}</PrintSheet>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button onClick={onExit} className="mb-2 flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-700">
            <ArrowLeft size={16} /> 문서 종류 다시 고르기
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-ink-900">증거목록 작성</h1>
            <Badge tone="blue">{MARKS.find((m) => m.key === mark).label}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-500">새로 입력할 게 거의 없어요. 이미 모은 증거에 번호를 매기고 입증취지만 채우면 됩니다.</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── 작업 영역 ── */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-bold text-ink-900">어디서 가져올까요?</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                onClick={loadFromComplaint}
                disabled={!draftRows}
                className={cx(
                  'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                  draftRows ? 'border-ink-200 hover:border-brand-200 hover:bg-brand-50/40' : 'cursor-not-allowed border-ink-100 opacity-50',
                )}
              >
                <FileText size={18} className="shrink-0 text-brand-400" />
                <span>
                  <span className="block text-sm font-bold text-ink-800">작성한 소장에서</span>
                  <span className="block text-xs text-ink-500">
                    {draftRows ? `${draftType?.title} · 증거 ${draftRows.length}건` : '소장에서 고른 증거가 아직 없어요'}
                  </span>
                </span>
              </button>
              <button
                onClick={loadFromEvidence}
                className="flex items-center gap-3 rounded-xl border border-ink-200 p-3 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/40"
              >
                <Upload size={18} className="shrink-0 text-brand-400" />
                <span>
                  <span className="block text-sm font-bold text-ink-800">증빙 자료에서</span>
                  <span className="block text-xs text-ink-500">업로드해 둔 파일 {evidenceList.length}건</span>
                </span>
              </button>
            </div>
            {!loaded && (
              <div className="mt-3">
                <Note tone="info">소장을 먼저 작성하면 거기서 고른 증거가 그대로 넘어와요. 직접 추가해도 됩니다.</Note>
                <div className="mt-2">
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
                    기재할 것은 <b className="font-semibold">문서의 제목 · 작성연월일 · 작성자 · 입증취지 · 원본 소지 여부</b>입니다.
                    호증 부호와 번호는 같은 규칙 제107조 제2항이 정한 방식(제출 순서대로 갑·을 제○호증)을 따릅니다.
                  </Note>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-bold text-ink-900">사건 정보</h3>
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
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-bold text-ink-900">증거 번호 체계</h3>
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
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <p className="text-[13px] text-ink-500">입증취지 {withPurpose} / {rows.length}건</p>
              <div className="w-24"><Progress value={percent} /></div>
              <Button size="sm" variant="soft" className="ml-auto" onClick={fillPurposes}>
                <Sparkles size={14} /> 입증취지 자동 제안
              </Button>
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
                      className="cursor-grab select-none px-1 text-ink-300 active:cursor-grabbing"
                      title="끌어서 순서 바꾸기"
                      aria-hidden
                    >⠿</span>
                    <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-500">{evidenceNo(code, i, r.branch)}</span>
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
                      title="원본 소지 여부 — 증거설명서 필수 기재사항"
                      value={r.hasOriginal || '있음'}
                      onChange={(e) => update(i, 'hasOriginal', e.target.value)}
                    >
                      <option value="있음">원본 있음</option>
                      <option value="없음">원본 없음</option>
                      <option value="사본만">사본만 소지</option>
                    </select>
                    <select
                      className="h-7 rounded-lg border border-ink-200 px-2 text-xs text-ink-700"
                      value={r.status}
                      onChange={(e) => update(i, 'status', e.target.value)}
                    >
                      {STATUS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <div className="ml-auto flex items-center gap-0.5">
                      <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-ink-400 hover:bg-ink-100 disabled:opacity-30" aria-label="위로">↑</button>
                      <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="rounded p-1 text-ink-400 hover:bg-ink-100 disabled:opacity-30" aria-label="아래로">↓</button>
                      <button onClick={() => remove(i)} className="rounded p-1 text-ink-400 hover:bg-ink-100" aria-label="삭제"><X size={14} /></button>
                    </div>
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
                </div>
              ))}
            </div>

            <button onClick={add} className="mt-3 flex items-center gap-1 text-sm font-medium text-brand-400 hover:text-brand-500">
              <Plus size={15} /> 증거 추가
            </button>

            <div className="mt-4">
              <Note tone="info">
                여기서 적은 입증취지는 소장의 입증방법란과 나중에 쓸 준비서면에서도 그대로 재사용됩니다.
              </Note>
            </div>
          </Card>

          <Card className="p-5">
            <SignatureUpload value={header.signature} onChange={(v) => setHeader((h) => ({ ...h, signature: v }))} />
          </Card>

          <Card className="sticky bottom-0 flex items-center gap-2 p-3">
            <Button variant="neutral" onClick={onExit}><ArrowLeft size={16} /> 이전</Button>
            <span className="text-xs text-ink-400">제출완료 {submitted} / {rows.length}건</span>
            <Button className="ml-auto" onClick={printSheet}>
              <FileText size={16} /> PDF 저장 · 인쇄
            </Button>
          </Card>
        </div>

        {/* ── 미리보기 ── */}
        <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-6rem)]">
          <Card className="flex h-full flex-col p-0">
            <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-5 py-3.5">
              <h3 className="font-bold text-ink-900">증거목록 미리보기</h3>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> 실시간 반영 중
              </span>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-ink-500">입증취지</span>
                <div className="w-20"><Progress value={percent} /></div>
                <span className="text-sm font-bold text-brand-400">{percent}%</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-ink-50 p-4">
              <div className="rounded-xl border border-ink-200 bg-white p-6 sm:p-8">
                {paper}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
