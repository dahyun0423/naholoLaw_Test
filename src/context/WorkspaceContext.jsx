import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { cases as demoCases, precedents, figmaWorkspaceCases } from '../data/mock.js'
import {
  listCases, caseSummary, saveComplaintAsCase, setCaseStatus, removeCase,
  addTodo, toggleTodo, updateTodo, removeTodo,
  addUserEvent, removeEvent, linkPrecedent, unlinkPrecedent, attachDoc, setFiling,
  setEvidenceStatus, updateEvidence, removeEvidence, setDocMeta, removeDoc,
  createCase, casePrecedentNos, seedCases, setFlowStep, setEntryPoint,
} from '../lib/casebook.js'

const WorkspaceContext = createContext(null)

const readNos = (key) => {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
const writeNos = (key, list) => {
  try { localStorage.setItem(key, JSON.stringify(list)) } catch { /* 저장소 접근 불가 시 무시 */ }
}

const readPrecedentItems = () => {
  try {
    const stored = JSON.parse(localStorage.getItem('naholo_precedent_items') || '{}')
    const legacy = readNos('naholo_saved_precedents')
    const seeded = Object.fromEntries(precedents.map((item) => [item.no, item]))
    const merged = { ...seeded, ...(stored && typeof stored === 'object' ? stored : {}) }
    legacy.forEach((no) => { if (seeded[no]) merged[no] = seeded[no] })
    return merged
  } catch {
    return Object.fromEntries(precedents.map((item) => [item.no, item]))
  }
}

export function WorkspaceProvider({ children }) {
  const previewParams = new URLSearchParams(window.location.search)
  const figmaPreview = import.meta.env.DEV && previewParams.get('figma') === '1'
  const resetFigmaPreview = figmaPreview && previewParams.get('figmaReset') === '1'
  const keepDemoData = import.meta.env.DEV && previewParams.get('empty') !== '1'
  // 내가 실제로 만든 사건 (소장 작성에서 생성) — 화면들이 공유하는 한 줄기
  //
  // 개발 중에는 데모 사건을 저장소에 한 번 심어 둔다. 일반 주소로 새로 열어도 사건관리·
  // 절차안내 캐러셀을 바로 테스트할 수 있고, 이미 수정한 데모/사용자 사건은 덮어쓰지 않는다.
  // 빈 상태 화면이 필요할 때만 ?empty=1을 사용한다.
  const [myCases, setMyCases] = useState(() => {
    // 미리보기 데이터도 사용자가 바꾼 상태를 유지한다. 매 새로고침마다 강제로 다시
    // 심으면 사건 상태·할 일·일정 변경이 모두 원래 더미값으로 되돌아간다.
    // 완성형 캡처 데이터를 처음부터 다시 만들 때만 ?figma=1&figmaReset=1을 쓴다.
    if (keepDemoData) seedCases(figmaWorkspaceCases, { force: resetFigmaPreview })
    return listCases()
  })
  const [activeCaseId, setActiveCaseId] = useState(null)
  // 담아둔 판례는 새로고침해도 남아야 한다.
  // 판례 검색에서 담고 → 문서 생성으로 넘어가는 흐름 자체가 페이지를 오가는 일이라,
  // 메모리에만 두면 사용자가 담은 게 사라진 것처럼 보인다.
  // 저장(북마크)은 사건과 무관한 개인 목록이라 전역이 맞다.
  // 인용은 다르다 — **문서에 실제로 들어가는 것**이라 사건에 매여야 한다.
  // 전에는 둘 다 전역이라, A사건에서 담은 판례가 B사건 준비서면에 인용됐다.
  const [savedNos, setSavedNos] = useState(() => readNos('naholo_saved_precedents'))
  const [precedentItems, setPrecedentItems] = useState(readPrecedentItems)

  useEffect(() => { writeNos('naholo_saved_precedents', savedNos) }, [savedNos])
  useEffect(() => { writeNos('naholo_precedent_items', precedentItems) }, [precedentItems])

  const refreshCases = useCallback(() => setMyCases(listCases()), [])

  /** 소장 작성 내용을 사건으로 저장하고, 저장된 사건 id를 돌려준다 */
  const saveCase = useCallback((typeKey, form, id) => {
    const saved = saveComplaintAsCase(typeKey, form, id)
    if (saved) {
      setMyCases(listCases())
      setActiveCaseId((cur) => cur || saved.id)
    }
    return saved
  }, [])

  const updateStatus = useCallback((id, status, options) => {
    const saved = setCaseStatus(id, status, options)
    if (saved) setMyCases(listCases())
    return saved
  }, [])

  /** 소장 없이 사건만 먼저 등록한다 */
  const addCase = useCallback((fields) => {
    const c = createCase(fields)
    if (c) { setMyCases(listCases()); setActiveCaseId(c.id) }
    return c
  }, [])

  const dropCase = useCallback((id) => {
    removeCase(id)
    setMyCases(listCases())
    setActiveCaseId((cur) => (cur === id ? null : cur))
  }, [])

  // 사건 안의 항목을 고치는 것들 — 모두 저장 후 목록을 다시 읽어 화면을 맞춘다.
  // 개별 setter를 만들지 않고 하나로 감싸 두면 새 항목이 늘어도 여기만 늘리면 된다.
  const mutate = useCallback((fn) => (...args) => {
    const r = fn(...args)
    setMyCases(listCases())
    return r
  }, [])

  const caseActions = useMemo(() => ({
    addTodo: mutate(addTodo),
    toggleTodo: mutate(toggleTodo),
    updateTodo: mutate(updateTodo),
    removeTodo: mutate(removeTodo),
    addUserEvent: mutate(addUserEvent),
    removeEvent: mutate(removeEvent),
    linkPrecedent: mutate(linkPrecedent),
    unlinkPrecedent: mutate(unlinkPrecedent),
    attachDoc: mutate(attachDoc),
    saveFiling: mutate(setFiling),
    saveEvidenceStatus: mutate(setEvidenceStatus),
    saveEvidence: mutate(updateEvidence),
    dropEvidence: mutate(removeEvidence),
    setFlowStep: mutate(setFlowStep),
    setEntryPoint: mutate(setEntryPoint),
    saveDocMeta: mutate(setDocMeta),
    dropDoc: mutate(removeDoc),
  }), [mutate])

  // 내 사건을 앞에, 데모 사건을 뒤에. 데모는 표시를 남겨 헷갈리지 않게 한다.
  const mine = useMemo(() => myCases.map(caseSummary).filter(Boolean), [myCases])
  const demo = useMemo(() => demoCases.map((c) => ({ ...c, label: c.id, status: c.badge, isMine: false })), [])
  const allCases = useMemo(() => [...mine, ...demo], [mine, demo])

  // 활성 사건이 없으면 가장 최근 내 사건, 그것도 없으면 데모 첫 건
  const activeCase = useMemo(
    () => allCases.find((c) => c.id === activeCaseId) || allCases[0] || null,
    [allCases, activeCaseId],
  )
  const activeRaw = useMemo(() => myCases.find((c) => c.id === activeCase?.id) || null, [myCases, activeCase])

  // 다른 탭에서 바뀐 사건도 반영한다
  useEffect(() => {
    const onStorage = (e) => { if (e.key === 'naholo_cases') refreshCases() }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [refreshCases])

  const registerPrecedents = useCallback((items) => {
    const list = Array.isArray(items) ? items.filter((item) => item?.no) : []
    if (!list.length) return
    setPrecedentItems((current) => ({
      ...current,
      ...Object.fromEntries(list.map((item) => [item.no, item])),
    }))
  }, [])

  const toggleSave = useCallback((precedent) => {
    const no = typeof precedent === 'string' ? precedent : precedent?.no
    if (!no) return
    if (typeof precedent === 'object') registerPrecedents([precedent])
    setSavedNos((s) => (s.includes(no) ? s.filter((x) => x !== no) : [...s, no]))
  }, [registerPrecedents])

  /** 인용은 지금 보고 있는 사건에 담긴다. 사건이 없으면 담을 곳이 없다. */
  const addCitation = useCallback((no, title = '') => {
    if (!activeCaseId) return false
    linkPrecedent(activeCaseId, no, title)
    setMyCases(listCases())
    return true
  }, [activeCaseId])

  const removeCitation = useCallback((no) => {
    if (!activeCaseId) return
    unlinkPrecedent(activeCaseId, no)
    setMyCases(listCases())
  }, [activeCaseId])

  const byNo = (no) => precedentItems[no] || precedents.find((p) => p.no === no)
  const savedList = savedNos.map(byNo).filter(Boolean)
  const citedNos = activeRaw ? casePrecedentNos(activeRaw) : []
  const citedList = citedNos.map(byNo).filter(Boolean)

  return (
    <WorkspaceContext.Provider
      value={{
        // 사건
        cases: allCases, myCases: mine, hasMyCase: mine.length > 0,
        activeCase, activeCaseId: activeCase?.id ?? null, setActiveCaseId,
        activeRaw,                        // 원본 (form 포함) — 증거·절차 화면에서 쓴다
        rawCases: myCases,                // 사건 상세는 요약이 아니라 원본이 필요하다
        saveCase, addCase, updateStatus, dropCase, refreshCases,
        ...caseActions,
        // 판례
        savedNos, toggleSave, registerPrecedents,
        citedNos, addCitation, removeCitation,
        savedList, citedList,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
