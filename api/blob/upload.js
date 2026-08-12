import { handleUpload } from '@vercel/blob/client'
import { assertWorkspacePath, storedBytes, storageEntitlement, validWorkspaceId } from '../_storage.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: '지원하지 않는 요청입니다.' })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const result = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = JSON.parse(clientPayload || '{}')
        if (!validWorkspaceId(payload.workspaceId)) throw new Error('저장공간을 확인할 수 없습니다.')
        assertWorkspacePath(payload.workspaceId, pathname)

        const [plan, usedBytes] = await Promise.all([
          storageEntitlement(payload.sessionId),
          storedBytes(payload.workspaceId),
        ])
        const remaining = Math.max(0, plan.totalBytes - usedBytes)
        if (remaining === 0) throw new Error('저장공간을 모두 사용했습니다.')

        return {
          allowedContentTypes: ['application/*', 'image/*', 'text/*', 'audio/*', 'video/*'],
          maximumSizeInBytes: remaining,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ workspaceId: payload.workspaceId }),
        }
      },
    })
    res.status(200).json(result)
  } catch (error) {
    console.error('blob upload error', error?.name || 'unknown')
    res.status(400).json({ error: error?.message || '파일을 올리지 못했습니다.' })
  }
}
