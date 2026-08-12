import Stripe from 'stripe'
import { storagePlan } from '../src/lib/storagePlans.js'
import { precedentPlan } from '../src/lib/precedentPlans.js'

let client

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe 환경 변수가 설정되지 않았습니다.')
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-07-29.dahlia',
    })
  }
  return client
}

export function allowMethod(req, res, method) {
  if (req.method === method) return true
  res.setHeader('Allow', method)
  res.status(405).json({ error: '지원하지 않는 요청입니다.' })
  return false
}

export function safeOrigin(req) {
  const raw = req.headers.origin || `https://${req.headers.host || ''}`
  try {
    const url = new URL(raw)
    const isLocal = ['localhost', '127.0.0.1'].includes(url.hostname)
    if (url.protocol !== 'https:' && !isLocal) throw new Error('invalid origin')
    return url.origin
  } catch {
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    }
    throw new Error('결제 후 돌아갈 주소를 확인하지 못했습니다.')
  }
}

export async function ensureStoragePrice(planId) {
  const plan = storagePlan(planId)
  if (plan.id === 'free') throw new Error('무료 플랜은 결제가 필요하지 않습니다.')

  const stripe = getStripe()
  const query = `active:'true' AND metadata['naholo_storage_plan']:'${plan.id}'`
  const found = await stripe.products.search({ query, limit: 1 })
  let product = found.data[0]

  if (!product) {
    product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: {
        naholo_storage_plan: plan.id,
        storage_bytes: String(plan.totalBytes),
      },
    })
  }

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 })
  let price = prices.data.find((candidate) => (
    candidate.currency === 'krw'
    && candidate.unit_amount === plan.price
    && candidate.recurring?.interval === 'month'
  ))

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      currency: 'krw',
      unit_amount: plan.price,
      recurring: { interval: 'month' },
      metadata: { naholo_storage_plan: plan.id },
    })

    // Stripe Price는 금액 수정이 불가능하므로 새 가격을 만든 뒤
    // 이전 월 가격은 신규 Checkout에 노출되지 않게 보관 처리한다.
    await Promise.all(prices.data
      .filter((candidate) => candidate.recurring?.interval === 'month')
      .map((candidate) => stripe.prices.update(candidate.id, { active: false })))
  }

  return { plan, price }
}

export async function ensurePrecedentPrice() {
  const plan = precedentPlan('premium')
  const stripe = getStripe()
  const query = `active:'true' AND metadata['naholo_precedent_plan']:'${plan.id}'`
  const found = await stripe.products.search({ query, limit: 1 })
  let product = found.data[0]

  if (!product) {
    product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: { naholo_precedent_plan: plan.id },
    })
  }

  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 })
  let price = prices.data.find((candidate) => (
    candidate.currency === 'krw'
    && candidate.unit_amount === plan.price
    && candidate.recurring?.interval === 'month'
  ))

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      currency: 'krw',
      unit_amount: plan.price,
      recurring: { interval: 'month' },
      metadata: { naholo_precedent_plan: plan.id },
    })
    await Promise.all(prices.data
      .filter((candidate) => candidate.recurring?.interval === 'month')
      .map((candidate) => stripe.prices.update(candidate.id, { active: false })))
  }

  return { plan, price }
}

export function publicSubscription(session) {
  const subscription = typeof session.subscription === 'object' ? session.subscription : null
  const status = subscription?.status || 'inactive'
  const entitled = ['active', 'trialing'].includes(status)
  const plan = entitled ? storagePlan(session.metadata?.storage_plan) : storagePlan('free')

  return {
    planId: plan.id,
    planName: plan.name,
    totalBytes: plan.totalBytes,
    status,
    cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
    currentPeriodEnd: subscription?.current_period_end || null,
  }
}

export function publicPrecedentSubscription(session) {
  const subscription = typeof session.subscription === 'object' ? session.subscription : null
  const status = subscription?.status || 'inactive'
  const entitled = ['active', 'trialing'].includes(status)
  const plan = entitled ? precedentPlan(session.metadata?.precedent_plan) : precedentPlan('free')

  return {
    planId: plan.id,
    planName: plan.name,
    similarLimit: plan.similarLimit,
    status,
    cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
    currentPeriodEnd: subscription?.current_period_end || null,
  }
}
