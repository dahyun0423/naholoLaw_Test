import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { caseUpcoming } from '../lib/casebook.js'
import { completeness, findType } from '../lib/complaint.js'
import Modal from './Modal.jsx'
import { CASE_FLOW } from './CaseStatus.jsx'
import { Button, cx } from './ui.jsx'
import { ArrowRight, CheckCircle, Shield } from './icons.jsx'

const NEXT_STATUS = {
  '작성 중': '제출 준비',
  '제출 준비': '접수함',
  '접수함': '진행 중',
  '진행 중': '종결',
}

const STATUS_COPY = {
  '작성 중': { label: '소장을 작성하고 있어요', action: '소장 작성 마무리' },
  '제출 준비': { label: '법원 접수를 준비할 차례예요', action: '법원 접수 확인' },
  '접수함': { label: '법원에서 기일을 정하기를 기다리고 있어요', action: '기일통지서 등록' },
  '진행 중': { label: '기일과 제출기한을 관리하고 있어요', action: '종결 여부 확인' },
  '종결': { label: '종결된 사건이에요', action: '' },
}

const openFilingPanel = () => {
  window.dispatchEvent(new CustomEvent('naholo:open-filing'))
  requestAnimationFrame(() => document.getElementById('filing')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
}

export default function CaseStateControl({ c }) {
  const { updateStatus } = useWorkspace()
  const toast = useToast()
  const navigate = useNavigate()
  const [nextOpen, setNextOpen] = useState(false)
  const [correctOpen, setCorrectOpen] = useState(false)
  const [correction, setCorrection] = useState(c.status)
  const [reason, setReason] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)

  const type = findType(c.typeKey)
  const complaintProgress = type ? completeness(type, c.form || {}) : 0
  const nextStatus = NEXT_STATUS[c.status] || ''
  const copy = STATUS_COPY[c.status] || STATUS_COPY['작성 중']
  const hasCourtDate = useMemo(
    () => caseUpcoming(c).some((item) => /기일|변론|재판|심문|조정/.test(item.text || '')),
    [c],
  )

  const startNext = () => {
    if (c.status === '작성 중' && complaintProgress < 100) {
      toast(`소장 필수 항목을 먼저 마무리해 주세요. 현재 ${complaintProgress}%예요`)
      navigate('/app/documents')
      return
    }
    if (c.status === '제출 준비' && !c.caseNo) {
      openFilingPanel()
      toast('법원에서 받은 사건번호와 접수일을 입력해 주세요')
      return
    }
    if (c.status === '접수함' && !hasCourtDate) {
      toast('기일통지서를 먼저 등록해 주세요')
      navigate('/app/schedule')
      return
    }
    setAcknowledged(false)
    setNextOpen(true)
  }

  const confirmNext = () => {
    if (!nextStatus || (nextStatus === '종결' && !acknowledged)) return
    const saved = updateStatus(c.id, nextStatus)
    if (!saved) {
      toast('상태를 저장하지 못했습니다. 브라우저 저장공간을 확인해 주세요', 'error')
      return
    }
    toast(`사건 상태가 「${nextStatus}」으로 변경됐어요`, 'success')
    setNextOpen(false)
  }

  const correctionBlocked = CASE_FLOW.indexOf(correction) >= CASE_FLOW.indexOf('접수함') && !c.caseNo
  const saveCorrection = () => {
    if (correction === c.status || reason.trim().length < 5 || correctionBlocked) return
    const saved = updateStatus(c.id, correction, { reason: `상태 정정: ${reason.trim()}` })
    if (!saved) {
      toast('상태를 정정하지 못했습니다', 'error')
      return
    }
    toast(`사건 상태를 「${correction}」으로 정정했어요`, 'success')
    setCorrectOpen(false)
    setReason('')
  }

  return (
    <>
      <div className="min-w-[230px] rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield size={16} className="shrink-0 text-brand-400" />
          <span className="text-[11px] font-semibold text-ink-500">현재 사건 상태</span>
          <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-brand-600">{c.status}</span>
        </div>
        <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-ink-700">{copy.label}</p>
        <div className="mt-3 flex items-center gap-2">
          {nextStatus ? (
            <button
              type="button"
              onClick={startNext}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-300 px-3 text-[12px] font-bold text-white transition-colors hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 active:scale-[0.97]"
            >
              {copy.action} <ArrowRight size={14} />
            </button>
          ) : (
            <span className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-[12px] font-bold text-brand-600">
              <CheckCircle size={15} /> 진행 완료
            </span>
          )}
          <button
            type="button"
            onClick={() => { setCorrection(c.status); setReason(''); setCorrectOpen(true) }}
            className="min-h-11 rounded-lg px-2.5 text-[11px] font-semibold text-ink-500 hover:bg-white hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          >
            상태 정정
          </button>
        </div>
      </div>

      <Modal
        open={nextOpen}
        onClose={() => setNextOpen(false)}
        dismissible={false}
        title={nextStatus === '종결' ? '이 사건이 실제로 끝났나요?' : `「${nextStatus}」 단계로 넘어갈까요?`}
        sub="확인한 사실을 기준으로 상태와 아래 절차바가 함께 변경됩니다."
        footer={(
          <>
            <Button variant="neutral" onClick={() => setNextOpen(false)}>취소</Button>
            <Button onClick={confirmNext} disabled={nextStatus === '종결' && !acknowledged}>확인하고 변경</Button>
          </>
        )}
      >
        <div className="rounded-xl border border-ink-200 bg-ink-50 p-4 text-[13px] font-medium leading-relaxed text-ink-600">
          <p><b className="text-ink-800">현재</b> {c.status} <span className="mx-1 text-ink-300">→</span> <b className="text-brand-600">{nextStatus}</b></p>
          {nextStatus === '진행 중' && <p className="mt-2">등록된 기일 일정을 기준으로 변론 준비 단계로 이동합니다.</p>}
          {nextStatus === '종결' && (
            <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-2 rounded-lg bg-white p-3">
              <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-300" />
              <span>판결·조정·취하 등으로 사건이 실제로 끝난 사실을 확인했습니다.</span>
            </label>
          )}
        </div>
      </Modal>

      <Modal
        open={correctOpen}
        onClose={() => setCorrectOpen(false)}
        dismissible={false}
        title="사건 상태를 정정할까요?"
        sub="잘못 표시된 상태를 고칠 때만 사용해 주세요. 정정 기록은 사건 타임라인에 남습니다."
        footer={(
          <>
            <Button variant="neutral" onClick={() => setCorrectOpen(false)}>취소</Button>
            <Button onClick={saveCorrection} disabled={correction === c.status || reason.trim().length < 5 || correctionBlocked}>상태 정정</Button>
          </>
        )}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="text-[12px] font-semibold text-ink-700">정정할 상태</span>
            <select
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-lg border border-ink-200 bg-white px-3 text-[13px] font-semibold text-ink-800 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
            >
              {CASE_FLOW.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-ink-700">정정 사유</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="예: 접수 완료로 잘못 표시해서 이전 단계로 되돌립니다"
              className="mt-1.5 w-full resize-none rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-[13px] font-medium leading-relaxed text-ink-700 outline-none placeholder:text-ink-300 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
            />
          </label>
          {correctionBlocked && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-medium text-red-500">
              접수 이후 상태로 정정하려면 먼저 법원에서 받은 사건번호를 등록해야 합니다.
            </p>
          )}
          <p className={cx('text-[11px]', reason.trim().length > 0 && reason.trim().length < 5 ? 'text-red-500' : 'text-ink-400')}>
            사유를 5자 이상 입력해 주세요.
          </p>
        </div>
      </Modal>
    </>
  )
}
