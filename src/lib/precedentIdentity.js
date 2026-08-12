const SESSION_KEY = 'naholo_precedent_checkout_session'

export const precedentSessionId = () => localStorage.getItem(SESSION_KEY) || ''
export const savePrecedentSession = (sessionId) => localStorage.setItem(SESSION_KEY, sessionId)
export const clearPrecedentSession = () => localStorage.removeItem(SESSION_KEY)

