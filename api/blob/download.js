import { Readable } from 'node:stream'
import { get } from '@vercel/blob'
import { assertWorkspacePath } from '../_storage.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).end()
    return
  }
  try {
    const { workspaceId, pathname } = req.query
    assertWorkspacePath(workspaceId, pathname)
    const result = await get(pathname, { access: 'private' })
    if (!result || result.statusCode !== 200) {
      res.status(404).end('파일을 찾지 못했습니다.')
      return
    }
    const filename = String(req.query.filename || pathname.split('/').pop()).replace(/["\r\n]/g, '')
    res.setHeader('Content-Type', result.blob.contentType || 'application/octet-stream')
    res.setHeader('Content-Length', String(result.blob.size))
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`)
    Readable.fromWeb(result.stream).pipe(res)
  } catch (error) {
    console.error('blob download error', error?.name || 'unknown')
    res.status(400).end('파일을 내려받지 못했습니다.')
  }
}
