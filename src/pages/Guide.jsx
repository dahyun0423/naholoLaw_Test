import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Card, Badge, Button } from '../components/ui.jsx'
import { ArrowRight, Book, CheckCircle, HelpCircle } from '../components/icons.jsx'
import { requestProductTour, TOUR_ROUTES, tourSeen } from '../components/guide/tourData.js'

export default function Guide() {
  const location = useLocation()
  const [, refreshStatus] = useState(0)

  useEffect(() => {
    const sync = () => refreshStatus((value) => value + 1)
    window.addEventListener('naholo:tour-complete', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('naholo:tour-complete', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const completed = TOUR_ROUTES.filter((route) => tourSeen(route.key)).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">화면별 사용가이드</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-500">
            설명서를 따로 읽지 않아도 괜찮아요. 원하는 화면으로 이동해 실제 버튼과 영역을 순서대로 짚어드립니다.
          </p>
        </div>
        <Badge tone="blue">{completed} / {TOUR_ROUTES.length} 완료</Badge>
      </div>

      <Card data-tour="current-guide" className="flex flex-col gap-5 border-brand-200 bg-brand-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-brand-500 shadow-sm">
            <HelpCircle size={22} />
          </span>
          <div>
            <h2 className="font-bold text-ink-900">지금 보고 있는 화면을 둘러볼까요?</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-600">가이드 모음의 사용법을 화면 위에서 바로 확인할 수 있어요.</p>
          </div>
        </div>
        <Button onClick={() => requestProductTour(location.pathname)} className="shrink-0">
          이 화면 둘러보기 <ArrowRight size={16} />
        </Button>
      </Card>

      <div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink-900">둘러볼 화면 선택</h2>
            <p className="mt-1 text-xs text-ink-500">완료한 가이드도 언제든 다시 실행할 수 있습니다.</p>
          </div>
          <p className="hidden text-xs text-ink-400 sm:block">Esc로 닫기 · ← → 키로 이동</p>
        </div>

        <ul data-tour="guide-list" className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {TOUR_ROUTES.map((route) => {
            const seen = tourSeen(route.key)
            return (
              <li key={route.key}>
                <Card className="flex h-full min-h-48 flex-col p-5 transition-colors hover:border-brand-300">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-500">
                      {seen ? <CheckCircle size={20} /> : <Book size={20} />}
                    </span>
                    <Badge tone={seen ? 'blue' : 'gray'}>{seen ? '둘러봄' : '미완료'}</Badge>
                  </div>
                  <h3 className="mt-4 font-bold text-ink-900">{route.label}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">{route.desc}</p>
                  <Link
                    to={route.path}
                    state={{ startTour: true }}
                    className="mt-auto inline-flex min-h-11 items-center gap-1 self-start rounded-lg pt-4 text-sm font-semibold text-brand-500 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
                    aria-label={`${route.label} 화면으로 이동해 사용가이드 ${seen ? '다시 ' : ''}시작`}
                  >
                    {seen ? '다시 둘러보기' : '가이드 시작'} <ArrowRight size={15} />
                  </Link>
                </Card>
              </li>
            )
          })}
        </ul>
      </div>

      <Card className="flex items-start gap-3 p-5">
        <HelpCircle size={18} className="mt-0.5 shrink-0 text-brand-400" />
        <p className="text-[13px] leading-relaxed text-ink-600">
          어느 앱 화면에서든 왼쪽 아래 <b className="font-semibold text-ink-800">사용가이드</b>를 누르면 현재 화면에 맞는 투어가 시작됩니다.
          화면 상태에 따라 강조할 대상이 없으면 중앙 안내로 설명하고 다음 단계로 안전하게 넘어갑니다.
        </p>
      </Card>
    </div>
  )
}
