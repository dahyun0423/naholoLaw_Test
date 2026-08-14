import Modal from './Modal.jsx'
import { cx } from './ui.jsx'
import { formatWon } from '../lib/storagePlans.js'
import { PRECEDENT_PLANS } from '../lib/precedentPlans.js'

const plans = [PRECEDENT_PLANS.free, PRECEDENT_PLANS.premium]
const neutralGlow = 'shadow-[inset_0px_6px_6px_-2px_rgba(101,106,118,0.15),inset_0px_-20px_20px_-6px_rgba(255,255,255,0.49),inset_0px_-40px_100px_-8px_rgba(212,212,212,0.4),inset_0px_-80px_60px_-25px_white]'
const featuredGlow = 'shadow-[inset_0px_6px_6px_-2px_rgba(35,101,255,0.15),inset_0px_-20px_20px_-6px_rgba(255,255,255,0.4),inset_0px_-40px_10px_-8px_rgba(0,77,255,0.5),inset_0px_-80px_60px_-25px_#144ccd]'

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
      maxW="max-w-[702px]"
      variant="subscription"
    >
      <div className="grid items-center gap-[14px] sm:grid-cols-2">
        {plans.map((plan) => {
          const current = currentPlanId === plan.id
          const featured = plan.id === 'premium'
          return (
            <section
              key={plan.id}
              className={cx(
                'relative overflow-hidden rounded-[20px] bg-white',
                featured ? 'h-[310px]' : 'h-[300px]',
              )}
            >
              <div
                aria-hidden="true"
                className={cx('pointer-events-none absolute inset-x-0 top-0 rounded-[20px]', featured ? `h-[332px] ${featuredGlow}` : `h-[346px] ${neutralGlow}`)}
              />
              <div className={cx('relative z-10 mx-auto flex h-[300px] w-full flex-col px-6 py-5', featured ? 'gap-4' : 'gap-6')}>
                <div className="flex flex-col gap-1">
                  <div className="flex min-h-[22px] items-start justify-between gap-2">
                    <h4 className={cx('font-bold leading-[1.6]', featured ? 'text-sm text-brand-400' : 'text-base text-ink-600')}>
                      {plan.name}
                    </h4>
                    {current ? (
                      <span className="shrink-0 text-xs font-medium leading-[1.6] text-brand-300">현재 이용권</span>
                    ) : featured ? (
                      <span className="shrink-0 rounded bg-brand-50 px-1 text-xs font-semibold leading-[1.6] text-brand-300">추천</span>
                    ) : null}
                  </div>
                  <div className={cx('flex flex-col items-start', featured ? 'gap-2' : 'gap-2')}>
                    {featured ? (
                      <div className="flex items-baseline gap-1 leading-[1.6]">
                        <span className="text-[30px] font-bold tracking-tight text-brand-400">{formatWon(plan.price)}</span>
                        <span className="text-[13px] font-medium text-brand-200">/ 월</span>
                      </div>
                    ) : (
                      <p className="text-[28px] font-bold leading-[1.6] tracking-tight text-ink-900">무료</p>
                    )}
                    <div className={cx('h-px w-full', featured ? 'bg-brand-100' : 'bg-ink-100')} />
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-1">
                  <p className="text-[13px] font-semibold leading-[1.6] text-ink-500">{plan.description}</p>
                  <p className="text-xs font-medium leading-[1.6] tracking-[-0.3px] text-ink-500">
                    판례의 관련성 설명·저장·내 문서 인용과 국가법령정보센터 원문 연결을 제공합니다.
                  </p>
                </div>

                {featured && (
                  <button
                    type="button"
                    disabled={Boolean(busyPlan) || checking}
                    onClick={isPremium ? onManage : onSubscribe}
                    className="h-[38px] w-full rounded-[10px] bg-brand-600 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(34,114,235,0.24)] transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyPlan === 'premium'
                      ? '결제 화면 여는 중…'
                      : busyPlan === 'portal'
                        ? '불러오는 중…'
                        : isPremium
                          ? '판례검색 구독 관리'
                          : '판례검색 프리미엄 시작'}
                  </button>
                )}
              </div>
            </section>
          )
        })}
      </div>
      {subscription?.cancelAtPeriodEnd && (
        <p className="mt-[18px] rounded-xl bg-red-50 px-3.5 py-3 text-[12.5px] text-red-500">
          현재 구독은 결제 기간이 끝나면 검색당 5건을 볼 수 있는 기본 이용권으로 돌아갑니다.
        </p>
      )}
      {error && <p role="alert" className="mt-[18px] text-[12.5px] font-medium text-red-500">{error}</p>}
      <p className="mt-[18px] text-[13px] leading-[1.6] text-ink-400">
        표시 가격은 부가세 포함 기준입니다.<br />
        판례검색 구독을 해지해도 저장공간 요금제와 보관 중인 증빙자료에는 영향을 주지 않습니다.
      </p>
    </Modal>
  )
}
