import { allowMethod, ensureStoragePrice, getStripe, safeOrigin } from '../_stripe.js'

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'POST')) return

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const { planId, email = '', workspaceId = '' } = body
    const { plan, price } = await ensureStoragePrice(planId)
    const origin = safeOrigin(req)
    const stripe = getStripe()
    const cleanEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined
    const cleanWorkspaceId = /^[a-zA-Z0-9_-]{8,80}$/.test(workspaceId) ? workspaceId : undefined

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${origin}/app/evidence?storage_checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/app/evidence?storage_checkout=cancel`,
      customer_email: cleanEmail,
      client_reference_id: cleanWorkspaceId,
      metadata: {
        storage_plan: plan.id,
        storage_bytes: String(plan.totalBytes),
        ...(cleanWorkspaceId ? { workspace_id: cleanWorkspaceId } : {}),
      },
      subscription_data: {
        metadata: {
          storage_plan: plan.id,
          storage_bytes: String(plan.totalBytes),
          ...(cleanWorkspaceId ? { workspace_id: cleanWorkspaceId } : {}),
        },
      },
      integration_identifier: 'naholo_storage_hqmtzvka',
    })

    res.status(200).json({ url: session.url })
  } catch (error) {
    console.error('storage checkout error', error?.type || error?.name || 'unknown')
    res.status(400).json({ error: error?.message || '결제를 시작하지 못했습니다.' })
  }
}
