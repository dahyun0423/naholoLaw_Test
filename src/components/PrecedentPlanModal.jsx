import Modal from './Modal.jsx'
import { Badge, Button, cx } from './ui.jsx'
import { formatWon } from '../lib/storagePlans.js'
import { PRECEDENT_PLANS } from '../lib/precedentPlans.js'

const plans = [PRECEDENT_PLANS.free, PRECEDENT_PLANS.premium]

export default function PrecedentPlanModal({
  open, onClose, subscription, checking, busyPlan, error, onSubscribe, onManage,
}) {
  const currentPlanId = subscription?.planId || 'free'
  const isPremium = currentPlanId === 'premium'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="판례검색 이용권"
      sub="증빙자료 저장공간과 별도로 운영되는 판례검색 전용 구독입니다."
      maxW="max-w-2xl"
      footer={isPremium ? (
        <Button size="sm" variant="neutral" disabled={busyPlan === 'portal'} onClick={onManage}>
          {busyPlan === 'portal' ? '불러오는 중…' : '판례검색 구독 관리'}
        </Button>
      ) : null}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {plans.map((plan) => {
          const current = currentPlanId === plan.id
          return (
            <section
              key={plan.id}
              className={cx(
                'flex min-h-[220px] flex-col rounded-2xl border p-5',
                current ? 'border-brand-300 bg-brand-50' : 'border-ink-200 bg-white',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-[16px] font-bold text-ink-900">{plan.name}</h4>
                  <p className="mt-2 text-[24px] font-bold tracking-tight text-ink-900">
                    {plan.price === 0 ? '무료' : `${formatWon(plan.price)} / 월`}
                  </p>
                </div>
                {current && <Badge tone="blue">현재 이용권</Badge>}
              </div>
              <p className="mt-4 text-[13px] leading-relaxed text-ink-600">{plan.description}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-500">
                판례의 관련성 설명·저장·내 문서 인용과 국가법령정보센터 원문 연결을 제공합니다.
              </p>
              <div className="mt-auto pt-5">
                {plan.id === 'premium' && !isPremium && (
                  <Button className="w-full" disabled={Boolean(busyPlan) || checking} onClick={onSubscribe}>
                    {busyPlan === 'premium' ? '결제 화면 여는 중…' : '판례검색 프리미엄 시작'}
                  </Button>
                )}
              </div>
            </section>
          )
        })}
      </div>
      {subscription?.cancelAtPeriodEnd && (
        <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-3 text-[12.5px] text-red-500">
          현재 구독은 결제 기간이 끝나면 검색당 5건을 볼 수 있는 기본 이용권으로 돌아갑니다.
        </p>
      )}
      {error && <p role="alert" className="mt-4 text-[12.5px] font-medium text-red-500">{error}</p>}
      <p className="mt-4 text-[11.5px] leading-relaxed text-ink-400">
        표시 가격은 부가세 포함 기준입니다. 판례검색 구독을 해지해도 저장공간 요금제와 보관 중인 증빙자료에는 영향을 주지 않습니다.
      </p>
    </Modal>
  )
}

