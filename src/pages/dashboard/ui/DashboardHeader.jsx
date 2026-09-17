import { cx } from '../../../components/ui.jsx'

// 실서비스 기준: 인사 30(3xl) Bold, 부제 18(lg), 오른쪽 날짜·시각 14(sm).
export default function DashboardHeader({ name, runningCaseCount, nextDeadline, dateText, timeText, hasCases = true }) {
  return (
    <header className="flex items-center justify-between gap-4 px-4 py-5">
      <div className="flex flex-col gap-1">
        <p className="text-3xl font-bold text-ink-900">안녕하세요, {name}님</p>
        {hasCases ? (
          <p className="text-lg text-ink-700">
            진행 중인 사건 {runningCaseCount}건 <span className="text-ink-300">|</span> 다음 기일까지{' '}
            <strong className={cx('font-bold', nextDeadline === '일정 없음' ? 'text-ink-500' : 'text-red-500')}>
              {nextDeadline}
            </strong>
          </p>
        ) : (
          <p className="text-lg text-ink-700">첫 사건을 등록하고 소송 준비를 시작해보세요.</p>
        )}
      </div>

      <div className="flex flex-col justify-center gap-1 text-right text-sm text-ink-700">
        <p>{dateText}</p>
        <p className="font-semibold text-ink-800">{timeText}</p>
      </div>
    </header>
  )
}
