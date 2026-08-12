import { upload } from '@vercel/blob/client'
import { storageSessionId, storageWorkspaceId } from './storageIdentity.js'

const safeFilename = (name) => name
  .normalize('NFC')
  .replace(/[^\p{L}\p{N}._-]+/gu, '-')
  .replace(/^-+|-+$/g, '')
  .slice(-120) || 'file'

export async function uploadEvidenceFile(file) {
  const workspaceId = storageWorkspaceId()
  const pathname = `evidence/${workspaceId}/${crypto.randomUUID()}-${safeFilename(file.name)}`
  const blob = await upload(pathname, file, {
    access: 'private',
    handleUploadUrl: '/api/blob/upload',
    multipart: file.size > 5 * 1024 * 1024,
    clientPayload: JSON.stringify({
      workspaceId,
      sessionId: storageSessionId(),
    }),
  })
  return { ...blob, bytes: file.size }
}

export async function deleteEvidenceFiles(files) {
  const pathnames = files.map((file) => file.blobPathname).filter(Boolean)
  if (pathnames.length === 0) return
  const response = await fetch('/api/blob/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId: storageWorkspaceId(), pathnames }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || '파일 원본을 삭제하지 못했습니다.')
}

export async function downloadEvidenceFile(file) {
  if (!file.blobPathname) return false
  const params = new URLSearchParams({
    workspaceId: storageWorkspaceId(),
    pathname: file.blobPathname,
    filename: file.name,
  })
  window.location.assign(`/api/blob/download?${params}`)
  return true
}
