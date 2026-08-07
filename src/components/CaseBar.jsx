// 사건 선택 바 — 절차 안내·증빙 자료·판례 검색이 "같은 사건"을 보게 하는 장치
//
// 사건번호가 없어도 사건은 존재한다(작성 중인 소장). 그래서 번호가 아니라
// 사건명으로 부르고, 번호는 붙었을 때만 곁들인다.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { Card, Badge, Button, cx } from './ui.jsx'
import { ChevronDown, FileText, Check } from './icons.jsx'

export default function CaseBar({ right }) {
  const { cases, activeCase, setActiveCaseId, hasMyCase } = useWorkspace()
  const [open, setOpen] = useState(false)
  if (!activeCase) return null

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
        <FileText size={17} className="shrink-0 text-brand-300" />

        <div className="relative min-w-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex min-w-0 items-center gap-2 text-left"
          >
            <span className="truncate font-bold text-ink-900">{activeCase.title}</span>
            {activeCase.caseNo
              ? <Badge tone="gray" shape="square">{activeCase.caseNo}</Badge>
              : <Badge tone="blue" shape="square">사건번호 없음</Badge>}
            {!activeCase.isMine && <Badge tone="gray">예시</Badge>}
            <ChevronDown size={16} className={cx('shrink-0 text-ink-400 transition-transform', open && 'rotate-180')} />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute z-20 mt-2 max-h-72 w-80 overflow-y-auto rounded-xl border border-ink-200 bg-white py-1 shadow-lg">
                {cases.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setActiveCaseId(c.id); setOpen(false) }}
                    className={cx(
                      'flex w-full items-start gap-2 px-3.5 py-2.5 text-left transition-colors',
                      c.id === activeCase.id ? 'bg-brand-50' : 'hover:bg-ink-50',
                    )}
                  >
                    <span className="mt-0.5 w-4 shrink-0">
                      {c.id === activeCase.id && <Check size={14} className="text-brand-500" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-ink-800">{c.title}</span>
                        {!c.isMine && <Badge tone="gray">예시</Badge>}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-500">
                        {[c.caseNo || '사건번호 없음', c.court, c.status].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </button>
                ))}
                {!hasMyCase && (
                  <div className="border-t border-ink-100 px-3.5 py-3">
                    <p className="text-xs leading-relaxed text-ink-500">
                      아직 만든 사건이 없어 <b className="text-ink-700">예시 사건</b>을 보고 계세요.
                      소장을 작성하면 이 목록에 내 사건이 생깁니다.
                    </p>
                    <Button as={Link} to="/app/documents" size="sm" variant="soft" className="mt-2 w-full">
                      소장 작성하러 가기
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          <p className="mt-0.5 truncate text-xs text-ink-500">
            {[activeCase.court, activeCase.status].filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">{right}</div>
      </div>
    </Card>
  )
}
