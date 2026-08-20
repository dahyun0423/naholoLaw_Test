// 사건관리 — 사건 고르기
//
// 문서 생성·증빙자료·판례 검색에서 한 일이 어느 사건에 속하는지 정리해 두고
// 그 사건 하나로 들어가는 입구다.
//
// ── 카드를 다시 짠 이유 ─────────────────────────────────────
// 전에는 폴더 그림 위에 반투명 판을 덮고 그 안에 여섯 줄을 10~13px로 눌러 담았다.
// 그림과 글자가 같은 자리를 다투니 어느 쪽도 읽히지 않았다.
// 지금은 그림을 걷어내고 **글자만 남긴다** — 대신 줄마다 크기를 다르게 줘서
// 사건명 → 진행률 → 다음 할 일 순으로 눈이 흐르게 한다.
//
// 좌우 화살표 캐러셀도 없앴다. 사건 5건을 넘기려고 방향키를 배우게 할 이유가 없다.
// 한 판에 아홉 장을 펼치고, 더 있으면 「더 보기」로 이어 붙인다.

import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { caseTitle, caseTodoList, overdueTodos, caseFlow, flowIndex, spineOf } from '../lib/casebook.js'
import { savedAgo } from '../lib/complaint.js'
import { Card, Button, cx } from '../components/ui.jsx'
import CaseNewModal from '../components/CaseNewModal.jsx'
import { Plus, ArrowRight, ChevronRight, Upload } from '../components/icons.jsx'

const SORTS = [
  { key: 'recent', label: '최근 작업순' },
  { key: 'urgent', label: '급한 순' },
]

const PAGE = 9      // 한 번에 펼치는 사건 수 — 3열 기준 세 줄

export default function Cases() {
  const { rawCases, myCases, hasMyCase } = useWorkspace()
  const navigate = useNavigate()
  const location = useLocation()
  const [sort, setSort] = useState('recent')
  const [newCase, setNewCase] = useState(false)
  const [shown, setShown] = useState(PAGE)

  const items = useMemo(() => rawCases.map((c) => {
    const sum = myCases.find((m) => m.id === c.id)
    const todos = caseTodoList(c)
    return {
      id: c.id,
      title: caseTitle(c),
      court: c.form?.court || '법원 미정',
      caseNo: c.caseNo || '',
      status: c.status,
      progress: sum?.progress || 0,
      stage: caseFlow(c)[flowIndex(c)]?.label || '',
      spine: spineOf(c).cover,
      todoLeft: todos.filter((t) => !t.done).length,
      overdue: overdueTodos(c).length,
      nextTodo: todos.find((t) => !t.done) || null,
      agoLabel: savedAgo(c.updatedAt),
      updatedAt: c.updatedAt,
    }
  }), [rawCases, myCases])

  const sorted = useMemo(() => {
    const list = [...items]
    if (sort === 'urgent') return list.sort((a, b) => (b.overdue - a.overdue) || (b.todoLeft - a.todoLeft))
    return list.sort((a, b) => b.updatedAt - a.updatedAt)
  }, [items, sort])

  const visible = sorted.slice(0, shown)

  useEffect(() => {
    if (!location.state?.openNewCase) return
    setNewCase(true)
    // 새로고침이나 뒤로가기로 등록창이 반복해서 열리지 않도록 일회성 이동 상태를 지운다.
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.state, navigate])

  return (
    <div className="mx-auto max-w-[1091px]">
      <header className="pb-7 pt-1">
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.6px] text-ink-900">사건 관리</h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-500">
          소송 진행 단계를 한눈에 확인하고 다음 단계를 준비하세요
        </p>
      </header>

      {!hasMyCase ? <Empty onNew={() => setNewCase(true)} /> : (
        <section>
          <div className="flex flex-wrap items-center gap-3 pb-5">
            <h2 className="text-[15px] font-bold text-ink-900">
              내 사건 <span className="tabular-nums text-ink-500">{items.length}</span>
            </h2>

            <div className="ml-auto inline-flex gap-1 rounded-xl bg-ink-100 p-1">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={sort === s.key}
                  onClick={() => { setSort(s.key); setShown(PAGE) }}
                  className={cx(
                    'rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
                    sort === s.key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <Button size="sm" variant="neutral" onClick={() => setNewCase(true)}>
              <Upload size={15} /> 파일 업로드
            </Button>
          </div>

          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <li><NewCasePick onNew={() => setNewCase(true)} /></li>
            {visible.map((c) => (
              <li key={c.id}>
                <CasePick c={c} onOpen={() => navigate(`/app/cases/${c.id}`)} />
              </li>
            ))}
          </ul>

          {shown < sorted.length && (
            <div className="mt-6 text-center">
              <Button variant="neutral" onClick={() => setShown((n) => n + PAGE)}>
                사건 {sorted.length - shown}건 더 보기
              </Button>
            </div>
          )}
        </section>
      )}

      {/* 사건은 소장보다 먼저 만든다 — 소송을 할지 정하기 전에도 분쟁은 존재한다 */}
      <CaseNewModal
        open={newCase}
        onClose={() => setNewCase(false)}
        onCreated={(c) => navigate(`/app/cases/${c.id}`)}
      />
    </div>
  )
}

/* ────────────────────── 사건 한 장 ────────────────────── */
//
// 위에서부터 굵기가 줄어든다: 사건명(19) → 진행률(13) → 다음 할 일(12.5) → 메타(11.5).
// 색은 두 군데만 쓴다 — 진행 막대(파랑)와 기한 지난 할 일(빨강).

function CasePick({ c, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${c.title} 사건 열기 — ${c.status}, 현재 ${c.stage}`}
      className="group flex h-full min-h-[236px] w-full cursor-pointer flex-col rounded-[20px] border border-ink-200 bg-white p-5 text-left transition-[border-color,box-shadow,transform] duration-150 hover:border-ink-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 active:scale-[0.985] motion-reduce:transition-none"
    >
      {/* 현재 단계 — 사건 유형 색 점 하나로만 유형을 표시한다 */}
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.spine }} />
        <span className="min-w-0 truncate text-[12px] font-semibold text-ink-500">{c.stage}</span>
        <span className="ml-auto shrink-0 rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-semibold text-ink-600">
          {c.status}
        </span>
      </span>

      <span className="mt-3.5 block truncate text-[19px] font-bold leading-snug tracking-[-0.3px] text-ink-900">
        {c.title}
      </span>
      <span className="mt-1 block truncate text-[13px] text-ink-500">
        {c.court} · {c.caseNo || '사건번호 없음'}
      </span>

      <span className="mt-4 block border-t border-ink-100 pt-4">
        <span className="flex items-baseline gap-2">
          <span className="text-[12px] text-ink-500">소장 작성</span>
          <span className="ml-auto text-[13px] font-bold tabular-nums text-ink-900">{c.progress}%</span>
        </span>
        <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
          <span className="block h-full rounded-full bg-brand-300" style={{ width: `${Math.min(100, c.progress)}%` }} />
        </span>
      </span>

      <span className="mt-3.5 flex items-center gap-2">
        <span className={cx('min-w-0 flex-1 truncate text-[12.5px]', c.overdue > 0 ? 'font-semibold text-red-500' : 'text-ink-600')}>
          {c.nextTodo
            ? `다음 할 일 · ${c.nextTodo.text}`
            : c.status === '종결' ? '종결된 사건 상세 보기' : '다음 할 일을 정해보세요'}
        </span>
        <ChevronRight size={15} className="shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-500" />
      </span>

      <span className="mt-auto flex items-center gap-1.5 pt-3 text-[11.5px] text-ink-400">
        <span className="shrink-0">남은 준비 {c.todoLeft}</span>
        <span aria-hidden="true">·</span>
        <span className="truncate">{c.agoLabel}</span>
      </span>
    </button>
  )
}

function NewCasePick({ onNew }) {
  return (
    <button
      type="button"
      onClick={onNew}
      aria-label="새 사건 만들기"
      className="group grid h-full min-h-[236px] w-full place-items-center rounded-[20px] border border-dashed border-ink-300 bg-ink-50/60 text-center transition-[border-color,background-color,transform] duration-150 hover:border-brand-300 hover:bg-brand-50/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 active:scale-[0.985] motion-reduce:transition-none"
    >
      <span className="grid place-items-center gap-3 px-6">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-ink-400 shadow-sm transition-colors group-hover:text-brand-400">
          <Plus size={20} />
        </span>
        <span>
          <span className="block text-[15px] font-bold text-ink-800">새 사건 시작</span>
          <span className="mt-1 block text-[12.5px] text-ink-500">다툼이 생겼다면 먼저 등록하세요</span>
        </span>
      </span>
    </button>
  )
}

/* ────────────────────── 아직 사건이 없을 때 ────────────────────── */

function Empty({ onNew }) {
  return (
    <Card className="grid place-items-center gap-4 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-ink-100 text-ink-400"><Plus size={22} /></div>
      <p className="text-[17px] font-bold text-ink-900">아직 사건이 없어요</p>
      <p className="max-w-md text-[13px] leading-relaxed text-ink-500">
        상대방과 다툼이 생긴 순간부터가 사건이에요. 소송을 할지 정하지 않았어도 괜찮습니다.
        <b className="font-semibold text-ink-700"> 먼저 사건을 만들어 두면</b> 자료·일정·문서가 그 사건에 모입니다.
      </p>
      <Button onClick={onNew} className="mt-1">첫 사건 만들기 <ArrowRight size={16} /></Button>
    </Card>
  )
}
