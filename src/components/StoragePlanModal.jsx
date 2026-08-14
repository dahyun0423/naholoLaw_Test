import Modal from './Modal.jsx'
import { cx } from './ui.jsx'
import { Check } from './icons.jsx'
import { formatBytes, formatWon, PAID_STORAGE_PLANS, STORAGE_PLANS } from '../lib/storagePlans.js'

const allPlans = [STORAGE_PLANS.free, ...PAID_STORAGE_PLANS]

const neutralGlow = 'shadow-[inset_0px_6px_6px_-2px_rgba(101,106,118,0.15),inset_0px_-20px_20px_-6px_rgba(255,255,255,0.49),inset_0px_-40px_100px_-8px_rgba(212,212,212,0.4),inset_0px_-80px_60px_-25px_white]'
const featuredGlow = 'shadow-[inset_0px_6px_6px_-2px_rgba(35,101,255,0.15),inset_0px_-20px_20px_-6px_rgba(255,255,255,0.4),inset_0px_-40px_10px_-8px_rgba(0,77,255,0.5),inset_0px_-80px_60px_-25px_#144ccd]'

function PlanAction({ primary, disabled, onClick, children }) {
  if (!onClick) {
    return (
      <div className="grid h-[38px] w-full place-items-center rounded-[10px] bg-ink-100 text-[13px] font-bold text-ink-600">
        {children}
      </div>
    )
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'h-[38px] w-full rounded-[10px] text-[13px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        primary
          ? 'bg-brand-600 text-white shadow-[0_4px_12px_rgba(34,114,235,0.24)] hover:bg-brand-700'
          : 'bg-ink-100 text-ink-600 hover:bg-ink-200',
      )}
    >
      {children}
    </button>
  )
}

export default function StoragePlanModal({
  open, onClose, subscription, checking, busyPlan, error, onSubscribe, onManage,
}) {
  const currentPlanId = subscription?.planId || 'free'
  const isPaid = currentPlanId !== 'free'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="저장공간 늘리기"
      sub="기본 500MB에서 시작하며, 필요한 만큼 증빙자료 보관 용량만 늘릴 수 있어요."
      maxW="max-w-[919px]"
      variant="subscription"
    >
      <div className="grid items-center gap-[14px] md:grid-cols-3">
        {allPlans.map((plan) => {
          const current = currentPlanId === plan.id
          const paidChoice = plan.id !== 'free'
          const featured = plan.id === 'storage10'
          const displayAmount = featured ? '10GB' : formatBytes(plan.totalBytes)
          const waiting = busyPlan === plan.id || busyPlan === 'portal'
          let actionLabel = current ? (paidChoice ? '구독 관리' : '현재 이용중') : `${formatBytes(plan.totalBytes)} 구독`
          let action = current ? (paidChoice ? onManage : null) : () => onSubscribe(plan.id)

          if (isPaid && !current) {
            actionLabel = plan.id === 'free' ? '기본으로 변경' : '구독 변경'
            action = onManage
          }
          if (waiting) actionLabel = busyPlan === 'portal' ? '불러오는 중…' : '결제 화면 여는 중…'

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
              <div className="relative z-10 mx-auto flex h-[300px] w-full flex-col gap-4 px-6 py-5">
                <div className="flex flex-col gap-1">
                  <div className="flex min-h-[22px] items-start justify-between gap-2">
                    <h4 className={cx('font-bold leading-[1.6]', featured ? 'text-sm text-brand-400' : 'text-base text-ink-600')}>
                      {plan.name}
                    </h4>
                    {current ? (
                      <span className="shrink-0 text-xs font-medium leading-[1.6] text-brand-300">현재 플랜</span>
                    ) : featured ? (
                      <span className="shrink-0 rounded bg-brand-50 px-1 text-xs font-semibold leading-[1.6] text-brand-300">추천</span>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className={cx('font-bold leading-[1.6] tracking-tight', featured ? 'text-[30px] text-brand-400' : 'text-[28px] text-ink-900')}>
                      {displayAmount}
                    </p>
                    <div className={cx('h-px w-full', featured ? 'bg-brand-100' : 'bg-ink-100')} />
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-1">
                  <p className="text-[13px] font-medium leading-[1.6] text-ink-500">{plan.description}</p>
                  <div className="flex flex-col gap-1">
                    <p className={cx('flex items-center gap-2 text-xs font-medium leading-[1.6]', featured ? 'text-brand-300' : 'text-ink-500')}>
                      <Check size={20} className="shrink-0" /> 파일 종류·사건 수 제한 없음
                    </p>
                    <p className={cx('flex items-center gap-2 text-xs font-medium leading-[1.6]', featured ? 'text-brand-300' : 'text-ink-500')}>
                      <Check size={20} className="shrink-0" /> 판례검색 이용권과 별도 관리
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold leading-[1.6] text-ink-700">
                  {plan.price === 0 ? '무료' : `${formatWon(plan.price)} / 월`}
                  </p>
                  <PlanAction
                    primary={featured}
                    disabled={Boolean(busyPlan) || checking}
                    onClick={action}
                  >
                    {actionLabel}
                  </PlanAction>
                </div>
              </div>
            </section>
          )
        })}
      </div>

      {subscription?.cancelAtPeriodEnd && (
        <p className="mt-[18px] rounded-xl bg-red-50 px-3.5 py-3 text-[12.5px] text-red-500">
          현재 구독은 결제 기간이 끝나면 기본 500MB로 돌아갑니다.
        </p>
      )}
      {error && <p role="alert" className="mt-[18px] text-[12.5px] font-medium text-red-500">{error}</p>}
      <p className="mt-[18px] text-[13px] leading-[1.6] text-ink-400">
        언제든 해지 가능 · 표시 가격은 부가세(VAT) 포함 기준이며 결제와 해지는 Stripe에서 안전하게 처리됩니다.<br />
        구독 해지 후 사용량이 500MB를 넘으면 기존 파일은 유지되지만 새 파일을 올릴 수 없습니다.
      </p>
    </Modal>
  )
}
