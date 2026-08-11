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
  caseTasks, caseFlow, flowIndex, caseUpcoming, caseInsights, spineOf, overdueTodos, caseTitle,
} from '../lib/casebook.js'
import { findType, fmtDate, savedAgo, completeness } from '../lib/complaint.js'
import { precedents } from '../data/mock.js'
import { Card, Button, Badge, Progress, cx } from '../components/ui.jsx'
import CaseStatus, { LawyerNote } from '../components/CaseStatus.jsx'
import Modal from '../components/Modal.jsx'
import Stepper from '../components/Stepper.jsx'
import {
  ArrowLeft, ArrowRight, FileText, Folder, Scale, Calendar, Check, CheckCircle,
  Plus, Trash, X, Sparkles, ChevronRight,
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
      <Flow c={c} />
      <Summary c={c} onOpen={setSheet} />

      {/* 기능 카드 — 하나에 목적 하나 */}
      <div className="grid gap-5 xl:grid-cols-3">
        <TasksCard c={c} />
        <InsightCard c={c} />
        <ScheduleCard c={c} onOpen={() => setSheet('todos')} />
        <DocsCard c={c} />
        <EvidenceCard c={c} />
        <PrecedentCard c={c} />
      </div>

      {/* 접수 정보는 손대는 일이 드물다 — 필요할 때만 편다 */}
      <FilingCard c={c} />

      <LawyerNote className="px-1" />

      <Sheet open={sheet} onClose={() => setSheet(null)} c={c} />

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
// 사건명 · 사건번호 · 진행률 · 현재 단계 · 접수까지 남은 작업 수

function Hero({ c, onDrop }) {
  const type = findType(c.typeKey)
  const pct = type ? completeness(type, c.form || {}) : 0
  const left = caseTasks(c).filter((t) => !t.done).length
  const stage = caseFlow(c)[flowIndex(c)]

  return (
    <div>
      <Link to="/app/cases" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition-colors hover:text-ink-700">
        <ArrowLeft size={16} /> 사건 목록으로
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-x-10 gap-y-5 rounded-2xl border border-ink-200 bg-white p-6">
        <span className="h-12 w-1.5 shrink-0 rounded-full" style={{ background: spineOf(c).cover }} />

        <div className="min-w-[220px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[26px] font-bold leading-tight text-ink-900">{caseTitle(c)}</h1>
            <Badge tone={TONE[c.status] || 'gray'}>{c.status}</Badge>
          </div>
          <p className="mt-1 text-[13px] text-ink-500">
            {[c.caseNo || '사건번호 없음', c.form?.court, `최근 활동 ${savedAgo(c.updatedAt)}`].filter(Boolean).join(' · ')}
          </p>
        </div>

        <Stat label="현재 단계" value={stage?.label || '—'} />
        <Stat label="소장 작성" value={`${pct}%`} bar={pct} />
        <Stat label="접수까지 남은 작업" value={left} unit="건" alert={left > 0} />

        <Button size="sm" variant="ghost" className="text-ink-400" onClick={onDrop} aria-label="사건 지우기"><Trash size={15} /></Button>
      </div>
    </div>
  )
}

function Stat({ label, value, unit, bar, alert }) {
  return (
    <div className="min-w-[96px]">
      <p className="text-[11px] text-ink-500">{label}</p>
      <p className={cx('mt-1 text-[22px] font-bold leading-none tabular-nums', alert ? 'text-red-500' : 'text-ink-900')}>
        {value}{unit && <span className="ml-0.5 text-[13px] font-semibold text-ink-500">{unit}</span>}
      </p>
      {bar !== undefined && <div className="mt-2 w-[96px]"><Progress value={bar} /></div>}
    </div>
  )
}

/* ══════════════════ 가로 진행 스텝퍼 ══════════════════ */
// 분쟁 발생 → 내용증명 → 소장 작성 → 법원 접수 → 변론 → 판결
// 「진행 표시」(사용자가 누르는 상태)와 달리, 이건 사건 자체가 어디까지 왔나다.

function Flow({ c }) {
  const steps = caseFlow(c)
  return (
    <Card className="px-6 pb-6 pt-7">
      <Stepper
        steps={steps.map((s) => ({
          ...s,
          note: s.at ? fmtDate(s.at) : s.pct !== undefined && !s.done ? `${s.pct}%` : '',
        }))}
        current={flowIndex(c)}
      />
    </Card>
  )
}

/* ══════════════════ Summary 카드 줄 ══════════════════ */
// 숫자만 크게. 누르면 그 자리로 간다.

function Summary({ c, onOpen }) {
  const todos = caseTodoList(c)
  const left = todos.filter((t) => !t.done).length
  const late = overdueTodos(c).length
  const soon = caseUpcoming(c).filter((t) => t.dday >= 0 && t.dday <= 7).length
  const ev = caseEvidence(c)
  const noPurpose = ev.filter((e) => !e.purpose).length
  const ai = caseInsights(c).length

  const cells = [
    { label: '오늘 할 일', v: left, unit: '건', sub: todos.length ? `${todos.length - left}/${todos.length} 완료` : '아직 없음', on: () => onOpen('todos') },
    { label: '기한 임박', v: late || soon, unit: '건', sub: late ? '기한 지남' : soon ? '7일 이내' : '없음', alert: late > 0, on: () => onOpen('todos') },
    { label: '생성한 문서', v: caseDocs(c).length, unit: '개', sub: '문서 생성으로', to: '/app/documents' },
    { label: '증빙자료', v: ev.length, unit: '개', sub: noPurpose ? `입증취지 ${noPurpose}개 부족` : '정리 완료', alert: noPurpose > 0, to: '/app/evidence' },
    { label: 'AI 검토', v: ai, unit: '건', sub: ai ? '조치 필요' : '이상 없음', alert: ai > 0, on: () => onOpen('ai') },
  ]

  const cls = 'rounded-2xl border border-ink-200 bg-white px-5 py-4 text-left transition-colors hover:border-ink-300 hover:bg-ink-50'

  return (
    <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
      {cells.map((x) => {
        const inner = (
          <>
            <p className="text-[11px] text-ink-500">{x.label}</p>
            <p className={cx('mt-1.5 text-[28px] font-bold leading-none tabular-nums', x.alert ? 'text-red-500' : 'text-ink-900')}>
              {x.v}<span className="ml-0.5 text-[13px] font-semibold text-ink-400">{x.unit}</span>
            </p>
            <p className={cx('mt-2 truncate text-[11px]', x.alert ? 'text-red-500' : 'text-ink-500')}>{x.sub}</p>
          </>
        )
        return x.to
          ? <Link key={x.label} to={x.to} className={cls}>{inner}</Link>
          : <button key={x.label} type="button" onClick={x.on} className={cls}>{inner}</button>
      })}
    </div>
  )
}

/* ══════════════════ 기능 카드 ══════════════════ */

function Tile({ icon: Icon, title, right, children, foot }) {
  return (
    <Card className="flex min-h-[196px] flex-col p-5">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-brand-300" />
        <h3 className="text-[13px] font-bold text-ink-900">{title}</h3>
        {right && <span className="ml-auto">{right}</span>}
      </div>
      <div className="mt-4 flex-1">{children}</div>
      {foot && <div className="mt-4">{foot}</div>}
    </Card>
  )
}

const Count = ({ children }) => <span className="text-[12px] font-bold tabular-nums text-ink-600">{children}</span>

const Go = ({ to, children }) => (
  <Link to={to} className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-500 hover:underline">
    {children} <ArrowRight size={12} />
  </Link>
)

const Blank = ({ children }) => <p className="grid h-full place-items-center text-[12.5px] text-ink-400">{children}</p>

/** 미완성 항목을 '작업 단위'로 — 누르면 그 입력으로 간다 */
function TasksCard({ c }) {
  const tasks = caseTasks(c)
  const done = tasks.filter((t) => t.done).length

  return (
    <Tile icon={CheckCircle} title="소장에 필요한 것" right={<Count>{done}/{tasks.length}</Count>} foot={<Go to="/app/documents">소장 이어서 쓰기</Go>}>
      <div className="grid grid-cols-2 gap-2">
        {tasks.map((t) => (
          <Link
            key={t.key}
            to={t.to}
            className={cx(
              'flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors',
              t.done ? 'border-ink-200 bg-ink-50' : 'border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50',
            )}
          >
            <span className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-full', t.done ? 'bg-brand-300 text-white' : 'bg-ink-100 text-ink-500')}>
              {t.done ? <Check size={11} /> : <span className="text-[10px] font-bold tabular-nums">{t.missing}</span>}
            </span>
            <span className={cx('min-w-0 flex-1 truncate text-[12.5px] font-semibold', t.done ? 'text-ink-500' : 'text-ink-800')}>{t.label}</span>
          </Link>
        ))}
      </div>
    </Tile>
  )
}

/** AI — 길게 쓰지 않는다. 손댈 것 한 줄씩. */
function InsightCard({ c }) {
  const list = caseInsights(c)
  return (
    <Tile icon={Sparkles} title="AI 검토" right={<Badge tone={list.length ? 'red' : 'blue'}>{list.length ? `${list.length}건` : '이상 없음'}</Badge>}>
      {list.length === 0 ? <Blank>지금 손댈 것이 없어요</Blank> : (
        <ul className="space-y-0.5">
          {list.map((x, i) => (
            <li key={i}>
              <Link to={x.to || '#'} className="flex items-center gap-2 rounded-lg px-2 py-2 text-[12.5px] transition-colors hover:bg-ink-50">
                <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', x.urgent ? 'bg-red-300' : 'bg-brand-300')} />
                <span className="min-w-0 flex-1 text-ink-700">{x.text}</span>
                <ChevronRight size={13} className="shrink-0 text-ink-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Tile>
  )
}

/** 일정 — 기한이 있는 준비사항만. D-day 숫자가 주인공이다. */
function ScheduleCard({ c, onOpen }) {
  const all = caseUpcoming(c)
  return (
    <Tile
      icon={Calendar}
      title="다가오는 일정"
      right={<Count>{all.length}건</Count>}
      foot={
        <button type="button" onClick={onOpen} className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-500 hover:underline">
          준비사항 전체 <ArrowRight size={12} />
        </button>
      }
    >
      {all.length === 0 ? <Blank>기한을 정한 일이 없어요</Blank> : (
        <ul className="space-y-2">
          {all.slice(0, 4).map((t) => (
            <li key={t.id} className="flex items-center gap-3">
              <span className={cx(
                'shrink-0 rounded-md px-2 py-1 text-[11px] font-bold tabular-nums',
                t.dday < 0 ? 'bg-red-50 text-red-500' : t.dday <= 3 ? 'bg-brand-50 text-brand-600' : 'bg-ink-100 text-ink-600',
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

function DocsCard({ c }) {
  const docs = caseDocs(c)
  const main = docs.find((d) => d.kind === 'complaint')
  const rest = docs.filter((d) => d.kind !== 'complaint')
  return (
    <Tile icon={FileText} title="문서" right={<Count>{docs.length}개</Count>} foot={<Go to="/app/documents">문서 생성으로</Go>}>
      {main && (
        <div className="mb-3.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[12.5px] font-semibold text-ink-700">소장 작성</span>
            <span className="text-[22px] font-bold leading-none tabular-nums text-ink-900">{main.progress}%</span>
          </div>
          <div className="mt-2"><Progress value={main.progress} /></div>
        </div>
      )}
      {rest.length === 0 ? (
        <p className="text-[12px] text-ink-400">준비서면·증거목록은 아직 없어요</p>
      ) : (
        <ul className="space-y-1.5">
          {rest.slice(0, 3).map((d) => (
            <li key={d.id} className="flex items-center gap-2 text-[12.5px]">
              <span className="shrink-0 rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-600">{d.label}</span>
              <span className="min-w-0 flex-1 truncate text-ink-700">{d.title}</span>
              <span className="shrink-0 text-[11px] tabular-nums text-ink-400">{d.progress}%</span>
            </li>
          ))}
        </ul>
      )}
    </Tile>
  )
}

function EvidenceCard({ c }) {
  const ev = caseEvidence(c)
  const ok = ev.filter((e) => e.purpose).length
  return (
    <Tile icon={Folder} title="증빙자료" right={<Count>{ev.length}개</Count>} foot={<Go to="/app/evidence">증빙자료에서 보기</Go>}>
      {ev.length === 0 ? <Blank>소장 6단계에서 올리면 모여요</Blank> : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-[28px] font-bold leading-none tabular-nums text-ink-900">{ok}</span>
            <span className="text-[13px] text-ink-500">/ {ev.length}건 입증취지 작성</span>
          </div>
          <div className="mt-2.5"><Progress value={Math.round((ok / ev.length) * 100)} /></div>
          {ok < ev.length && (
            <p className="mt-2.5 text-[12px] text-red-500">{ev.length - ok}건은 입증취지가 없어 증거목록에 못 들어가요</p>
          )}
        </>
      )}
    </Tile>
  )
}

function PrecedentCard({ c }) {
  const linked = casePrecedentNos(c).map((no) => precedents.find((p) => p.no === no)).filter(Boolean)
  return (
    <Tile icon={Scale} title="관련 판례" right={<Count>{linked.length}건</Count>} foot={<Go to="/app/search">판례 더 찾아보기</Go>}>
      {linked.length === 0 ? <Blank>판례 검색에서 담아 오면 모여요</Blank> : (
        <ul className="space-y-2">
          {linked.slice(0, 3).map((p) => (
            <li key={p.no} className="flex items-center gap-2 text-[12.5px]">
              <span className="min-w-0 flex-1 truncate text-ink-700">{p.title}</span>
              <Badge tone={p.result?.includes('승') ? 'blue' : 'gray'}>{p.result}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Tile>
  )
}

/* ══════════════════ 접수 정보 ══════════════════ */
// 손대는 일이 드물다. 접수 전에는 한 줄로 접어 두고, 필요할 때만 편다.

function FilingCard({ c }) {
  const [open, setOpen] = useState(!c.caseNo && c.status === '접수함')
  return (
    <Card className="p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <h3 className="text-[13px] font-bold text-ink-900">진행 표시 · 접수 정보</h3>
        <span className="text-[12px] text-ink-500">
          {c.caseNo ? `${c.caseNo}${c.filedAt ? ` · ${fmtDate(c.filedAt)} 접수` : ''}` : '사건번호는 접수해야 나옵니다'}
        </span>
        <ChevronRight size={15} className={cx('ml-auto shrink-0 text-ink-300 transition-transform', open && 'rotate-90')} />
      </button>
      {open && <div className="mt-5 border-t border-ink-200 pt-5"><CaseStatus c={c} /></div>}
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
          <Link to={x.to || '#'} className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-[13px] hover:bg-ink-50">
            <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', x.urgent ? 'bg-red-300' : 'bg-brand-300')} />
            <span className="min-w-0 flex-1 text-ink-700">{x.text}</span>
            <ChevronRight size={14} className="shrink-0 text-ink-300" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
