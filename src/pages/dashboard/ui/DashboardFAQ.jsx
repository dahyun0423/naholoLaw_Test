import { ChevronRight, HelpCircle } from '../../../components/icons.jsx'
import { cx } from '../../../components/ui.jsx'
import { DASHBOARD_PANEL_CLASS } from './dashboardStyles.js'
import PanelGlow from './PanelGlow.jsx'

// 실서비스 기준: radius 20 · 좌우 26 · 위아래 24
//   한 칸이 두 줄이다 — 질문 한 줄, 그 아래 조회 수 한 줄.
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
            className="flex w-full flex-col items-start gap-1 rounded-[10px] border border-ink-200 bg-white p-3 text-left transition-colors hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className="flex min-w-0 items-start gap-2">
                <HelpCircle size={16} className="mt-1 shrink-0 text-brand-400" />
                <span className="truncate text-base text-ink-800">{item.q}</span>
              </span>
              <ChevronRight size={20} className="shrink-0 text-ink-300" />
            </span>
            <span className="text-sm text-ink-400">조회 {item.views}회</span>
          </button>
        ))}
      </div>
    </section>
  )
}
