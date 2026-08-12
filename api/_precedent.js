import { getStripe, publicPrecedentSubscription } from './_stripe.js'
import { precedentPlan } from '../src/lib/precedentPlans.js'

export async function precedentEntitlement(sessionId) {
  if (!String(sessionId || '').startsWith('cs_')) return precedentPlan('free')
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ['subscription'] })
    const subscription = publicPrecedentSubscription(session)
    return precedentPlan(subscription.planId)
  } catch {
    return precedentPlan('free')
  }
}

