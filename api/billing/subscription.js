import { allowMethod, getStripe, publicSubscription } from '../_stripe.js'

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'POST')) return

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const sessionId = String(body.sessionId || '')
    if (!sessionId.startsWith('cs_')) throw new Error('결제 세션을 확인할 수 없습니다.')

    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })
    res.status(200).json(publicSubscription(session))
  } catch (error) {
    console.error('storage subscription error', error?.type || error?.name || 'unknown')
    res.status(400).json({ error: error?.message || '구독 상태를 확인하지 못했습니다.' })
  }
}
