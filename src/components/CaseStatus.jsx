// 사건 진행 표시 + 접수 정보
//
// ── 사건번호는 어디서 오는가 ────────────────────────────────
// 우리 서비스는 사건번호를 만들 수도, 알아낼 수도 없다.
// 소장을 접수해야 법원이 부여하고, 그 값은 법원 시스템에만 있다.
//
//   전자소송으로 냈다  → 접수 직후 「나의전자소송 > 나의사건」에 뜬다
//   종이로 냈다        → 법원 민원실에서 준 접수증에 찍혀 있다
//
// 그래서 흐름은 하나뿐이다: **사용자가 보고 옮겨 적는다.**
// 조회하는 척하거나 자동으로 채워 주는 척해서는 안 된다.
//
// 함께 받는 두 가지:
//   접수일   — 이후 안내(답변서 기한·변론기일)가 전부 이 날짜에서 출발한다
//   접수 방법 — 이후 화면이 복사용(전자소송)인지 인쇄용(종이)인지가 여기서 갈린다
//
// 오타는 반드시 난다. 그래서 언제든 다시 고칠 수 있어야 한다.

import { useEffect, useState } from 'react'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { looksLikeCaseNo } from '../lib/casebook.js'
import { fmtDate } from '../lib/complaint.js'
import { Button, Opt, cx } from './ui.jsx'
import Stepper from './Stepper.jsx'
import { AlertTriangle } from './icons.jsx'

export const CASE_FLOW = ['작성 중', '제출 준비', '접수함', '진행 중', '종결']

/** 단계마다 한 줄 설명 — 눌렀을 때 "이게 무슨 뜻이지"를 없앤다 */
const STEP_DESC = {
  '작성 중': '소장을 쓰고 있어요',
  '제출 준비': '다 쓰고 접수를 앞두고 있어요',
  '접수함': '법원에 내고 사건번호를 받았어요',
  '진행 중': '변론이 오가는 중이에요',
  '종결': '판결·조정으로 끝났어요',
}

const inputSm =
  'h-10 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-700 outline-none transition placeholder:text-ink-300 focus:border-brand-300 focus:ring-4 focus:ring-brand-100'

export default function CaseStatus({ c }) {
  const { updateStatus, saveFiling } = useWorkspace()
  const toast = useToast()
  const idx = Math.max(0, CASE_FLOW.indexOf(c.status))
  // 사건번호가 있으면 이미 접수한 것이다. 상태를 앞 단계로 되돌려 놓았더라도
  // 적어 둔 접수 정보를 감추면 안 된다 — 다시 찾아 적게 만드는 셈이다.
  const filed = idx >= 2 || !!c.caseNo

  const [edit, setEdit] = useState(false)
  const [no, setNo] = useState(c.caseNo || '')
  const [at, setAt] = useState(c.filedAt || '')
  const [via, setVia] = useState(c.filedVia || '전자소송')

  // 사건을 옮겨 다녀도 입력칸이 이전 사건 값을 물고 있지 않게 한다
  useEffect(() => {
    setNo(c.caseNo || ''); setAt(c.filedAt || ''); setVia(c.filedVia || '전자소송'); setEdit(false)
  }, [c.id, c.caseNo, c.filedAt, c.filedVia])

  const move = (next) => {
    // 「접수함」부터는 사건번호가 있어야 이후 화면이 의미를 갖는다
    if (CASE_FLOW.indexOf(next) >= 2 && !c.caseNo) { setEdit(true); updateStatus(c.id, next); return }
    updateStatus(c.id, next)
  }

  const save = () => {
    saveFiling(c.id, { caseNo: no, filedAt: at, filedVia: via })
    setEdit(false)
    toast('접수 정보를 저장했어요')
  }

  const warn = no.trim() && !looksLikeCaseNo(no)

  return (
    <div className="space-y-4">
      {/* 진행 표시 — 배달 추적처럼. 지나온 단계는 채우고, 지금 단계에 점을 세운다.
          각 단계가 그대로 버튼이라 누르면 그 단계로 옮겨진다. */}
      <div>
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="text-sm font-bold text-ink-900">진행 표시</h3>
          <span className="text-xs text-ink-400">단계를 눌러 직접 바꿔 주세요 — 저희가 법원을 조회할 수는 없어요</span>
        </div>

        <div className="mt-4">
          <Stepper
            steps={CASE_FLOW.map((label, i) => ({
              key: label,
              label,
              done: i < idx,
              note: c.statusAt?.[label] && i <= idx ? fmtDate(new Date(c.statusAt[label]).toISOString().slice(0, 10)) : '',
            }))}
            current={idx}
            onPick={(i) => move(CASE_FLOW[i])}
          />
        </div>

        <p className="mt-1 text-center text-[12px] text-ink-500">{STEP_DESC[c.status]}</p>
      </div>

      {/* 접수 정보 */}
      <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
        {!filed && !edit ? (
          <p className="text-[13px] leading-relaxed text-ink-600">
            <b className="text-ink-800">사건번호는 접수해야 나옵니다.</b> 법원이 부여하는 번호라 저희는 조회할 수 없어요.
            접수하고 나면 <b className="text-ink-800">전자소송은 「나의전자소송」</b>에서,
            <b className="text-ink-800"> 종이 제출은 접수증</b>에서 확인해 여기 적어 주세요.
            <button type="button" onClick={() => setEdit(true)} className="ml-1 font-semibold text-brand-500 underline underline-offset-2">
              지금 적기
            </button>
          </p>
        ) : !edit ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Info label="사건번호" value={c.caseNo || '아직 없음'} strong />
            <Info label="접수일" value={c.filedAt ? fmtDate(c.filedAt) : '—'} />
            <Info label="접수 방법" value={c.filedVia || '—'} />
            <button type="button" onClick={() => setEdit(true)} className="ml-auto text-xs font-semibold text-brand-500 hover:underline">
              고치기
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-ink-700">법원에서 받은 접수 정보를 적어 주세요</p>
            <div className="flex flex-wrap gap-2">
              <input className={cx(inputSm, 'w-44')} placeholder="2026가단123456" value={no} onChange={(e) => setNo(e.target.value)} />
              <input className={cx(inputSm, 'w-[150px]')} type="date" aria-label="접수일" value={at} onChange={(e) => setAt(e.target.value)} />
              <div className="flex items-center gap-3 px-1">
                <Opt checked={via === '전자소송'} onChange={() => setVia('전자소송')} label="전자소송" />
                <Opt checked={via === '종이 제출'} onChange={() => setVia('종이 제출')} label="종이 제출" />
              </div>
            </div>
            {warn && (
              <p className="text-[12px] text-red-500">
                「2026가단123456」처럼 <b>연도 + 재판부호 + 번호</b> 형태인지 확인해 주세요. 그대로 저장할 수도 있습니다.
              </p>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={!no.trim()}>저장</Button>
              <Button size="sm" variant="neutral" onClick={() => setEdit(false)}>취소</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Info({ label, value, strong }) {
  return (
    <span>
      <span className="block text-[11px] text-ink-500">{label}</span>
      <span className={cx('block text-[13px]', strong ? 'font-bold text-ink-900' : 'font-semibold text-ink-700')}>{value}</span>
    </span>
  )
}

/** 사건과 무관하게 어디서든 붙이는 한 줄 — 우리는 도구이지 대리인이 아니다 */
export function LawyerNote({ className }) {
  return (
    <p className={cx('flex items-start gap-1.5 text-[12px] leading-relaxed text-ink-500', className)}>
      <AlertTriangle size={13} className="mt-0.5 shrink-0 text-ink-300" />
      <span>
        나홀로법에는 서류 작성과 자료 정리를 돕는 도구예요.
        <b className="text-ink-700"> 사건의 승패나 전략에 관한 판단은 변호사의 자문을 받으셔야 합니다.</b>
        법률구조가 필요하시면 대한법률구조공단(132)에서 무료 상담을 받을 수 있어요.
      </span>
    </p>
  )
}
