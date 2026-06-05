import { createContext, useContext, useState, useCallback } from 'react'
import { cases, precedents } from '../data/mock.js'

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ children }) {
  const [activeCaseId, setActiveCaseId] = useState(cases[0].id)
  const [savedNos, setSavedNos] = useState([])     // 저장한 판례 (no 배열)
  const [citedNos, setCitedNos] = useState([])     // 내 문서에 인용한 판례 (no 배열)

  const activeCase = cases.find((c) => c.id === activeCaseId) || cases[0]

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
        cases, activeCase, activeCaseId, setActiveCaseId,
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
