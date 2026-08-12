import { del } from '@vercel/blob'
import { assertWorkspacePath } from '../_storage.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: '지원하지 않는 요청입니다.' })
    return
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const pathnames = Array.isArray(body.pathnames) ? body.pathnames.slice(0, 100) : []
    pathnames.forEach((pathname) => assertWorkspacePath(body.workspaceId, pathname))
    if (pathnames.length) await del(pathnames)
    res.status(200).json({ deleted: pathnames.length })
  } catch (error) {
    console.error('blob delete error', error?.name || 'unknown')
    res.status(400).json({ error: error?.message || '파일을 삭제하지 못했습니다.' })
  }
}
