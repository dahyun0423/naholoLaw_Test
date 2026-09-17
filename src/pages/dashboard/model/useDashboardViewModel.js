import { useMemo } from 'react'
import { dateLabel } from '../../../data/mock.js'
import { caseDocs, caseEvidence, caseTodoList, caseTitle, caseUpcoming } from '../../../lib/casebook.js'

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

function formatDeadline(dday) {
  if (dday < 0) return `D+${-dday}`
  if (dday === 0) return 'D-DAY'
  return `D-${dday}`
}

function getCurrentWeek(now) {
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))

  return WEEKDAY_LABELS.map((label, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return {
      id: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
      label,
      date: date.getDate(),
      isToday: date.toDateString() === now.toDateString(),
    }
  })
}

function buildDashboardViewModel(rawCases, activeRaw, now) {
  const runningCaseCount = rawCases.filter((item) => item.status !== '종결').length
  const documentCount = rawCases.reduce((count, item) => count + caseDocs(item).length, 0)
  const evidenceCount = rawCases.reduce((count, item) => count + caseEvidence(item).length, 0)
  const upcomingItems = rawCases
    .flatMap((item) => caseUpcoming(item).map((schedule) => ({
      ...schedule,
      caseId: item.id,
      caseName: caseTitle(item),
    })))
    .sort((a, b) => a.dday - b.dday)

  const urgentItem = upcomingItems[0] ?? null
  const nextItem = upcomingItems.find((item) => item.dday >= 0) ?? null
  const nextDeadline = nextItem ? formatDeadline(nextItem.dday) : '일정 없음'
  const urgentCase = rawCases.find((item) => item.id === urgentItem?.caseId) ?? activeRaw
  const imminentCaseCount = upcomingItems.filter((item) => item.dday >= 0 && item.dday <= 7).length
  const visibleUpcoming = upcomingItems.slice(0, 3)
  // 목록은 기한 순이다. 그러니 맨 위 칸이 곧 가장 급한 일 — 파란 면은 여기 하나뿐이다.
  const highlightedUpcomingIndex = 0
  const completedTasks = rawCases
    .flatMap((item) => caseTodoList(item)
      .filter((todo) => todo.done)
      .map((todo) => ({ ...todo, caseId: item.id })))
    .slice(0, 2)

  const primaryTask = {
    title: urgentItem?.text ?? `${caseTitle(activeRaw)} 확인`,
    deadline: urgentItem ? formatDeadline(urgentItem.dday) : null,
    description: urgentItem
      ? `${urgentCase?.form?.court || '법원 미정'} ${urgentCase?.caseNo || ''} | ${dateLabel(urgentItem.due)}까지 제출`
      : `${activeRaw?.form?.court || '법원 미정'} ${activeRaw?.caseNo || '사건번호 없음'}`,
    actionLabel: urgentItem?.typeKey === 'filing' ? '바로 작성하러 가기' : '바로 확인하러 가기',
    actionTo: urgentItem?.typeKey === 'filing'
      ? '/app/documents'
      : `/app/cases/${urgentItem?.caseId || activeRaw?.id}`,
  }

  const summaryCards = [
    { id: 'cases', label: '진행 중인 사건', value: `${runningCaseCount}건`, badge: `${imminentCaseCount}건 기일 임박`, to: '/app/cases' },
    { id: 'hearing', label: '다음 변론기일', value: nextDeadline, badge: nextItem ? dateLabel(nextItem.due) : '등록된 일정 없음', to: '/app/schedule' },
    { id: 'documents', label: '생성한 문서', value: `${documentCount}개`, badge: `${documentCount}개 제출 완료`, to: '/app/documents' },
    { id: 'evidence', label: '등록된 증거', value: `${evidenceCount}`, badge: `갑호증 ${evidenceCount}개`, to: '/app/evidence' },
  ]

  const recentCases = rawCases.slice(0, 3).map((item) => {
    const pendingCount = caseTodoList(item).filter((todo) => !todo.done).length
    return {
      id: item.id,
      title: caseTitle(item),
      status: item.status || '진행중',
      meta: `${item.caseNo || '사건번호 없음'} · ${pendingCount ? `남은 준비 ${pendingCount}건` : '남은 준비 없음'}`,
    }
  })

  return {
    now,
    dateText: now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
    timeText: now.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' }),
    runningCaseCount,
    nextDeadline,
    primaryTask,
    summaryCards,
    weekDays: getCurrentWeek(now),
    visibleUpcoming,
    highlightedUpcomingIndex,
    completedTasks,
    recentCases,
  }
}

export function useDashboardViewModel(rawCases, activeRaw) {
  const now = useMemo(() => new Date(), [])
  return useMemo(
    () => buildDashboardViewModel(rawCases, activeRaw, now),
    [activeRaw, now, rawCases],
  )
}
