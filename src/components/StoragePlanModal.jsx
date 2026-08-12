import Modal from './Modal.jsx'
import { Badge, Button, cx } from './ui.jsx'
import { Check } from './icons.jsx'
import { formatBytes, formatWon, PAID_STORAGE_PLANS, STORAGE_PLANS } from '../lib/storagePlans.js'

const allPlans = [STORAGE_PLANS.free, ...PAID_STORAGE_PLANS]

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
      maxW="max-w-3xl"
      footer={isPaid ? (
        <Button size="sm" variant="neutral" disabled={busyPlan === 'portal'} onClick={onManage}>
          {busyPlan === 'portal' ? '불러오는 중…' : '결제·구독 관리'}
        </Button>
      ) : null}
    >
      <div className="grid gap-3 md:grid-cols-3">
        {allPlans.map((plan) => {
          const current = currentPlanId === plan.id
          const paidChoice = plan.id !== 'free'
          return (
            <section
              key={plan.id}
              className={cx(
                'flex min-h-[224px] flex-col rounded-2xl border p-4',
                current ? 'border-brand-300 bg-brand-50' : 'border-ink-200 bg-white',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-[15px] font-bold text-ink-900">{plan.name}</h4>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-ink-900">{formatBytes(plan.totalBytes)}</p>
                </div>
                {current && <Badge tone="blue">현재 플랜</Badge>}
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">{plan.description}</p>
              <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-ink-600">
                <Check size={13} className="text-brand-500" /> 파일 종류·사건 수 제한 없음
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-ink-600">
                <Check size={13} className="text-brand-500" /> 판례검색 이용권과 별도 관리
              </p>
              <div className="mt-auto pt-5">
                <p className="mb-2 text-[13px] font-bold text-ink-900">
                  {plan.price === 0 ? '무료' : `${formatWon(plan.price)} / 월`}
                </p>
                {paidChoice && !isPaid && (
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={Boolean(busyPlan) || checking}
                    onClick={() => onSubscribe(plan.id)}
                  >
                    {busyPlan === plan.id ? '결제 화면 여는 중…' : `${formatBytes(plan.totalBytes)} 구독`}
                  </Button>
                )}
                {paidChoice && isPaid && !current && (
                  <Button size="sm" variant="neutral" className="w-full" onClick={onManage}>
                    구독 변경
                  </Button>
                )}
              </div>
            </section>
          )
        })}
      </div>

      {subscription?.cancelAtPeriodEnd && (
        <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-3 text-[12.5px] text-red-500">
          현재 구독은 결제 기간이 끝나면 기본 500MB로 돌아갑니다.
        </p>
      )}
      {error && <p role="alert" className="mt-4 text-[12.5px] font-medium text-red-500">{error}</p>}
      <p className="mt-4 text-[11.5px] leading-relaxed text-ink-400">
        표시 가격은 부가세 포함 기준이며 결제와 해지는 Stripe에서 안전하게 처리됩니다. 구독 해지 후 사용량이 500MB를 넘으면 기존 파일은 유지되지만 새 파일을 올릴 수 없습니다.
      </p>
    </Modal>
  )
}
