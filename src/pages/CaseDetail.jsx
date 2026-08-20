// 사건 상세 — 대시보드
//
// 이 화면의 목적은 읽히는 것이 아니라 **보이는 것**이다.
// 사용자는 스크롤하며 읽지 않는다. 화면을 켠 순간 두 가지를 알아야 한다:
//   (1) 이 사건이 지금 어디쯤인가   (2) 그래서 내가 지금 뭘 해야 하는가
//
// 그래서 규칙이 셋 있다.
//   · 카드 하나에 목적 하나. 여러 정보를 섞지 않는다.
//   · 카드 안에는 문장이 아니라 **숫자·진행률·배지**를 먼저 놓는다.
//   · 상세는 카드 안에 늘어놓지 않고, 펼치거나 원래 화면으로 보낸다.
//
// 세로로 쌓지 않는다 — 가로 그리드로 눕혀 첫 화면 안에서 끝낸다.

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import {
  caseEvidence, caseTodoList, caseDocs, casePrecedentNos,
  caseTasks, caseFlow, flowIndex, caseUpcoming, caseInsights, caseTitle, caseLog,
  ENTRY_POINTS, entryPoint,
} from '../lib/casebook.js'
import { findType, fmtDate, savedAgo, completeness, buildPreview } from '../lib/complaint.js'
import { downloadEvidenceFile } from '../lib/blobClient.js'
import { Card, Button, Badge, Progress, cx } from '../components/ui.jsx'
import { LawyerNote } from '../components/CaseStatus.jsx'
import CaseStateControl from '../components/CaseStateControl.jsx'
import SubmitGuide from '../components/SubmitGuide.jsx'
import Modal from '../components/Modal.jsx'
import Stepper from '../components/Stepper.jsx'
import EvidencePreview from '../components/EvidencePreview.jsx'
import { ComplaintPaper } from '../components/ComplaintWizard.jsx'
import { printSheet } from '../components/docform.jsx'
import {
  ArrowLeft, ArrowRight, FileText, Folder, Scale, Calendar, Check,
  Plus, Trash, X, Sparkles, ChevronRight, DocFolder, ExternalLink, Printer,
} from '../components/icons.jsx'

const TONE = { '작성 중': 'gray', '제출 준비': 'gray', '접수함': 'blue', '진행 중': 'blue', '종결': 'gray' }
const TODAY = () => new Date().toISOString().slice(0, 10)

export default function CaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { rawCases, setActiveCaseId, dropCase } = useWorkspace()
  const [drop, setDrop] = useState(false)
  const [sheet, setSheet] = useState(null)      // 카드에서 펼쳐 보는 상세
  const [viewer, setViewer] = useState(null)    // 표에서 눌러 여는 문서·자료·판례

  const c = rawCases.find((x) => x.id === id) || null
  useEffect(() => { if (c) setActiveCaseId(c.id) }, [c?.id, setActiveCaseId])

  if (!c) {
    return (
      <Card className="grid place-items-center gap-3 p-12 text-center">
        <Folder size={34} className="text-ink-300" />
        <p className="font-semibold text-ink-700">사건을 찾을 수 없어요</p>
        <Button as={Link} to="/app/cases" variant="neutral" className="mt-1"><ArrowLeft size={16} /> 사건 목록으로</Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Hero c={c} onDrop={() => setDrop(true)} />
      <ManagementOverview c={c} onOpenTodos={() => setSheet('todos')} />

      {/* 기능 카드 — 하나에 목적 하나.
          문서·증빙은 「몇 개 있다」가 아니라 **무엇이 어디까지 됐나**를 보러 오는 곳이라,
          문서 생성의 「최근 생성 문서」와 같은 표로 편다. 줄을 누르면 그 문서·자료가 열린다.
          「소장에 필요한 것」은 뺐다 — 남은 항목 수는 진행 스텝퍼 옆의 「접수까지 남은 작업」이 센다. */}
      <div data-guide="case-cards" className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-2">
          <DocsTable c={c} onOpen={(doc) => setViewer({ kind: 'doc', item: doc })} />
          <EvidenceTable c={c} onOpen={(item) => setViewer({ kind: 'evidence', item })} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ScheduleCard c={c} onOpen={() => setSheet('todos')} />
          <PrecedentCard c={c} onOpen={(item) => setViewer({ kind: 'precedent', item })} />
        </div>
      </div>

      {/* 소장을 다 쓴 다음 사용자가 멈추는 자리는 "그래서 이걸 어디에 내지?"다.
          그 답이 문서 생성 화면 안에만 있으면, 며칠 뒤 사건을 다시 열었을 때 찾지 못한다.
          접수 정보를 적는 칸도 이 안에 있다 — 접수하고 돌아오는 곳이 곧 여기라서다. */}
      <SubmitGuideCard c={c} />

      <LawyerNote className="px-1" />

      <Sheet open={sheet} onClose={() => setSheet(null)} c={c} />
      <Viewer c={c} view={viewer} onClose={() => setViewer(null)} />

      <Modal
        open={drop}
        onClose={() => setDrop(false)}
        title="사건을 지울까요?"
        sub="작성한 내용과 준비사항·기록이 함께 사라지고 되돌릴 수 없습니다."
        footer={
          <>
            <Button variant="neutral" onClick={() => setDrop(false)}>취소</Button>
            <Button variant="danger" onClick={() => { dropCase(c.id); toast('사건을 지웠습니다'); navigate('/app/cases') }}>지우기</Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-ink-600">
          법원에 이미 접수한 사건이라면, 여기서 지워도 <b className="text-ink-800">실제 소송은 그대로 진행됩니다.</b> 이 화면의 기록만 없어져요.
        </p>
      </Modal>
    </div>
  )
}

/* ══════════════════ Hero ══════════════════ */
// 사건명 · 사건번호 · 진행 스텝퍼 · 소장 작성률 · 접수까지 남은 작업

// 제목줄과 숫자줄을 위아래로 나눈다. 전에는 제목·통계 셋·상태 조작부·삭제까지
// 한 줄에 밀어 넣어서, 창을 조금만 좁혀도 어느 것이 어느 것에 딸린 값인지 흩어졌다.
function Hero({ c, onDrop }) {
  return (
    <div>
      <Link to="/app/cases" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 transition-colors hover:text-ink-700">
        <ArrowLeft size={16} /> 사건 목록으로
      </Link>

      <div className="mt-3 rounded-[20px] border border-ink-200 bg-white p-6">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
          <div className="min-w-[240px] flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[26px] font-bold leading-tight tracking-[-0.5px] text-ink-900">{caseTitle(c)}</h1>
              <Badge tone={TONE[c.status] || 'gray'}>{c.status}</Badge>
            </div>
            <p className="mt-1.5 text-[13px] text-ink-500">
              {[c.caseNo || '사건번호 없음', c.form?.court, `최근 활동 ${savedAgo(c.updatedAt)}`].filter(Boolean).join(' · ')}
            </p>
          </div>

          <CaseStateControl c={c} />

          <Button size="sm" variant="ghost" className="-mr-2 shrink-0 text-ink-300 hover:text-ink-600" onClick={onDrop} aria-label="사건 지우기">
            <Trash size={15} />
          </Button>
        </div>

        <Flow c={c} />
      </div>
    </div>
  )
}

function Stat({ label, value, unit, bar }) {
  return (
    <div className="min-w-[104px]">
      <p className="text-[11.5px] text-ink-500">{label}</p>
      <p className="mt-1.5 text-[22px] font-bold leading-none tabular-nums text-ink-900">
        {value}{unit && <span className="ml-0.5 text-[13px] font-semibold text-ink-500">{unit}</span>}
      </p>
      {bar !== undefined && <div className="mt-2.5 w-[104px]"><Progress value={bar} /></div>}
    </div>
  )
}

/* ══════════════════ 첫 화면 관리 요약 ══════════════════ */

// 전에는 여기에 「자료·일정 현황」 카드가 하나 더 있었다.
// 문서 6개 · 증빙 6개 · 일정 2건 — 그런데 그 숫자는 바로 아래 기능 카드가
// 다시 세고 있었다. 같은 값을 두 번 보여 주면 어느 쪽을 믿을지 고민하게 된다.
// 그래서 세는 일은 기능 카드에 맡기고, 이 줄에는 **지금 할 일**과 **방금 있었던 일**만 남겼다.
function ManagementOverview({ c, onOpenTodos }) {
  const todos = caseTodoList(c)
  const openTodos = todos.filter((t) => !t.done)
  const nextDeadline = caseUpcoming(c)[0] || null
  const recent = caseLog(c).slice(0, 5)

  return (
    <section data-guide="case-overview" aria-label="사건 관리 요약" className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,.8fr)]">
      <NowCard c={c} todos={openTodos} nextDeadline={nextDeadline} onOpenTodos={onOpenTodos} />

      <Card className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-bold text-ink-900">최근 변화</h2>
          <span className="text-[11px] text-ink-400">자동 기록</span>
        </div>
        {recent.length ? (
          <ol className="mt-4 space-y-3.5">
            {recent.map((event) => (
              <li key={event.id} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300" />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-semibold leading-snug text-ink-800">{event.title}</span>
                  {event.desc && <span className="mt-0.5 line-clamp-1 block text-[11.5px] text-ink-500">{event.desc}</span>}
                  <span className="mt-0.5 block text-[11px] text-ink-400">{savedAgo(event.at)}</span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 rounded-xl bg-ink-50 px-4 py-6 text-center text-[12.5px] text-ink-500">
            상태 변경, 할 일 완료, 문서·증빙 수정이 여기에 기록됩니다.
          </p>
        )}
      </Card>
    </section>
  )
}

function NowCard({ c, todos, nextDeadline, onOpenTodos }) {
  const { addTodo, toggleTodo } = useWorkspace()
  const toast = useToast()
  const [text, setText] = useState('')
  const [due, setDue] = useState('')
  const generated = caseTasks(c).find((task) => !task.done)

  const add = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    addTodo(c.id, text, due)
    toast('할 일을 추가했어요')
    setText('')
    setDue('')
  }

  const insights = caseInsights(c)

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-ink-900">지금 해야 할 일</h2>
          <p className="mt-1 text-[12px] text-ink-500">완료하면 최근 변화에 자동으로 남습니다.</p>
        </div>
        {/* 기한 칩은 색을 아껴 쓴다 — 지난 기한일 때만 붉어지고, 평소엔 조용한 회색이다 */}
        {nextDeadline ? (
          <Link
            to="/app/schedule"
            className={cx(
              'rounded-xl px-3 py-2 text-right transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100',
              nextDeadline.dday < 0 ? 'bg-red-50 text-red-500' : 'bg-ink-50 text-ink-700 hover:bg-ink-100',
            )}
          >
            <span className="block text-[10.5px] font-semibold opacity-70">다음 기한</span>
            <span className="block text-[12px] font-bold tabular-nums">{deadlineLabel(nextDeadline)} · {fmtDate(nextDeadline.due)}</span>
          </Link>
        ) : (
          <Link to="/app/schedule" className="rounded-xl bg-ink-50 px-3 py-2 text-[11.5px] font-semibold text-ink-500 hover:bg-ink-100">
            기한 등록하기
          </Link>
        )}
      </div>

      <div className="mt-4">
        {todos.length ? (
          <ul className="space-y-1">
            {todos.slice(0, 3).map((todo) => {
              const late = todo.due && todo.due < TODAY()
              return (
                <li key={todo.id}>
                  <button
                    type="button"
                    onClick={() => { toggleTodo(c.id, todo.id); toast('할 일을 완료했어요') }}
                    className="group flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                    aria-label={`${todo.text} 완료로 표시`}
                  >
                    <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border border-ink-300 bg-white text-white group-hover:border-brand-300">
                      <Check size={11} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink-800">{todo.text}</span>
                    {todo.due && <span className={cx('shrink-0 text-[11px] font-semibold tabular-nums', late ? 'text-red-500' : 'text-ink-500')}>{fmtDate(todo.due)}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : generated ? (
          <Link to={generated.to} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-3.5 text-[13px] font-semibold text-brand-600 hover:bg-brand-100">
            <span>{generated.label} 입력을 마무리하세요</span>
            <span className="shrink-0 text-[11px]">빈칸 {generated.missing}개</span>
          </Link>
        ) : (
          <p className="rounded-xl bg-ink-50 px-4 py-3 text-[13px] font-semibold text-ink-600">지금 등록된 할 일은 모두 끝났어요.</p>
        )}
      </div>

      {/* AI 검토는 따로 카드를 두지 않는다. 「지금 손댈 것」이라는 점에서 할 일과 같은 종류라,
          두 칸으로 나누면 어느 쪽부터 봐야 하는지가 사라진다. */}
      {insights.length > 0 && (
        <div className="mt-4 border-t border-ink-100 pt-3.5">
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-500">
            <Sparkles size={13} className="text-ink-400" /> AI가 짚은 것 {insights.length}
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {insights.slice(0, 3).map((x, i) => (
              <li key={i}>
                <Link
                  to={x.to === '/app/evidence' ? `/app/evidence?case=${c.id}` : x.to || '#'}
                  state={x.to === '/app/documents' ? { openDoc: 'complaint', caseId: c.id, from: 'case-insight' } : undefined}
                  className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-[12.5px] transition-colors hover:bg-ink-50"
                >
                  <span className={cx('min-w-0 flex-1 truncate', x.urgent ? 'font-semibold text-red-500' : 'text-ink-700')}>{x.text}</span>
                  <ChevronRight size={13} className="shrink-0 text-ink-300" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={add} className="mt-4 flex flex-wrap gap-2 border-t border-ink-100 pt-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="할 일 추가"
          aria-label="새 할 일"
          className="h-10 min-w-[180px] flex-1 rounded-lg border border-ink-200 bg-white px-3 text-[13px] text-ink-700 outline-none placeholder:text-ink-300 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
        />
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          aria-label="할 일 기한"
          className="h-10 w-[142px] rounded-lg border border-ink-200 bg-white px-2.5 text-[12px] text-ink-700 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
        />
        <Button size="sm" type="submit" disabled={!text.trim()}>추가</Button>
        <button type="button" onClick={onOpenTodos} className="h-10 px-2 text-[12px] font-semibold text-brand-500 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">전체 관리</button>
      </form>
    </Card>
  )
}

const deadlineLabel = (item) => item.dday < 0 ? `D+${-item.dday}` : item.dday === 0 ? '오늘' : `D-${item.dday}`

/* ══════════════════ 가로 진행 스텝퍼 — 헤더 카드 안 ══════════════════ */
// 분쟁 발생 → 내용증명 → 소장 작성 → 법원 접수 → 변론 → 판결
// 「진행 표시」(사용자가 누르는 상태)와 달리, 이건 사건 자체가 어디까지 왔나다.

/**
 * 사건이 어디까지 왔나.
 *
 * 칸을 눌러 현재 위치를 직접 옮길 수 있어야 한다. 변론이 끝났는지, 판결이 났는지는 법원 시스템에만
 * 있고 우리는 조회할 수 없어서, 사용자가 표시하지 않으면 뒤 칸은 영원히 비어 있다.
 * 시작 지점도 여기서 바꾼다 — 소장부터 온 사람에게 「분쟁 발생」은 이미 지난 일이다.
 */
function Flow({ c }) {
  const { setFlowStep, setEntryPoint } = useWorkspace()
  const navigate = useNavigate()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [noticeDate, setNoticeDate] = useState(TODAY())
  const steps = caseFlow(c)
  const entry = entryPoint(c)
  const current = flowIndex(c)
  const left = caseTasks(c).filter((t) => !t.done).length
  const type = findType(c.typeKey)
  const pct = type ? completeness(type, c.form || {}) : 0

  const pickStep = (index) => {
    const step = steps[index]
    if (!step) return
    if (step.key === 'notice' && index <= current + 1) {
      setNoticeDate(TODAY())
      setNoticeOpen(true)
      return
    }
    if (step.key === 'draft') {
      navigate('/app/documents', { state: { openDoc: 'complaint', caseId: c.id, from: 'case-flow' } })
      return
    }
    if (step.key === 'file') {
      window.dispatchEvent(new CustomEvent('naholo:open-filing'))
      requestAnimationFrame(() => document.getElementById('filing')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      return
    }
    if (step.key === 'trial') {
      navigate('/app/schedule')
      return
    }
    if (index > current) {
      toast('앞 단계를 확인해야 다음 단계로 넘어갈 수 있어요')
      return
    }
    toast('지난 단계는 상단의 「상태 정정」에서 사유를 남기고 변경해 주세요')
  }

  const finishNotice = (skipped) => {
    setFlowStep(c.id, 'draft', {
      note: skipped ? '내용증명은 선택 단계로 건너뜀' : `${noticeDate} 내용증명 발송 확인`,
      skipped: skipped ? 'notice' : '',
      clearSkipped: skipped ? '' : 'notice',
    })
    toast(skipped ? '내용증명을 건너뛰고 소장 작성으로 이동했어요' : '내용증명 발송을 기록했어요', 'success')
    setNoticeOpen(false)
    navigate('/app/documents', { state: { openDoc: 'complaint', caseId: c.id, from: 'case-flow' } })
  }

  return (
    <>
      {/* 「현재 단계: 판결」이라고 적어 두는 대신 바 자체를 헤더에 놓는다.
          지금 서 있는 칸은 바 위에서 빛나므로, 같은 말을 글자로 또 쓸 필요가 없다.
          오른쪽 숫자 둘과 한 선에 놓아 「어디까지 왔나 · 얼마나 남았나」를 한눈에 붙인다. */}
      <div className="mt-6 flex flex-wrap items-center gap-x-10 gap-y-6 border-t border-ink-100 pt-5">
        <div className="min-w-[320px] flex-1">
          <Stepper
            steps={steps.map((s) => ({
              ...s,
              note: c.flowSkipped?.[s.key] ? '건너뜀' : s.at ? fmtDate(s.at) : s.pct !== undefined && !s.done ? `${s.pct}%` : '',
            }))}
            current={current}
            onPick={pickStep}
          />
        </div>
        <div className="flex shrink-0 items-start gap-x-10 border-ink-100 sm:border-l sm:pl-8">
          <Stat label="소장 작성" value={`${pct}%`} bar={pct} />
          <Stat label="접수까지 남은 작업" value={left} unit="건" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-3">
        <p className="text-[12px] text-ink-400">현재 단계를 누르면 그 앞은 완료, 뒤는 예정으로 정리됩니다. 법원 진행은 직접 옮겨 주세요.</p>
        <button type="button" onClick={() => setOpen(true)} className="shrink-0 text-[12px] font-semibold text-brand-500 hover:underline">
          시작 지점: {entry.label}
        </button>
      </div>

      <Modal
        open={open} onClose={() => setOpen(false)} maxW="max-w-[460px]"
        title="어디서부터 시작하는 사건인가요?"
        sub="고른 지점보다 앞 단계는 이미 지나온 것으로 표시합니다."
        footer={<Button onClick={() => setOpen(false)}>확인</Button>}
      >
        <div className="space-y-2">
          {ENTRY_POINTS.map((item) => (
            <label
              key={item.key}
              className={cx(
                'flex cursor-pointer items-start gap-2.5 rounded-xl border p-3.5 transition-colors',
                entry.key === item.key ? 'border-brand-300 bg-brand-50' : 'border-ink-200 hover:bg-ink-50',
              )}
            >
              <input
                type="radio"
                name="entry-point"
                className="mt-0.5 h-4 w-4 shrink-0 accent-brand-300"
                checked={entry.key === item.key}
                onChange={() => setEntryPoint(c.id, item.key)}
              />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-ink-800">{item.label}</span>
                <span className="block text-xs leading-snug text-ink-500">{item.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </Modal>

      <Modal
        open={noticeOpen}
        onClose={() => setNoticeOpen(false)}
        dismissible={false}
        title="내용증명을 보냈나요?"
        sub="필수 절차는 아니지만 발송 여부를 남겨 두면 사건 흐름을 확인하기 쉬워요."
        footer={(
          <>
            <Button variant="neutral" onClick={() => setNoticeOpen(false)}>아직 결정하지 않았어요</Button>
            <Button variant="outline" onClick={() => finishNotice(true)}>이 단계 건너뛰기</Button>
            <Button onClick={() => finishNotice(false)} disabled={!noticeDate}>발송 기록하기</Button>
          </>
        )}
      >
        <label className="block rounded-xl border border-ink-200 bg-ink-50 p-4">
          <span className="text-[12px] font-semibold text-ink-700">발송일</span>
          <input
            type="date"
            value={noticeDate}
            onChange={(e) => setNoticeDate(e.target.value)}
            className="mt-2 min-h-11 w-full rounded-lg border border-ink-200 bg-white px-3 text-[13px] font-semibold text-ink-700 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
          />
          <span className="mt-2 block text-[11px] font-medium leading-relaxed text-ink-500">발송하지 않았다면 건너뛰어도 소장 작성은 계속할 수 있어요.</span>
        </label>
      </Modal>
    </>
  )
}

/* ══════════════════ 기능 카드 ══════════════════ */

// 카드 머리는 전부 같은 모양이다 — 회색 아이콘 · 제목 · 오른쪽 숫자.
// 아이콘까지 파랗게 칠하면 카드 넷이 저마다 손을 드는 꼴이라 어느 것도 눈에 안 들어온다.
function Tile({ icon: Icon, title, right, children, foot }) {
  return (
    <Card className="flex min-h-[204px] flex-col p-5">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-ink-400" />
        <h3 className="text-[13px] font-bold text-ink-900">{title}</h3>
        {right && <span className="ml-auto">{right}</span>}
      </div>
      <div className="mt-4 flex-1">{children}</div>
      {foot && <div className="mt-4 border-t border-ink-100 pt-3">{foot}</div>}
    </Card>
  )
}

const Count = ({ children }) => <span className="text-[12px] font-bold tabular-nums text-ink-600">{children}</span>

const Go = ({ to, state, children }) => (
  <Link to={to} state={state} className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-500 hover:underline">
    {children} <ArrowRight size={12} />
  </Link>
)

const Blank = ({ children }) => <p className="grid h-full place-items-center text-[12.5px] text-ink-400">{children}</p>


/** 일정 — 기한이 있는 준비사항만. D-day 숫자가 주인공이다. */
function ScheduleCard({ c, onOpen }) {
  const all = caseUpcoming(c)
  return (
    <Tile
      icon={Calendar}
      title="다가오는 일정"
      right={<Count>{all.length}건</Count>}
      foot={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <button type="button" onClick={onOpen} className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-500 hover:underline">
            준비사항 전체 <ArrowRight size={12} />
          </button>
          {/* 「자료·일정 현황」 카드를 없애면서 일정 화면으로 가는 길이 여기로 옮겨왔다 */}
          <Link to="/app/schedule" className="text-[12px] font-semibold text-ink-500 hover:text-brand-500 hover:underline">
            일정 관리
          </Link>
        </span>
      }
    >
      {all.length === 0 ? <Blank>기한을 정한 일이 없어요</Blank> : (
        <ul className="space-y-2">
          {all.slice(0, 4).map((t) => (
            <li key={t.id} className="flex items-center gap-3">
              <span className={cx(
                'shrink-0 rounded-md px-2 py-1 text-[11px] font-bold tabular-nums',
                t.dday < 0 ? 'bg-red-50 text-red-500' : 'bg-ink-100 text-ink-600',
              )}>
                {t.dday < 0 ? `D+${-t.dday}` : t.dday === 0 ? 'D-DAY' : `D-${t.dday}`}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-700">{t.text}</span>
            </li>
          ))}
        </ul>
      )}
    </Tile>
  )
}

/* ── 표로 펴는 카드 ─────────────────────────────────────────
   문서 생성 화면의 「최근 생성 문서」와 같은 골격이다: 머리글 한 줄, 그 아래 밑선으로
   나뉜 줄들. 카드 안에서 요약 숫자만 보여 주면 "무엇이 100%고 무엇이 덜 됐나"를
   알 수 없어서, 결국 다른 화면으로 건너가야 했다. 줄 자체가 열리는 문이 되게 한다. */

const TABLE_COLS = 'grid grid-cols-[minmax(0,1fr)_92px_78px] items-center gap-3'

const shortDate = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—'
    : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function TableCard({ icon: Icon, title, right, head, empty, rows, foot }) {
  return (
    <Card className="flex min-h-[204px] flex-col p-5">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-ink-400" />
        <h3 className="text-[13px] font-bold text-ink-900">{title}</h3>
        {right && <span className="ml-auto">{right}</span>}
      </div>

      <div className="mt-4 flex-1">
        {rows.length === 0 ? <Blank>{empty}</Blank> : (
          <>
            <div className={cx(TABLE_COLS, 'border-b border-ink-200 pb-2 text-[11.5px] font-medium text-ink-500')}>{head}</div>
            <ul>{rows}</ul>
          </>
        )}
      </div>

      {foot && <div className="mt-4 border-t border-ink-100 pt-3">{foot}</div>}
    </Card>
  )
}

/** 표의 한 줄 — 눌러서 여는 버튼이다. 어디를 눌러야 열리는지 헷갈리지 않게 줄 전체가 과녁이다. */
function TableRow({ onClick, label, icon, sub, mid, tail }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        title={`${label} 열기`}
        className={cx(TABLE_COLS, 'w-full border-b border-ink-100 py-2.5 text-left transition-colors hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300')}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {icon}
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-semibold text-ink-800">{label}</span>
            <span className="block truncate text-[11px] text-ink-400">{sub}</span>
          </span>
        </span>
        {mid}
        <span className="text-right text-[11px] tabular-nums text-ink-400">{tail}</span>
      </button>
    </li>
  )
}

/** 작성률 — 100%면 숫자만으로 다 됐다는 게 보이도록 색을 준다 */
function ProgressCell({ value }) {
  const done = value >= 100
  return (
    <span className="min-w-0">
      <span className={cx('block text-[12.5px] font-bold tabular-nums', done ? 'text-brand-500' : 'text-ink-700')}>{value}%</span>
      <span className="mt-1 block"><Progress value={value} /></span>
    </span>
  )
}

function DocsTable({ c, onOpen }) {
  const docs = caseDocs(c)
  const done = docs.filter((d) => d.progress >= 100).length
  return (
    <TableCard
      icon={FileText}
      title="문서"
      right={<Count>{done}/{docs.length} 완성</Count>}
      head={<><span>문서명</span><span>작성률</span><span className="text-right">수정일</span></>}
      empty="아직 만든 문서가 없어요"
      foot={<Go to="/app/documents">문서 생성으로</Go>}
      rows={docs.map((d) => (
        <TableRow
          key={d.id}
          onClick={() => onOpen(d)}
          icon={<DocFolder className="shrink-0" />}
          label={d.title}
          sub={[d.label, d.versions?.length ? `v${d.versions.length}` : ''].filter(Boolean).join(' · ')}
          mid={<ProgressCell value={d.progress} />}
          tail={shortDate(d.updatedAt)}
        />
      ))}
    />
  )
}

function EvidenceTable({ c, onOpen }) {
  const ev = caseEvidence(c)
  const ok = ev.filter((e) => e.purpose).length
  return (
    <TableCard
      icon={Folder}
      title="증빙자료"
      right={<Count>{ok}/{ev.length} 입증취지</Count>}
      head={<><span>자료명</span><span>상태</span><span className="text-right">크기</span></>}
      empty="소장 6단계에서 올리면 모여요"
      foot={(
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Go to={`/app/evidence?case=${c.id}`}>증빙자료에서 보기</Go>
          <Link to={`/app/evidence?case=${c.id}&view=folder&action=upload`} className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-500 hover:text-brand-500 hover:underline">
            <Plus size={12} /> 파일 올리기
          </Link>
        </span>
      )}
      rows={ev.map((e) => (
        <TableRow
          key={e.no}
          onClick={() => onOpen(e)}
          icon={<span className="shrink-0 rounded bg-ink-100 px-1.5 py-1 text-[10px] font-bold tabular-nums text-ink-600">{e.no}</span>}
          label={e.file}
          // 입증취지가 없으면 그 자체가 할 일이라, 파일 이름 밑에 그대로 적어 둔다
          sub={e.purpose || `${e.code} · 입증취지 없음`}
          mid={<Badge tone={e.tone}>{e.status}</Badge>}
          tail={e.size || '—'}
        />
      ))}
    />
  )
}

/**
 * 이 사건에 **인용한** 판례.
 *
 * '관련 판례'라고 부르면 시스템이 골라 준 목록처럼 읽히지만, 여기 있는 것은
 * 사용자가 판례 검색에서 [내 문서에 인용]으로 직접 담은 것뿐이다. 소장·준비서면의
 * 청구원인에 실제로 들어가는 판례라, 무엇을 담았는지 사건에서 바로 보여야 한다.
 *
 * 풀어 쓸 때는 workspace의 판례 보관함을 거친다. mock만 뒤지면 공개 판례 API에서
 * 담아 온 판례가 전부 걸러져 "0건"으로 보인다 — 실제로 인용해 둔 것이 있는데도.
 */
function PrecedentCard({ c, onOpen }) {
  const { precedentByNo, removeCitation, activeCaseId } = useWorkspace()
  const nos = casePrecedentNos(c)
  const cited = nos.map((no) => precedentByNo(no) || { no, title: no }).filter(Boolean)
  const canRemove = activeCaseId === c.id
  return (
    <Tile icon={Scale} title="인용한 판례" right={<Count>{cited.length}건</Count>} foot={<Go to="/app/search">판례 검색에서 더 담기</Go>}>
      {cited.length === 0 ? <Blank>판례 검색에서 [내 문서에 인용]으로 담으면 여기에 모여요</Blank> : (
        <ul className="-mx-2">
          {/* 줄을 누르면 그 판례의 판시사항·검색 근거를 그대로 펼친다.
              번호만 적어 두면 무엇을 왜 인용했는지는 판례 검색 화면까지 가야 알 수 있었다. */}
          {cited.map((p) => (
            <li key={p.no} className="group flex items-start">
              <button
                type="button"
                onClick={() => onOpen(p)}
                title={`${p.title} 열기`}
                className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left text-[12.5px] transition-colors hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                <span className="flex items-start gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink-800">{p.title}</span>
                    <span className="block truncate text-[11px] text-ink-400">
                      {[p.court, p.no, p.date].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  {p.result && <Badge tone={p.result.includes('승') ? 'blue' : 'gray'}>{p.result}</Badge>}
                </span>
              </button>
              {canRemove && (
                <button
                  type="button"
                  onClick={() => removeCitation(p.no)}
                  aria-label={`${p.title} 인용 빼기`}
                  className="mt-2 shrink-0 rounded-md p-1 text-ink-300 opacity-0 transition hover:bg-ink-100 hover:text-red-500 focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <X size={13} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Tile>
  )
}

/* ══════════════════ 눌러서 여는 창 ══════════════════ */
//
// 표의 줄 하나를 누르면 열린다. 세 가지를 한 창이 맡는다 — 문서·증빙자료·판례.
// 창을 따로 셋 두면 상태도 셋이고, 여는 쪽에서 어느 창을 쓸지 매번 골라야 한다.

const officialPrecedentUrl = (p) =>
  `https://www.law.go.kr/LSW/precInfoP.do?precSeq=${encodeURIComponent(p.officialId || '')}`

function Viewer({ c, view, onClose }) {
  const navigate = useNavigate()
  const toast = useToast()
  if (!view) return null

  const caseMeta = { caseTitle: caseTitle(c), caseNo: c.caseNo || '', court: c.form?.court || '' }

  /* ── 문서 ── */
  if (view.kind === 'doc') {
    const doc = view.item
    const type = findType(c.typeKey)
    const editDoc = () => {
      onClose()
      navigate('/app/documents', { state: { openDoc: doc.kind, caseId: c.id, from: 'case-detail' } })
    }

    // 소장은 사건 답변에서 그대로 조판된다 — 완성본을 여기서 바로 읽을 수 있다
    if (doc.kind === 'complaint' && type) {
      return (
        <Modal
          open onClose={onClose} maxW="max-w-4xl"
          title={doc.title}
          sub={`작성률 ${doc.progress}% · ${[caseMeta.caseNo || '사건번호 없음', caseMeta.court].filter(Boolean).join(' · ')}`}
          footer={(
            <>
              <Button variant="neutral" size="sm" onClick={onClose}>닫기</Button>
              <Button variant="outline" size="sm" onClick={printSheet}><Printer size={14} /> PDF 저장 · 인쇄</Button>
              <Button size="sm" onClick={editDoc}>{doc.progress >= 100 ? '내용 수정하기' : '이어서 쓰기'} <ArrowRight size={14} /></Button>
            </>
          )}
        >
          {doc.progress < 100 && (
            <p className="mb-4 rounded-xl bg-ink-50 px-4 py-3 text-[12.5px] leading-relaxed text-ink-600">
              아직 <b className="text-ink-900">{doc.progress}%</b>예요. 비어 있는 칸은 <span className="text-ink-400">[ 대괄호 ]</span>로 표시됩니다.
            </p>
          )}
          <div className="rounded-2xl border border-ink-200 bg-white px-6 py-8 sm:px-10 sm:py-10">
            <ComplaintPaper doc={buildPreview(type, c.form || {})} />
          </div>
        </Modal>
      )
    }

    // 준비서면·증거목록 등 — 문서 생성 화면이 만든 파일이라 파일 정보와 버전을 보여 준다
    return (
      <Modal
        open onClose={onClose} maxW="max-w-6xl"
        title={doc.title}
        sub={`${doc.label} · 작성률 ${doc.progress}%`}
        footer={(
          <>
            <Button variant="neutral" size="sm" onClick={onClose}>닫기</Button>
            <Button size="sm" onClick={editDoc}>문서 생성에서 열기 <ArrowRight size={14} /></Button>
          </>
        )}
      >
        <EvidencePreview
          // 제출 여부는 작성률이 아니라 **제출 기록**에서 온다 — 다 썼어도 낸 적이 없으면 미제출이다
          item={{ ...doc, ...caseMeta, file: doc.title, group: 'doc', status: doc.versions?.some((v) => v.submittedAt) ? '제출완료' : '미제출' }}
          onDownload={() => toast(`${doc.title} 파일은 문서 생성 화면에서 내려받을 수 있어요`)}
        />
      </Modal>
    )
  }

  /* ── 증빙자료 ── */
  if (view.kind === 'evidence') {
    const item = view.item
    const download = async () => {
      // 올린 원본이 있으면 그대로 내려받는다. 데모 자료는 파일이 없으니 그 사실을 알린다.
      const ok = await downloadEvidenceFile({ ...item, name: item.file }).catch(() => false)
      if (!ok) toast(`${item.file}은 예시 자료라 원본 파일이 없어요`)
    }
    return (
      <Modal
        open onClose={onClose} maxW="max-w-6xl"
        title={item.file}
        sub={[item.code, caseMeta.caseTitle, caseMeta.caseNo].filter(Boolean).join(' · ')}
        footer={(
          <>
            <Button variant="neutral" size="sm" onClick={onClose}>닫기</Button>
            <Button size="sm" onClick={download}>원본 다운로드</Button>
          </>
        )}
      >
        <EvidencePreview item={{ ...item, ...caseMeta, group: 'evidence' }} onDownload={download} />
      </Modal>
    )
  }

  /* ── 판례 ── */
  const p = view.item
  return (
    <Modal
      open onClose={onClose} maxW="max-w-2xl"
      title={p.title || p.no}
      sub={[p.court, p.no, p.date].filter(Boolean).join(' · ')}
      footer={(
        <>
          <Button variant="neutral" size="sm" onClick={onClose}>닫기</Button>
          {p.officialId && (
            <Button href={officialPrecedentUrl(p)} target="_blank" rel="noopener noreferrer" variant="outline" size="sm">
              공식 원문 <ExternalLink size={14} />
            </Button>
          )}
          <Button to="/app/search" size="sm" onClick={onClose}>판례 검색으로 <ArrowRight size={14} /></Button>
        </>
      )}
    >
      {p.result && <Badge tone={p.result.includes('승') ? 'blue' : 'gray'}>{p.result}</Badge>}

      {p.point ? (
        <div className="mt-4">
          <h4 className="text-[12px] font-bold text-ink-900">판시사항</h4>
          <p className="mt-2 whitespace-pre-wrap rounded-xl bg-ink-50 px-4 py-3.5 text-[13px] leading-relaxed text-ink-700">{p.point}</p>
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-ink-50 px-4 py-6 text-center text-[12.5px] leading-relaxed text-ink-500">
          이 판례의 본문은 아직 받아 두지 않았어요. 아래 공식 원문에서 전문을 확인할 수 있습니다.
        </p>
      )}

      {p.apply && (
        <div className="mt-4">
          <h4 className="text-[12px] font-bold text-ink-900">이 사건에 인용한 이유</h4>
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-brand-600">{p.apply}</p>
        </div>
      )}

      <p className="mt-5 text-[11px] leading-relaxed text-ink-400">
        판례는 사건마다 사실관계가 달라 결론이 그대로 적용되지 않습니다. 소장에 인용할 때는 판시 부분이 내 쟁점과 맞는지 확인하세요.
      </p>
    </Modal>
  )
}

/* ══════════════════ 소장 제출 가이드 ══════════════════ */
//
// 전에는 이 자리가 「진행 표시 · 접수 정보」였다. 사건번호와 접수일은 이미 맨 위
// 사건 머리에 적혀 있어서, 같은 값을 접힌 줄에 한 번 더 보여 주는 것뿐이었다.
//
// 정작 이 자리에 있어야 할 것은 **소장을 다 쓴 사람이 다음에 할 일**이다.
// 어디에 내는지, 전자소송 화면에 무엇을 어떤 순서로 옮겨 적는지, 얼마를 내는지.
// 그 안내는 문서 생성 화면 안에만 있어서 사건을 다시 열면 닿을 수 없었다.
//
// 접수 정보를 적는 칸(CaseStatus)은 없애지 않고 이 가이드 안으로 들어갔다.
// 사건번호는 접수하고 돌아와서 적는 값이고, 접수하러 가는 문이 바로 이 화면이다.

function SubmitGuideCard({ c }) {
  const navigate = useNavigate()
  const type = findType(c.typeKey)
  const pct = type ? completeness(type, c.form || {}) : 0
  const complaint = caseDocs(c).find((d) => d.kind === 'complaint')
  // 다 썼거나, 파일이 나왔거나, 이미 접수했으면 '낼 수 있는 상태'로 본다
  const ready = pct >= 100 || !!complaint?.versions?.length || !!c.caseNo
  const [open, setOpen] = useState(ready)

  // 상태를 「접수함」으로 바꾸면 사건번호를 적으라고 이 판을 열어 준다
  useEffect(() => {
    const openPanel = () => setOpen(true)
    window.addEventListener('naholo:open-filing', openPanel)
    return () => window.removeEventListener('naholo:open-filing', openPanel)
  }, [])
  useEffect(() => { if (ready) setOpen(true) }, [ready])

  const editDoc = () => navigate('/app/documents', { state: { openDoc: 'complaint', caseId: c.id, from: 'case-detail' } })

  if (!type) return null

  if (!ready) {
    return (
      <Card className="p-5">
        <h3 className="text-[13px] font-bold text-ink-900">소장 제출 가이드</h3>
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-ink-50 p-4">
          <FileText size={20} className="shrink-0 text-ink-300" />
          <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink-600">
            소장을 다 쓰면 <b className="text-ink-800">어디에 어떻게 내는지</b>를 여기에서 안내해 드려요.
            전자소송 입력 순서, 인지대·송달료, 제출 전 확인까지 이 자리에 열립니다.
          </p>
          <span className="shrink-0 text-[13px] font-bold tabular-nums text-ink-500">{pct}%</span>
          <Button size="sm" onClick={editDoc}>소장 이어서 쓰기 <ArrowRight size={14} /></Button>
        </div>
      </Card>
    )
  }

  return (
    <Card id="submit-guide" className="p-5">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 text-left">
        <h3 className="text-[13px] font-bold text-ink-900">소장 제출 가이드</h3>
        <span className="text-[12px] text-ink-500">전자소송 입력 순서 · 인지대 · 접수 정보 기록</span>
        <ChevronRight size={15} className={cx('ml-auto shrink-0 text-ink-300 transition-transform', open && 'rotate-90')} />
      </button>
      {open && (
        <div className="mt-5 border-t border-ink-200 pt-5">
          <SubmitGuide embedded type={type} form={c.form || {}} caseItem={c} onEditDoc={editDoc} />
        </div>
      )}
    </Card>
  )
}

/* ══════════════════ 펼침 ══════════════════ */
// 카드는 요약만 보여준다. 손대야 할 때만 여기서 펼친다.

function Sheet({ open, onClose, c }) {
  if (!open) return null
  const isTodo = open === 'todos'
  return (
    <Modal
      open
      onClose={onClose}
      title={isTodo ? '준비사항' : 'AI 검토'}
      sub={isTodo ? '이 사건을 위해 준비할 것' : '지금 손대야 할 것'}
      footer={<Button variant="neutral" onClick={onClose}>닫기</Button>}
    >
      {isTodo ? <TodoList c={c} /> : <InsightList c={c} />}
    </Modal>
  )
}

function TodoList({ c }) {
  const { addTodo, toggleTodo, removeTodo } = useWorkspace()
  const [text, setText] = useState('')
  const [due, setDue] = useState('')
  const list = caseTodoList(c)
  const today = TODAY()

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    addTodo(c.id, text, due)
    setText(''); setDue('')
  }

  return (
    <div>
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <input
          value={text} onChange={(e) => setText(e.target.value)}
          placeholder="예) 차용증 원본 찾아 스캔하기"
          className="h-10 min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none placeholder:text-ink-300 focus:border-brand-300"
        />
        <input
          type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="기한"
          className="h-10 w-[142px] rounded-lg border border-ink-200 bg-white px-2.5 text-sm text-ink-700 outline-none focus:border-brand-300"
        />
        <Button size="sm" type="submit" disabled={!text.trim()}><Plus size={15} /> 추가</Button>
      </form>

      <ul className="mt-3 max-h-[44vh] space-y-0.5 overflow-y-auto">
        {list.map((t) => {
          const late = !t.done && t.due && t.due < today
          return (
            <li key={t.id} className="group flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-ink-50">
              <button
                type="button" role="checkbox" aria-checked={t.done} onClick={() => toggleTodo(c.id, t.id)}
                className={cx('grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border', t.done ? 'border-brand-300 bg-brand-300 text-white' : 'border-ink-300 bg-white')}
              >
                {t.done && <Check size={11} />}
              </button>
              <span className={cx('min-w-0 flex-1 text-[13px]', t.done ? 'text-ink-400 line-through' : 'text-ink-800')}>{t.text}</span>
              {t.due && <span className={cx('shrink-0 text-[11px] font-semibold tabular-nums', late ? 'text-red-500' : 'text-ink-500')}>{fmtDate(t.due)}</span>}
              <button
                type="button" onClick={() => removeTodo(c.id, t.id)} aria-label="지우기"
                className="shrink-0 rounded p-1 text-ink-300 opacity-0 hover:text-ink-600 group-hover:opacity-100 focus:opacity-100"
              >
                <X size={13} />
              </button>
            </li>
          )
        })}
        {list.length === 0 && <li className="py-6 text-center text-[13px] text-ink-400">준비할 것을 적어 두면 잊지 않아요.</li>}
      </ul>
    </div>
  )
}

function InsightList({ c }) {
  const list = caseInsights(c)
  if (!list.length) return <p className="py-6 text-center text-[13px] text-ink-400">지금 손댈 것이 없어요.</p>
  return (
    <ul className="space-y-0.5">
      {list.map((x, i) => (
        <li key={i}>
          <Link
            to={x.to === '/app/evidence' ? `/app/evidence?case=${c.id}` : x.to || '#'}
            state={x.to === '/app/documents' ? { openDoc: 'complaint', caseId: c.id, from: 'case-insight-sheet' } : undefined}
            className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-[13px] hover:bg-ink-50"
          >
            <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', x.urgent ? 'bg-red-300' : 'bg-brand-300')} />
            <span className="min-w-0 flex-1 text-ink-700">{x.text}</span>
            <ChevronRight size={14} className="shrink-0 text-ink-300" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
