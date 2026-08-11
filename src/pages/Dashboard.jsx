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
import { useToast } from '../context/ToastContext.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { Card, cx } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import CaseNewModal from '../components/CaseNewModal.jsx'
import HelpMedia from '../components/HelpMedia.jsx'
import {
  dashboardSchedule, recentActivity, helpContents, popularFaq,
  activeCase, ddayOf, dateLabel, dayOffset,
} from '../data/mock.js'
import { caseEvidence, caseDocs, caseUpcoming } from '../lib/casebook.js'
import { Check, Clock, ArrowRight, ChevronRight, Video, Book, FileText, HelpCircle, Folder } from '../components/icons.jsx'
import aiSpark from '../assets/dash/ai-spark.png'
import gavelImg from '../assets/dash/gavel.png'
import notebookImg from '../assets/dash/notebook.png'
import calendarImg from '../assets/dash/calendar.png'

const WEEK = ['월', '화', '수', '목', '금', '토', '일']

const HELP_ICON = { 동영상: Video, 가이드: Book, 템플릿: FileText }

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { rawCases, activeRaw } = useWorkspace()
  const [help, setHelp] = useState(null)
  const [faq, setFaq] = useState(null)
  const [newCase, setNewCase] = useState(false)

  const now = new Date()
  const dateStr = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  const timeStr = now.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })

  // 숫자는 실제 사건에서 뽑고, 없으면 예시 값으로 화면을 채운다
  const running = rawCases.filter((c) => c.status !== '종결').length || 2
  const docCount = rawCases.reduce((n, c) => n + caseDocs(c).length, 0) || 7
  const evCount = rawCases.reduce((n, c) => n + caseEvidence(c).length, 0) || 14
  const gapCount = activeRaw ? caseEvidence(activeRaw).length : 9
  // 「다음」 기일이므로 이미 지난 것은 건너뛴다 — D+8을 '다음 변론기일'로 보여줄 수는 없다
  const nextUp = activeRaw ? caseUpcoming(activeRaw).find((t) => t.dday >= 0) : null
  const dday = nextUp ? (nextUp.dday < 0 ? `D+${-nextUp.dday}` : nextUp.dday === 0 ? 'D-DAY' : `D-${nextUp.dday}`) : 'D-3'

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
    { label: '진행 중인 사건', value: `${running}건`, badge: '1건 기일 임박', to: '/app/cases' },
    { label: '다음 변론기일', value: dday, badge: nextUp ? dateLabel(nextUp.due) : '7월 1일', to: '/app/schedule' },
    { label: '생성한 문서', value: `${docCount}`, badge: '2개 제출 완료', to: '/app/documents' },
    { label: '등록된 증거', value: `${evCount}`, badge: `갑호증 ${gapCount}개`, to: '/app/evidence' },
  ]

  return (
    <div className="space-y-6">
      {/* ── 인사 ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-5">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-ink-900">안녕하세요, {user?.name || '고객'}님</h1>
          <p className="mt-1 text-[14px] text-ink-500">
            진행 중인 사건 {running}건 <span className="text-ink-300">|</span> 다음 기일까지 <b className="font-bold text-red-500">{dday}</b>
          </p>
        </div>
        <div className="text-right text-[14px] font-medium text-ink-600">
          <p>{dateStr}</p>
          <p className="mt-0.5">{timeStr}</p>
        </div>
      </div>

      {/* ── 지금 제일 급한 일 + AI 제안 ── */}
      <div className="grid gap-3 lg:grid-cols-[1.53fr_1fr]">
        <Card className="relative flex min-h-[180px] flex-col justify-center rounded-[20px] p-8">
          <p className="max-w-[260px] text-[28px] font-semibold leading-snug text-brand-400">
            준비서면 제출 {dday}<br />지금 바로 작성하세요!
          </p>
          <p className="mt-3 text-[14px] font-medium text-ink-500">
            {activeRaw?.form?.court || '서울중앙지방법원'} {activeRaw?.caseNo || '2024가단12345'} | {dateLabel(dayOffset(3))} 오전 10시까지 제출
          </p>
          <button
            type="button"
            onClick={() => navigate('/app/documents')}
            className="absolute right-8 top-8 inline-flex h-14 items-center gap-2 rounded-[20px] border border-ink-200 bg-white px-6 text-[18px] font-bold text-ink-600 transition-colors hover:border-brand-200 hover:text-brand-400"
          >
            바로 작성하러 가기
            <span className="text-ink-400">↗</span>
          </button>
        </Card>

        <Card className="relative min-h-[180px] rounded-[20px] p-7">
          <div className="flex items-center gap-2">
            <img src={aiSpark} alt="" aria-hidden className="h-[38px] w-[38px] object-contain" />
            <h2 className="text-[20px] font-semibold text-brand-400">AI가 제안 주요 작업</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Chip onClick={() => navigate('/app/documents')} urgent>준비서면 작성 권장</Chip>
            <Chip onClick={() => navigate('/app/evidence')}>증거 보완 권장</Chip>
            <Chip onClick={() => navigate('/app/documents')}>답변 예정 권장하기</Chip>
          </div>
        </Card>
      </div>

      {/* ── 숫자 넷 ── */}
      <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Link
            key={k.label}
            to={k.to}
            className="flex min-h-[188px] flex-col justify-center gap-2 rounded-[20px] border border-ink-200 bg-white px-7 transition-colors hover:border-brand-200"
          >
            <span className="text-[20px] font-semibold text-brand-700">{k.label}</span>
            <span className="text-[34px] font-extrabold leading-none text-brand-700">{k.value}</span>
            <span className="mt-1 inline-flex w-fit rounded-[20px] bg-brand-50 px-4 py-1 text-[20px] font-normal text-brand-300">
              {k.badge}
            </span>
          </Link>
        ))}
      </div>

      {/* ── 일정 · 활동 · 도움말 ── */}
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* 다가오는 일정 */}
        <Card className="rounded-[20px] p-6">
          <p className="text-[14px] font-medium text-ink-700">
            {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <h2 className="mt-1 text-[24px] font-semibold text-ink-900">다가오는 일정</h2>

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

          {/* 세로 타임라인 */}
          <ol className="relative mt-5 space-y-3 border-l border-ink-200 pl-4">
            {dashboardSchedule.map((s) => (
              <li key={s.title} className="relative">
                <span className={cx(
                  'absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full ring-4 ring-white',
                  s.highlight ? 'bg-brand-500' : 'border-2 border-ink-300 bg-white',
                )} />
                <div className={cx(
                  'rounded-xl px-4 py-3',
                  s.highlight ? 'bg-brand-500 text-white' : 'bg-ink-50',
                )}>
                  <p className={cx('flex items-center gap-1.5 text-[16px] font-semibold', s.highlight ? 'text-white' : 'text-ink-900')}>
                    <Clock size={14} className={s.highlight ? 'text-white/80' : 'text-ink-400'} />{s.title}
                  </p>
                  <p className={cx('mt-0.5 text-[12px]', s.highlight ? 'text-ink-100' : 'text-ink-700')}>{s.date}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6 border-t border-ink-100 pt-4">
            <h3 className="text-[18px] font-semibold text-ink-900">완료된 작업</h3>
            <ul className="mt-3 space-y-2">
              {['증거자료 수집', '사건 정리'].map((t) => (
                <li key={t} className="flex items-center gap-2 text-[16px] font-medium text-ink-700">
                  <Check size={15} className="text-brand-300" />{t}
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <div className="space-y-6">
          {/* 최근 활동 */}
          <Card className="rounded-[20px] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-ink-900">최근 활동</h2>
              <Link to="/app/notifications" className="text-[14px] font-medium text-brand-400 hover:underline">전체보기 →</Link>
            </div>
            <ul className="mt-4 space-y-3">
              {recentActivity.map((a) => (
                <li key={a.title} className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                  <div>
                    <p className="text-[16px] font-medium text-ink-800">{a.title} ({a.dday})</p>
                    <p className="mt-0.5 text-[14px] text-ink-400">{a.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* 도움 콘텐츠 */}
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
                        className="flex w-full items-center gap-3 rounded-xl border border-ink-200 px-4 py-3 text-left transition-colors hover:border-brand-200 hover:bg-brand-50"
                      >
                        <Icon size={16} className="shrink-0 text-brand-400" />
                        <span className="min-w-0 flex-1 truncate text-[16px] font-medium text-ink-800">{h.title}</span>
                        <span className="shrink-0 rounded-md bg-brand-50 px-2 py-0.5 text-[12px] font-semibold text-brand-500">{h.type}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Card>

            {/* 자주 묻는 질문 */}
            <Card className="rounded-[20px] p-6">
              <h2 className="text-[18px] font-semibold text-ink-900">질문이 많은 — 자주 묻는 질문</h2>
              <ul className="mt-4 space-y-2.5">
                {popularFaq.map((f) => (
                  <li key={f.q}>
                    <button
                      type="button"
                      onClick={() => setFaq(f)}
                      className="flex w-full items-center gap-3 rounded-xl border border-ink-200 px-4 py-3 text-left transition-colors hover:border-brand-200 hover:bg-brand-50"
                    >
                      <HelpCircle size={16} className="shrink-0 text-brand-400" />
                      <span className="min-w-0 flex-1 truncate text-[16px] font-medium text-ink-800">{f.q}</span>
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
        <p className="text-[14px] leading-relaxed text-ink-600">
          가이드에서 더 자세한 설명을 볼 수 있어요.
        </p>
        <Link
          to="/app/guide"
          onClick={() => setFaq(null)}
          className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-500 hover:underline"
        >
          가이드로 가기 <ArrowRight size={14} />
        </Link>
      </Modal>
    </div>
  )
}

/* ══════════════ 첫 화면 ══════════════
   Figma 「대시보드 처음」(1696:29818) 그대로.
   인사 30 SemiBold / 부제 18 Regular grey700
   빈 상태 제목 28 Bold blue500 · 설명 14 Medium grey500
   안내 카드 제목 18 SemiBold grey700 · 설명 12 Medium grey600 */

const START_CARDS = [
  { title: '사건 등록', desc: '소송 유형·상대방·청구금액을 입력해 사건을 만들어요.', img: gavelImg, action: true },
  { title: '문서 작성', desc: 'AI가 소장·준비서면·증거목록 초안을 형식에 맞춰 생성해요.', img: notebookImg, to: '/app/documents' },
  { title: '증거·일정 관리', desc: '증거를 정리하고 변론기일·제출기한 알림을 받아요.', img: calendarImg, to: '/app/evidence' },
]

function FirstRun({ name, dateStr, timeStr, onNew }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-5">
        <div>
          <h1 className="text-[30px] font-semibold leading-tight text-ink-900">안녕하세요, {name}님</h1>
          <p className="mt-1.5 text-[18px] font-normal text-ink-700">첫 사건을 등록하고 소송 준비를 시작해보세요.</p>
        </div>
        <div className="text-right">
          <p className="text-[14px] font-normal text-ink-700">{dateStr}</p>
          <p className="mt-0.5 text-[14px] font-semibold text-ink-800">{timeStr}</p>
        </div>
      </div>

      <Card className="relative rounded-[20px] px-8 py-16">
        <button
          type="button"
          onClick={onNew}
          className="absolute right-8 top-8 inline-flex h-14 items-center gap-2 rounded-[20px] border border-ink-200 bg-white px-6 text-[18px] font-bold text-ink-600 transition-colors hover:border-brand-200 hover:text-brand-400"
        >
          새 사건 등록하기 <span className="text-ink-400">↗</span>
        </button>

        <div className="grid place-items-center gap-4 text-center">
          <span className="grid h-[54px] w-[54px] place-items-center rounded-full bg-brand-50 text-brand-400">
            <Folder size={26} />
          </span>
          <p className="text-[28px] font-bold text-brand-500">아직 진행 중인 사건이 없어요</p>
          <p className="text-[14px] font-medium leading-relaxed text-ink-500">
            사건을 등록하면 일정·문서·증거를 한 곳에서 관리하고,<br />
            AI가 소송 준비를 단계별로 도와드려요.
          </p>
        </div>
      </Card>

      <Card className="rounded-[20px] p-6">
        <div className="grid gap-5 md:grid-cols-3">
          {START_CARDS.map((c) => {
            const Comp = c.action ? 'button' : Link
            return (
            <Comp
              key={c.title}
              {...(c.action ? { type: 'button', onClick: onNew } : { to: c.to })}
              className="group relative flex h-[164px] flex-col overflow-hidden rounded-[16px] border border-ink-200 bg-white p-5 text-left transition-colors hover:border-brand-200 hover:bg-brand-50"
            >
              <span className="relative z-[1] text-[18px] font-semibold text-ink-700 transition-colors group-hover:text-brand-400">{c.title}</span>
              <span className="relative z-[1] mt-1.5 max-w-[70%] text-[12px] font-medium leading-relaxed text-ink-600">{c.desc}</span>
              <img src={c.img} alt="" aria-hidden className="pointer-events-none absolute -bottom-2 right-2 h-[104px] w-[104px] object-contain" />
            </Comp>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

/** AI 제안 칩 — Figma: 흰 배경 · 외곽선 grey200 · radius 10 · 14 Medium blue300 */
function Chip({ children, urgent, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-[10px] border border-ink-200 bg-white px-4 py-2 text-[14px] font-medium text-brand-300 transition-colors hover:border-brand-200 hover:bg-brand-50"
    >
      {children}
      {urgent && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[12px] font-semibold text-white">긴급</span>}
    </button>
  )
}
