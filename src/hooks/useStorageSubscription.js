import { useCallback, useEffect, useState } from 'react'
import { storagePlan } from '../lib/storagePlans.js'
import {
  clearStorageSession, saveStorageSession, storageSessionId, storageWorkspaceId,
} from '../lib/storageIdentity.js'

const freeState = { ...storagePlan('free'), planId: 'free', planName: '기본', status: 'free' }

async function request(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || '구독 정보를 불러오지 못했습니다.')
  return payload
}

export function useStorageSubscription() {
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
      const current = await request('/api/billing/subscription', { sessionId })
      setSubscription({ ...current, id: current.planId })
      setError('')
    } catch (reason) {
      clearStorageSession()
      setSubscription(freeState)
      setError(reason.message)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    const checkoutState = url.searchParams.get('storage_checkout')
    const returnedSession = url.searchParams.get('session_id')

    if (checkoutState === 'success' && returnedSession) {
      saveStorageSession(returnedSession)
      setNotice('저장공간 구독이 적용되었습니다.')
    } else if (checkoutState === 'cancel') {
      setNotice('결제가 취소되었습니다. 기존 저장공간은 그대로 유지됩니다.')
    }

    if (checkoutState || returnedSession) {
      url.searchParams.delete('storage_checkout')
      url.searchParams.delete('session_id')
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    }

    refresh(returnedSession || storageSessionId())
  }, [refresh])

  const startCheckout = useCallback(async (planId, email) => {
    setBusyPlan(planId)
    setError('')
    try {
      const { url } = await request('/api/billing/create-checkout-session', {
        planId,
        email,
        workspaceId: storageWorkspaceId(),
      })
      window.location.assign(url)
    } catch (reason) {
      setError(reason.message)
      setBusyPlan('')
    }
  }, [])

  const openPortal = useCallback(async () => {
    const sessionId = storageSessionId()
    if (!sessionId) return
    setBusyPlan('portal')
    setError('')
    try {
      const { url } = await request('/api/billing/create-portal-session', { sessionId })
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
