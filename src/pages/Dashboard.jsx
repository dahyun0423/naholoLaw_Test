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
import { Calendar as CalendarIcon, Clock, ArrowRight, ChevronRight, Video, Book, FileText, HelpCircle, Folder, ExternalLink } from '../components/icons.jsx'
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
    { label: '진행 중인 사건', value: `${running}건`, badge: `전체 ${rawCases.length}건`, to: '/app/cases' },
    { label: '다가오는 일정', value: dday, badge: nextUp ? dateLabel(nextUp.due) : '등록된 일정 없음', to: '/app/schedule' },
    { label: '생성한 문서', value: `${docCount}개`, badge: '문서 관리에서 보기', to: '/app/documents' },
    { label: '등록된 증거', value: `${evCount}개`, badge: '증빙자료에서 보기', to: '/app/evidence' },
  ]

  return (
    <div className="space-y-6">
      {/* ── 인사 ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-5">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-ink-900">안녕하세요, {user?.name || '고객'}님</h1>
          <p className="mt-1 text-[14px] text-ink-500">
            진행 중인 사건 {running}건 <span className="text-ink-300">|</span> 다음 일정 <b className={cx('font-bold', nextUp ? 'text-red-500' : 'text-ink-500')}>{dday}</b>
          </p>
        </div>
        <div className="text-right text-[14px] font-medium text-ink-600">
          <p>{dateStr}</p>
          <p className="mt-0.5">{timeStr}</p>
        </div>
      </div>

      {/* ── 지금 제일 급한 일 + AI 제안 ── */}
      <div className="grid gap-3 lg:grid-cols-[1.53fr_1fr]">
        <Card className="flex min-h-[180px] flex-col justify-between gap-6 rounded-[20px] p-6 sm:flex-row sm:items-start sm:p-8">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink-500">지금 먼저 확인할 일</p>
            <p className="mt-2 max-w-xl text-[26px] font-semibold leading-snug text-brand-500 sm:text-[28px]">
              {urgent ? urgent.text : `${caseTitle(activeRaw)} 진행 상태를 확인하세요`}
              {urgent && (
                <span className="ml-2 whitespace-nowrap text-red-500">
                  {urgent.dday < 0 ? `D+${-urgent.dday}` : urgent.dday === 0 ? 'D-DAY' : `D-${urgent.dday}`}
                </span>
              )}
            </p>
            <p className="mt-3 text-[14px] font-medium text-ink-500">
              {urgent
                ? `${urgent.caseName} · ${dateLabel(urgent.due)}까지`
                : `${activeRaw?.form?.court || '법원 미정'} · ${activeRaw?.caseNo || '사건번호 없음'}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/app/cases/${urgent?.caseId || activeRaw.id}`)}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-ink-200 bg-white px-5 text-[15px] font-bold text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
          >
            {urgent ? '준비사항 확인' : '사건 열기'}
            <ArrowRight size={16} />
          </button>
        </Card>

        <Card className="min-h-[180px] rounded-[20px] p-7">
          <h2 className="text-[20px] font-semibold text-ink-900">바로 이어서 하기</h2>
          <p className="mt-1 text-xs text-ink-500">현재 사건의 문서와 증거를 바로 확인하세요.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Chip onClick={() => navigate('/app/documents')}>문서 이어서 작성</Chip>
            <Chip onClick={() => navigate('/app/evidence')}>증거 확인·보완</Chip>
            <Chip onClick={() => navigate(`/app/cases/${activeRaw.id}`)}>사건 전체 점검</Chip>
          </div>
        </Card>
      </div>

      {/* 이동에 필요한 현황만 한 줄로 압축한다. */}
      <Card className="overflow-hidden rounded-[20px] p-0">
        <div className="grid sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k, index) => (
            <Link
              key={k.label}
              to={k.to}
              aria-label={`${k.label} ${k.value} — ${k.badge}`}
              className={cx(
                'group flex min-h-[104px] items-center justify-between gap-4 border-ink-100 px-6 py-5 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-300',
                index > 0 && 'border-t sm:border-t-0 sm:border-l',
                index === 2 && 'sm:border-l-0 sm:border-t xl:border-l xl:border-t-0',
              )}
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-ink-500">{k.label}</span>
                <span className="mt-1 block truncate text-[22px] font-bold text-ink-900">{k.value}</span>
                <span className="mt-1 block truncate text-[11px] text-ink-400">{k.badge}</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-400" />
            </Link>
          ))}
        </div>
      </Card>

      {/* 기존 Figma의 300px 일정 카드 비율과 타임라인 UI를 유지한다. */}
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* 다가오는 일정 */}
        <Card className="rounded-[20px] p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[13px] font-medium text-ink-500">
                {now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
              </p>
              <h2 className="mt-1 text-[22px] font-semibold text-ink-900">다가오는 일정</h2>
            </div>
            <Link to="/app/schedule" className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-500 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
              전체보기
            </Link>
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
            <ol className="relative mt-5 space-y-3 border-l border-ink-200 pl-4">
              {upcomingItems.slice(0, 4).map((item) => (
                <li key={`${item.caseId}-${item.id}`} className="relative">
                  <span className={cx(
                    'absolute -left-[21px] top-4 h-2.5 w-2.5 rounded-full ring-4 ring-white',
                    item.dday < 0 ? 'bg-red-300' : item.dday <= 3 ? 'bg-brand-500' : 'border-2 border-ink-300 bg-white',
                  )} />
                  <Link
                    to={`/app/cases/${item.caseId}`}
                    className="block rounded-xl bg-ink-50 px-4 py-3 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                  >
                    <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-900">
                      <Clock size={14} className="shrink-0 text-ink-400" />
                      <span className="min-w-0 flex-1 truncate">{item.text}</span>
                      <span className={cx('shrink-0 text-xs font-bold', item.dday < 0 ? 'text-red-500' : 'text-brand-500')}>
                        {item.dday < 0 ? `D+${-item.dday}` : item.dday === 0 ? '오늘' : `D-${item.dday}`}
                      </span>
                    </p>
                    <p className="mt-1 truncate text-[11px] text-ink-500">{dateLabel(item.due)} · {item.caseName}</p>
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
        </Card>

        <div className="space-y-6">
        {/* 최근 사건 */}
        <Card className="rounded-[20px] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-semibold text-ink-900">최근 사건</h2>
                <p className="mt-0.5 text-xs text-ink-500">최근 수정한 사건에서 바로 이어서 하세요.</p>
              </div>
              <Link to="/app/cases" className="rounded-lg px-2 py-1 text-[13px] font-medium text-brand-500 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">전체보기</Link>
            </div>
            <ul className="mt-4 space-y-3">
              {rawCases.slice(0, 3).map((c) => {
                const pending = caseTodoList(c).filter((item) => !item.done)
                return (
                  <li key={c.id}>
                    <Link
                      to={`/app/cases/${c.id}`}
                      className="group flex h-full min-h-28 flex-col rounded-xl border border-ink-200 p-4 transition-colors hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink-800 group-hover:text-brand-500">{caseTitle(c)}</span>
                        <ChevronRight size={16} className="shrink-0 text-ink-300 group-hover:text-brand-400" />
                      </span>
                      <span className="mt-1 truncate text-xs text-ink-500">{c.caseNo || '사건번호 없음'} · {c.status}</span>
                      <span className={cx('mt-auto pt-3 text-xs font-semibold', pending.length ? 'text-brand-500' : 'text-ink-400')}>
                        {pending.length ? `남은 준비 ${pending.length}건 확인` : '사건 상세 열기'}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
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
            <p className="text-[14px] leading-relaxed text-ink-700">{faq.a}</p>
            <p className="rounded-xl bg-ink-50 px-4 py-3 text-[13px] leading-relaxed text-ink-600">
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
            <p className="text-[11px] leading-relaxed text-ink-400">사건의 진행 상황과 법원이 정한 기한에 따라 필요한 조치는 달라질 수 있습니다.</p>
          </div>
        )}
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
  { title: '증빙자료 관리', desc: '사진·계약서·송금내역을 사건별로 모아 정리해요.', img: calendarImg, to: '/app/evidence' },
]

function FirstRun({ name, dateStr, timeStr, onNew }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-5">
        <div>
          <h1 className="text-[30px] font-semibold leading-tight text-ink-900">안녕하세요, {name}님</h1>
          <p className="mt-1.5 text-[18px] font-medium text-ink-700">첫 사건을 등록하고 소송 준비를 시작해보세요.</p>
        </div>
        <div className="text-right">
          <p className="text-[14px] font-medium text-ink-700">{dateStr}</p>
          <p className="mt-0.5 text-[14px] font-semibold text-ink-800">{timeStr}</p>
        </div>
      </div>

      <Card className="flex flex-col gap-8 rounded-[20px] px-6 py-8 sm:px-8 sm:py-10">
        <button
          type="button"
          onClick={onNew}
          className="order-2 inline-flex min-h-12 items-center justify-center gap-2 self-stretch rounded-xl border border-brand-300 bg-brand-300 px-5 text-[15px] font-bold text-white transition-colors hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 sm:self-end"
        >
          새 사건 등록하기 <ArrowRight size={16} />
        </button>

        <div className="order-1 grid place-items-center gap-4 text-center">
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
              className="group relative flex h-[164px] flex-col overflow-hidden rounded-[16px] border border-ink-200 bg-white p-5 text-left transition-colors hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
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

/** 바로가기 칩 — Figma 컴포넌트의 외곽선·radius·색을 유지한다. */
function Chip({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-ink-200 bg-white px-4 py-2 text-[14px] font-medium text-brand-500 transition-colors hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
    >
      {children}
      <ArrowRight size={14} />
    </button>
  )
}
