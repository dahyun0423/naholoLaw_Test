const SESSION_KEY = 'naholo_storage_checkout_session'
const WORKSPACE_KEY = 'naholo_storage_workspace'

export function storageWorkspaceId() {
  const saved = localStorage.getItem(WORKSPACE_KEY)
  if (saved) return saved
  const value = globalThis.crypto?.randomUUID?.().replaceAll('-', '') || `workspace_${Date.now().toString(36)}`
  localStorage.setItem(WORKSPACE_KEY, value)
  return value
}

export const storageSessionId = () => localStorage.getItem(SESSION_KEY) || ''
export const saveStorageSession = (sessionId) => localStorage.setItem(SESSION_KEY, sessionId)
export const clearStorageSession = () => localStorage.removeItem(SESSION_KEY)
