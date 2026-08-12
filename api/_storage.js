import { list } from '@vercel/blob'
import { getStripe, publicSubscription } from './_stripe.js'
import { storagePlan } from '../src/lib/storagePlans.js'

export const validWorkspaceId = (value) => /^[a-zA-Z0-9_-]{8,80}$/.test(String(value || ''))
export const workspacePrefix = (workspaceId) => `evidence/${workspaceId}/`

export async function storageEntitlement(sessionId) {
  if (!String(sessionId || '').startsWith('cs_')) return storagePlan('free')
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ['subscription'] })
    const subscription = publicSubscription(session)
    return storagePlan(subscription.planId)
  } catch {
    return storagePlan('free')
  }
}

export async function storedBytes(workspaceId) {
  let cursor
  let total = 0
  do {
    const page = await list({ prefix: workspacePrefix(workspaceId), cursor, limit: 1000 })
    total += page.blobs.reduce((sum, blob) => sum + blob.size, 0)
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  return total
}

export function assertWorkspacePath(workspaceId, pathname) {
  if (!validWorkspaceId(workspaceId) || !String(pathname || '').startsWith(workspacePrefix(workspaceId))) {
    throw new Error('파일 경로를 확인할 수 없습니다.')
  }
}
