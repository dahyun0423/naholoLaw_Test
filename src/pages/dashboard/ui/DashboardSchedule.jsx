import { Link } from 'react-router-dom'
import { Check, Clock } from '../../../components/icons.jsx'
import { cx } from '../../../components/ui.jsx'
import { DASHBOARD_PANEL_CLASS } from './dashboardStyles.js'
import PanelGlow from './PanelGlow.jsx'

// 실서비스 기준: 폭 300 · radius 28 · 위 26 / 좌우 17 / 아래 100
//   가장 가까운 일정 한 칸만 파란 면(blue300)이고, 나머지는 grey100 위에 오른쪽이 흐려진다.
//   점과 선은 SVG 한 장으로 그린다 — 칸 높이가 달라도 선이 끊기지 않는다.

/** 일정 타임라인의 점 — 지금 차례인 칸만 속이 찬 겹동그라미다 */
function TimelineDot({ active }) {
  return active ? (
    <svg width="16" height="85" viewBox="0 0 16 85" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="8" cy="8" r="4.5" fill="#64a8ff" stroke="#64a8ff" />
      <circle cx="8" cy="8" r="7" stroke="#64a8ff" fill="none" />
      <path d="M8.5 20.5 8 84.5" stroke="#64a8ff" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="16" height="76" viewBox="0 0 16 76" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="8" cy="5" r="4.5" stroke="#64a8ff" fill="none" />
      <path d="M8.5 15.5V75.5" stroke="#64a8ff" strokeLinecap="round" />
    </svg>
  )
}

export default function DashboardSchedule({ now, weekDays, upcomingItems, highlightedIndex, completedTasks }) {
  return (
    <section className={cx(DASHBOARD_PANEL_CLASS, 'px-[17px] pb-[100px] pt-[26px]')}>
      <PanelGlow />
      <div className="relative z-10">
        <div className="flex flex-col gap-2.5 px-2">
          <p className="text-sm text-ink-700">
            {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <h2 className="text-2xl font-semibold text-ink-900">다가오는 일정</h2>
        </div>

        <div className="mt-[26px] grid grid-cols-7">
          {weekDays.map((item) => (
            <div key={item.id} className="flex flex-col items-center justify-center gap-1.5">
              <span className={cx('text-sm', item.isToday ? 'text-brand-500' : 'text-ink-600')}>{item.label}</span>
              <span className={cx('text-base font-semibold', item.isToday ? 'text-brand-500' : 'text-ink-900')}>{item.date}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {upcomingItems.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-400">다가오는 일정이 없어요</p>
          ) : upcomingItems.map((item, index) => {
            const isHighlighted = index === highlightedIndex
            return (
              <div key={`${item.caseId}-${item.id}`} className="flex items-center gap-[11px]">
                <TimelineDot active={isHighlighted} />
                <Link
                  to={`/app/cases/${item.caseId}`}
                  className={cx(
                    'relative min-w-0 flex-1 overflow-hidden rounded-[20px] pl-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
                    isHighlighted
                      ? 'bg-brand-300 pb-[18px] pt-[14px] text-white hover:bg-brand-400'
                      : 'h-[60px] bg-ink-100 py-2 text-ink-900 hover:bg-brand-50',
                  )}
                >
                  {!isHighlighted && (
                    <span aria-hidden="true" className="pointer-events-none absolute right-0 top-0 z-20 h-full w-16 bg-[linear-gradient(90deg,rgba(243,244,246,0)_60%,#ffffff_100%)]" />
                  )}
                  <span className="relative z-10 flex flex-col">
                    <span className="flex items-center gap-3">
                      {!isHighlighted && <Clock size={16} className="shrink-0 text-brand-300" />}
                      <span className="truncate text-base font-bold">{item.text}</span>
                    </span>
                    <span className={cx('truncate text-xs', isHighlighted ? 'text-ink-100' : 'pl-7 text-ink-700')}>{item.due}</span>
                  </span>
                </Link>
              </div>
            )
          })}
          <div className="h-px w-full bg-ink-200" />
        </div>

        <div className="mt-2.5 flex flex-col gap-3.5">
          <h3 className="text-lg font-semibold text-ink-900">완료된 작업</h3>
          <div className="flex flex-col gap-3">
            {completedTasks.length === 0 ? (
              <p className="text-sm text-ink-400">완료된 작업이 없어요</p>
            ) : completedTasks.map((item) => (
              <div key={`${item.caseId}-${item.id}`} className="flex items-center gap-4">
                <Check size={16} className="shrink-0 text-brand-400" />
                <p className="truncate text-base text-ink-700">{item.text || item.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
