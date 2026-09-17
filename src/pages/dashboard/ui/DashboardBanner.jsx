import { useNavigate } from 'react-router-dom'
import aiSparkImage from '../../../assets/dash/ai-spark.png'
import { cx } from '../../../components/ui.jsx'
import DashboardSurface from './DashboardSurface.jsx'

// 실서비스 기준: 배너와 AI 카드가 한 줄에서 어깨를 맞춘다.
//   배너   높이 180 · 제목 30(3xl) SemiBold blue400 · 부제 14 grey500 · 오른쪽 위 버튼 높이 56
//   AI     높이 180 · 폭 557 · 제목 20(xl) SemiBold blue400 · 칩 14 blue400 · 「긴급」 bg red500 흰 글자
const AI_TASKS = [
  { label: '준비서면 작성 권장', to: '/app/documents', urgent: true },
  { label: '증거 보완 권장', to: '/app/evidence' },
  { label: '답변 예정 권장하기', to: '/app/schedule' },
]

function AiTaskButton({ task, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(task.to)}
      className="flex h-[37px] items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm text-brand-400 transition-colors hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
    >
      {task.label}
      {task.urgent ? (
        <span className="rounded-full bg-red-500 px-2 py-1 text-xs font-semibold leading-none text-white">긴급</span>
      ) : null}
    </button>
  )
}

export default function DashboardBanner({ primaryTask }) {
  const navigate = useNavigate()

  return (
    <section className="flex flex-col items-stretch gap-4 xl:flex-row xl:items-center xl:justify-between">
      <DashboardSurface as="div" className="relative h-[180px] min-w-0 flex-1 rounded-2xl">
        {/* 버튼이 먼저 자리를 잡고, 글은 그 아래 층에서 카드 한가운데를 쓴다 */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate(primaryTask.actionTo)}
            className={cx(
              'flex h-14 items-center gap-2 rounded-2xl px-8 text-lg font-semibold text-ink-600 transition-colors hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
              'border border-ink-200 bg-white',
              'shadow-[inset_0_6px_10px_-2px_rgba(130,130,132,0.10),inset_0_-10px_50px_-6px_rgba(255,255,255,0.40),inset_0_-40px_30px_-8px_#e2e8f0,inset_0_-80px_60px_-30px_#f7f9ff]',
            )}
          >
            {primaryTask.actionLabel}
            <img src="/figma/dashboard/arrow-up-right.svg" alt="" aria-hidden="true" className="size-5 rotate-45 opacity-60" />
          </button>
        </div>

        <div className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-[9px] px-10 py-6">
          <p className="text-3xl font-semibold leading-tight text-brand-400">
            {primaryTask.title}
            {primaryTask.deadline ? <span className="ml-2 whitespace-nowrap text-red-500">{primaryTask.deadline}</span> : null}
            <span className="block">지금 바로 준비하세요!</span>
          </p>
          <p className="text-sm text-ink-500">{primaryTask.description}</p>
        </div>
      </DashboardSurface>

      <DashboardSurface as="div" className="flex h-[180px] w-full shrink-0 flex-col gap-2.5 rounded-2xl px-[34px] pb-5 pt-4 xl:w-[557px]">
        <div className="flex items-center gap-3">
          <span className="grid h-[50px] w-[50px] shrink-0 place-items-center" aria-hidden="true">
            <img src={aiSparkImage} alt="" className="h-[62px] w-[48px] object-contain" />
          </span>
          <h2 className="text-xl font-semibold text-brand-400">AI가 제안 주요 작업</h2>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-2">
          {AI_TASKS.map((task) => <AiTaskButton key={task.label} task={task} onSelect={navigate} />)}
        </div>
      </DashboardSurface>
    </section>
  )
}
