// 증빙 자료 — 폴더형 보기
//
// 목표는 하나다. **컴퓨터에서 폴더 정리하듯 다룰 수 있을 것.**
// 그래서 파일 탐색기가 가진 것들을 그대로 가져왔다.
//   · 왼쪽 트리로 사건·폴더를 오간다
//   · 파일을 끌어서 폴더에 떨어뜨리면 옮겨진다 (바탕화면 파일을 끌어다 놓으면 올라간다)
//   · 여러 개를 골라(⌘/Shift 클릭) 한 번에 옮기고 지운다
//   · 이름은 두 번 눌러 그 자리에서 고친다 (F2)
//   · 오른쪽 클릭이면 할 수 있는 일이 뜬다
//   · 정리한 모습은 저장된다 — 저장 버튼은 없다
//
// 자료의 내용은 사건에 있고, 여기서 다루는 것은 정리 상태다. 나눠 둔 까닭은 lib/vault.js에.

import { forwardRef, useState, useMemo, useEffect, useRef, useCallback, useImperativeHandle } from 'react'
import { EVIDENCE_KINDS } from '../lib/casebook.js'
import {
  buildTree, persist, findCase, findFolder, isCaseFile, newFileId,
  addFolder, renameFolder, removeFolder, addFiles, addFilesAuto, moveFiles, removeFiles, renameFile,
} from '../lib/vault.js'
import { formatBytes, MB } from '../lib/storagePlans.js'
import { deleteEvidenceFiles, downloadEvidenceFile, uploadEvidenceFile } from '../lib/blobClient.js'
import { Card, Button, Badge, Progress, cx } from './ui.jsx'
import Modal from './Modal.jsx'
import {
  Folder, FileText, Image, Upload, Plus, Eye, Check, Trash, Search,
  ChevronRight, ChevronDown, ArrowLeft, X,
} from './icons.jsx'

const today = () => new Date().toISOString().slice(0, 10)
const isImage = (name = '') => /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(name)
const iconOf = (name) => (isImage(name) ? Image : FileText)

/* 용량은 파일에만 적혀 있다. 폴더·사건 용량은 그때그때 더한다 —
   따로 저장해 두면 파일을 지운 뒤에도 옛 숫자가 남는다. */
const parseBytes = (s = '') => {
  const m = /([\d.]+)\s*(KB|MB|GB)/i.exec(String(s))
  if (!m) return 0
  const n = parseFloat(m[1])
  const u = m[2].toUpperCase()
  return u === 'GB' ? n * 1024 * MB : u === 'KB' ? n * 1024 : n * MB
}
const fileBytes = (file) => Number.isFinite(file?.bytes) ? file.bytes : parseBytes(file?.size)
const sumSize = (files = []) => formatBytes(files.reduce((sum, file) => sum + fileBytes(file), 0))
const nodeFiles = (n) => (n.folders || []).reduce((s, f) => s + f.files.length, 0)
const nodeSize = (n) => formatBytes((n.folders || []).reduce((s, f) => s + f.files.reduce((a, x) => a + fileBytes(x), 0), 0))
const pendingOf = (files = []) => files.filter((f) => f.status !== '제출완료').length

const DND = 'application/x-naholo-files'

const Download = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M5 21h14" />
  </svg>
)
const Pencil = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)

/* ────────────────────────── 서류철 카드 ────────────────────────── */

function Tile({ active, dropping, badge, title, sub, meta, hint, kicker, onClick, ...dnd }) {
  const highlighted = active || dropping
  return (
    <button
      onClick={onClick}
      {...dnd}
      className={cx(
        'group relative h-[235px] w-full max-w-[237px] overflow-hidden rounded-[26px] border-[2.5px] text-left outline-none transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[#79a4ff] hover:shadow-[0_16px_30px_rgba(54,119,255,0.16)] focus-visible:border-[#79a4ff] focus-visible:ring-4 focus-visible:ring-brand-100',
        highlighted
          ? 'border-[#79a4ff] bg-gradient-to-b from-[#537edc] to-[#3677ff] shadow-[inset_0_6px_3px_#c8d5f4]'
          : 'border-[#e9e9e9] bg-gradient-to-b from-[#ecedee] to-[#3b3e46] shadow-[inset_0_6px_3px_#e8e9e9] hover:bg-gradient-to-b hover:from-[#537edc] hover:to-[#3677ff] hover:shadow-[inset_0_6px_3px_#c8d5f4,0_16px_30px_rgba(54,119,255,0.16)] focus-visible:bg-gradient-to-b focus-visible:from-[#537edc] focus-visible:to-[#3677ff]',
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full" aria-hidden="true">
        <div className="absolute left-[23px] top-[24px] h-[192px] w-[191px] -rotate-[9.63deg] rounded-[13px] bg-white/70 shadow-sm" />
        <div className="absolute left-[24px] top-[22px] h-[192px] w-[191px] rotate-[4.73deg] rounded-[13px] bg-white/90 shadow-sm" />
        <div className="absolute left-[20px] top-[24px] h-[192px] w-[191px] rounded-[13px] bg-white/45" />
        <img src="/figma/evidence/folder-front-grey.svg" alt="" className={cx('absolute inset-x-0 bottom-0 h-[173px] w-full transition-opacity duration-200 group-hover:opacity-0 group-focus-visible:opacity-0', highlighted && 'opacity-0')} />
        <img src="/figma/evidence/folder-front-blue.svg" alt="" className={cx('absolute inset-x-0 bottom-0 h-[173px] w-full opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100', highlighted && 'opacity-100')} />
      </div>
      {badge && (
        <span className="absolute right-4 top-4 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-ink-600 shadow-sm">{badge}</span>
      )}
      <div className="absolute inset-x-[19px] bottom-[22px] z-10">
        <p className="truncate text-[19px] font-bold leading-[1.25] text-ink-900">{title}</p>
        <p className="mt-2 truncate text-[14px] font-semibold text-white">{sub}</p>
        <p className="mt-6 truncate text-[11px] font-medium text-white/90">{meta}</p>
      </div>
      <span className="sr-only">{[kicker, hint].filter(Boolean).join(' · ')}</span>
    </button>
  )
}

/* ────────────────────────── 왼쪽 트리 ────────────────────────── */

function Tree({ tree, openCaseKey, openFolderKey, expanded, onToggle, onOpenCase, onOpenFolder, dropKey, dndProps }) {
  return (
    <nav className="space-y-1">
      {tree.map((n) => {
        const open = expanded.has(n.key)
        const on = n.key === openCaseKey
        return (
          <div key={n.key}>
            <div
              {...dndProps(`case:${n.key}`, n.key, null)}
              className={cx(
                'flex items-center gap-1 rounded-lg pr-2 transition-colors',
                dropKey === `case:${n.key}` ? 'bg-brand-100 ring-1 ring-brand-300'
                  : on && !openFolderKey ? 'bg-brand-50' : 'hover:bg-ink-100/70',
              )}
            >
              <button onClick={() => onToggle(n.key)} className="grid h-7 w-6 shrink-0 place-items-center text-ink-400" aria-label="펼치기">
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <button onClick={() => onOpenCase(n.key)} className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left">
                <Folder size={14} className={cx('shrink-0', on ? 'text-brand-500' : 'text-ink-400')} />
                <span className={cx('truncate text-[13px]', on ? 'font-bold text-brand-600' : 'font-medium text-ink-700')}>{n.title}</span>
              </button>
              <span className="shrink-0 text-[11px] tabular-nums text-ink-400">{nodeFiles(n)}</span>
            </div>
            {open && (
              <div className="ml-6 mt-0.5 space-y-0.5 border-l border-ink-100 pl-2">
                {n.folders.length === 0 && <p className="py-1 pl-1 text-[12px] text-ink-400">폴더 없음</p>}
                {n.folders.map((f) => {
                  const sel = on && f.key === openFolderKey
                  return (
                    <div
                      key={f.key}
                      {...dndProps(`folder:${n.key}:${f.key}`, n.key, f.key)}
                      className={cx(
                        'flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors',
                        dropKey === `folder:${n.key}:${f.key}` ? 'bg-brand-100 ring-1 ring-brand-300'
                          : sel ? 'bg-brand-50' : 'hover:bg-ink-100/70',
                      )}
                    >
                      <button onClick={() => onOpenFolder(n.key, f.key)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
                        <Folder size={13} className={cx('shrink-0', sel ? 'text-brand-500' : 'text-ink-300')} />
                        <span className={cx('truncate text-[12.5px]', sel ? 'font-bold text-brand-600' : 'text-ink-600')}>{f.name}</span>
                      </button>
                      <span className="shrink-0 text-[11px] tabular-nums text-ink-400">{f.files.length}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

/* ────────────────────────── 본체 ────────────────────────── */

const EvidenceExplorer = forwardRef(function EvidenceExplorer({
  defs, activeCaseId, storage, onUpgrade, onFlash, onPreview, onRenameCaseFile, onDeleteCaseFile,
}, ref) {
  const [tree, setTree] = useState(() => buildTree(defs))
  // 사건 자료가 실제로 바뀌었을 때만 다시 읽는다 — 매 렌더 덮어쓰면 방금 정리한 게 사라진다
  const sig = useMemo(
    () => JSON.stringify(defs.map((d) => [d.key, (d.caseFiles || []).map((f) => [f.id, f.status, f.size])])),
    [defs],
  )
  const lastSig = useRef(sig)
  useEffect(() => {
    if (sig === lastSig.current) return
    lastSig.current = sig
    setTree(buildTree(defs))
  }, [sig, defs])

  const commit = useCallback((next) => { setTree(next); persist(next) }, [])

  const [openCaseKey, setOpenCaseKey] = useState(null)
  const [openFolderKey, setOpenFolderKey] = useState(null)
  const [expanded, setExpanded] = useState(() => new Set(activeCaseId ? [activeCaseId] : []))
  const [sel, setSel] = useState(() => new Set())
  const [anchor, setAnchor] = useState(null)          // Shift 클릭의 기준점
  const [q, setQ] = useState('')
  const [sort, setSort] = useState({ by: 'name', dir: 1 })
  const [editing, setEditing] = useState(null)        // { type:'file'|'folder', id }
  const [draft, setDraft] = useState('')
  const [dropKey, setDropKey] = useState(null)
  const [menu, setMenu] = useState(null)              // { x, y, type, caseKey, folderKey, file }
  const [confirm, setConfirm] = useState(null)        // { title, sub, body, danger, onOk }
  const [uploadChooserOpen, setUploadChooserOpen] = useState(false)
  const [uploadCaseKey, setUploadCaseKey] = useState(activeCaseId || tree[0]?.key || '')
  const [uploadFolderKey, setUploadFolderKey] = useState('')
  const fileInput = useRef(null)
  const uploadTarget = useRef(null)                   // { caseKey, folderKey|null }

  const node = findCase(tree, openCaseKey)
  const folder = findFolder(node, openFolderKey)
  const previewFile = (file) => onPreview?.({
    ...file,
    title: file.name,
    file: file.name,
    previewTitle: folder?.name || '증빙자료',
    folderName: folder?.name || '',
    caseTitle: node?.title || '',
    caseNo: node?.caseNo || '',
    court: node?.court || '',
    purpose: file.desc || '',
  })
  const totalFiles = tree.reduce((sum, item) => sum + nodeFiles(item), 0)
  const usedBytes = tree.reduce((sum, item) => (
    sum + (item.folders || []).reduce((folderSum, currentFolder) => (
      folderSum + currentFolder.files.reduce((fileSum, file) => fileSum + fileBytes(file), 0)
    ), 0)
  ), 0)
  const totalBytes = storage?.totalBytes || 500 * MB
  const usedPct = Math.min(100, Math.round((usedBytes / totalBytes) * 100))

  useEffect(() => { setSel(new Set()); setAnchor(null) }, [openCaseKey, openFolderKey])

  const flash = onFlash || (() => {})

  /* ── 검색 — 열려 있는 사건 안에서, 사건이 없으면 전부 ── */
  const results = useMemo(() => {
    const key = q.trim().toLowerCase()
    if (!key) return null
    const scope = node ? [node] : tree
    return scope.flatMap((n) => n.folders.flatMap((f) => f.files
      .filter((x) => x.name.toLowerCase().includes(key) || (x.desc || '').toLowerCase().includes(key))
      .map((x) => ({ file: x, caseKey: n.key, caseTitle: n.title, folderKey: f.key, folderName: f.name }))))
  }, [q, node, tree])

  const sorted = useMemo(() => {
    const files = folder ? [...folder.files] : []
    const { by, dir } = sort
    files.sort((a, b) => {
      if (by === 'size') return (parseMB(a.size) - parseMB(b.size)) * dir
      if (by === 'date') return String(a.date || '').localeCompare(String(b.date || '')) * dir
      if (by === 'status') return String(a.status || '').localeCompare(String(b.status || ''), 'ko') * dir
      return a.name.localeCompare(b.name, 'ko') * dir
    })
    return files
  }, [folder, sort])

  /* ── 고르기 ── */
  const pick = (e, id, list) => {
    const ids = list.map((f) => f.id)
    if (e.shiftKey && anchor && ids.includes(anchor)) {
      const a = ids.indexOf(anchor); const b = ids.indexOf(id)
      const [s, t] = a < b ? [a, b] : [b, a]
      setSel(new Set(ids.slice(s, t + 1)))
      return
    }
    if (e.metaKey || e.ctrlKey) {
      setSel((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
      setAnchor(id)
      return
    }
    setSel(new Set([id]))
    setAnchor(id)
  }
  const selectedFiles = useMemo(
    () => (folder ? folder.files.filter((f) => sel.has(f.id)) : []),
    [folder, sel],
  )

  /* ── 옮기기 ── */
  const doMove = (fromCaseKey, ids, toCaseKey, toFolderKey) => {
    const from = findCase(tree, fromCaseKey)
    const moving = (from?.folders || []).flatMap((f) => f.files.filter((x) => ids.includes(x.id)))
    if (moving.length === 0) return
    if (fromCaseKey !== toCaseKey && moving.some(isCaseFile)) {
      flash('소장에 딸린 자료는 다른 사건으로 옮길 수 없어요')
      return
    }
    commit(moveFiles(tree, fromCaseKey, ids, toCaseKey, toFolderKey))
    const to = findCase(tree, toCaseKey)
    const name = findFolder(to, toFolderKey)?.name || '폴더'
    flash(moving.length === 1 ? `'${moving[0].name}' → ${name}` : `${moving.length}개 파일을 ${name}(으)로 옮겼습니다`)
    setSel(new Set())
  }

  /** 폴더가 아니라 사건 위에 떨어뜨렸을 때 — 파일명대로 알아서 나눠 넣는다 */
  const doMoveAuto = (fromCaseKey, ids, toCaseKey) => {
    const from = findCase(tree, fromCaseKey)
    const moving = (from?.folders || []).flatMap((f) => f.files.filter((x) => ids.includes(x.id)))
    if (moving.length === 0) return
    if (fromCaseKey !== toCaseKey && moving.some(isCaseFile)) {
      flash('소장에 딸린 자료는 다른 사건으로 옮길 수 없어요')
      return
    }
    commit(addFilesAuto(removeFiles(tree, fromCaseKey, ids), toCaseKey, moving))
    flash(`${moving.length}개 파일을 종류별 폴더로 옮겼습니다`)
    setSel(new Set())
  }

  /* ── 올리기 — 진짜 파일에서 이름·크기를 읽는다 ── */
  const doUpload = async (fileList, caseKey, folderKey) => {
    const sourceFiles = [...fileList]
    const incomingBytes = sourceFiles.reduce((sum, file) => sum + file.size, 0)
    if (usedBytes + incomingBytes > totalBytes) {
      const available = Math.max(0, totalBytes - usedBytes)
      flash(`저장공간이 부족합니다 · 남은 용량 ${formatBytes(available)}`)
      onUpgrade?.()
      return
    }

    flash(sourceFiles.length === 1 ? `'${sourceFiles[0].name}'을(를) 올리는 중입니다` : `${sourceFiles.length}개 파일을 올리는 중입니다`)
    const items = []
    try {
      for (const file of sourceFiles) {
        const blob = await uploadEvidenceFile(file)
        items.push({
          id: newFileId(),
          name: file.name,
          desc: '서류함에 직접 올린 파일',
          size: formatBytes(file.size),
          bytes: file.size,
          blobPathname: blob.pathname,
          date: today(),
          status: '대기중',
        })
      }
    } catch (error) {
      if (items.length) await deleteEvidenceFiles(items).catch(() => {})
      flash(error?.message || '파일을 올리지 못했습니다')
      return
    }
    if (items.length === 0) return
    const next = folderKey
      ? addFiles(tree, caseKey, folderKey, items)
      : addFilesAuto(tree, caseKey, items)
    commit(next)
    const where = folderKey ? findFolder(findCase(tree, caseKey), folderKey)?.name : '종류별 폴더'
    flash(items.length === 1 ? `'${items[0].name}'을(를) ${where}에 올렸습니다` : `${items.length}개 파일을 올렸습니다`)
    setUploadChooserOpen(false)
  }
  const openPicker = (caseKey, folderKey) => {
    uploadTarget.current = { caseKey, folderKey }
    fileInput.current?.click()
  }

  /* ── 지우기 ── */
  const askDeleteFiles = (caseKey, files) => {
    if (files.length === 0) return
    const fromCase = files.filter(isCaseFile)
    setConfirm({
      title: files.length === 1 ? '이 파일을 지울까요?' : `${files.length}개 파일을 지울까요?`,
      sub: files.map((f) => f.name).join(', ').slice(0, 90),
      body: fromCase.length > 0
        ? `이 중 ${fromCase.length}개는 소장에 딸린 갑호증이에요. 지우면 증거 목록에서도 빠지고, 뒤 호증 번호가 하나씩 당겨집니다.`
        : '지운 파일은 되돌릴 수 없어요.',
      danger: true,
      onOk: async () => {
        try {
          await deleteEvidenceFiles(files)
        } catch (error) {
          flash(error?.message || '파일 원본을 삭제하지 못했습니다')
          return
        }
        // 호증 번호는 순서라, 앞에서부터 지우면 뒤 번호가 밀린다 — 뒤에서부터 지운다
        ;[...fromCase].sort((a, b) => (b.no || 0) - (a.no || 0)).forEach((f) => onDeleteCaseFile?.(caseKey, f))
        commit(removeFiles(tree, caseKey, files.map((f) => f.id)))
        flash(files.length === 1 ? '파일을 지웠습니다' : `${files.length}개 파일을 지웠습니다`)
        setSel(new Set())
        setConfirm(null)
      },
    })
  }

  const askDeleteFolder = (caseKey, f) => setConfirm({
    title: `'${f.name}' 폴더를 지울까요?`,
    sub: `파일 ${f.files.length}개`,
    body: f.files.length > 0
      ? '안에 있던 파일은 지우지 않고 [기타 자료]로 옮깁니다.'
      : '빈 폴더라 그냥 사라집니다.',
    onOk: () => {
      commit(removeFolder(tree, caseKey, f.key))
      if (openFolderKey === f.key) setOpenFolderKey(null)
      flash(`'${f.name}' 폴더를 지웠습니다`)
      setConfirm(null)
    },
  })

  /* ── 이름 바꾸기 ── */
  const startRename = (type, id, current) => { setEditing({ type, id }); setDraft(current) }
  const applyRename = () => {
    if (!editing) return
    const name = draft.trim()
    setEditing(null)
    if (!name) return
    if (editing.type === 'folder') {
      commit(renameFolder(tree, openCaseKey, editing.id, name))
      return
    }
    const file = folder?.files.find((f) => f.id === editing.id)
    if (!file || file.name === name) return
    if (isCaseFile(file)) onRenameCaseFile?.(openCaseKey, file, name)
    commit(renameFile(tree, openCaseKey, editing.id, name))
  }

  const makeFolder = (caseKey) => {
    const base = '새 폴더'
    const node2 = findCase(tree, caseKey)
    let name = base; let i = 2
    while (node2?.folders.some((f) => f.name === name)) name = `${base} ${i++}`
    const { tree: next, key } = addFolder(tree, caseKey, name)
    commit(next)
    setOpenCaseKey(caseKey); setOpenFolderKey(null)
    setExpanded((p) => new Set(p).add(caseKey))
    // 만들자마자 이름을 고칠 수 있게 — 탐색기가 그렇게 한다
    setTimeout(() => startRename('folder', key, name), 0)
  }

  useImperativeHandle(ref, () => ({
    upload: () => {
      if (openCaseKey) return openPicker(openCaseKey, openFolderKey)
      setUploadCaseKey(activeCaseId || tree[0]?.key || '')
      setUploadFolderKey('')
      setUploadChooserOpen(true)
    },
    newFolder: () => {
      if (!openCaseKey) {
        flash('새 폴더를 만들 사건을 먼저 열어 주세요')
        return
      }
      makeFolder(openCaseKey)
    },
  }), [openCaseKey, openFolderKey, tree])

  /* ── 끌어다 놓기 ── */
  const dndProps = (key, caseKey, folderKey) => ({
    onDragOver: (e) => { e.preventDefault(); e.stopPropagation(); setDropKey(key) },
    onDragLeave: (e) => { e.stopPropagation(); setDropKey((k) => (k === key ? null : k)) },
    onDrop: (e) => {
      e.preventDefault(); e.stopPropagation(); setDropKey(null)
      if (e.dataTransfer.files?.length) { doUpload(e.dataTransfer.files, caseKey, folderKey); return }
      const raw = e.dataTransfer.getData(DND)
      if (!raw) return
      try {
        const { caseKey: from, ids } = JSON.parse(raw)
        if (folderKey) doMove(from, ids, caseKey, folderKey)
        else doMoveAuto(from, ids, caseKey)
      } catch { /* 다른 데서 온 드래그는 무시 */ }
    },
  })
  const dragProps = (file, list) => ({
    draggable: true,
    onDragStart: (e) => {
      const ids = sel.has(file.id) ? [...sel] : [file.id]
      if (!sel.has(file.id)) setSel(new Set([file.id]))
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData(DND, JSON.stringify({ caseKey: openCaseKey, ids }))
    },
  })

  /* ── 키보드 ── */
  const onKeyDown = (e) => {
    if (editing) return
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a' && folder) {
      e.preventDefault(); setSel(new Set(folder.files.map((f) => f.id))); return
    }
    if (e.key === 'Escape') { setSel(new Set()); setMenu(null); return }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFiles.length) {
      e.preventDefault(); askDeleteFiles(openCaseKey, selectedFiles); return
    }
    if (e.key === 'F2' && selectedFiles.length === 1) {
      e.preventDefault(); startRename('file', selectedFiles[0].id, selectedFiles[0].name)
    }
  }

  /* 오른쪽 클릭 메뉴에 쓰는 폴더 목록 */
  const folderChoices = (node?.folders || []).map((f) => ({ key: f.key, name: f.name }))
    .concat(EVIDENCE_KINDS.filter((k) => !(node?.folders || []).some((f) => f.key === k.key))
      .map((k) => ({ key: k.key, name: `${k.name} (새 폴더)` })))

  return (
    <div className="space-y-4" onKeyDown={onKeyDown} tabIndex={-1}>
      <input
        ref={fileInput}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const t = uploadTarget.current
          if (t && e.target.files?.length) doUpload(e.target.files, t.caseKey, t.folderKey)
          e.target.value = ''
        }}
      />

      <Modal
        open={uploadChooserOpen}
        onClose={() => setUploadChooserOpen(false)}
        title="파일 업로드"
        sub="어느 사건의 어떤 폴더에 넣을지 먼저 선택해 주세요."
        maxW="max-w-md"
        footer={(
          <>
            <Button size="sm" variant="neutral" onClick={() => setUploadChooserOpen(false)}>취소</Button>
            <Button
              size="sm"
              disabled={!uploadCaseKey}
              onClick={() => openPicker(uploadCaseKey, uploadFolderKey || null)}
            >파일 선택</Button>
          </>
        )}
      >
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[12px] font-semibold text-ink-700">사건</span>
            <select
              value={uploadCaseKey}
              onChange={(event) => { setUploadCaseKey(event.target.value); setUploadFolderKey('') }}
              className="h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
            >
              <option value="">사건을 선택하세요</option>
              {tree.map((item) => <option key={item.key} value={item.key}>{item.title}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-[12px] font-semibold text-ink-700">폴더 <span className="font-normal text-ink-400">(선택)</span></span>
            <select
              value={uploadFolderKey}
              onChange={(event) => setUploadFolderKey(event.target.value)}
              disabled={!uploadCaseKey}
              className="h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100 disabled:bg-ink-50 disabled:text-ink-400"
            >
              <option value="">종류별 폴더에 자동 분류</option>
              {(findCase(tree, uploadCaseKey)?.folders || []).map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}
            </select>
          </label>
          <button
            type="button"
            onClick={() => openPicker(uploadCaseKey, uploadFolderKey || null)}
            disabled={!uploadCaseKey}
            onDragOver={(event) => { event.preventDefault() }}
            onDrop={(event) => {
              event.preventDefault()
              if (uploadCaseKey && event.dataTransfer.files?.length) doUpload(event.dataTransfer.files, uploadCaseKey, uploadFolderKey || null)
            }}
            className="flex w-full items-center justify-center rounded-xl border border-dashed border-ink-300 bg-ink-50 px-4 py-8 text-sm font-medium text-ink-500 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            파일을 선택하거나 여기에 끌어다 놓으세요
          </button>
        </div>
      </Modal>

      {/* 지금 어디에 있는지 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-1.5 text-sm">
          <button
            onClick={() => { setOpenCaseKey(null); setOpenFolderKey(null) }}
            className={cx('font-medium transition', node ? 'text-brand-500 hover:text-brand-600' : 'text-ink-900')}
          >
            전체 사건 <span className="text-ink-400">({tree.length})</span>
          </button>
          {node && (
            <>
              <span className="text-ink-300">/</span>
              <button onClick={() => setOpenFolderKey(null)}
                className={cx('max-w-[220px] truncate font-medium transition', folder ? 'text-brand-500 hover:text-brand-600' : 'text-ink-900')}>
                {node.title}
              </button>
            </>
          )}
          {folder && (
            <>
              <span className="text-ink-300">/</span>
              <span className="font-medium text-ink-900">{folder.name}</span>
            </>
          )}
        </nav>

        <label className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={node ? '이 사건에서 파일 찾기' : '전체 사건에서 파일 찾기'}
            className="h-9 w-[220px] rounded-xl border border-ink-200 bg-white pl-9 pr-8 text-[13px] text-ink-900 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 hover:text-ink-700"><X size={13} /></button>
          )}
        </label>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* 왼쪽 — 사건·폴더 트리 */}
        <aside className="w-full lg:w-60 lg:shrink-0">
          <Card className="p-3">
            <div className="px-1 pb-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-semibold text-ink-400">저장공간</span>
                <span className="text-[11px] tabular-nums text-ink-400">{formatBytes(usedBytes)} / {formatBytes(totalBytes)}</span>
              </div>
              <div className="mt-1.5"><Progress value={usedPct} /></div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <p className="text-[11px] text-ink-400">파일 {totalFiles}개 · {storage?.planName || '기본'}</p>
                <button
                  type="button"
                  onClick={onUpgrade}
                  className="shrink-0 text-[11px] font-semibold text-brand-500 transition hover:text-brand-600"
                >
                  {storage?.planId === 'free' ? '용량 늘리기' : '구독 관리'}
                </button>
              </div>
            </div>
            <div className="border-t border-ink-100 pt-2">
              <Tree
                tree={tree}
                openCaseKey={openCaseKey}
                openFolderKey={openFolderKey}
                expanded={expanded}
                onToggle={(k) => setExpanded((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n })}
                onOpenCase={(k) => { setOpenCaseKey(k); setOpenFolderKey(null); setQ(''); setExpanded((p) => new Set(p).add(k)) }}
                onOpenFolder={(c, f) => { setOpenCaseKey(c); setOpenFolderKey(f); setQ('') }}
                dropKey={dropKey}
                dndProps={dndProps}
              />
            </div>
          </Card>
          <p className="mt-2 px-1 text-[11px] leading-relaxed text-ink-400">
            파일을 끌어다 폴더 위에 놓으면 옮겨져요. 바탕화면 파일을 끌어다 놓으면 그대로 올라갑니다.
          </p>
        </aside>

        {/* 오른쪽 — 지금 위치의 내용 */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* 도구 줄 */}
          <div className="flex flex-wrap items-center gap-2">
            {node ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => (folder ? setOpenFolderKey(null) : setOpenCaseKey(null))}>
                  <ArrowLeft size={15} /> 뒤로
                </Button>
                <Button size="sm" variant="neutral" onClick={() => makeFolder(node.key)}>
                  <Plus size={15} /> 새 폴더
                </Button>
                <Button size="sm" onClick={() => openPicker(node.key, folder?.key || null)}>
                  <Upload size={15} /> 파일 올리기
                </Button>
              </>
            ) : (
              <p className="text-[12.5px] text-ink-500">사건 서류철을 열면 폴더를 만들고 파일을 올릴 수 있어요.</p>
            )}

            {selectedFiles.length > 0 && (
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] font-semibold text-brand-600">{selectedFiles.length}개 선택</span>
                <MoveButton choices={folderChoices} current={openFolderKey}
                  onPick={(k) => doMove(openCaseKey, [...sel], openCaseKey, k)} />
                <Button size="sm" variant="ghost" onClick={() => flash(`${selectedFiles.length}개 파일 다운로드 (데모)`)}><Download size={15} /> 다운로드</Button>
                <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50"
                  onClick={() => askDeleteFiles(openCaseKey, selectedFiles)}><Trash size={15} /> 삭제</Button>
                <Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>선택 해제</Button>
              </div>
            )}
          </div>

          {/* 검색 결과 */}
          {results && (
            <Card className="overflow-hidden">
              <p className="border-b border-ink-100 px-5 py-3 text-[12.5px] font-semibold text-ink-500">
                ‘{q}’ 검색 결과 {results.length}건 {node ? `· ${node.title}` : '· 전체 사건'}
              </p>
              {results.length === 0
                ? <p className="py-10 text-center text-sm text-ink-400">찾는 파일이 없어요.</p>
                : results.map(({ file, caseKey, caseTitle, folderKey, folderName }) => {
                  const Icon = iconOf(file.name)
                  return (
                    <button
                      key={`${caseKey}-${file.id}`}
                      onClick={() => { setOpenCaseKey(caseKey); setOpenFolderKey(folderKey); setQ(''); setSel(new Set([file.id])) }}
                      className="flex w-full items-center gap-3 border-b border-ink-50 px-5 py-3 text-left last:border-0 hover:bg-ink-50/60"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-500"><Icon size={15} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold text-ink-900">{file.name}</span>
                        <span className="block truncate text-[11.5px] text-ink-400">{caseTitle} › {folderName}</span>
                      </span>
                      <span className="shrink-0 text-[12px] text-ink-400">{file.size}</span>
                    </button>
                  )
                })}
            </Card>
          )}

          {/* 1단 — 사건 서류철 */}
          {!results && !node && (
            tree.length === 0 ? (
              <Card className="p-10 text-center">
                <p className="text-sm text-ink-500">아직 사건이 없어요. 소장을 작성하면 사건 서류철이 만들어집니다.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 justify-items-center gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {tree.map((n) => (
                  <Tile
                    key={n.key}
                    dropping={dropKey === `case:${n.key}`}
                    badge={(n.folders.reduce((s, f) => s + pendingOf(f.files), 0)) > 0 ? `정리 ${n.folders.reduce((s, f) => s + pendingOf(f.files), 0)}` : null}
                    title={n.title}
                    sub={n.caseNo || '사건번호 없음'}
                    meta={`${n.folders.length}개 폴더 · ${nodeFiles(n)}개 파일 · ${nodeSize(n)}`}
                    kicker="사건"
                    hint="열면 서류 종류별로 나뉩니다"
                    onClick={() => { setOpenCaseKey(n.key); setExpanded((p) => new Set(p).add(n.key)) }}
                    {...dndProps(`case:${n.key}`, n.key, null)}
                  />
                ))}
              </div>
            )
          )}

          {/* 2단 — 서류 종류 폴더 */}
          {!results && node && !folder && (
            <>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-ink-900">{node.title}</h2>
                  <p className="mt-0.5 text-[13px] text-ink-500">
                    {node.caseNo || '사건번호 없음'}{node.court ? ` · ${node.court}` : ''} · {nodeFiles(node)}개 파일 · {nodeSize(node)}
                  </p>
                </div>
              </div>
              {node.folders.length === 0 ? (
                <div {...dndProps(`case:${node.key}`, node.key, null)}>
                  <Card className={cx('p-10 text-center transition', dropKey === `case:${node.key}` && 'border-brand-300 bg-brand-50/50')}>
                    <p className="text-sm text-ink-500">이 사건에는 아직 자료가 없어요.</p>
                    <p className="mt-1 text-xs text-ink-400">파일을 이 영역에 끌어다 놓으면 종류별 폴더가 자동으로 만들어집니다.</p>
                    <Button size="sm" className="mt-4" onClick={() => openPicker(node.key, null)}><Upload size={15} /> 파일 올리기</Button>
                  </Card>
                </div>
              ) : (
                <div className="grid grid-cols-1 justify-items-center gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {node.folders.map((f) => (
                    editing?.type === 'folder' && editing.id === f.key ? (
                      <div key={f.key} className="grid h-[235px] w-full max-w-[237px] place-items-center rounded-[26px] border-2 border-brand-300 bg-brand-50/40 p-5">
                        <div className="w-full">
                          <Folder size={32} className="mx-auto text-brand-400" />
                          <input
                            autoFocus
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={applyRename}
                            onKeyDown={(e) => { if (e.key === 'Enter') applyRename(); if (e.key === 'Escape') setEditing(null) }}
                            className="mt-3 w-full rounded-lg border border-brand-300 px-2.5 py-1.5 text-center text-sm font-semibold text-ink-900 outline-none"
                          />
                        </div>
                      </div>
                    ) : (
                      <Tile
                        key={f.key}
                        dropping={dropKey === `folder:${node.key}:${f.key}`}
                        badge={pendingOf(f.files) > 0 ? `정리 ${pendingOf(f.files)}` : null}
                        title={f.name}
                        sub={`${f.files.length} 파일`}
                        meta={sumSize(f.files)}
                        kicker={node.title}
                        hint="두 번 눌러 이름 바꾸기 · 오른쪽 클릭"
                        onClick={() => setOpenFolderKey(f.key)}
                        onDoubleClick={() => startRename('folder', f.key, f.name)}
                        onContextMenu={(e) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, type: 'folder', caseKey: node.key, folder: f }) }}
                        {...dndProps(`folder:${node.key}:${f.key}`, node.key, f.key)}
                      />
                    )
                  ))}
                </div>
              )}
            </>
          )}

          {/* 3단 — 폴더 안의 파일 */}
          {!results && node && folder && (
            <div
              className="space-y-4"
              {...dndProps(`folder:${node.key}:${folder.key}`, node.key, folder.key)}
            >
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-xl font-bold text-ink-900">
                    {folder.name}
                    <button onClick={() => startRename('folder', folder.key, folder.name)}
                      className="rounded-lg p-1 text-ink-300 transition hover:bg-ink-100 hover:text-ink-600" title="폴더 이름 바꾸기">
                      <Pencil size={15} />
                    </button>
                    <span className="text-sm font-medium text-ink-400">{folder.files.length}개 · {sumSize(folder.files)}</span>
                  </h2>
                  <p className="mt-0.5 truncate text-[13px] text-ink-500">{node.title}{node.caseNo ? ` · ${node.caseNo}` : ''}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => askDeleteFolder(node.key, folder)}>
                  <Trash size={15} /> 폴더 삭제
                </Button>
              </div>

              {editing?.type === 'folder' && editing.id === folder.key && (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={applyRename}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyRename(); if (e.key === 'Escape') setEditing(null) }}
                  className="w-full max-w-xs rounded-xl border border-brand-300 px-3 py-2 text-sm font-semibold text-ink-900 outline-none ring-4 ring-brand-100"
                />
              )}

              <Card className={cx('transition', dropKey === `folder:${node.key}:${folder.key}` && 'border-brand-300 ring-4 ring-brand-100')}>
                {/* 머리글 — 눌러서 정렬 */}
                <div className="grid grid-cols-[28px_1fr_88px_112px_96px_120px] items-center gap-2 border-b border-ink-100 px-4 py-2.5 text-[11px] font-semibold text-ink-400">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-[#3182f6]"
                    checked={folder.files.length > 0 && sel.size === folder.files.length}
                    onChange={(e) => setSel(e.target.checked ? new Set(folder.files.map((f) => f.id)) : new Set())}
                    aria-label="전체 선택"
                  />
                  <SortTh label="이름" k="name" sort={sort} setSort={setSort} />
                  <SortTh label="크기" k="size" sort={sort} setSort={setSort} />
                  <SortTh label="날짜" k="date" sort={sort} setSort={setSort} />
                  <SortTh label="상태" k="status" sort={sort} setSort={setSort} />
                  <span className="text-right">관리</span>
                </div>

                {sorted.length === 0 ? (
                  <p className="px-5 py-12 text-center text-sm text-ink-400">
                    빈 폴더예요. 파일을 여기에 끌어다 놓거나 [파일 올리기]를 누르세요.
                  </p>
                ) : sorted.map((f) => {
                  const Icon = iconOf(f.name)
                  const on = sel.has(f.id)
                  return (
                    <div
                      key={f.id}
                      onClick={(e) => pick(e, f.id, sorted)}
                      onDoubleClick={() => previewFile(f)}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        if (!sel.has(f.id)) setSel(new Set([f.id]))
                        setMenu({ x: e.clientX, y: e.clientY, type: 'file', caseKey: node.key, file: f })
                      }}
                      {...dragProps(f, sorted)}
                      className={cx(
                        'grid cursor-default grid-cols-[28px_1fr_88px_112px_96px_120px] items-center gap-2 border-b border-ink-50 px-4 py-3 last:rounded-b-2xl last:border-0',
                        on ? 'bg-brand-50' : 'hover:bg-ink-50/60',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-[#3182f6]"
                        checked={on}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => setSel((prev) => { const n = new Set(prev); n.has(f.id) ? n.delete(f.id) : n.add(f.id); return n })}
                        aria-label={`${f.name} 선택`}
                      />
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-500"><Icon size={15} /></span>
                        <div className="min-w-0">
                          {editing?.type === 'file' && editing.id === f.id ? (
                            <input
                              autoFocus
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onBlur={applyRename}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => { if (e.key === 'Enter') applyRename(); if (e.key === 'Escape') setEditing(null) }}
                              className="w-full rounded-md border border-brand-300 px-2 py-1 text-[13px] font-semibold text-ink-900 outline-none"
                            />
                          ) : (
                            <p className="truncate text-[13.5px] font-semibold text-ink-900">{f.name}</p>
                          )}
                          <p className="truncate text-[11.5px] text-ink-400">{f.desc}</p>
                        </div>
                      </div>
                      <span className="text-[12.5px] tabular-nums text-ink-600">{f.size}</span>
                      <span className="text-[12.5px] tabular-nums text-ink-600">{f.date || '—'}</span>
                      <span>
                        {f.status === '제출완료'
                          ? <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-600"><Check size={12} /> {f.status}</span>
                          : <span className="text-[11.5px] font-medium text-ink-400">{f.status}</span>}
                      </span>
                      <div className="flex items-center justify-end gap-0.5 text-ink-400" onClick={(e) => e.stopPropagation()}>
                        <RowBtn label="이름 바꾸기" onClick={() => startRename('file', f.id, f.name)}><Pencil size={15} /></RowBtn>
                        <RowBtn label="미리보기" onClick={() => previewFile(f)}><Eye size={16} /></RowBtn>
                        <RowBtn label="다운로드" onClick={() => {
                          if (!downloadEvidenceFile(f)) flash(`${f.name} 다운로드 (예시 파일)`)
                        }}><Download size={16} /></RowBtn>
                        <RowBtn label="삭제" danger onClick={() => askDeleteFiles(node.key, [f])}><Trash size={16} /></RowBtn>
                      </div>
                    </div>
                  )
                })}
              </Card>

              <p className="px-1 text-[11.5px] text-ink-400">
                클릭으로 고르고 ⌘/Ctrl·Shift 클릭으로 여러 개, 끌어서 옮기고, F2로 이름을 바꿔요.
                {folder.tags?.length > 0 && <> 태그: {folder.tags.join(', ')}</>}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 오른쪽 클릭 메뉴 */}
      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null) }} />
          <div
            className="fixed z-50 w-[184px] rounded-xl border border-ink-200 bg-white py-1.5 shadow-xl"
            style={{ left: Math.min(menu.x, window.innerWidth - 200), top: Math.min(menu.y, window.innerHeight - 260) }}
          >
            {menu.type === 'file' ? (
              <>
                <MenuItem onClick={() => { previewFile(menu.file); setMenu(null) }}><Eye size={14} /> 열기</MenuItem>
                <MenuItem onClick={() => { startRename('file', menu.file.id, menu.file.name); setMenu(null) }}><Pencil size={14} /> 이름 바꾸기</MenuItem>
                <MenuItem onClick={() => {
                  if (!downloadEvidenceFile(menu.file)) flash(`${menu.file.name} 다운로드 (예시 파일)`)
                  setMenu(null)
                }}><Download size={14} /> 다운로드</MenuItem>
                <div className="my-1 border-t border-ink-100" />
                <p className="px-3 py-1 text-[11px] font-semibold text-ink-400">폴더로 옮기기</p>
                <div className="max-h-[168px] overflow-y-auto">
                  {folderChoices.filter((c) => c.key !== openFolderKey).map((c) => (
                    <MenuItem key={c.key} onClick={() => { doMove(menu.caseKey, sel.has(menu.file.id) ? [...sel] : [menu.file.id], menu.caseKey, c.key); setMenu(null) }}>
                      <Folder size={14} /> {c.name}
                    </MenuItem>
                  ))}
                </div>
                <div className="my-1 border-t border-ink-100" />
                <MenuItem danger onClick={() => { askDeleteFiles(menu.caseKey, sel.has(menu.file.id) ? selectedFiles : [menu.file]); setMenu(null) }}><Trash size={14} /> 삭제</MenuItem>
              </>
            ) : (
              <>
                <MenuItem onClick={() => { setOpenFolderKey(menu.folder.key); setMenu(null) }}><Folder size={14} /> 열기</MenuItem>
                <MenuItem onClick={() => { startRename('folder', menu.folder.key, menu.folder.name); setMenu(null) }}><Pencil size={14} /> 이름 바꾸기</MenuItem>
                <MenuItem onClick={() => { openPicker(menu.caseKey, menu.folder.key); setMenu(null) }}><Upload size={14} /> 여기에 파일 올리기</MenuItem>
                <div className="my-1 border-t border-ink-100" />
                <MenuItem danger onClick={() => { askDeleteFolder(menu.caseKey, menu.folder); setMenu(null) }}><Trash size={14} /> 폴더 삭제</MenuItem>
              </>
            )}
          </div>
        </>
      )}

      {/* 확인 */}
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.title || ''}
        sub={confirm?.sub}
        maxW="max-w-md"
        footer={(
          <>
            <Button variant="neutral" size="sm" onClick={() => setConfirm(null)}>취소</Button>
            <Button size="sm" className={confirm?.danger ? 'bg-red-500 hover:bg-red-600' : ''} onClick={() => confirm?.onOk?.()}>
              {confirm?.danger ? '지우기' : '확인'}
            </Button>
          </>
        )}
      >
        <p className="text-[13.5px] leading-relaxed text-ink-600">{confirm?.body}</p>
      </Modal>
    </div>
  )
})

export default EvidenceExplorer

/* ────────────────────────── 조각들 ────────────────────────── */

const RowBtn = ({ label, danger, onClick, children }) => (
  <button
    type="button" title={label} aria-label={label} onClick={onClick}
    className={cx('rounded-lg p-1.5 transition-colors', danger ? 'hover:bg-red-50 hover:text-red-500' : 'hover:bg-ink-100 hover:text-ink-700')}
  >
    {children}
  </button>
)

const MenuItem = ({ danger, onClick, children }) => (
  <button
    type="button" onClick={onClick}
    className={cx(
      'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] transition-colors',
      danger ? 'text-red-500 hover:bg-red-50' : 'text-ink-700 hover:bg-ink-50',
    )}
  >
    {children}
  </button>
)

function SortTh({ label, k, sort, setSort }) {
  const on = sort.by === k
  return (
    <button
      type="button"
      onClick={() => setSort((s) => ({ by: k, dir: s.by === k ? -s.dir : 1 }))}
      className={cx('flex items-center gap-0.5 text-left transition-colors hover:text-ink-700', on && 'text-ink-700')}
    >
      {label}{on && <ChevronDown size={11} className={cx('transition-transform', sort.dir < 0 && 'rotate-180')} />}
    </button>
  )
}

/** 고른 파일을 어디로 옮길지 — 도구 줄의 [이동] */
function MoveButton({ choices, current, onPick }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative">
      <Button size="sm" variant="neutral" onClick={() => setOpen((v) => !v)}><Folder size={15} /> 이동</Button>
      {open && (
        <>
          <span className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <span className="absolute right-0 z-40 mt-1 block max-h-[240px] w-[180px] overflow-y-auto rounded-xl border border-ink-200 bg-white py-1.5 text-left shadow-xl">
            {choices.filter((c) => c.key !== current).map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => { onPick(c.key); setOpen(false) }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-ink-700 transition-colors hover:bg-ink-50"
              >
                <Folder size={14} className="text-ink-300" />{c.name}
              </button>
            ))}
          </span>
        </>
      )}
    </span>
  )
}
