import { Link } from 'react-router-dom'
import { cx } from '../../../components/ui.jsx'
import { DASHBOARD_PANEL_CLASS } from './dashboardStyles.js'
import PanelGlow from './PanelGlow.jsx'

// 최근에 수정한 사건 세 건을 바로 이어서 열 수 있는 목록.
export default function DashboardRecentCases({ cases }) {
  return (
    <section className={cx(DASHBOARD_PANEL_CLASS, 'p-6')}>
      <PanelGlow />
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">최근 사건</h2>
          <Link to="/app/cases" className="text-sm text-brand-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
            전체보기 →
          </Link>
        </div>
        {cases.length ? (
          <ul className="flex flex-col gap-3">
            {cases.map((item) => (
              <li key={item.id} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-700" />
                <Link
                  to={`/app/cases/${item.id}`}
                  className="flex min-w-0 flex-col gap-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                >
                  <span className="truncate text-base text-ink-800">
                    {item.title} <span className="text-ink-500">({item.status})</span>
                  </span>
                  <span className="truncate text-sm font-normal text-ink-400">{item.meta}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-400">아직 등록한 사건이 없어요</p>
        )}
      </div>
    </section>
  )
}
