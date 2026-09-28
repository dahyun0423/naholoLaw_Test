import { ChevronRight } from '../../../components/icons.jsx'
import { cx } from '../../../components/ui.jsx'
import { DASHBOARD_PANEL_CLASS } from './dashboardStyles.js'
import PanelGlow from './PanelGlow.jsx'

/** 질문 말풍선 — Figma 2298:118304 */
const QuestionBubble = ({ className = '' }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
    <path
      d="M5.26602 13.3314C6.53826 13.9841 8.00177 14.1608 9.39281 13.8299C10.7839 13.499 12.011 12.6821 12.853 11.5264C13.695 10.3708 14.0966 8.9524 13.9854 7.52686C13.8742 6.10133 13.2575 4.76238 12.2464 3.75131C11.2354 2.74024 9.89642 2.12353 8.47089 2.01232C7.04535 1.90111 5.62696 2.30271 4.47132 3.14475C3.31569 3.98679 2.49879 5.21389 2.16785 6.60494C1.83691 7.99598 2.01368 9.45949 2.66631 10.7317L1.33313 14.6646L5.26602 13.3314Z"
      stroke="#4593FC"
      strokeWidth="1.33318"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// 실서비스 기준: radius 20 · 좌우 26 · 위아래 24
//   한 칸에 질문 한 줄. 누르면 답변과 「공식 안내 보기」 링크가 열린다.
export default function DashboardFAQ({ items, onSelect }) {
  return (
    <section className={cx(DASHBOARD_PANEL_CLASS, 'flex flex-col gap-4 rounded-[20px] px-[26px] py-6')}>
      <PanelGlow radius={20} />
      <h2 className="relative z-10 text-lg font-semibold text-ink-900">질문이 많은 — 자주 묻는 질문</h2>
      <div className="relative z-10 flex flex-col gap-3">
        {items.map((item) => (
          <button
            key={item.q}
            type="button"
            onClick={() => onSelect(item)}
            className="flex w-full items-center justify-between gap-2 rounded-[10px] border border-ink-200 bg-white p-3 text-left transition-colors hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <span className="flex min-w-0 items-center gap-2">
              <QuestionBubble className="shrink-0" />
              <span className="truncate text-base text-ink-800">{item.q}</span>
            </span>
            <ChevronRight size={20} className="shrink-0 text-ink-300" />
          </button>
        ))}
      </div>
    </section>
  )
}
