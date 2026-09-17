import { Link } from 'react-router-dom'
import { ArrowRight, Folder } from '../../../components/icons.jsx'
import { Card } from '../../../components/ui.jsx'
import calendarImage from '../../../assets/dash/calendar.png'
import gavelImage from '../../../assets/dash/gavel.png'
import notebookImage from '../../../assets/dash/notebook.png'
import DashboardHeader from './DashboardHeader.jsx'

const ONBOARDING_CARDS = [
  { id: 'case', title: '사건 등록', description: '소송 유형·상대방·청구금액을 입력해 사건을 만들어요.', image: gavelImage, isAction: true },
  { id: 'document', title: '문서 작성', description: 'AI가 소장·준비서면·증거목록 초안을 형식에 맞춰 생성해요.', image: notebookImage, to: '/app/documents' },
  { id: 'evidence', title: '증거·일정 관리', description: '증거를 정리하고 변론기일·제출기한 알림을 받아요.', image: calendarImage, to: '/app/evidence' },
]

export default function DashboardEmptyState({ name, dateText, timeText, onCreateCase }) {
  return (
    <div className="space-y-6 pb-2">
      <DashboardHeader name={name} dateText={dateText} timeText={timeText} hasCases={false} />

      <Card className="relative flex min-h-[333px] flex-col items-center justify-center overflow-hidden rounded-[20px] px-6 py-20 sm:px-8">
        <button
          type="button"
          onClick={onCreateCase}
          className="absolute right-0 top-0 inline-flex min-h-14 min-w-[248px] items-center justify-center gap-2 rounded-bl-[20px] rounded-tr-[20px] border border-ink-200 bg-white px-6 text-[18px] font-bold text-ink-600 shadow-[0_12px_24px_rgba(25,31,40,0.08)] transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-inset"
        >
          새 사건 등록하기 <ArrowRight size={16} />
        </button>

        <div className="grid place-items-center gap-3.5 text-center">
          <span className="grid h-[72px] w-[72px] place-items-center rounded-full bg-brand-50 text-brand-400"><Folder size={34} /></span>
          <p className="text-[28px] font-bold text-brand-500">아직 진행 중인 사건이 없어요</p>
          <p className="text-[14px] font-medium leading-relaxed text-ink-500">
            사건을 등록하면 일정·문서·증거를 한 곳에서 관리하고,<br />AI가 소송 준비를 단계별로 도와드려요.
          </p>
        </div>
      </Card>

      <Card className="rounded-[14px] border-0 p-6 shadow-none">
        <div className="grid gap-4 md:grid-cols-3">
          {ONBOARDING_CARDS.map((card) => {
            const Component = card.isAction ? 'button' : Link
            const navigationProps = card.isAction
              ? { type: 'button', onClick: onCreateCase }
              : { to: card.to }
            return (
              <Component
                key={card.id}
                {...navigationProps}
                className="group relative flex h-[221px] flex-col overflow-hidden rounded-[22px] border border-ink-200 bg-white p-6 text-left transition-colors hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
              >
                <span className="relative z-[1] text-[18px] font-semibold text-ink-700 transition-colors group-hover:text-brand-400">{card.title}</span>
                <span className="relative z-[1] mt-1 max-w-full text-[12px] font-medium leading-[20px] text-ink-600">{card.description}</span>
                <img src={card.image} alt="" aria-hidden="true" className="pointer-events-none absolute -bottom-12 right-1 h-[190px] w-[220px] object-contain transition-transform duration-300 group-hover:-translate-y-1" />
              </Component>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
