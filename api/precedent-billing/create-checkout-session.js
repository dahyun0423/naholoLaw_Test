import { allowMethod, ensurePrecedentPrice, getStripe, safeOrigin } from '../_stripe.js'

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'POST')) return

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const email = String(body.email || '')
    const { plan, price } = await ensurePrecedentPrice()
    const origin = safeOrigin(req)
    const stripe = getStripe()
    const cleanEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${origin}/app/search?precedent_checkout=success&precedent_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/app/search?precedent_checkout=cancel`,
      customer_email: cleanEmail,
      metadata: { precedent_plan: plan.id },
      subscription_data: { metadata: { precedent_plan: plan.id } },
      integration_identifier: 'naholo_precedent_nxkqptla',
    })

    res.status(200).json({ url: session.url })
  } catch (error) {
    console.error('precedent checkout error', error?.type || error?.name || 'unknown')
    res.status(400).json({ error: error?.message || '판례검색 결제를 시작하지 못했습니다.' })
  }
}

