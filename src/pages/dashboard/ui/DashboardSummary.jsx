import { Link } from 'react-router-dom'
import { cx } from '../../../components/ui.jsx'
import { DASHBOARD_STAT_CLASS } from './dashboardStyles.js'
import PanelGlow from './PanelGlow.jsx'

// 실서비스 기준: 네 칸 · 간격 10 · 높이 188 · 좌우 여백 36
//   라벨 20(xl) SemiBold blue700 / 숫자 30(3xl) Bold blue700 / 배지 20(xl) blue400 · bg blue50 · radius 20
function SummaryCard({ card }) {
  return (
    <Link
      to={card.to}
      aria-label={`${card.label} ${card.value} — ${card.badge}`}
      className={cx(
        DASHBOARD_STAT_CLASS,
        'flex h-[188px] flex-col justify-between px-9 pb-[30px] pt-6 transition-colors hover:border-brand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
      )}
    >
      <PanelGlow radius={20} />
      <span className="relative z-10 flex flex-col gap-1">
        <span className="text-xl font-semibold text-brand-700">{card.label}</span>
        <span className="truncate text-3xl font-bold text-brand-700">{card.value}</span>
      </span>
      <span className="relative z-10">
        <span className="inline-flex max-w-full items-center truncate rounded-[20px] bg-brand-50 px-4 py-1 text-xl font-normal text-brand-400">
          {card.badge}
        </span>
      </span>
    </Link>
  )
}

export default function DashboardSummary({ cards }) {
  return (
    <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4" aria-label="사건 현황 요약">
      {cards.map((card) => <SummaryCard key={card.id} card={card} />)}
    </section>
  )
}
