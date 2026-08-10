import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { cases as demoCases, precedents } from '../data/mock.js'
import {
  listCases, caseSummary, saveComplaintAsCase, setCaseStatus, removeCase,
  addTodo, toggleTodo, updateTodo, removeTodo,
  addUserEvent, removeEvent, linkPrecedent, unlinkPrecedent, attachDoc, setFiling,
  setEvidenceStatus, updateEvidence,
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

export function WorkspaceProvider({ children }) {
  // 내가 실제로 만든 사건 (소장 작성에서 생성) — 화면들이 공유하는 한 줄기
  const [myCases, setMyCases] = useState(() => listCases())
  const [activeCaseId, setActiveCaseId] = useState(null)
  // 담아둔 판례는 새로고침해도 남아야 한다.
  // 판례 검색에서 담고 → 문서 생성으로 넘어가는 흐름 자체가 페이지를 오가는 일이라,
  // 메모리에만 두면 사용자가 담은 게 사라진 것처럼 보인다.
  const [savedNos, setSavedNos] = useState(() => readNos('naholo_saved_precedents'))
  const [citedNos, setCitedNos] = useState(() => readNos('naholo_cited_precedents'))

  useEffect(() => { writeNos('naholo_saved_precedents', savedNos) }, [savedNos])
  useEffect(() => { writeNos('naholo_cited_precedents', citedNos) }, [citedNos])

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

  const updateStatus = useCallback((id, status) => {
    setCaseStatus(id, status)
    setMyCases(listCases())
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

  const toggleSave = useCallback((no) => {
    setSavedNos((s) => (s.includes(no) ? s.filter((x) => x !== no) : [...s, no]))
  }, [])

  const addCitation = useCallback((no) => {
    setCitedNos((c) => (c.includes(no) ? c : [...c, no]))
  }, [])

  const removeCitation = useCallback((no) => {
    setCitedNos((c) => c.filter((x) => x !== no))
  }, [])

  const byNo = (no) => precedents.find((p) => p.no === no)
  const savedList = savedNos.map(byNo).filter(Boolean)
  const citedList = citedNos.map(byNo).filter(Boolean)

  return (
    <WorkspaceContext.Provider
      value={{
        // 사건
        cases: allCases, myCases: mine, hasMyCase: mine.length > 0,
        activeCase, activeCaseId: activeCase?.id ?? null, setActiveCaseId,
        activeRaw,                        // 원본 (form 포함) — 증거·절차 화면에서 쓴다
        rawCases: myCases,                // 사건 상세는 요약이 아니라 원본이 필요하다
        saveCase, updateStatus, dropCase, refreshCases,
        ...caseActions,
        // 판례
        savedNos, toggleSave,
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
