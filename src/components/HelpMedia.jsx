import { FileText, Book, ArrowRight, ExternalLink } from './icons.jsx'
import { downloadText, youtubeSearch, resources, templateFor } from '../lib/templates.js'

// 도움 콘텐츠 모달 안에서 유형별 '실제 동작'을 제공한다.
// item: { type: '동영상'|'템플릿'|'가이드', title, cta?, to? }
export default function HelpMedia({ item, navigate, onClose }) {
  const type = item.type
  const cleanTitle = item.title.replace(/\s*\(.*?\)\s*/g, '').trim()

  return (
    <div className="space-y-3">
      {type === '동영상' && (
        <button
          onClick={() => window.open(youtubeSearch(`${cleanTitle} 나홀로소송`), '_blank', 'noopener,noreferrer')}
          className="group relative grid h-40 w-full place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-ink-800 to-ink-600"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 pl-1 text-2xl text-ink-900 transition group-hover:scale-110">▶</span>
          <span className="absolute inset-x-3 bottom-3 truncate text-left text-xs font-medium text-white/90">
            YouTube에서 ‘{cleanTitle}’ 영상 보기 →
          </span>
        </button>
      )}

      {type === '템플릿' && (() => {
        const t = templateFor(item.title)
        return (
          <button
            onClick={() => downloadText(t.name, t.text)}
            className="flex w-full items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 text-left hover:bg-brand-50"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-brand-500"><FileText size={20} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink-900">{t.name} 다운로드</p>
              <p className="text-xs text-ink-500">바로 사용할 수 있는 표준 양식을 내려받습니다.</p>
            </div>
            <ArrowRight size={16} className="shrink-0 text-brand-400" />
          </button>
        )
      })()}

      {type === '가이드' && (
        <button
          onClick={() => { onClose?.(); navigate(item.to || '/app/guide') }}
          className="flex w-full items-center gap-3 rounded-xl border border-ink-200 bg-ink-50 p-4 text-left hover:bg-brand-50/40"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-brand-500"><Book size={20} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink-900">{item.cta || '앱에서 단계별로 보기'}</p>
            <p className="text-xs text-ink-500">앱 안의 해당 화면으로 이동합니다.</p>
          </div>
          <ArrowRight size={16} className="shrink-0 text-brand-400" />
        </button>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-ink-400">
        <span className="font-medium">관련 공식 자료</span>
        <a href={resources.naholo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-brand-400">법원 나홀로소송 <ExternalLink size={11} /></a>
        <a href={resources.easylaw} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-brand-400">생활법령정보 <ExternalLink size={11} /></a>
      </div>
    </div>
  )
}
