import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { cases as demoCases, precedents } from '../data/mock.js'
import { listCases, caseSummary, saveComplaintAsCase, setCaseStatus, removeCase } from '../lib/casebook.js'

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ children }) {
  // 내가 실제로 만든 사건 (소장 작성에서 생성) — 화면들이 공유하는 한 줄기
  const [myCases, setMyCases] = useState(() => listCases())
  const [activeCaseId, setActiveCaseId] = useState(null)
  const [savedNos, setSavedNos] = useState([])     // 저장한 판례 (no 배열)
  const [citedNos, setCitedNos] = useState([])     // 내 문서에 인용한 판례 (no 배열)

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

  const updateStatus = useCallback((id, status, caseNo) => {
    setCaseStatus(id, status, caseNo)
    setMyCases(listCases())
  }, [])

  const dropCase = useCallback((id) => {
    removeCase(id)
    setMyCases(listCases())
    setActiveCaseId((cur) => (cur === id ? null : cur))
  }, [])

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
        saveCase, updateStatus, dropCase, refreshCases,
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
