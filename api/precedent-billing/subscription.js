import { allowMethod, getStripe, publicPrecedentSubscription } from '../_stripe.js'

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'POST')) return

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const sessionId = String(body.sessionId || '')
    if (!sessionId.startsWith('cs_')) throw new Error('판례검색 결제 세션을 확인할 수 없습니다.')
    const session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ['subscription'] })
    res.status(200).json(publicPrecedentSubscription(session))
  } catch (error) {
    console.error('precedent subscription error', error?.type || error?.name || 'unknown')
    res.status(400).json({ error: error?.message || '판례검색 구독 상태를 확인하지 못했습니다.' })
  }
}

