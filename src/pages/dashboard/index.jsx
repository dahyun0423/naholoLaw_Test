import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CaseNewModal from '../../components/CaseNewModal.jsx'
import HelpMedia from '../../components/HelpMedia.jsx'
import Modal from '../../components/Modal.jsx'
import { ArrowRight, ExternalLink } from '../../components/icons.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { useWorkspace } from '../../context/WorkspaceContext.jsx'
import { helpContents, popularFaq } from '../../data/mock.js'
import { useDashboardViewModel } from './model/useDashboardViewModel.js'
import DashboardBanner from './ui/DashboardBanner.jsx'
import DashboardEmptyState from './ui/DashboardEmptyState.jsx'
import DashboardFAQ from './ui/DashboardFAQ.jsx'
import DashboardHeader from './ui/DashboardHeader.jsx'
import DashboardHelpContent from './ui/DashboardHelpContent.jsx'
import DashboardRecentCases from './ui/DashboardRecentCases.jsx'
import DashboardSchedule from './ui/DashboardSchedule.jsx'
import DashboardSummary from './ui/DashboardSummary.jsx'

export default function DashboardPage() {
  const { user } = useAuth()
  const { rawCases, activeRaw } = useWorkspace()
  const navigate = useNavigate()
  const dashboard = useDashboardViewModel(rawCases, activeRaw)
  const [selectedHelp, setSelectedHelp] = useState(null)
  const [selectedFaq, setSelectedFaq] = useState(null)
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false)
  const userName = user?.name || '고객'

  if (rawCases.length === 0) {
    return (
      <>
        <DashboardEmptyState
          name={userName}
          dateText={dashboard.dateText}
          timeText={dashboard.timeText}
          onCreateCase={() => setIsNewCaseOpen(true)}
        />
        <CaseNewModal
          open={isNewCaseOpen}
          onClose={() => setIsNewCaseOpen(false)}
          onCreated={(createdCase) => navigate(`/app/cases/${createdCase.id}`)}
        />
      </>
    )
  }

  return (
    // 폭을 묶지 않는다 — 실서비스처럼 본문이 남는 자리를 그대로 채운다.
    // 바깥 간격 gap-8, 안쪽 격자 gap-6. 인사와 배너는 한 덩이라 사이를 띄우지 않는다.
    <div className="flex flex-col pb-6">
      <main className="flex flex-col gap-8">
        <div>
          <DashboardHeader
            name={userName}
            runningCaseCount={dashboard.runningCaseCount}
            nextDeadline={dashboard.nextDeadline}
            dateText={dashboard.dateText}
            timeText={dashboard.timeText}
          />
          <DashboardBanner primaryTask={dashboard.primaryTask} />
        </div>

        <DashboardSummary cards={dashboard.summaryCards} />

        <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
          <DashboardSchedule
            now={dashboard.now}
            weekDays={dashboard.weekDays}
            upcomingItems={dashboard.visibleUpcoming}
            highlightedIndex={dashboard.highlightedUpcomingIndex}
            completedTasks={dashboard.completedTasks}
          />

          <div className="flex min-w-0 flex-col gap-6">
            <DashboardRecentCases cases={dashboard.recentCases} />
            <div className="grid gap-6 lg:grid-cols-2">
              <DashboardHelpContent items={helpContents} onSelect={setSelectedHelp} />
              <DashboardFAQ items={popularFaq} onSelect={setSelectedFaq} />
            </div>
          </div>
        </div>
      </main>

      <Modal open={!!selectedHelp} onClose={() => setSelectedHelp(null)} title={selectedHelp?.title} sub={selectedHelp?.type} maxW="max-w-2xl">
        {selectedHelp ? <HelpMedia item={selectedHelp} /> : null}
      </Modal>

      <Modal open={!!selectedFaq} onClose={() => setSelectedFaq(null)} title={selectedFaq?.q} maxW="max-w-lg">
        {selectedFaq ? (
          <div className="space-y-4">
            <p className="text-[14px] font-medium leading-relaxed text-ink-700">{selectedFaq.a}</p>
            <p className="rounded-xl bg-ink-50 px-4 py-3 text-[13px] font-medium leading-relaxed text-ink-600">
              <strong className="font-semibold text-ink-800">제출 전 확인</strong><br />{selectedFaq.note}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={selectedFaq.to}
                onClick={() => setSelectedFaq(null)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-brand-300 px-4 text-[13px] font-semibold text-white hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
              >
                {selectedFaq.cta} <ArrowRight size={14} />
              </Link>
              <a
                href={selectedFaq.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-ink-500 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                공식 안내 보기 <ExternalLink size={14} />
              </a>
            </div>
            <p className="text-[11px] font-medium leading-relaxed text-ink-400">사건의 진행 상황과 법원이 정한 기한에 따라 필요한 조치는 달라질 수 있습니다.</p>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
