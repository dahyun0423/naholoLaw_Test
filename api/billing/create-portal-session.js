import { allowMethod, getStripe, safeOrigin } from '../_stripe.js'

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'POST')) return

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const sessionId = String(body.sessionId || '')
    if (!sessionId.startsWith('cs_')) throw new Error('관리할 구독을 확인할 수 없습니다.')

    const stripe = getStripe()
    const checkout = await stripe.checkout.sessions.retrieve(sessionId)
    const customer = typeof checkout.customer === 'string' ? checkout.customer : checkout.customer?.id
    if (!customer) throw new Error('Stripe 고객 정보를 확인하지 못했습니다.')

    const portal = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${safeOrigin(req)}/app/evidence`,
    })
    res.status(200).json({ url: portal.url })
  } catch (error) {
    console.error('storage portal error', error?.type || error?.name || 'unknown')
    res.status(400).json({ error: error?.message || '구독 관리 화면을 열지 못했습니다.' })
  }
}
