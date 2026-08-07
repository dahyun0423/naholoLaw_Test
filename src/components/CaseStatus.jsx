// 사건 상태 관리 — 접수 여부는 우리가 알 수 없다
//
// 전자소송포털에 접수됐는지, 사건번호가 뭔지는 법원 시스템만 안다.
// 우리가 몰래 조회할 수도 없고, 조회한 척해서도 안 된다.
// 그래서 **사용자가 직접 표시**하게 하고, 그 표시를 축으로 나머지를 정리한다.
//
//   작성 중 → 제출 준비 → 접수함(사건번호 입력) → 진행 중 → 종결
//
// 사건번호가 붙기 전에도 사건은 존재한다. 번호는 나중에 붙는 속성일 뿐이다.

import { useState } from 'react'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { Card, Button, Badge, Input, cx } from './ui.jsx'
import { Check, AlertTriangle } from './icons.jsx'

export const CASE_FLOW = ['작성 중', '제출 준비', '접수함', '진행 중', '종결']

const TONE = {
  '작성 중': 'gray',
  '제출 준비': 'amber',
  '접수함': 'blue',
  '진행 중': 'green',
  '종결': 'gray',
}

export default function CaseStatus({ caseId, status, caseNo }) {
  const { updateStatus } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [no, setNo] = useState(caseNo || '')
  const idx = Math.max(0, CASE_FLOW.indexOf(status))

  const move = (next) => {
    // 접수 표시에는 사건번호가 따라와야 이후 화면이 의미를 갖는다
    if (next === '접수함' && !caseNo) { setOpen(true); return }
    updateStatus(caseId, next)
  }

  const confirmFiled = () => {
    updateStatus(caseId, '접수함', no.trim())
    setOpen(false)
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-bold text-ink-900">사건 진행 표시</h3>
        <Badge tone={TONE[status] || 'gray'}>{status}</Badge>
        {caseNo && <Badge tone="gray" shape="square">{caseNo}</Badge>}
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
        접수 여부와 사건번호는 법원 시스템에만 있어서 저희가 자동으로 확인할 수 없어요.
        <b className="text-ink-700"> 직접 눌러 표시</b>해 두시면 절차 안내·증빙자료·일정이 그 기준으로 정리됩니다.
      </p>

      {/* 단계 — 지난 단계는 되돌릴 수 있게 전부 누를 수 있다 */}
      <div className="mt-4 flex flex-wrap gap-2">
        {CASE_FLOW.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => move(s)}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
              i < idx ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                : i === idx ? 'border-brand-300 bg-brand-50 font-semibold text-brand-500'
                  : 'border-ink-200 bg-white text-ink-500 hover:bg-ink-50',
            )}
          >
            {i < idx && <Check size={13} />}
            {s}
          </button>
        ))}
      </div>

      {(open || (status === '접수함' && !caseNo)) && (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
          <p className="text-sm font-semibold text-brand-600">법원에서 받은 사건번호를 적어주세요</p>
          <p className="mt-1 text-[12px] leading-relaxed text-brand-600/80">
            전자소송은 접수 직후 포털 「나의전자소송」에서, 종이 제출은 접수증에서 확인할 수 있어요.
            아직 모르면 비워두고 나중에 채워도 됩니다.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Input
              className="w-56"
              placeholder="2026가단123456"
              value={no}
              onChange={(e) => setNo(e.target.value)}
            />
            <Button onClick={confirmFiled}>접수 표시</Button>
            <Button variant="neutral" onClick={() => setOpen(false)}>나중에</Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2 rounded-xl border border-ink-200 bg-ink-50 p-3 text-[12px] leading-relaxed text-ink-600">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-ink-400" />
        <span>
          나홀로법에는 서류 작성과 자료 정리를 돕는 도구예요. 여기의 안내는 일반적인 절차 설명이고,
          <b className="text-ink-800"> 사건의 승패나 전략에 관한 판단은 변호사의 자문을 받으셔야 합니다.</b>
          법률구조가 필요하시면 대한법률구조공단(132)에서 무료 상담을 받을 수 있어요.
        </span>
      </div>
    </Card>
  )
}
