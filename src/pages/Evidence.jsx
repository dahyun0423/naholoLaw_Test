import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { caseEvidence, EVIDENCE_STATUS, EVIDENCE_TONE } from '../lib/casebook.js'
import CaseBar from '../components/CaseBar.jsx'
import { Card, Badge, Button, Progress, Field, Input, inputCls, cx } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import {
  evidenceList, evidenceAi, activeCase, courtUrl,
  evidenceFolders, evidenceStorage, evidenceRecent, evidenceTips,
} from '../data/mock.js'
import { Upload, Folder, FileText, Image, AlertTriangle, Sparkles, Check, Plus, Eye, ArrowLeft, ExternalLink, ChevronDown, ArrowRight } from '../components/icons.jsx'

const statusTone = { 제출완료: 'green', 제출예정: 'blue', 보완필요: 'amber', 미제출: 'gray', 대기중: 'gray', 검토중: 'blue' }
const today = new Date().toISOString().slice(0, 10)
const isImage = (name = '') => /\.(jpg|jpeg|png|gif|webp)$/i.test(name)

/* 다운로드/삭제 액션 아이콘 (인라인 SVG) */
const Download = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M5 21h14" />
  </svg>
)
const Trash = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" /><path d="M10 11v6M14 11v6" />
  </svg>
)

/* ── 폴더 카드 (호버 시 카테고리·용량·파일 수 오버레이) ── */
function FolderTile({ folder, onClick }) {
  const active = folder.tone === 'blue'
  return (
    <button
      onClick={onClick}
      className={cx(
        'group relative h-[232px] w-full overflow-hidden rounded-[22px] border-2 bg-gradient-to-b p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg',
        active ? 'border-transparent from-[#64a8ff] to-[#3182f6]' : 'border-ink-200/70 from-[#f3f4f6] to-[#e5e8eb]',
      )}
    >
      {/* 폴더 + 겹쳐진 서류 그래픽 */}
      <div className="pointer-events-none absolute inset-x-5 top-5 h-[120px]">
        <div className="absolute left-3 right-9 top-2 h-[92px] -rotate-6 rounded-lg bg-white/70 shadow-sm" />
        <div className="absolute left-9 right-3 top-1 h-[92px] rotate-3 rounded-lg bg-white/90 shadow-sm" />
        <div className={cx('absolute inset-x-0 bottom-0 grid h-[74px] place-items-center rounded-xl', active ? 'bg-white/25' : 'bg-white/55')}>
          <Folder size={40} className={active ? 'text-white' : 'text-ink-300'} />
        </div>
      </div>
      <div className="absolute inset-x-5 bottom-5">
        <p className={cx('text-lg font-bold', active ? 'text-white' : 'text-ink-900')}>{folder.name}</p>
        <p className={cx('mt-0.5 text-sm font-medium', active ? 'text-white/85' : 'text-ink-500')}>{folder.files.length} 파일</p>
        <p className={cx('mt-2 text-xs font-medium', active ? 'text-white/70' : 'text-ink-400')}>{folder.size}</p>
      </div>

      {/* 호버 오버레이 */}
      <div className="absolute inset-0 flex flex-col justify-end gap-1.5 bg-gradient-to-t from-ink-900/80 via-ink-900/35 to-transparent p-5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <span className="inline-flex w-fit rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur">증빙 카테고리</span>
        <p className="text-base font-bold text-white">{folder.name}</p>
        <div className="flex items-center gap-1.5 text-xs font-medium text-white/90">
          <Folder size={13} /> {folder.files.length}개 파일
          <span className="text-white/50">·</span> {folder.size}
        </div>
        <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-white/75">클릭하여 폴더 열기 →</p>
      </div>
    </button>
  )
}

/* ── 저장공간 카드 ── */
function StorageCard({ totalFiles, submitted }) {
  const usedPct = Math.round((evidenceStorage.used / evidenceStorage.total) * 100)
  return (
    <Card className="p-6">
      <h3 className="text-[17px] font-bold text-ink-900">저장공간</h3>
      <div className="mt-4 flex items-end justify-between">
        <span className="text-3xl font-bold text-ink-900">{evidenceStorage.used} GB</span>
        <span className="text-sm text-ink-500">/ {evidenceStorage.total} GB</span>
      </div>
      <div className="mt-2"><Progress value={usedPct} /></div>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between"><span className="text-ink-500">총 파일</span><span className="font-semibold text-ink-900">{totalFiles}개</span></div>
        <div className="flex items-center justify-between"><span className="text-ink-500">제출 완료</span><span className="font-semibold text-brand-600">{submitted}개</span></div>
      </div>
    </Card>
  )
}

/* ── 최근 활동 카드 ── */
function RecentCard() {
  return (
    <Card className="p-6">
      <h3 className="text-[17px] font-bold text-ink-900">최근 활동</h3>
      <ul className="mt-4 space-y-3">
        {evidenceRecent.map((r, i) => {
          const Icon = r.kind === 'img' ? Image : FileText
          return (
            <li key={i} className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-ink-100 text-ink-500"><Icon size={16} /></span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-900">{r.name}</p>
                <p className="text-xs text-ink-400">{r.date}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/* ── Properties 카드 (폴더 상세) ── */
function PropertiesCard({ folder }) {
  return (
    <Card className="p-6">
      <h3 className="text-[17px] font-bold text-ink-900">Properties</h3>
      <dl className="mt-4 space-y-3 text-sm">
        <div><dt className="text-ink-400">Type</dt><dd className="mt-0.5 font-semibold text-ink-900">{folder.name}</dd></div>
        <div><dt className="text-ink-400">Size</dt><dd className="mt-0.5 font-semibold text-ink-900">{folder.size}</dd></div>
        <div><dt className="text-ink-400">Files</dt><dd className="mt-0.5 font-semibold text-ink-900">{folder.files.length} items</dd></div>
        <div>
          <dt className="text-ink-400">Tags</dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">{folder.tags.map((t) => <Badge key={t} tone="blue">{t}</Badge>)}</dd>
        </div>
      </dl>
    </Card>
  )
}

export default function Evidence() {
  // 소장에서 올린 파일이 곧 갑호증이다. 내 사건이 있으면 그것을 보여주고,
  // 없으면 화면 구성을 보여주기 위한 예시 목록을 쓴다.
  const { activeRaw, hasMyCase, saveEvidenceStatus, saveEvidence } = useWorkspace()
  // 내 사건의 증거가 있으면 그것이 목록이다. 상태는 사건에 저장되므로
  // 새로고침해도, 증거목록·절차 안내에서 읽어도 같은 값이 나온다.
  const mine = activeRaw ? caseEvidence(activeRaw) : []
  const real = mine.length > 0
  const [view, setView] = useState('list') // 'list' | 'folder'
  const [demo, setDemo] = useState(evidenceList)
  const list = real ? mine : demo
  const setList = real ? () => {} : setDemo
  const [folders, setFolders] = useState(evidenceFolders)
  const [openKey, setOpenKey] = useState(null) // 열린 폴더 key

  const [toast, setToast] = useState('')
  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 1800) }

  // 모달 상태
  const [submitTarget, setSubmitTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({ file: '', purpose: '' })
  const [preview, setPreview] = useState(null) // { title, file, size, status }
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderCat, setNewFolderCat] = useState('')   // 카테고리(태그), 쉼표 구분
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [uploadFolder, setUploadFolder] = useState('')   // 업로드 대상 폴더 key
  const [tagInput, setTagInput] = useState('')           // 폴더 상세에서 카테고리 추가

  const openFolder = folders.find((f) => f.key === openKey) || null
  const submitted = list.filter((e) => e.status === '제출완료').length
  const rate = Math.round((submitted / list.length) * 100)
  const notSubmitted = list.filter((e) => e.status === '미제출').length
  const totalFiles = folders.reduce((s, f) => s + f.files.length, 0)

  // 액션
  const openEdit = (e) => { setEditTarget(e); setEditForm({ file: e.file, purpose: e.purpose }) }

  const doSubmit = () => {
    // 대한민국 법원 전자소송 사이트로 연동 (새 창)
    window.open(courtUrl, '_blank', 'noopener,noreferrer')
    if (real) saveEvidenceStatus(activeRaw.id, submitTarget.no, '제출완료')
    else setDemo((prev) => prev.map((e) =>
      e.no === submitTarget.no ? { ...e, status: '제출완료', tone: 'blue', dateLabel: '제출일', date: today } : e))
    flash('전자소송 사이트로 이동했습니다 · 제출완료 처리')
    setSubmitTarget(null)
  }

  /** 상태를 직접 옮긴다 — 법원 시스템을 조회할 수 없으니 사용자가 표시한다 */
  const moveStatus = (e, next) => {
    if (real) saveEvidenceStatus(activeRaw.id, e.no, next)
    else setDemo((prev) => prev.map((x) => (x.no === e.no ? { ...x, status: next, tone: EVIDENCE_TONE[next] } : x)))
    flash(`${e.code} — ${next}`)
  }
  const saveEdit = () => {
    if (real) saveEvidence(activeRaw.id, editTarget.no, { name: editForm.file, purpose: editForm.purpose })
    else setDemo((prev) => prev.map((e) =>
      e.no === editTarget.no ? { ...e, file: editForm.file, purpose: editForm.purpose } : e))
    flash(`${editTarget.code} 정보를 수정했습니다`)
    setEditTarget(null)
  }
  const addFolder = () => {
    const name = newFolderName.trim()
    if (!name) return
    const tags = newFolderCat.split(',').map((t) => t.trim()).filter(Boolean)
    const key = `f${Date.now()}`
    setFolders((prev) => [...prev, { key, name, size: '0 MB', tone: 'slate', tags, files: [] }])
    flash(`'${name}' 폴더를 만들었습니다`)
    setNewFolderName(''); setNewFolderCat(''); setNewFolderOpen(false)
    setView('folder'); setOpenKey(key)
  }
  const doUpload = () => {
    const name = uploadName.trim()
    if (!name) { flash('파일명을 입력하세요'); return }
    if (!uploadFolder) { flash('저장할 폴더를 선택하세요'); return }
    const file = { name, desc: '직접 업로드한 파일', size: '0.0 MB', date: today, status: '대기중' }
    setFolders((prev) => prev.map((f) =>
      f.key === uploadFolder ? { ...f, files: [...f.files, file] } : f))
    const folderName = folders.find((f) => f.key === uploadFolder)?.name || '폴더'
    flash(`'${folderName}'에 '${name}'을(를) 업로드했습니다`)
    setUploadName(''); setUploadOpen(false)
    setView('folder'); setOpenKey(uploadFolder)
  }
  const addTag = (folderKey) => {
    const t = tagInput.trim()
    if (!t) return
    setFolders((prev) => prev.map((f) =>
      f.key === folderKey && !f.tags.includes(t) ? { ...f, tags: [...f.tags, t] } : f))
    setTagInput('')
    flash('카테고리를 추가했습니다')
  }
  const removeTag = (folderKey, tag) => {
    setFolders((prev) => prev.map((f) =>
      f.key === folderKey ? { ...f, tags: f.tags.filter((t) => t !== tag) } : f))
  }
  const deleteFile = (folderKey, idx) => {
    setFolders((prev) => prev.map((f) =>
      f.key === folderKey ? { ...f, files: f.files.filter((_, i) => i !== idx) } : f))
    flash('파일을 삭제했습니다')
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">증빙 자료</h1>
          <p className="mt-1 text-sm text-ink-500">소송에 필요한 증거자료를 체계적으로 관리하세요.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-ink-200 bg-white p-1">
            <button onClick={() => { setView('list') }}
              className={cx('rounded-lg px-3.5 py-1.5 text-sm font-medium transition', view === 'list' ? 'bg-brand-300 text-white shadow-sm' : 'text-ink-500 hover:text-ink-700')}>법률 증거 관리</button>
            <button onClick={() => { setView('folder'); setOpenKey(null) }}
              className={cx('rounded-lg px-3.5 py-1.5 text-sm font-medium transition', view === 'folder' ? 'bg-brand-300 text-white shadow-sm' : 'text-ink-500 hover:text-ink-700')}>폴더 보기</button>
          </div>
          <Button size="sm" variant="neutral" onClick={() => { setView('folder'); setOpenKey(null); setNewFolderOpen(true) }}><Plus size={15} /> 새 폴더</Button>
          <Button size="sm" onClick={() => { setUploadFolder(openFolder?.key || folders[0]?.key || ''); setUploadOpen(true) }}><Upload size={15} /> 파일 업로드</Button>
        </div>
      </div>

      {/* ─────────── 법률 증거 관리 뷰 ─────────── */}
      {view === 'list' && (
        <>
          {/* AI 제안은 맨 위에 — 표를 다 훑고 나서야 보이면 이미 늦다 */}
          {evidenceAi.length > 0 && (
            <Card className="border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-red-500">
                <Sparkles size={15} />
                <h3 className="text-[13px] font-bold">AI 제안</h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-red-500">{evidenceAi.length}</span>
              </div>
              <ol className="mt-2.5 space-y-1.5">
                {evidenceAi.map((t, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-red-500">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-300" />{t}
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {/* 표 위 한 줄 — 어느 사건인지, 몇 건인지, 예시인지 */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h2 className="text-[15px] font-bold text-ink-900">
              증거 목록 <span className="text-brand-500">{list.length}건</span>
            </h2>
            {!real && <Badge tone="gray">예시</Badge>}
            <span className="text-[12px] text-ink-500">
              제출완료 {submitted} · 미제출 {notSubmitted} · 입증취지 없음 {list.filter((e) => !e.purpose).length}
            </span>
            <div className="ml-auto flex gap-2">
              {!real && <Button as={Link} to="/app/documents" size="sm">소장 작성하고 내 증거 등록하기</Button>}
              {real && <Button as={Link} to="/app/documents" size="sm" variant="neutral">소장에서 자료 추가</Button>}
              <Button as={Link} to="/app/procedure" size="sm" variant="ghost">절차 안내 <ArrowRight size={14} /></Button>
            </div>
          </div>

          {/* ── 표 — 노션 데이터베이스처럼 한 줄에 하나 ── */}
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50 text-[11px] font-medium text-ink-500">
                    <Th className="w-[112px] whitespace-nowrap">호증</Th>
                    <Th className="w-[220px]">서증명</Th>
                    <Th>입증취지</Th>
                    <Th className="w-[132px]">제출 상태</Th>
                    <Th className="w-[136px] whitespace-nowrap">기한 · 제출일</Th>
                    <Th className="w-[92px]">크기</Th>
                    <Th className="w-[112px]" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((e) => {
                    const Icon = isImage(e.file) ? Image : FileText
                    return (
                      <tr key={e.no} className="group border-b border-ink-100 align-middle transition-colors last:border-0 hover:bg-ink-50">
                        <Td>
                          <span className="flex items-center gap-2">
                            <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-brand-50 text-[10px] font-bold text-brand-500">{e.no}</span>
                            <span className="whitespace-nowrap text-[12.5px] font-bold text-ink-800">{e.code}</span>
                          </span>
                        </Td>

                        <Td>
                          <button
                            type="button"
                            onClick={() => setPreview({ title: e.code, file: e.file, size: e.size, status: e.status })}
                            className="flex w-full min-w-0 items-center gap-1.5 text-left"
                          >
                            <Icon size={13} className="shrink-0 text-ink-400" />
                            <span className="min-w-0 truncate text-[12.5px] text-ink-800 group-hover:underline">{e.file}</span>
                          </button>
                          {e.warn && (
                            <span className="mt-1 flex items-start gap-1 text-[11px] leading-snug text-red-500">
                              <AlertTriangle size={11} className="mt-0.5 shrink-0" />{e.warn}
                            </span>
                          )}
                        </Td>

                        <Td>
                          <button type="button" onClick={() => openEdit(e)} className="w-full text-left">
                            {e.purpose
                              ? <span className="line-clamp-2 text-[12.5px] leading-snug text-ink-700">{e.purpose}</span>
                              : <span className="text-[12.5px] text-red-500">비어 있음 — 채워야 증거목록에 들어가요</span>}
                          </button>
                        </Td>

                        {/* 상태는 셀 안에서 바로 바꾼다 — 노션의 select 열처럼 */}
                        <Td>
                          <StatusCell e={e} onPick={(st) => moveStatus(e, st)} />
                        </Td>

                        <Td>
                          <span className={cx('block whitespace-nowrap text-[12px] tabular-nums', e.dateLabel === '기한' ? 'font-semibold text-red-500' : 'text-ink-500')}>
                            {e.date ? `${e.dateLabel ? e.dateLabel + ' ' : ''}${e.date}` : '—'}
                          </span>
                        </Td>

                        <Td><span className="text-[12px] tabular-nums text-ink-400">{e.size || '—'}</span></Td>

                        <Td>
                          <span className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                            {e.status !== '제출완료' && (
                              <IconBtn label="전자소송에서 제출" onClick={() => setSubmitTarget(e)}><Upload size={14} /></IconBtn>
                            )}
                            <IconBtn label="수정" onClick={() => openEdit(e)}><FileText size={14} /></IconBtn>
                            <IconBtn label="미리보기" onClick={() => setPreview({ title: e.code, file: e.file, size: e.size, status: e.status })}><Eye size={14} /></IconBtn>
                          </span>
                        </Td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {list.length === 0 && (
              <p className="px-6 py-14 text-center text-[13px] text-ink-400">
                아직 등록된 증거가 없어요. 소장 6단계에서 파일을 올리면 여기 모입니다.
              </p>
            )}
          </Card>

          <p className="px-1 text-[11.5px] leading-relaxed text-ink-400">
            서증명은 <b className="font-semibold text-ink-600">청구원인에 적은 이름과 똑같이</b> 맞춰야 재판부가 대조할 수 있어요.
            제출 상태는 법원 시스템에만 있어 저희가 조회할 수 없으니 직접 표시해 주세요.
          </p>
        </>
      )}

      {/* ─────────── 폴더 보기 뷰 ─────────── */}
      {view === 'folder' && (
        <>
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex-1">
              {!openFolder ? (
                /* 폴더 그리드 */
                <>
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-ink-900">폴더</h2>
                    <Button size="sm" variant="neutral" onClick={() => setNewFolderOpen(true)}><Plus size={15} /> 새 폴더</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-5 xl:grid-cols-3">
                    {folders.map((f) => <FolderTile key={f.key} folder={f} onClick={() => setOpenKey(f.key)} />)}
                  </div>
                </>
              ) : (
                /* 폴더 상세 */
                <div className="space-y-5">
                  <button onClick={() => setOpenKey(null)} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-600">
                    <ArrowLeft size={16} /> 폴더로 돌아가기
                  </button>

                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-ink-900">
                      {openFolder.name} <span className="text-sm font-medium text-ink-400">({openFolder.files.length}개 파일)</span>
                    </h2>
                    <Button size="sm" onClick={() => flash('파일을 일괄 다운로드합니다 (데모)')}><Download size={15} /> 일괄 다운로드</Button>
                  </div>

                  <Card className="overflow-hidden">
                    <div className="grid grid-cols-[1fr_88px_120px_96px_104px] items-center gap-2 border-b border-ink-100 px-5 py-3 text-xs font-semibold text-ink-400">
                      <span>이름</span><span>크기</span><span>업로드 날짜</span><span>상태</span><span className="text-right">관리</span>
                    </div>
                    {openFolder.files.length === 0 ? (
                      <p className="py-10 text-center text-sm text-ink-400">아직 파일이 없습니다.</p>
                    ) : openFolder.files.map((f, i) => {
                      const Icon = isImage(f.name) ? Image : FileText
                      return (
                        <div key={i} className="grid grid-cols-[1fr_88px_120px_96px_104px] items-center gap-2 border-b border-ink-50 px-5 py-3.5 last:border-0 hover:bg-ink-50/60">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-500"><Icon size={17} /></span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink-900">{f.name}</p>
                              <p className="truncate text-xs text-ink-400">{f.desc}</p>
                            </div>
                          </div>
                          <span className="text-sm text-ink-600">{f.size}</span>
                          <span className="text-sm text-ink-600">{f.date}</span>
                          <span>
                            {f.status === '제출완료'
                              ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600"><Check size={13} /> {f.status}</span>
                              : <span className="text-xs font-medium text-ink-400">{f.status}</span>}
                          </span>
                          <div className="flex items-center justify-end gap-1 text-ink-400">
                            <button onClick={() => setPreview({ title: f.name, file: f.name, size: f.size, status: f.status })} className="rounded-lg p-1.5 hover:bg-ink-100 hover:text-ink-700" title="미리보기"><Eye size={17} /></button>
                            <button onClick={() => flash(`${f.name} 다운로드 (데모)`)} className="rounded-lg p-1.5 hover:bg-ink-100 hover:text-ink-700" title="다운로드"><Download size={17} /></button>
                            <button onClick={() => deleteFile(openFolder.key, i)} className="rounded-lg p-1.5 hover:bg-red-50 hover:text-red-500" title="삭제"><Trash size={17} /></button>
                          </div>
                        </div>
                      )
                    })}
                  </Card>

                  <Card className="p-5">
                    <h3 className="text-sm font-bold text-ink-900">카테고리(태그)</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {openFolder.tags.length ? openFolder.tags.map((t) => (
                        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-500">
                          {t}
                          <button onClick={() => removeTag(openFolder.key, t)} className="text-brand-400 hover:text-brand-600" title="삭제">×</button>
                        </span>
                      )) : <span className="text-sm text-ink-400">아직 카테고리가 없습니다.</span>}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input className={inputCls} value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTag(openFolder.key)} placeholder="카테고리 입력 후 추가" />
                      <Button size="sm" variant="neutral" className="shrink-0" onClick={() => addTag(openFolder.key)}><Plus size={15} /> 추가</Button>
                    </div>
                  </Card>
                </div>
              )}
            </div>

            {/* 사이드 */}
            <div className="w-full space-y-6 lg:w-80 lg:shrink-0">
              <StorageCard totalFiles={totalFiles} submitted={submitted} />
              {openFolder && <PropertiesCard folder={openFolder} />}
              <RecentCard />
            </div>
          </div>

          {!openFolder && (
            <Card className="p-6">
              <h3 className="text-[17px] font-bold text-ink-900">💡 증빙자료 관리 팁</h3>
              <ul className="mt-3 space-y-2">
                {evidenceTips.map((t, i) => (
                  <li key={i} className="flex gap-2 text-[15px] text-ink-600"><span className="text-ink-400">•</span>{t}</li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      {/* ───────── 모달: 제출하기 (법원 연동) ───────── */}
      <Modal
        open={!!submitTarget}
        onClose={() => setSubmitTarget(null)}
        title="법원에 증거 제출"
        sub={submitTarget ? `${submitTarget.code} · ${activeCase.court}` : ''}
        footer={(
          <>
            <Button variant="neutral" size="sm" onClick={() => setSubmitTarget(null)}>취소</Button>
            <Button size="sm" onClick={doSubmit}><ExternalLink size={14} /> 전자소송으로 제출</Button>
          </>
        )}
      >
        {submitTarget && (
          <div className="space-y-3">
            <div className="rounded-xl border border-ink-200 bg-ink-50 px-4 py-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                {isImage(submitTarget.file) ? <Image size={15} className="text-ink-400" /> : <FileText size={15} className="text-ink-400" />}
                {submitTarget.file}
              </p>
              <p className="mt-1 text-xs text-ink-500">{submitTarget.size} · {activeCase.id}</p>
            </div>
            <div className="rounded-xl bg-brand-50/60 px-4 py-3">
              <p className="text-xs font-medium text-ink-400">입증 취지</p>
              <p className="mt-0.5 text-[13px] text-ink-700">{submitTarget.purpose}</p>
            </div>
            {submitTarget.warn && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-500">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" /><span><b>제출 전 확인</b> — {submitTarget.warn}</span>
              </div>
            )}
            <div className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50/40 px-4 py-3 text-xs leading-relaxed text-brand-600">
              <ExternalLink size={14} className="mt-0.5 shrink-0" />
              <span><b>대한민국 법원 전자소송</b> 사이트(ecfs.scourt.go.kr)가 새 창으로 열립니다. 실제 제출은 전자소송에서 본인 인증 후 진행되며, 여기서는 ‘제출완료’로 기록됩니다.</span>
            </div>
          </div>
        )}
      </Modal>

      {/* ───────── 모달: 수정 ───────── */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="증거 정보 수정"
        sub={editTarget ? editTarget.code : ''}
        footer={(
          <>
            <Button variant="neutral" size="sm" onClick={() => setEditTarget(null)}>취소</Button>
            <Button size="sm" onClick={saveEdit}><Check size={14} /> 저장</Button>
          </>
        )}
      >
        <div className="space-y-4">
          <Field label="파일명">
            <Input value={editForm.file} onChange={(e) => setEditForm((f) => ({ ...f, file: e.target.value }))} placeholder="예: 임대차계약서.pdf" />
          </Field>
          <Field label="입증 취지" hint="이 증거로 무엇을 입증하려는지 적어주세요.">
            <textarea
              className="min-h-[96px] w-full resize-none rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
              value={editForm.purpose}
              onChange={(e) => setEditForm((f) => ({ ...f, purpose: e.target.value }))}
            />
          </Field>
        </div>
      </Modal>

      {/* ───────── 모달: 미리보기 ───────── */}
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title="미리보기"
        sub={preview ? `${preview.title} · ${preview.file}` : ''}
        maxW="max-w-xl"
        footer={<Button variant="neutral" size="sm" onClick={() => setPreview(null)}>닫기</Button>}
      >
        {preview && (
          <div>
            <div className="grid min-h-[260px] place-items-center rounded-xl border border-ink-200 bg-ink-50 p-6">
              {isImage(preview.file) ? (
                <div className="text-center">
                  <div className="mx-auto grid h-40 w-56 place-items-center rounded-lg border border-ink-200 bg-white text-ink-300"><Image size={48} /></div>
                  <p className="mt-3 text-xs text-ink-400">이미지 미리보기 (데모)</p>
                </div>
              ) : (
                <div className="w-full max-w-sm rounded-lg border border-ink-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-2 text-ink-400"><FileText size={18} /><span className="text-xs">문서 미리보기 (데모)</span></div>
                  <div className="space-y-2">
                    {[10, 9, 11, 8, 10, 6].map((w, i) => <div key={i} className="h-2.5 rounded bg-ink-100" style={{ width: `${w * 9}%` }} />)}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-ink-50 px-4 py-3 text-sm">
              <span className="text-ink-500">{preview.size}</span>
              <Badge tone={statusTone[preview.status]}>{preview.status}</Badge>
            </div>
          </div>
        )}
      </Modal>

      {/* ───────── 모달: 새 폴더 ───────── */}
      <Modal
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        title="새 폴더(카테고리) 만들기"
        footer={(
          <>
            <Button variant="neutral" size="sm" onClick={() => setNewFolderOpen(false)}>취소</Button>
            <Button size="sm" onClick={addFolder}><Plus size={14} /> 만들기</Button>
          </>
        )}
      >
        <div className="space-y-4">
          <Field label="폴더 이름">
            <Input autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addFolder()} placeholder="예: 추가 증거" />
          </Field>
          <Field label="카테고리(태그)" hint="쉼표(,)로 여러 개 입력할 수 있어요. 예: 계약, 임대차">
            <Input value={newFolderCat} onChange={(e) => setNewFolderCat(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addFolder()} placeholder="예: 계약, 임대차" />
          </Field>
        </div>
      </Modal>

      {/* ───────── 모달: 파일 업로드 ───────── */}
      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="파일 업로드"
        sub="선택한 폴더(카테고리)에 증거 파일을 추가합니다 (데모)"
        footer={(
          <>
            <Button variant="neutral" size="sm" onClick={() => setUploadOpen(false)}>취소</Button>
            <Button size="sm" onClick={doUpload}><Upload size={14} /> 업로드</Button>
          </>
        )}
      >
        <div className="space-y-4">
          <Field label="저장할 폴더(카테고리)">
            {folders.length === 0 ? (
              <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-500">먼저 [새 폴더]로 폴더를 만들어 주세요.</p>
            ) : (
              <select className={inputCls} value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)}>
                {folders.map((f) => <option key={f.key} value={f.key}>{f.name} ({f.files.length}개)</option>)}
              </select>
            )}
          </Field>
          <label className="grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50 py-10 text-center transition hover:border-brand-300 hover:bg-brand-50/40">
            <Upload size={28} className="text-ink-400" />
            <p className="mt-2 text-sm font-medium text-ink-700">파일을 끌어다 놓거나 클릭하여 선택</p>
            <p className="mt-0.5 text-xs text-ink-400">최대 50MB</p>
            <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && setUploadName(e.target.files[0].name)} />
          </label>
          <Field label="파일명">
            <Input value={uploadName} onChange={(e) => setUploadName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doUpload()} placeholder="예: 임대차계약서.pdf" />
          </Field>
        </div>
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>}
    </div>
  )
}

/* ────────────── 표 조각 ──────────────
   노션 데이터베이스의 셀처럼 촘촘하게. 색·간격은 우리 디자인 시스템 그대로다. */

const Th = ({ className, children }) => (
  <th className={cx('px-4 py-2.5 font-medium', className)}>{children}</th>
)

const Td = ({ className, children }) => (
  <td className={cx('px-4 py-3 align-middle', className)}>{children}</td>
)

const IconBtn = ({ label, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="grid h-7 w-7 place-items-center rounded-md text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
  >
    {children}
  </button>
)

/** 상태 셀 — 누르면 그 자리에서 고른다 (노션 select 열) */
function StatusCell({ e, onPick }) {
  const [open, setOpen] = useState(false)
  const tone = {
    미제출: 'bg-ink-100 text-ink-600',
    제출예정: 'bg-brand-50 text-brand-600',
    제출완료: 'bg-brand-300 text-white',
    보완필요: 'bg-red-50 text-red-500',
  }
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cx('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-semibold transition-opacity hover:opacity-80', tone[e.status] || tone['미제출'])}
      >
        {e.status}
        <ChevronDown size={11} />
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <span className="absolute left-0 z-20 mt-1 block w-[124px] rounded-lg border border-ink-200 bg-white py-1 shadow-lg">
            {EVIDENCE_STATUS.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => { onPick(st); setOpen(false) }}
                className={cx(
                  'flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12px] transition-colors hover:bg-ink-50',
                  e.status === st ? 'font-bold text-ink-900' : 'text-ink-600',
                )}
              >
                <span className={cx('h-2 w-2 rounded-full', tone[st].split(' ')[0])} />
                {st}
              </button>
            ))}
          </span>
        </>
      )}
    </span>
  )
}
