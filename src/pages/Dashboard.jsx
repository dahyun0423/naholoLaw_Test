// 대시보드 — Figma 「대시보드 기본」(1696:29480) 기준
//
// 화면 순서가 곧 우선순위다.
//   인사 → 지금 제일 급한 일(배너) + AI 제안 → 숫자 넷 → 일정 · 활동 · 도움말
//
// 색·크기는 Figma에서 읽은 값을 그대로 쓴다.
//   카드   흰 배경 · 외곽선 grey200 · radius 20
//   배너   제목 28 SemiBold blue400 / 부제 14 Medium grey500
//   KPI    라벨 20 SemiBold blue700 · 숫자 34 ExtraBold blue700
//          배지 bg blue50 · 20 Regular blue300 · radius 20
//   AI     제목 20 SemiBold blue400 · 칩 14 Medium blue300 · 「긴급」 bg red500
//
// 폭(1091·653·426·270·300·767)은 Figma 기준이지만 화면에 따라 늘고 줄게 두었다.

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { Card, cx } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import CaseNewModal from '../components/CaseNewModal.jsx'
import HelpMedia from '../components/HelpMedia.jsx'
import { helpContents, popularFaq, dateLabel } from '../data/mock.js'
import { caseEvidence, caseDocs, caseUpcoming, caseTodoList, caseTitle } from '../lib/casebook.js'
import { Calendar as CalendarIcon, Clock, ArrowRight, ChevronRight, Video, Book, FileText, HelpCircle, Folder, ExternalLink, Sparkles, Check } from '../components/icons.jsx'
import gavelImg from '../assets/dash/gavel.png'
import notebookImg from '../assets/dash/notebook.png'
import calendarImg from '../assets/dash/calendar.png'

const WEEK = ['월', '화', '수', '목', '금', '토', '일']
const HELP_ICON = { 동영상: Video, 가이드: Book, 템플릿: FileText }

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { rawCases, activeRaw } = useWorkspace()
  const [help, setHelp] = useState(null)
  const [faq, setFaq] = useState(null)
  const [newCase, setNewCase] = useState(false)

  const now = new Date()
  const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  const timeStr = now.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })

  const running = rawCases.filter((c) => c.status !== '종결').length
  const docCount = rawCases.reduce((n, c) => n + caseDocs(c).length, 0)
  const evCount = rawCases.reduce((n, c) => n + caseEvidence(c).length, 0)
  const upcomingItems = rawCases
    .flatMap((c) => caseUpcoming(c).map((t) => ({ ...t, caseId: c.id, caseName: caseTitle(c) })))
    .sort((a, b) => a.dday - b.dday)
  const urgent = upcomingItems[0] || null
  const nextUp = upcomingItems.find((t) => t.dday >= 0) || null
  const dday = nextUp ? (nextUp.dday === 0 ? 'D-DAY' : `D-${nextUp.dday}`) : '일정 없음'
  const urgentCase = rawCases.find((item) => item.id === urgent?.caseId) || activeRaw
  const completedTasks = rawCases
    .flatMap((item) => caseTodoList(item).filter((todo) => todo.done).map((todo) => ({ ...todo, caseId: item.id })))
    .slice(0, 2)

  // 주간 캘린더 — 이번 주 월요일부터 7일
  const mon = new Date(now)
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i); return d
  })

  // 사건이 하나도 없는데 "진행 중인 사건 2건"을 보여주면 거짓말이 된다.
  // Figma 「대시보드 처음」이 그 자리를 위한 화면이다.
  if (rawCases.length === 0) {
    return (
      <>
        <FirstRun name={user?.name || '고객'} dateStr={dateStr} timeStr={timeStr} onNew={() => setNewCase(true)} />
        <CaseNewModal open={newCase} onClose={() => setNewCase(false)} onCreated={(c) => navigate(`/app/cases/${c.id}`)} />
      </>
    )
  }

  const kpis = [
    { label: '진행 중인 사건', value: `${running}건`, badge: running ? `${running}건 진행 중` : '진행 사건 없음', to: '/app/cases' },
    { label: '다음 변론기일', value: dday, badge: nextUp ? dateLabel(nextUp.due) : '등록된 일정 없음', to: '/app/schedule' },
    { label: '생성한 문서', value: `${docCount}개`, badge: docCount ? '문서 관리에서 확인' : '아직 생성 전', to: '/app/documents' },
    { label: '등록된 증거', value: `${evCount}개`, badge: evCount ? `${evCount}개 정리됨` : '아직 등록 전', to: '/app/evidence' },
  ]

  return (
    <div className="space-y-6 pb-2">
      {/* ── 인사 ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pb-5 pt-2">
        <div>
          <h1 className="text-[30px] font-semibold leading-[1.35] text-ink-900">안녕하세요, {user?.name || '고객'}님</h1>
          <p className="mt-1 text-[14px] font-medium text-ink-500">
            진행 중인 사건 {running}건 <span className="text-ink-300">|</span> 다음 일정 <b className={cx('font-bold', nextUp ? 'text-red-500' : 'text-ink-500')}>{dday}</b>
          </p>
        </div>
        <div className="text-right text-[14px] font-medium text-ink-600">
          <p>{dateStr}</p>
          <p className="mt-0.5">{timeStr}</p>
        </div>
      </div>

      {/* ── 지금 제일 급한 일 + AI 제안 ── */}
      <div className="grid gap-3 lg:grid-cols-[1.56fr_1fr]">
        <Card className="relative min-h-[180px] overflow-hidden rounded-[20px] p-7 sm:p-8">
          <div className="min-w-0">
            <p className="max-w-[68%] text-[24px] font-semibold leading-[1.45] text-brand-400 sm:text-[28px]">
              {urgent ? urgent.text : `${caseTitle(activeRaw)} 확인`}
              {urgent && (
                <span className="ml-2 whitespace-nowrap text-red-500">
                  {urgent.dday < 0 ? `D+${-urgent.dday}` : urgent.dday === 0 ? 'D-DAY' : `D-${urgent.dday}`}
                </span>
              )}
              <span className="block">지금 바로 준비하세요!</span>
            </p>
            <p className="mt-2 text-[12px] font-medium text-ink-500">
              {urgent
                ? `${urgentCase?.form?.court || '법원 미정'} ${urgentCase?.caseNo || ''} · ${dateLabel(urgent.due)}까지`
                : `${activeRaw?.form?.court || '법원 미정'} ${activeRaw?.caseNo || '사건번호 없음'}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(urgent?.typeKey === 'filing' ? '/app/documents' : `/app/cases/${urgent?.caseId || activeRaw.id}`)}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-ink-200 bg-white px-5 text-[15px] font-semibold text-ink-600 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 sm:absolute sm:right-0 sm:top-0 sm:mt-0 sm:min-w-[178px] sm:rounded-bl-[20px] sm:rounded-tr-[20px]"
          >
            {urgent?.typeKey === 'filing' ? '바로 작성하러 가기' : '바로 확인하러 가기'}
            <ArrowRight size={16} />
          </button>
        </Card>

        <Card className="min-h-[180px] rounded-[20px] p-7">
          <h2 className="flex items-center gap-3 text-[20px] font-semibold text-brand-400">
            <Sparkles size={24} className="text-brand-300" /> AI가 제안한 주요 작업
          </h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <Chip onClick={() => navigate('/app/documents')}>{urgent?.typeKey === 'filing' ? urgent.text : '준비서면 작성 권장'}{urgent?.dday >= 0 && urgent.dday <= 3 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-500">긴급</span>}</Chip>
            <Chip onClick={() => navigate('/app/evidence')}>증거 보완 권장</Chip>
            <Chip onClick={() => navigate('/app/schedule')}>답변 일정 점검하기</Chip>
          </div>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Link
            key={k.label}
            to={k.to}
            aria-label={`${k.label} ${k.value} — ${k.badge}`}
            className="group min-h-[134px] rounded-[20px] border border-ink-200 bg-white px-6 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <span className="block text-[17px] font-semibold text-brand-700">{k.label}</span>
            <span className="mt-1 block truncate text-[30px] font-bold leading-[1.35] text-brand-700">{k.value}</span>
            <span className="mt-2 inline-flex max-w-full truncate rounded-full bg-brand-50 px-3 py-1 text-[13px] font-medium text-brand-400 group-hover:bg-white">{k.badge}</span>
          </Link>
        ))}
      </div>

      {/* 기존 Figma의 300px 일정 카드 비율과 타임라인 UI를 유지한다. */}
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* 다가오는 일정 */}
        <Card className="min-h-[486px] rounded-[20px] p-6">
          <div>
            <p className="text-[13px] font-medium text-ink-500">
              {now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            <h2 className="mt-1 text-[22px] font-semibold text-ink-900">다가오는 일정</h2>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-1 text-center">
            {week.map((d, i) => {
              const today = d.toDateString() === now.toDateString()
              return (
                <div key={i}>
                  <p className={cx('text-[14px] font-medium', today ? 'text-brand-500' : 'text-ink-600')}>{WEEK[i]}</p>
                  <p className={cx('mt-1 text-[16px] font-semibold', today ? 'text-brand-500' : 'text-ink-900')}>{d.getDate()}</p>
                </div>
              )
            })}
          </div>

          {upcomingItems.length > 0 ? (
            <ol className="relative mt-5 space-y-3 border-l border-brand-200 pl-4">
              {upcomingItems.slice(0, 3).map((item, index) => (
                <li key={`${item.caseId}-${item.id}`} className="relative">
                  <span className={cx(
                    'absolute -left-[21px] top-4 h-2.5 w-2.5 rounded-full ring-4 ring-white',
                    index === 0 ? 'bg-brand-300 ring-brand-100' : item.dday < 0 ? 'bg-red-300' : 'border border-brand-300 bg-white',
                  )} />
                  <Link
                    to={`/app/cases/${item.caseId}`}
                    className={cx(
                      'block rounded-[10px] px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
                      index === 0 ? 'bg-brand-300 text-white hover:bg-brand-400' : 'bg-ink-50 hover:bg-brand-50',
                    )}
                  >
                    <p className={cx('flex items-center gap-1.5 text-[14px] font-semibold', index === 0 ? 'text-white' : 'text-ink-900')}>
                      <Clock size={14} className={cx('shrink-0', index === 0 ? 'text-white' : 'text-brand-400')} />
                      <span className="min-w-0 flex-1 truncate">{item.text}</span>
                      <span className={cx('shrink-0 text-xs font-bold', index === 0 ? 'text-white' : item.dday < 0 ? 'text-red-500' : 'text-brand-500')}>
                        {item.dday < 0 ? `D+${-item.dday}` : item.dday === 0 ? '오늘' : `D-${item.dday}`}
                      </span>
                    </p>
                    <p className={cx('mt-1 truncate text-[11px] font-medium', index === 0 ? 'text-white/85' : 'text-ink-500')}>{item.due} · {item.caseName}</p>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-ink-200 bg-ink-50 px-4 py-6 text-center">
              <CalendarIcon />
              <p className="mt-2 text-sm font-semibold text-ink-700">예정된 준비사항이 없어요.</p>
              <Link to={`/app/cases/${activeRaw.id}`} className="mt-2 inline-flex text-xs font-semibold text-brand-500 hover:underline">준비사항 추가하기</Link>
            </div>
          )}

          <div className="mt-5 border-t border-ink-100 pt-4">
            <p className="text-[14px] font-semibold text-ink-800">완료된 작업</p>
            {completedTasks.length ? (
              <ul className="mt-3 space-y-2">
                {completedTasks.map((item) => (
                  <li key={`${item.caseId}-${item.id}`} className="flex items-center gap-2 text-[13px] font-medium text-ink-600">
                    <Check size={14} className="shrink-0 text-brand-300" />
                    <span className="truncate">{item.text || item.title}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-[12px] font-medium text-ink-400">완료한 작업이 아직 없어요.</p>}
          </div>
          <Link to="/app/schedule" className="mt-4 inline-flex text-[12px] font-semibold text-brand-500 hover:underline">일정 전체보기 →</Link>
        </Card>

        <div className="space-y-4">
        {/* 최근 사건 */}
        <Card className="rounded-[20px] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-semibold text-ink-900">최근 사건</h2>
                <p className="mt-0.5 text-xs font-medium text-ink-500">최근 수정한 사건에서 바로 이어서 하세요.</p>
              </div>
              <Link to="/app/cases" className="rounded-lg px-2 py-1 text-[13px] font-medium text-brand-500 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">전체보기</Link>
            </div>
            <ul className="mt-4 space-y-1.5">
              {rawCases.slice(0, 3).map((c) => {
                const pending = caseTodoList(c).filter((item) => !item.done)
                return (
                  <li key={c.id}>
                    <Link
                      to={`/app/cases/${c.id}`}
                      className="group flex min-h-[52px] items-center gap-3 rounded-[10px] border border-ink-200 px-4 py-2.5 transition-colors hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[14px] font-semibold text-ink-800 group-hover:text-brand-500">{caseTitle(c)}</span>
                          <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-500">{c.status || '진행중'}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] font-medium text-ink-400">{c.caseNo || '사건번호 없음'}{pending.length ? ` · 남은 준비 ${pending.length}건` : ''}</span>
                      </span>
                      <ChevronRight size={16} className="shrink-0 text-ink-300 group-hover:text-brand-400" />
                    </Link>
                  </li>
                )
              })}
            </ul>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="rounded-[20px] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-ink-900">도움 콘텐츠</h2>
              <Link to="/app/guide" className="text-[14px] font-medium text-brand-400 hover:underline">더보기 →</Link>
            </div>
            <ul className="mt-4 space-y-2.5">
              {helpContents.map((h) => {
                const Icon = HELP_ICON[h.type] || FileText
                return (
                  <li key={h.title}>
                    <button
                      type="button"
                      onClick={() => setHelp(h)}
                      className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-ink-200 px-4 py-3 text-left transition-colors hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
                    >
                      <Icon size={16} className="shrink-0 text-brand-400" />
                      <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink-800">{h.title}</span>
                      <span className="shrink-0 rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-500">{h.type}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>

          <Card className="rounded-[20px] p-6">
            <h2 className="text-[18px] font-semibold text-ink-900">자주 묻는 질문</h2>
            <ul className="mt-4 space-y-2.5">
              {popularFaq.map((f) => (
                <li key={f.q}>
                  <button
                    type="button"
                    onClick={() => setFaq(f)}
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-ink-200 px-4 py-3 text-left transition-colors hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
                  >
                    <HelpCircle size={16} className="shrink-0 text-brand-400" />
                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink-800">{f.q}</span>
                    <ChevronRight size={16} className="shrink-0 text-ink-300" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        </div>
      </div>

      <Modal open={!!help} onClose={() => setHelp(null)} title={help?.title} sub={help?.type} maxW="max-w-2xl">
        {help && <HelpMedia item={help} />}
      </Modal>

      <Modal open={!!faq} onClose={() => setFaq(null)} title={faq?.q} maxW="max-w-lg">
        {faq && (
          <div className="space-y-4">
            <p className="text-[14px] font-medium leading-relaxed text-ink-700">{faq.a}</p>
            <p className="rounded-xl bg-ink-50 px-4 py-3 text-[13px] font-medium leading-relaxed text-ink-600">
              <b className="font-semibold text-ink-800">제출 전 확인</b><br />{faq.note}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={faq.to}
                onClick={() => setFaq(null)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-brand-300 px-4 text-[13px] font-semibold text-white hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
              >
                {faq.cta} <ArrowRight size={14} />
              </Link>
              <a
                href={faq.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-ink-500 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                공식 안내 보기 <ExternalLink size={14} />
              </a>
            </div>
            <p className="text-[11px] font-medium leading-relaxed text-ink-400">사건의 진행 상황과 법원이 정한 기한에 따라 필요한 조치는 달라질 수 있습니다.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ══════════════ 첫 화면 ══════════════
   Figma 「대시보드 처음」(2108:71091) 기준.
   인사 30 SemiBold / 부제 18 Medium grey700
   빈 상태 제목 28 Bold blue500 · 설명 14 Medium grey500
   안내 카드 제목 18 SemiBold grey700 · 설명 12 Medium grey600 */

const START_CARDS = [
  { title: '사건 등록', desc: '소송 유형·상대방·청구금액을 입력해 사건을 만들어요.', img: gavelImg, action: true },
  { title: '문서 작성', desc: 'AI가 소장·준비서면·증거목록 초안을 형식에 맞춰 생성해요.', img: notebookImg, to: '/app/documents' },
  { title: '증거·일정 관리', desc: '증거를 정리하고 변론기일·제출기한 알림을 받아요.', img: calendarImg, to: '/app/evidence' },
]

function FirstRun({ name, dateStr, timeStr, onNew }) {
  return (
    <div className="space-y-6 pb-2">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pb-5 pt-2">
        <div>
          <h1 className="text-[30px] font-semibold leading-tight text-ink-900">안녕하세요, {name}님</h1>
          <p className="mt-1.5 text-[18px] font-medium text-ink-700">첫 사건을 등록하고 소송 준비를 시작해보세요.</p>
        </div>
        <div className="text-right">
          <p className="text-[14px] font-medium text-ink-700">{dateStr}</p>
          <p className="mt-0.5 text-[14px] font-semibold text-ink-800">{timeStr}</p>
        </div>
      </div>

      <Card className="relative flex min-h-[333px] flex-col items-center justify-center overflow-hidden rounded-[20px] px-6 py-20 sm:px-8">
        <button
          type="button"
          onClick={onNew}
          className="absolute right-0 top-0 inline-flex min-h-14 min-w-[248px] items-center justify-center gap-2 rounded-bl-[20px] rounded-tr-[20px] border border-ink-200 bg-white px-6 text-[18px] font-bold text-ink-600 shadow-[0_12px_24px_rgba(25,31,40,0.08)] transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-inset"
        >
          새 사건 등록하기 <ArrowRight size={16} />
        </button>

        <div className="grid place-items-center gap-3.5 text-center">
          <span className="grid h-[72px] w-[72px] place-items-center rounded-full bg-brand-50 text-brand-400">
            <Folder size={34} />
          </span>
          <p className="text-[28px] font-bold text-brand-500">아직 진행 중인 사건이 없어요</p>
          <p className="text-[14px] font-medium leading-relaxed text-ink-500">
            사건을 등록하면 일정·문서·증거를 한 곳에서 관리하고,<br />
            AI가 소송 준비를 단계별로 도와드려요.
          </p>
        </div>
      </Card>

      <Card className="rounded-[14px] border-0 p-6 shadow-none">
        <div className="grid gap-4 md:grid-cols-3">
          {START_CARDS.map((c) => {
            const Comp = c.action ? 'button' : Link
            return (
            <Comp
              key={c.title}
              {...(c.action ? { type: 'button', onClick: onNew } : { to: c.to })}
              className="group relative flex h-[221px] flex-col overflow-hidden rounded-[22px] border border-ink-200 bg-white p-6 text-left transition-colors hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
            >
              <span className="relative z-[1] text-[18px] font-semibold text-ink-700 transition-colors group-hover:text-brand-400">{c.title}</span>
              <span className="relative z-[1] mt-1 max-w-full text-[12px] font-medium leading-[20px] text-ink-600">{c.desc}</span>
              <img src={c.img} alt="" aria-hidden className="pointer-events-none absolute -bottom-12 right-1 h-[190px] w-[220px] object-contain transition-transform duration-300 group-hover:-translate-y-1" />
            </Comp>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

/** AI 제안 칩 — Figma 컴포넌트의 외곽선·radius·색을 유지한다. */
function Chip({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-ink-200 bg-white px-4 py-2 text-[14px] font-medium text-brand-500 transition-colors hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
    >
      {children}
    </button>
  )
}
