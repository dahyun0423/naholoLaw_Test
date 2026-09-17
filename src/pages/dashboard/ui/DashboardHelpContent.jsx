import { Link } from 'react-router-dom'
import { Book, FileText, Video } from '../../../components/icons.jsx'
import { cx } from '../../../components/ui.jsx'
import { DASHBOARD_PANEL_CLASS } from './dashboardStyles.js'
import PanelGlow from './PanelGlow.jsx'

const ICON_BY_TYPE = { 동영상: Video, 가이드: Book, 템플릿: FileText }

// 실서비스 기준: radius 20 · 좌우 26 · 위 24 / 아래 50 · 항목 사이 16
//   아이콘은 blue50 바탕의 32 정사각 안에, 배지는 오른쪽 끝에 붙는다.
export default function DashboardHelpContent({ items, onSelect }) {
  return (
    <section className={cx(DASHBOARD_PANEL_CLASS, 'rounded-[20px] px-[26px] pb-[50px] pt-6')}>
      <PanelGlow radius={20} />
      <div className="relative z-10 flex flex-col gap-7">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">도움 콘텐츠</h2>
          <Link to="/app/guide" className="text-sm text-brand-400 hover:underline">더보기 →</Link>
        </div>
        <div className="flex flex-col gap-4">
          {items.map((item) => {
            const Icon = ICON_BY_TYPE[item.type] || FileText
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => onSelect(item)}
                className="flex items-center justify-between gap-2 rounded-[10px] border border-ink-200 bg-white px-4 py-[13px] text-left transition-colors hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-brand-50">
                    <Icon size={16} className="text-brand-400" />
                  </span>
                  <span className="truncate text-base text-ink-800">{item.title}</span>
                </span>
                <span className="shrink-0 rounded-sm bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-500">{item.type}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
