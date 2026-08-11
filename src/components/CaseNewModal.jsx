// 새 사건 만들기 — Figma 「대시보드 / 사건 등록하기」(1145:18355)
//
// ── 왜 소장과 따로 있는가 ──────────────────────────────────
// 소장을 쓴다고 사건이 시작되는 게 아니다. 계약이 틀어지고, 내용증명을 보내고,
// 소송을 할지 말지 재는 동안에도 분쟁은 이미 존재한다.
// 그 시기에도 상대방·금액·자료를 모아 둘 곳이 필요하다.
//
// 그래서 여기서는 **분쟁 자체**만 등록한다. 소장은 나중에 이 사건에 붙는 문서다.
// 사건번호도 마찬가지 — 접수해야 나오는 값이라 비워 두는 것이 기본이다.

import { useState } from 'react'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import Modal from './Modal.jsx'
import { Button, inputCls, cx } from './ui.jsx'
import { complaintTypes, courts, won } from '../lib/complaint.js'
import { looksLikeCaseNo } from '../lib/casebook.js'
import { HelpCircle } from './icons.jsx'

export default function CaseNewModal({ open, onClose, onCreated }) {
  const { addCase } = useWorkspace()
  const toast = useToast()

  const [f, setF] = useState({ title: '', typeKey: '', dName: '', amount: '', court: '', caseNo: '' })
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  const noWarn = f.caseNo.trim() && !looksLikeCaseNo(f.caseNo)

  const submit = () => {
    if (!f.title.trim()) { toast('사건명을 입력해 주세요'); return }
    const c = addCase({ ...f, amount: f.amount.replace(/[^0-9]/g, '') })
    if (!c) { toast('사건을 만들지 못했습니다. 브라우저 저장공간을 확인해 주세요', 'error'); return }
    toast(`「${c.title}」 사건을 만들었어요`, 'success')
    setF({ title: '', typeKey: '', dName: '', amount: '', court: '', caseNo: '' })
    onClose()
    onCreated?.(c)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxW="max-w-lg"
      title="새 사건 만들기"
      sub="진행할 소송 사건을 등록하세요."
      footer={
        <>
          <Button variant="neutral" onClick={onClose}>취소</Button>
          <Button onClick={submit} disabled={!f.title.trim()}>사건 만들기</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="사건명">
          <input className={inputCls} placeholder="예: 임대차 보증금 반환 청구" value={f.title} onChange={set('title')} autoFocus />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="사건 유형">
            <select className={cx(inputCls, 'appearance-none')} value={f.typeKey} onChange={set('typeKey')}>
              <option value="">아직 모르겠어요</option>
              {complaintTypes.map((t) => <option key={t.key} value={t.key}>{t.title}</option>)}
            </select>
          </Field>
          <Field label="상대방(피고)">
            <input className={inputCls} placeholder="예: 김철수" value={f.dName} onChange={set('dName')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="청구 금액">
            <div className="relative">
              <input
                className={cx(inputCls, 'pr-8')}
                inputMode="numeric"
                placeholder="예: 10,000,000"
                value={f.amount ? won(f.amount.replace(/[^0-9]/g, '')) : ''}
                onChange={(e) => setF((x) => ({ ...x, amount: e.target.value.replace(/[^0-9]/g, '') }))}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-400">원</span>
            </div>
          </Field>
          <Field label="관할 법원">
            <input className={inputCls} placeholder="예: 서울중앙지방법원" value={f.court} onChange={set('court')} list="court-list" />
            <datalist id="court-list">{courts.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
        </div>

        <Field label="사건번호" hint="사건번호는 법원에 소장을 접수하면 부여됩니다.">
          <input className={inputCls} placeholder="접수 후 부여 — 신규 사건이면 비워두세요" value={f.caseNo} onChange={set('caseNo')} />
          {noWarn && (
            <p className="mt-1 text-[12px] text-red-500">
              「2026가단123456」처럼 연도 + 재판부호 + 번호 형태인지 확인해 주세요. 그대로 저장할 수도 있습니다.
            </p>
          )}
        </Field>

        {/* 관할은 우리가 정해 줄 수 없다 — 틀리면 이송돼 몇 달이 밀린다 */}
        <p className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3.5 text-[12px] leading-relaxed text-brand-600">
          <HelpCircle size={14} className="mt-0.5 shrink-0" />
          관할 법원은 사건 유형·주소지에 따라 정해집니다. 정확한 관할은 반드시 직접 확인하세요.
        </p>
      </div>
    </Modal>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  )
}
