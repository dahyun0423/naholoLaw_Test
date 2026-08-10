// 사건관리 — 사건 고르기
//
// 여기는 "고르는" 화면이다. 기능을 새로 만드는 곳이 아니라,
// 문서 생성·증빙자료·판례 검색에서 한 일이 어느 사건에 속하는지 정리해 두고
// 그 사건 하나로 들어가는 입구다.
//
// 사건을 얇은 막대로 세워 두고 가리킨 하나만 넓게 편다(선반).
// 사건은 여러 건을 나란히 비교하는 물건이 아니라 하나를 붙잡고 몇 달을 가는 것이라,
// 하나를 크게 보여주고 나머지는 곁에 두는 편이 맞다.
// 펼친 칸 안에서도 문장이 아니라 **숫자와 진행률**이 먼저 읽혀야 한다.

import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { spineOf, shortLabelOf, caseTodoList, overdueTodos, caseFlow, flowIndex, caseEvidence, caseDocs } from '../lib/casebook.js'
import { findType, savedAgo } from '../lib/complaint.js'
import { Card, Button, cx } from '../components/ui.jsx'
import CaseRail from '../components/CaseRail.jsx'
import { Plus, ArrowRight, AlertTriangle } from '../components/icons.jsx'

const SORTS = [
  { key: 'recent', label: '최근 작업순' },
  { key: 'urgent', label: '급한 순' },
]

export default function Cases() {
  const { rawCases, myCases, hasMyCase } = useWorkspace()
  const navigate = useNavigate()
  const [sort, setSort] = useState('recent')

  const items = useMemo(() => rawCases.map((c) => {
    const sum = myCases.find((m) => m.id === c.id)
    const type = findType(c.typeKey)
    const todos = caseTodoList(c)
    return {
      id: c.id,
      title: type ? `${type.title} 청구` : '작성 중인 사건',
      short: shortLabelOf(c),          // 접힌 막대에 세로로 적을 짧은 이름
      caseNo: c.caseNo || '',
      parties: [c.form?.pName, c.form?.dName].filter(Boolean).join(' → '),
      status: c.status,
      progress: sum?.progress || 0,
      stage: caseFlow(c)[flowIndex(c)]?.label || '',
      todoLeft: todos.filter((t) => !t.done).length,
      overdue: overdueTodos(c).length,
      docs: caseDocs(c).length,
      evidence: caseEvidence(c).length,
      agoLabel: savedAgo(c.updatedAt),
      updatedAt: c.updatedAt,
      spine: spineOf(c),
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">사건관리</h1>
          <p className="mt-1 text-sm text-ink-500">
            사건 하나에 들어가면 그 사건의 문서·증빙자료·판례와 앞으로 할 준비가 한곳에 모여 있어요.
          </p>
        </div>
        {hasMyCase && (
          <div className="inline-flex gap-1 rounded-xl bg-ink-100 p-1">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSort(s.key)}
                className={cx(
                  'rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors',
                  sort === s.key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!hasMyCase ? <Empty /> : (
        <>
          {attention.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5">
              <AlertTriangle size={16} className="shrink-0 text-red-300" />
              <span className="text-[13px] font-semibold text-red-500">기한이 지난 준비사항이 있어요</span>
              {attention.map((c) => (
                <Link key={c.id} to={`/app/cases/${c.id}`} className="text-[13px] font-semibold text-ink-700 underline underline-offset-2 hover:text-ink-900">
                  {c.title} <span className="tabular-nums">{c.overdue}건</span>
                </Link>
              ))}
            </div>
          )}

          <CaseRail
            items={sorted}
            onOpen={(id) => navigate(`/app/cases/${id}`)}
            onNew={() => navigate('/app/documents')}
          />
          <p className="text-center text-xs text-ink-400">
            마우스를 올리면 사건이 펼쳐집니다 · 펼쳐진 카드를 누르면 들어가요 · ← → 키로도 고를 수 있어요
          </p>
        </>
      )}
    </div>
  )
}

/* ────────────────────── 아직 사건이 없을 때 ────────────────────── */

function Empty() {
  return (
    <Card className="grid place-items-center gap-4 px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-300"><Plus size={24} /></div>
      <p className="text-lg font-bold text-ink-900">아직 사건이 없어요</p>
      <p className="max-w-md text-[13px] leading-relaxed text-ink-500">
        소장을 쓰기 시작하면 사건이 하나 만들어집니다. 사건번호가 없어도 괜찮아요 —
        <b className="text-ink-700"> 사건은 접수 전에 이미 존재</b>하고, 번호는 나중에 붙는 속성일 뿐입니다.
      </p>
      <Button as={Link} to="/app/documents" className="mt-1">첫 사건 시작하기 <ArrowRight size={16} /></Button>
    </Card>
  )
}
