// 사건관리 — 사건 고르기
//
// 문서 생성·증빙자료·판례 검색에서 한 일이 어느 사건에 속하는지 정리해 두고
// 그 사건 하나로 들어가는 입구다. 소송 절차 안내의 첫 화면과 같은 카드 그리드를 써서
// 어느 메뉴에서 사건을 고르든 같은 방식으로 제목·사건번호·현재 상태를 읽게 한다.

import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { caseTitle, caseTodoList, overdueTodos, caseFlow, flowIndex, caseEvidence, caseDocs } from '../lib/casebook.js'
import { savedAgo } from '../lib/complaint.js'
import { Card, Button, cx } from '../components/ui.jsx'
import CaseNewModal from '../components/CaseNewModal.jsx'
import { Plus, ArrowRight, AlertTriangle } from '../components/icons.jsx'

const SORTS = [
  { key: 'recent', label: '최근 작업순' },
  { key: 'urgent', label: '급한 순' },
]

export default function Cases() {
  const { rawCases, myCases, hasMyCase } = useWorkspace()
  const navigate = useNavigate()
  const [sort, setSort] = useState('recent')
  const [newCase, setNewCase] = useState(false)

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
      todoLeft: todos.filter((t) => !t.done).length,
      overdue: overdueTodos(c).length,
      docs: caseDocs(c).length,
      evidence: caseEvidence(c).length,
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

  const attention = items.filter((c) => c.overdue > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">사건관리</h1>
        <p className="mt-1 text-sm text-ink-500">
          사건 하나에 들어가면 그 사건의 문서·증빙자료·판례와 앞으로 할 준비가 한곳에 모여 있어요.
        </p>
      </div>

      {!hasMyCase ? <Empty onNew={() => setNewCase(true)} /> : (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-bold text-ink-900">내 사건 {items.length}건</h2>
              <p className="mt-0.5 text-xs text-ink-500">사건을 열어 다음 준비사항부터 이어서 하세요.</p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <div className="inline-flex gap-1 rounded-xl bg-ink-100 p-1">
                {SORTS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={sort === s.key}
                    onClick={() => setSort(s.key)}
                    className={cx(
                      'min-h-11 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 sm:min-h-9',
                      sort === s.key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <Button size="sm" onClick={() => setNewCase(true)} className="ml-auto min-h-11 sm:ml-0 sm:min-h-9">
                <Plus size={15} /> 새 사건
              </Button>
            </div>
          </div>

          {attention.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertTriangle size={16} className="shrink-0 text-red-300" />
              <span className="text-[13px] font-semibold text-red-500">기한이 지난 준비사항이 있어요</span>
              {attention.map((c) => (
                <Link key={c.id} to={`/app/cases/${c.id}`} className="rounded text-[13px] font-semibold text-ink-700 underline underline-offset-2 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                  {c.title} <span className="tabular-nums">{c.overdue}건</span>
                </Link>
              ))}
            </div>
          )}

          <ul className="mt-5 grid justify-items-center gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((c) => (
              <li key={c.id} className="w-full max-w-[320px]">
                <CasePick c={c} onOpen={() => navigate(`/app/cases/${c.id}`)} />
              </li>
            ))}
            <li className="w-full max-w-[320px]">
              <NewCasePick onNew={() => setNewCase(true)} />
            </li>
          </ul>
        </Card>
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

const STATUS_TONE = {
  '작성 중': 'bg-ink-100 text-ink-600',
  '제출 준비': 'bg-ink-100 text-ink-700',
  '접수함': 'bg-brand-50 text-brand-600',
  '진행 중': 'bg-brand-50 text-brand-600',
  '종결': 'bg-ink-100 text-ink-500',
}

/** 소송 절차 안내의 사건 선택 카드와 같은 문서 더미/포켓 구조다. */
function CasePick({ c, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${c.title} 사건 열기 — ${c.status}, 현재 ${c.stage}`}
      className="group relative aspect-[320/284] w-full cursor-pointer overflow-hidden rounded-[20px] border border-ink-200 bg-ink-100 text-left transition-colors hover:border-brand-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
    >
      <span
        aria-hidden="true"
        className="absolute rounded-[14px] bg-ink-300"
        style={{ left: '31.25%', top: '38.73%', width: '51.25%', height: '68.31%' }}
      />
      <span
        aria-hidden="true"
        className="absolute rounded-[14px] bg-white shadow-[0_0_22px_rgba(0,0,0,0.1)]"
        style={{ left: '18.13%', top: '39.44%', width: '51.25%', height: '68.31%' }}
      />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[44%] bg-ink-50/90 backdrop-blur-[19px]" />

      <span className="absolute left-[7.8%] right-[7.8%] top-[4.9%]">
        <span className="block truncate text-[22px] font-semibold leading-snug text-ink-700 transition-colors group-hover:text-brand-500">
          {c.title}
        </span>
        <span className="mt-0.5 block truncate text-[14px] font-medium text-ink-600">
          {[c.court, c.caseNo || '사건번호 없음'].join(' | ')}
        </span>
      </span>

      <span className="absolute inset-x-0 bottom-0 flex h-[44%] flex-col px-5 py-3.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink-800">현재 {c.stage}</span>
          <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', STATUS_TONE[c.status] || 'bg-ink-100 text-ink-600')}>
            {c.status}
          </span>
        </span>

        <span className={cx('mt-1.5 block truncate text-[11px] font-medium', c.overdue > 0 ? 'text-red-500' : 'text-brand-500')}>
          {c.nextTodo ? `다음 할 일 · ${c.nextTodo.text}` : c.status === '종결' ? '종결된 사건 상세 보기' : '다음 할 일을 사건 상세에서 정해보세요'}
        </span>

        <span className="mt-1.5 flex items-center gap-2">
          <span className="text-[11px] text-ink-500">소장 작성</span>
          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-ink-200">
            <span className="block h-full rounded-full bg-brand-300" style={{ width: `${Math.min(100, c.progress)}%` }} />
          </span>
          <span className="text-[11px] font-bold tabular-nums text-ink-700">{c.progress}%</span>
        </span>

        <span className="mt-auto flex min-w-0 items-end gap-2 text-[10.5px] text-ink-500">
          <span className={cx('shrink-0', c.overdue > 0 && 'font-semibold text-red-500')}>
            남은 준비 {c.todoLeft}
          </span>
          <span aria-hidden="true" className="text-ink-300">·</span>
          <span className="shrink-0">문서 {c.docs}</span>
          <span aria-hidden="true" className="text-ink-300">·</span>
          <span className="shrink-0">증빙 {c.evidence}</span>
          <span className="ml-auto truncate text-ink-400">{c.agoLabel}</span>
        </span>
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
      className="group grid aspect-[320/284] w-full place-items-center rounded-[20px] border-2 border-dashed border-ink-200 bg-white text-center transition-colors hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
    >
      <span className="grid place-items-center gap-3 px-6">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-300 transition-colors group-hover:bg-brand-300 group-hover:text-white">
          <Plus size={22} />
        </span>
        <span>
          <span className="block text-[15px] font-bold text-ink-800">새 사건 시작</span>
          <span className="mt-1 block text-[12px] leading-relaxed text-ink-500">다툼이 생겼다면 먼저 등록하세요</span>
        </span>
      </span>
    </button>
  )
}

/* ────────────────────── 아직 사건이 없을 때 ────────────────────── */

function Empty({ onNew }) {
  return (
    <Card className="grid place-items-center gap-4 px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-300"><Plus size={24} /></div>
      <p className="text-lg font-bold text-ink-900">아직 사건이 없어요</p>
      <p className="max-w-md text-[13px] leading-relaxed text-ink-500">
        상대방과 다툼이 생긴 순간부터가 사건이에요. 소송을 할지 정하지 않았어도 괜찮습니다.
        <b className="text-ink-700"> 먼저 사건을 만들어 두면</b> 자료·일정·문서가 그 사건에 모입니다.
        사건번호는 접수한 뒤에 붙는 속성일 뿐이에요.
      </p>
      <Button onClick={onNew} className="mt-1">첫 사건 만들기 <ArrowRight size={16} /></Button>
    </Card>
  )
}
