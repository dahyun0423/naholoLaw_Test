// 증빙 자료 — 소송 서류를 한곳에서 본다
//
// 보는 방법이 둘이다. 같은 자료를 다르게 볼 뿐이라 언제든 오갈 수 있다.
//   · 리스트로 보기  — 종류(소장·증거자료·준비서면…)로 묶은 표. 기한과 제출 상태를 훑는 화면.
//   · 폴더형으로 보기 — 사건 서류철. 컴퓨터에서 폴더 정리하듯 다루는 화면.
//
// 어느 쪽이든 줄 하나하나는 사건에 매여 있다. 어느 사건 서류인지 모르면 아무 의미가 없다.

import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useStorageSubscription } from '../hooks/useStorageSubscription.js'
import { caseEvidence } from '../lib/casebook.js'
import { boardRows, boardNotices, versionInfo } from '../lib/docboard.js'
import { evId } from '../lib/vault.js'
import { downloadEvidenceFile } from '../lib/blobClient.js'
import DocumentBoard from '../components/DocumentBoard.jsx'
import EvidenceExplorer from '../components/EvidenceExplorer.jsx'
import EvidencePreview from '../components/EvidencePreview.jsx'
import StoragePlanModal from '../components/StoragePlanModal.jsx'
import { Button, cx } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import {
  courtUrl, evidenceCaseFolders,
  demoBoardRows, demoCaseList,
} from '../data/mock.js'
import { Bell, Check } from '../components/icons.jsx'

const DEMO_ROWS_KEY = 'naholo_evidence_demo_rows'

const previewItem = (row) => ({
  ...row,
  previewTitle: row.code || row.caseTitle,
  file: row.file || row.title,
})

const mergeFilledDemoRow = (seed, stored = {}) => {
  const merged = { ...seed, ...stored }
  Object.entries(seed).forEach(([key, value]) => {
    const current = merged[key]
    if (current === '' || current === null || current === undefined || (Array.isArray(current) && current.length === 0)) {
      merged[key] = value
    }
  })
  const storedVersions = Array.isArray(stored.versions) ? stored.versions : []
  merged.versions = (seed.versions || []).map((version, index) => {
    const current = { ...version, ...(storedVersions[index] || {}) }
    Object.entries(version).forEach(([key, value]) => {
      if (current[key] === '' || current[key] === null || current[key] === undefined) current[key] = value
    })
    return current
  })
  return merged
}

const readDemoRows = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(DEMO_ROWS_KEY) || '[]')
    const byKey = new Map((Array.isArray(stored) ? stored : []).map((row) => [row.key, row]))
    // 저장된 값이 오래됐어도 새 예시 필드와 새 행은 기본 데이터에서 반드시 보강한다.
    return demoBoardRows.map((seed) => mergeFilledDemoRow(seed, byKey.get(seed.key)))
  } catch {
    return demoBoardRows
  }
}

export default function Evidence() {
  const navigate = useNavigate()
  const [previewParams, setPreviewParams] = useSearchParams()
  const figmaPreview = import.meta.env.DEV && previewParams.get('figma') === '1'
  const previewKey = previewParams.get('preview') || ''
  const initialCaseKey = previewParams.get('case') || ''
  const { user } = useAuth()
  const {
    rawCases, hasMyCase, activeCaseId,
    saveEvidenceStatus, saveEvidence, dropEvidence, saveDocMeta, dropDoc,
  } = useWorkspace()

  // 사건 상세에서 「파일 올리기」로 들어오면 폴더 보기의 업로드까지 한 번에 연다.
  // 업로드 UI 자체는 여기 한 곳에만 둔다 — 두 화면에 같은 업로더를 두면 어느 사건에
  // 올라가는지가 흐려지고, 저장공간·용량 안내도 두 벌이 된다.
  const wantsFolder = previewParams.get('view') === 'folder'
  const wantsUpload = previewParams.get('action') === 'upload'
  const [view, setView] = useState(() => (wantsFolder || wantsUpload ? 'folder' : 'list')) // 'list' | 'folder'
  const [toast, setToast] = useState('')
  const [preview, setPreview] = useState(null)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [storageOpen, setStorageOpen] = useState(false)
  const [focus, setFocus] = useState(() => (initialCaseKey ? { caseKey: initialCaseKey } : null)) // 알림·URL에서 눌러 찾아간 줄
  const [pendingExplorerAction, setPendingExplorerAction] = useState(() => (wantsUpload ? 'upload' : null))
  const explorerRef = useRef(null)
  const previewPushed = useRef(false)
  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 1800) }
  const billing = useStorageSubscription()

  useEffect(() => {
    if (view !== 'folder' || !pendingExplorerAction) return undefined
    const frame = requestAnimationFrame(() => {
      explorerRef.current?.[pendingExplorerAction]?.()
      setPendingExplorerAction(null)
      if (previewParams.get('action')) {
        const next = new URLSearchParams(previewParams)
        next.delete('action')
        setPreviewParams(next, { replace: true })
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [view, pendingExplorerAction])

  useEffect(() => {
    if (!billing.notice) return
    flash(billing.notice)
    billing.clearNotice()
  }, [billing.notice])

  /* ── 리스트로 보기가 읽는 줄 ──
     예시 데이터는 실제 사건이 생겨도 사라지지 않는다. 실제 행을 앞에 두고,
     완성형 예시는 뒤에 유지해 빈 표나 누락된 상세값 없이 기능을 확인할 수 있게 한다. */
  const real = hasMyCase
  const [demoRows, setDemoRows] = useState(readDemoRows)
  const rows = useMemo(() => {
    const actual = boardRows(rawCases)
    if (figmaPreview) return actual.length ? actual : demoRows
    const examples = demoRows.map((row) => ({ ...row, caseTitle: `예시 · ${row.caseTitle}` }))
    return [...actual, ...examples]
  }, [rawCases, demoRows, figmaPreview])

  // 미리보기는 주소의 한 상태로 둔다. 목록 → 미리보기 → 뒤로가기가 자연스럽게
  // 이어지고, Figma 캡처에서도 같은 자료의 정확한 상태를 재현할 수 있다.
  useEffect(() => {
    if (!previewKey) {
      setPreview(null)
      return
    }
    const [rowKey, versionId = ''] = previewKey.split(':file:')
    const row = rows.find((item) => item.key === rowKey)
    if (!row) return
    if (!versionId) {
      setPreview(previewItem(row))
      return
    }
    const file = versionInfo(row).versions.find((item) => item.id === versionId)
    setPreview(previewItem(file ? {
      ...row,
      key: previewKey,
      createdAt: file.createdAt || row.createdAt,
      updatedAt: file.createdAt || row.updatedAt,
      submittedAt: file.submittedAt || '',
      status: file.submittedAt ? '제출완료' : row.status,
      versions: [file],
    } : row))
  }, [previewKey, rows])

  const openPreview = (row) => {
    setPreview(previewItem(row))
    const next = new URLSearchParams(previewParams)
    next.set('preview', row.key)
    previewPushed.current = true
    setPreviewParams(next)
  }

  const closePreview = () => {
    if (previewPushed.current) {
      previewPushed.current = false
      navigate(-1)
      return
    }
    const next = new URLSearchParams(previewParams)
    next.delete('preview')
    setPreviewParams(next, { replace: true })
  }

  useEffect(() => {
    try { localStorage.setItem(DEMO_ROWS_KEY, JSON.stringify(demoRows)) } catch { /* 저장소 접근 불가 시 기본값 유지 */ }
  }, [demoRows])

  const caseChips = useMemo(() => (
    figmaPreview
      ? rawCases.map((c) => ({ caseKey: c.id, caseTitle: rows.find((r) => r.caseKey === c.id)?.caseTitle || c.caseNo || '사건', caseNo: c.caseNo || '' }))
      : [
        ...rawCases.map((c) => ({ caseKey: c.id, caseTitle: rows.find((r) => r.caseKey === c.id)?.caseTitle || c.caseNo || '사건', caseNo: c.caseNo || '' })),
        ...demoCaseList.map((c) => ({ ...c, caseTitle: `예시 · ${c.caseTitle}` })),
      ]
  ), [figmaPreview, rawCases, rows])

  /* ── 짚어 줄 것 ──
     화면에 상자로 붙여 두면 며칠 만에 배경이 된다. 들어올 때 한 번 알리고,
     그 뒤로는 문제가 있는 줄 자체에 표시해 거기서 고치게 한다. */
  const notices = useMemo(() => boardNotices(rows), [rows])
  useEffect(() => {
    if (figmaPreview) return
    if (notices.length === 0) return
    // 한 번 본 알림으로 계속 붙잡지 않는다 — 이번 방문에 한 번이면 충분하다
    if (sessionStorage.getItem('naholo_evidence_notice') === '1') return
    sessionStorage.setItem('naholo_evidence_notice', '1')
    setNoticeOpen(true)
  }, [notices.length, figmaPreview])

  const goNotice = (n) => {
    setNoticeOpen(false)
    setView('list')
    setFocus({ caseKey: n.caseKey, rowKey: n.rowKey, at: Date.now() })
  }

  /** 예시 줄도 로컬 데모 상태에 저장해 화면 이동·새로고침 뒤에 유지한다. */
  const patchDemo = (row, fields) =>
    setDemoRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, ...fields } : r)))

  const onStatus = (row, status) => {
    if (!row.real) {
      patchDemo(row, { status, submittedAt: status === '제출완료' ? new Date().toISOString().slice(0, 10) : '' })
    } else if (row.group === 'evidence') {
      saveEvidenceStatus(row.caseKey, row.evNo, status)
    } else {
      saveDocMeta(row.caseKey, row.docId, { status })
    }
    flash(`${row.code || row.title} — ${status}`)
  }

  const onSave = (row, { title, purpose, due, submittedAt }) => {
    if (!row.real) patchDemo(row, { title, purpose, due, submittedAt })
    else if (row.group === 'evidence') saveEvidence(row.caseKey, row.evNo, { name: title, purpose, due, submittedAt })
    else saveDocMeta(row.caseKey, row.docId, { title, due, submittedAt })
    flash('저장했습니다')
  }

  const onDelete = (row) => {
    if (row.kind === 'complaint') { flash('소장은 사건 그 자체라 지울 수 없어요'); return }
    if (!row.real) setDemoRows((prev) => prev.filter((r) => r.key !== row.key))
    else if (row.group === 'evidence') dropEvidence(row.caseKey, row.evNo)
    else dropDoc(row.caseKey, row.docId)
    flash('지웠습니다')
  }

  const onSubmit = (row) => {
    window.open(courtUrl, '_blank', 'noopener,noreferrer')
    onStatus(row, '제출완료')
    flash('전자소송 사이트로 이동했습니다 · 제출완료 처리')
  }

  /* ── 폴더형 보기가 읽는 사건별 자료 ── */
  const defs = useMemo(() => {
    const actual = rawCases.map((c) => ({
        key: c.id,
        caseNo: c.caseNo || '',
        title: rows.find((r) => r.caseKey === c.id)?.caseTitle || c.caseNo || '사건',
        court: c.form?.court || '',
        status: c.status || '',
        caseFiles: caseEvidence(c).map((e) => ({
          id: evId(e.file),
          no: e.no,
          name: e.file,
          desc: e.purpose || `${e.code} · 입증취지 없음`,
          size: e.size || '—',
          date: e.submittedAt || e.due || '',
          status: e.status,
          thumb: e.thumb,
          blobPathname: e.blobPathname,
          url: e.url,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
          versions: e.versions,
        })),
      }))
    if (figmaPreview) return actual.length ? actual : evidenceCaseFolders
    const examples = evidenceCaseFolders.map((n) => ({
        key: n.key, caseNo: n.caseNo, title: `예시 · ${n.title}`, court: n.court, status: n.status,
        seedFolders: n.folders.map((f) => ({
          ...f,
          files: f.files.map((x, i) => ({
            ...x,
            id: `d-${n.key}-${f.key}-${i}`,
            pages: x.pages || (/\.(jpg|jpeg|png|webp)$/i.test(x.name) ? 1 : (i % 5) + 2),
            createdAt: x.createdAt || `${x.date || '2026-08-09'}T${String(9 + (i % 7)).padStart(2, '0')}:${String(10 + i * 7).padStart(2, '0').slice(-2)}:00`,
            updatedAt: x.updatedAt || `${x.date || '2026-08-09'}T${String(14 + (i % 4)).padStart(2, '0')}:40:00`,
          })),
        })),
      }))
    return [...actual, ...examples]
  }, [figmaPreview, rawCases, rows])

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[30px] font-bold leading-[1.6] text-ink-900">증빙 자료</h1>
          <p className="mt-1 text-[18px] font-medium leading-[1.6] text-ink-700">소송에 필요한 서류와 증거를 사건별로 관리하세요.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <div data-guide="evidence-view" className="flex rounded-xl border border-ink-200 bg-white p-1">
            <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}
              className={cx('rounded-lg px-3 py-1 text-[12px] font-semibold leading-[1.6] transition', view === 'list' ? 'bg-white text-ink-600 shadow-sm' : 'text-ink-600 hover:text-ink-700')}>리스트로 보기</button>
            <button type="button" aria-pressed={view === 'folder'} onClick={() => setView('folder')}
              className={cx('rounded-lg px-3 py-1 text-[12px] font-medium leading-[1.6] transition', view === 'folder' ? 'bg-white text-ink-600 shadow-sm' : 'text-ink-600 hover:text-ink-700')}>폴더형으로 보기</button>
          </div>
          <Button
            size="sm"
            onClick={() => { setPendingExplorerAction('upload'); if (view !== 'folder') setView('folder') }}
          >
            파일 업로드
          </Button>
          {notices.length > 0 && (
            <button
              onClick={() => setNoticeOpen(true)}
              className="relative inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-5 text-[14px] font-semibold text-red-500 transition hover:bg-red-100"
              title="AI가 찾은 확인할 것"
            >
              <Bell size={15} /> 확인할 것
              <span className="grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[12px] font-bold leading-none text-white">{notices.length}</span>
            </button>
          )}
        </div>
      </div>

      {/* ─────────── 리스트로 보기 ─────────── */}
      {view === 'list' && (
        <div data-guide="evidence-body" className="space-y-5">
          <DocumentBoard
            focus={focus}
            rows={rows}
            cases={caseChips}
            real={real}
            onStatus={onStatus}
            onSave={onSave}
            onDelete={onDelete}
            onSubmit={onSubmit}
            onPreview={openPreview}
          />

          <p className="px-1 text-[12px] font-medium leading-[1.6] text-ink-400">
            서증명은 <b className="font-semibold text-ink-600">청구원인에 적은 이름과 똑같이</b> 맞춰야 재판부가 대조할 수 있어요.
            제출 상태는 법원 시스템에만 있어 저희가 조회할 수 없으니 직접 표시해 주세요.
          </p>
        </div>
      )}

      {/* ─────────── 폴더형으로 보기 ─────────── */}
      {view === 'folder' && (
        <div data-guide="evidence-body">
          <EvidenceExplorer
            ref={explorerRef}
          defs={defs}
          activeCaseId={activeCaseId}
          storage={{
            planId: billing.subscription.planId,
            planName: billing.subscription.planName,
            totalBytes: billing.subscription.totalBytes,
            checking: billing.checking,
          }}
          onUpgrade={() => setStorageOpen(true)}
          onFlash={flash}
          onPreview={setPreview}
          onRenameCaseFile={(caseKey, file, name) => saveEvidence(caseKey, file.no, { name })}
          onDeleteCaseFile={(caseKey, file) => dropEvidence(caseKey, file.no)}
          />
        </div>
      )}

      <StoragePlanModal
        open={storageOpen}
        onClose={() => setStorageOpen(false)}
        subscription={billing.subscription}
        checking={billing.checking}
        busyPlan={billing.busyPlan}
        error={billing.error}
        onSubscribe={(planId) => billing.startCheckout(planId, user?.email)}
        onManage={billing.openPortal}
      />

      {/* 들어올 때 한 번 — AI가 훑어 본 결과 */}
      <Modal
        open={noticeOpen}
        onClose={() => setNoticeOpen(false)}
        title="확인할 것이 있어요"
        sub={`AI가 서류 ${rows.length}건을 훑어 ${notices.length}가지를 찾았습니다`}
        maxW="max-w-lg"
        footer={<Button size="sm" className="w-full justify-center" onClick={() => setNoticeOpen(false)}><Check size={14} /> 확인했어요</Button>}
      >
        {notices.length === 0 ? (
          <div className="rounded-xl bg-ink-50 px-4 py-5 text-center">
            <p className="text-[14px] font-semibold text-ink-800">지금은 확인할 것이 없어요.</p>
            <p className="mt-1 text-[13px] text-ink-500">새로운 제출 기한이나 파일 변경이 생기면 알려드릴게요.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl bg-ink-50 px-4 py-3">
              <p className="text-[14px] font-semibold text-ink-900">먼저 확인할 일이 {notices.length}건 있어요.</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-500">필요한 항목을 누르면 해당 사건의 서류로 바로 이동합니다.</p>
            </div>
            <ul className="divide-y divide-ink-100 rounded-xl border border-ink-200 bg-white">
            {notices.map((n) => {
              const tone = n.tone === 'red'
                ? 'bg-red-50'
                : n.tone === 'amber' ? 'bg-red-50/50' : 'bg-brand-50/60'
              const dot = n.tone === 'red'
                ? 'bg-red-500'
                : n.tone === 'amber' ? 'bg-red-300' : 'bg-brand-300'
              return (
                <li key={n.id}>
                  <button
                    onClick={() => goNotice(n)}
                    className="group flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-300"
                  >
                    <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', dot)} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-ink-900">{n.title}</span>
                      <span className="mt-1 block text-[12px] leading-relaxed text-ink-500">{n.desc}</span>
                    </span>
                    <span className={cx('shrink-0 rounded-md px-2 py-1 text-[12px] font-semibold text-ink-400 transition-colors group-hover:bg-white group-hover:text-brand-600', tone)}>열기</span>
                  </button>
                </li>
              )
            })}
            </ul>
          </div>
        )}
      </Modal>

      {/* 미리보기 — 두 화면이 함께 쓴다 */}
      <Modal
        open={!!preview}
        onClose={closePreview}
        title={preview?.file || '파일 미리보기'}
        sub={preview ? [preview.previewTitle || preview.folderName || preview.caseTitle, preview.caseNo].filter(Boolean).join(' · ') : ''}
        maxW="max-w-6xl"
        footer={<Button variant="neutral" size="sm" onClick={closePreview}>닫기</Button>}
      >
        {preview && <EvidencePreview item={preview} onDownload={async () => {
          const downloaded = await downloadEvidenceFile(preview)
          if (!downloaded) flash(`${preview.file} 원본 다운로드 (예시 파일)`)
        }} />}
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>}
    </div>
  )
}
