import { useState } from 'react'
import { Card, Badge, Button, Progress, inputCls, cx } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import { procedureSteps as demoSteps, procedureSchedule, submitDocs, activeCase as demoCase } from '../data/mock.js'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { caseSteps, caseProgress, caseTodos, caseEvidence } from '../lib/casebook.js'
import CaseBar from '../components/CaseBar.jsx'
import { Link } from 'react-router-dom'
// 인지대·송달료는 소장 화면과 반드시 같은 식을 써야 한다.
// 여기서 따로 계산하면 같은 앱이 같은 금액에 두 답을 내놓는다.
import { stampFee, serviceFee, won, SERVICE_FEE_IS_ESTIMATE } from '../lib/complaint.js'
import { Check, Clock, Circle, Calendar, Upload, FileText, AlertTriangle } from '../components/icons.jsx'

const statusMeta = {
  done: { icon: Check, ring: 'bg-emerald-500 text-white', line: 'bg-emerald-300' },
  current: { icon: Clock, ring: 'bg-brand-400 text-white', line: 'bg-ink-200' },
  todo: { icon: Circle, ring: 'bg-ink-200 text-ink-400', line: 'bg-ink-200' },
}

export default function Procedure() {
  // 내가 만든 사건이면 그 사건의 실제 상태를 보여준다.
  // 아직 없으면 예시 사건으로 화면 구성을 보여주되, 예시임을 밝힌다.
  const { activeCase, activeRaw } = useWorkspace()
  const mine = !!activeRaw
  const steps = mine ? caseSteps(activeRaw) : demoSteps
  const todos = mine ? caseTodos(activeRaw) : []
  const evidence = mine ? caseEvidence(activeRaw) : []
  const banner = mine
    ? { ...activeCase, progress: caseProgress(activeRaw) }
    : { ...demoCase, title: demoCase.title, court: demoCase.court, caseNo: demoCase.id, status: '예시', progress: demoCase.progress }

  const [upload, setUpload] = useState(false)
  const [checklist, setChecklist] = useState(false)
  const [calc, setCalc] = useState(false)
  const [amount, setAmount] = useState('')
  const [checked, setChecked] = useState({})
  const [toast, setToast] = useState('')

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 1800) }
  const fee = amount ? stampFee(Number(amount)) : 0
  const postage = amount ? serviceFee(2) : 0

  // 제출 서류 체크도 실제 작성 상태를 따른다
  const docs = mine
    ? [
        { name: '소장', done: caseProgress(activeRaw) >= 60 },
        { name: '당사자 표시', done: !!(activeRaw.form?.pName && activeRaw.form?.dName) },
        { name: '증거자료', done: evidence.length > 0 },
        { name: '입증취지', done: evidence.length > 0 && evidence.every((e) => e.purpose) },
        { name: '서명 · 날인', done: !!activeRaw.form?.signature },
      ]
    : submitDocs
  const doneCount = docs.filter((d) => d.done).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">소송 절차 안내</h1>
        <p className="mt-1 text-sm text-ink-500">소송 진행 단계를 한눈에 확인하고 다음 단계를 준비하세요.</p>
      </div>

      <CaseBar />

      {/* case banner */}
      <Card className="border-brand-200 bg-gradient-to-r from-brand-500 to-brand-400 p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge className="bg-white/20 text-white">민사 소송</Badge>
            <h2 className="mt-2 text-lg font-bold">{banner.title}</h2>
            <p className="text-sm text-white/80">
              {[banner.court, banner.caseNo || '사건번호 없음 (접수 전)'].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="w-48">
            <div className="flex justify-between text-xs text-white/80"><span>진행률</span><span>{banner.progress}%</span></div>
            <div className="mt-1.5 h-2 rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${banner.progress}%` }} /></div>
          </div>
        </div>
      </Card>

      {/* 접수 전 사건은 '무엇을 더 채워야 하는가'가 곧 다음 단계다 */}
      {mine && todos.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
            <AlertTriangle size={16} /> 접수하려면 {todos.length}가지가 더 필요해요
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {todos.slice(0, 5).map((t, i) => (
              <li key={i}>
                <Link to={t.to} className="text-[13px] leading-relaxed text-amber-700 hover:underline">
                  · <b className="font-semibold">{t.title}</b>{t.desc && ` — ${t.desc}`}
                </Link>
              </li>
            ))}
          </ul>
          {todos.length > 5 && <p className="mt-2 text-xs text-amber-600">외 {todos.length - 5}건</p>}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* timeline */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-bold text-ink-900">소송 진행 단계</h3>
          <div className="mt-5">
            {steps.map((s, i) => {
              const m = statusMeta[s.status]
              const Icon = m.icon
              const last = i === steps.length - 1
              return (
                <div key={s.name} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full', m.ring)}><Icon size={18} /></span>
                    {!last && <span className={cx('my-1 w-0.5 flex-1', m.line)} />}
                  </div>
                  <div className={cx('flex-1 pb-7', last && 'pb-0')}>
                    <div className="flex flex-wrap items-center gap-2">
                      {s.to
                        ? <Link to={s.to} className={cx('font-bold hover:text-brand-500 hover:underline', s.status === 'todo' ? 'text-ink-500' : 'text-ink-900')}>{s.name}</Link>
                        : <h4 className={cx('font-bold', s.status === 'todo' ? 'text-ink-500' : 'text-ink-900')}>{s.name}</h4>}
                      {s.status === 'current' && <Badge tone="blue">진행 중</Badge>}
                      <span className="text-xs text-ink-400">{s.date}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-600">{s.desc}</p>
                    <ul className="mt-2 space-y-1">
                      {s.items.map((it) => <li key={it} className="flex items-center gap-1.5 text-[13px] text-ink-500">· {it}</li>)}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* right column */}
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center gap-2"><Calendar size={16} className="text-brand-400" /><h3 className="text-sm font-bold text-ink-900">예정된 일정</h3></div>
            <div className="mt-3 space-y-2">
              {procedureSchedule.map((e) => (
                <div key={e.title} className="rounded-xl border border-ink-100 p-3">
                  <p className="text-sm font-semibold text-ink-800">{e.title}</p>
                  <p className="text-xs text-ink-400">{e.date}{e.place && ` · ${e.place}`}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-900">제출 서류</h3>
              <span className="text-xs text-ink-400">{doneCount}/{docs.length}</span>
            </div>
            <div className="mt-3"><Progress value={(doneCount / docs.length) * 100} tone="green" /></div>
            <div className="mt-3 space-y-2">
              {docs.map((d) => (
                <div key={d.name} className="flex items-center justify-between rounded-lg px-1 py-1.5">
                  <span className="flex items-center gap-2 text-sm text-ink-700"><FileText size={15} className="text-ink-400" /> {d.name}</span>
                  {d.done ? <Check size={16} className="text-emerald-500" /> : <Circle size={16} className="text-ink-300" />}
                </div>
              ))}
            </div>
            <Button className="mt-3 w-full" onClick={() => setUpload(true)}><Upload size={16} /> 서류 업로드</Button>
            <Button variant="neutral" className="mt-2 w-full" onClick={() => setChecklist(true)}>제출 전 체크리스트</Button>
          </Card>
        </div>
      </div>

      {/* upload modal */}
      <Modal
        open={upload} onClose={() => setUpload(false)}
        title="서류 업로드" sub={`${activeCase.title}에 대한 서류를 업로드합니다.`}
        footer={<><Button variant="neutral" onClick={() => setUpload(false)}>취소</Button><Button onClick={() => { setUpload(false); flash('서류가 업로드되었습니다') }}>업로드</Button></>}
      >
        <div className="space-y-4">
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">서류 종류</span>
            <select className={inputCls}><option>준비서면</option><option>증거목록</option><option>소장</option><option>기타 신청서</option></select>
          </label>
          <div className="grid place-items-center rounded-xl border-2 border-dashed border-ink-200 bg-ink-50 py-10 text-center">
            <Upload className="text-ink-400" size={28} />
            <p className="mt-2 text-sm font-medium text-ink-600">파일을 드래그하거나 클릭하여 업로드</p>
            <p className="text-xs text-ink-400">PDF, DOCX (최대 10MB)</p>
          </div>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">제출 기한</span>
            <input type="date" className={inputCls} />
          </label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">메모 (선택)</span>
            <textarea rows={2} className={cx(inputCls, 'h-auto py-2.5')} placeholder="서류에 대한 추가 메모를 입력하세요" />
          </label>
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-700">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>서류는 법원 제출용 원본과 동일해야 합니다. 제출 기한을 반드시 확인하고, 서명·날인이 필요한 서류는 완료 후 업로드하세요.</span>
          </div>
        </div>
      </Modal>

      {/* checklist modal */}
      <Modal
        open={checklist} onClose={() => setChecklist(false)} maxW="max-w-2xl"
        title="소장 제출 전 필수 준비사항" sub="소송을 제기하기 위해 아래 항목들을 확인하고 준비하세요."
        footer={<><Button variant="ghost" onClick={() => { setChecklist(false); setCalc(true) }}>소송 비용 계산기 →</Button><Button onClick={() => setChecklist(false)}>완료</Button></>}
      >
        <div className="space-y-3">
          {[
            { t: '1. 필수 기재사항 작성', d: '소장에 반드시 포함되어야 하는 정보', items: ['당사자 정보 — 원고·피고의 성명·주소·주민등록번호·연락처', '청구취지 — 예: "피고는 원고에게 1,000만 원을 지급하라"', '청구원인 — 구체적인 사실관계와 주장', '관할 법원 — 소장을 접수할 법원 (예: 서울중앙지방법원)'] },
            { t: '2. 증거 및 첨부서류 준비', d: '주장을 뒷받침할 증거자료를 준비하세요', items: ['증거 자료 — 계약서, 차용증, 내용증명, 진단서, 사진 등', '입증방법 기재 — 갑 제1호증·제2호증 순으로 번호를 매겨 목록 작성', '부속 서류 — 기본증명서, 가족관계증명서, 주민등록초본 등'] },
            { t: '3. 소송 비용 준비', d: '청구 금액에 따른 비용을 계산하세요', items: ['인지대 및 송달료 — 소송 청구 금액(소가)에 따라 산정되는 비용'] },
          ].map((sec, i) => (
            <div key={i} className="rounded-xl border border-ink-200 p-4">
              <div className="flex items-center justify-between">
                <div><p className="font-bold text-ink-900">{sec.t}</p><p className="text-xs text-ink-500">{sec.d}</p></div>
                <button onClick={() => setChecked((c) => ({ ...c, [i]: !c[i] }))} className={cx('rounded-lg px-3 py-1.5 text-xs font-semibold', checked[i] ? 'bg-emerald-50 text-emerald-600' : 'bg-ink-100 text-ink-500')}>
                  {checked[i] ? '확인됨 ✓' : '확인'}
                </button>
              </div>
              <ul className="mt-3 space-y-2 border-t border-ink-100 pt-3">
                {sec.items.map((it) => <li key={it} className="text-[13px] leading-relaxed text-ink-600">• {it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Modal>

      {/* calculator modal */}
      <Modal
        open={calc} onClose={() => setCalc(false)}
        title="소송 비용 계산기" sub="청구 금액을 입력하면 인지대와 송달료가 자동으로 계산됩니다."
        footer={<><Button variant="neutral" onClick={() => { setCalc(false); setChecklist(true) }}>체크리스트로 돌아가기</Button><Button onClick={() => setCalc(false)}>확인</Button></>}
      >
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">청구 금액</span>
          <div className="relative">
            <input className={cx(inputCls, 'pr-10')} inputMode="numeric" placeholder="10000000" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-400">원</span>
          </div>
          <span className="mt-1 block text-xs text-ink-400">숫자만 입력하세요 (예: 1천만원 = 10000000)</span>
        </label>
        {amount && (
          <div className="mt-4 space-y-2 rounded-xl bg-brand-50/60 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-ink-600">예상 인지대 <span className="text-xs text-ink-400">민사소송등인지법 제2조</span></span>
              <span className="font-bold text-ink-800">{won(fee)}원</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-600">
                예상 송달료 <span className="text-xs text-ink-400">당사자 2명</span>
                {SERVICE_FEE_IS_ESTIMATE && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">추정</span>}
              </span>
              <span className="font-bold text-ink-800">{won(postage)}원</span>
            </div>
            <div className="flex justify-between border-t border-brand-200 pt-2 text-sm"><span className="font-semibold text-ink-700">합계</span><span className="font-bold text-brand-500">{won(fee + postage)}원</span></div>
            {Number(amount) <= 30000000 && <p className="pt-1 text-xs text-emerald-600">✓ 3천만원 이하 — 소액사건으로 간이 절차가 적용됩니다.</p>}
            <p className="text-[11px] leading-relaxed text-ink-400">
              * 참고용 계산이며 나홀로법에에서 결제하지 않습니다. 실제 납부는 법원 또는 전자소송포털에서 하시고,
              송달료는 사건 종류별 예납 회차·우편요금에 따라 달라지므로 접수 전에 확인하세요.
            </p>
          </div>
        )}
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>}
    </div>
  )
}
