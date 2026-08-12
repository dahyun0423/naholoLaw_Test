import { useCallback, useEffect, useState } from 'react'
import { precedentPlan } from '../lib/precedentPlans.js'
import {
  clearPrecedentSession, precedentSessionId, savePrecedentSession,
} from '../lib/precedentIdentity.js'

const freeState = { ...precedentPlan('free'), planId: 'free', planName: '기본 검색', status: 'free' }

async function request(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || '판례검색 구독 정보를 불러오지 못했습니다.')
  return payload
}

export function usePrecedentSubscription() {
  const [subscription, setSubscription] = useState(freeState)
  const [checking, setChecking] = useState(true)
  const [busyPlan, setBusyPlan] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async (sessionId) => {
    if (!sessionId) {
      setSubscription(freeState)
      setChecking(false)
      return
    }
    setChecking(true)
    try {
      const current = await request('/api/precedent-billing/subscription', { sessionId })
      setSubscription(current)
      setError('')
    } catch (reason) {
      clearPrecedentSession()
      setSubscription(freeState)
      setError(reason.message)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    const checkoutState = url.searchParams.get('precedent_checkout')
    const returnedSession = url.searchParams.get('precedent_session_id')

    if (checkoutState === 'success' && returnedSession) {
      savePrecedentSession(returnedSession)
      setNotice('판례검색 프리미엄이 적용되었습니다.')
    } else if (checkoutState === 'cancel') {
      setNotice('결제가 취소되었습니다. 기본 판례검색은 그대로 이용할 수 있어요.')
    }

    if (checkoutState || returnedSession) {
      url.searchParams.delete('precedent_checkout')
      url.searchParams.delete('precedent_session_id')
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    }

    refresh(returnedSession || precedentSessionId())
  }, [refresh])

  const startCheckout = useCallback(async (email) => {
    setBusyPlan('premium')
    setError('')
    try {
      const { url } = await request('/api/precedent-billing/create-checkout-session', { email })
      window.location.assign(url)
    } catch (reason) {
      setError(reason.message)
      setBusyPlan('')
    }
  }, [])

  const openPortal = useCallback(async () => {
    const sessionId = precedentSessionId()
    if (!sessionId) return
    setBusyPlan('portal')
    setError('')
    try {
      const { url } = await request('/api/precedent-billing/create-portal-session', { sessionId })
      window.location.assign(url)
    } catch (reason) {
      setError(reason.message)
      setBusyPlan('')
    }
  }, [])

  return {
    subscription,
    checking,
    busyPlan,
    error,
    notice,
    clearNotice: () => setNotice(''),
    startCheckout,
    openPortal,
  }
}

