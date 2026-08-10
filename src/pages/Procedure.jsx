// 소송 절차 안내
//
// 이 화면의 주인공은 **소송 진행 단계** 하나다.
// 예전에는 사건 배너가 두 번(CaseBar + 그라데이션 배너) 뜨고, 세로 타임라인이 길게
// 늘어졌고, 「접수하려면 N가지가 더 필요해요」가 또 따로 있었다. 셋 다 같은 말이었다.
//
// 그래서 이렇게 바꾼다.
//   · 사건 표시는 한 줄로 한 번만
//   · 진행 단계는 **가로 스텝퍼**로 크게 — 지금 칸은 빛이 번진다
//   · 못 채운 것은 별도 경고 카드가 아니라 **지금 단계 안의 할 일**로 들어간다
//
// 단계 정의는 사건관리와 같은 caseFlow를 쓴다. 한 앱에서 진행 단계가 두 종류면
// "내가 어디 있는 거지"를 두 번 묻게 된다.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Badge, Button, Progress, inputCls, cx } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import Stepper from '../components/Stepper.jsx'
import { procedureSchedule, submitDocs } from '../data/mock.js'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { caseFlow, flowIndex, caseTasks, caseEvidence, caseUpcoming } from '../lib/casebook.js'
import { stampFee, serviceFee, won, fmtDate, findType, completeness, savedAgo, SERVICE_FEE_IS_ESTIMATE } from '../lib/complaint.js'
import { Check, Circle, Calendar, Upload, FileText, AlertTriangle, ArrowRight } from '../components/icons.jsx'

/**
 * 사건 고르기 카드 — Figma 문서 유형 카드와 같은 컴포넌트를 쓴다.
 * 제목이 사건명, 부제가 「법원 | 사건번호」, 아래에 마지막 업데이트가 붙는다.
 */
function CasePick({ c, sum, onPick }) {
  const type = findType(c.typeKey)
  return (
    <button
      type="button"
      onClick={onPick}
      className="group relative aspect-[320/284] w-full max-w-[320px] self-start overflow-hidden rounded-[20px] border border-ink-200 bg-ink-100 text-left transition-colors hover:border-brand-200"
    >
      {/* 뒷장 — Rectangle 150 (164×194 @100,110) */}
      <span
        aria-hidden
        className="absolute rounded-[14px] bg-[#c0cad7]"
        style={{ left: '31.25%', top: '38.73%', width: '51.25%', height: '68.31%' }}
      />
      {/* 앞장 — Rectangle 149 (164×194 @58,112) + drop-shadow 21.7 / 10% */}
      <span
        aria-hidden
        className="absolute rounded-[14px] bg-white shadow-[0_0_22px_rgba(0,0,0,0.1)]"
        style={{ left: '18.13%', top: '39.44%', width: '51.25%', height: '68.31%' }}
      />
      {/* 포켓 — 320×90 @0,194 · #f2f4f6 68% + 유리 블러 19.5 */}
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 backdrop-blur-[19px]"
        style={{ height: '31.69%', background: 'rgba(242,244,246,0.68)' }}
      />

      {/* 제목·부제 — @25,14 */}
      <span className="absolute left-[7.8%] right-[7.8%] top-[4.9%]">
        <span className="block truncate text-[24px] font-semibold leading-snug text-ink-700 transition-colors group-hover:text-brand-400">
          {type ? `${type.title} 청구` : '작성 중인 사건'}
        </span>
        <span className="mt-0.5 block truncate text-[15px] font-medium text-ink-600">
          {[c.form?.court || '법원 미정', c.caseNo || '사건번호 없음'].join(' | ')}
        </span>
      </span>

      {/* 마지막 업데이트 — 포켓 안 @30,225 */}
      <span className="absolute bottom-[6%] left-[9.4%] text-[18px] font-normal text-ink-400">
        마지막 업데이트: {savedAgo(c.updatedAt)}
      </span>
    </button>
  )
}

/**
 * 단계마다 "무엇을 하는 때인가"와 "그때 할 일".
 * 사건 데이터에서 나오지 않는 절차 지식이라 여기 둔다.
 */
const GUIDE = {
  deal: {
    desc: '다툼이 생긴 시점이에요. 소송보다 먼저 자료를 모아 둡니다.',
    items: ['계약서·차용증·이체내역 모으기', '사실관계를 시간순으로 적어 두기'],
  },
  notice: {
    desc: '소송 전에 상대방에게 이행을 요구하는 단계예요. 꼭 거쳐야 하는 건 아닙니다.',
    items: ['내용증명 작성·발송', '배달증명 보관 (도달일이 지연손해금 기산점이 돼요)'],
  },
  draft: {
    desc: '청구취지·청구원인·증거를 갖춘 소장을 만드는 단계예요.',
    items: ['당사자·관할·청구금액 입력', '사실관계를 요건사실 순서로 정리', '갑호증 번호 매기고 입증취지 적기'],
    to: '/app/documents',
  },
  file: {
    desc: '관할 법원에 소장을 내고 사건번호를 받는 단계예요.',
    items: ['인지대·송달료 납부', '전자소송 입력 또는 종이 제출', '접수 후 사건번호를 사건관리에 적어 두기'],
    to: '/app/cases',
  },
  trial: {
    desc: '답변서와 준비서면이 오가는 단계예요.',
    items: ['상대방 답변서 검토', '준비서면으로 반박', '부족한 증거 보강'],
    to: '/app/documents',
  },
  judge: {
    desc: '선고를 받고, 확정되면 집행으로 이어집니다.',
    items: ['판결문 수령', '항소 여부 판단 — 송달 다음 날부터 2주', '확정 후 강제집행 신청'],
  },
}

export default function Procedure() {
  const { activeCase, activeRaw, rawCases, myCases, setActiveCaseId } = useWorkspace()
  // Figma 「소송절차안내」 시작 화면 — 어느 사건의 절차인지부터 고른다.
  // 절차는 사건마다 다르므로, 사건을 안 고른 채로 단계를 보여주면 남의 절차를 읽는 셈이다.
  const [chosen, setChosen] = useState(false)
  const mine = !!activeRaw

  const steps = mine ? caseFlow(activeRaw) : caseFlow(null)
  const cur = mine ? flowIndex(activeRaw) : 0
  const [pick, setPick] = useState(null)              // 눌러서 다른 단계를 볼 수도 있다
  const shown = pick ?? cur

  const type = mine ? findType(activeRaw.typeKey) : null
  const pct = mine && type ? completeness(type, activeRaw.form || {}) : 0
  const tasks = mine ? caseTasks(activeRaw).filter((t) => !t.done) : []
  const evidence = mine ? caseEvidence(activeRaw) : []
  const upcoming = mine ? caseUpcoming(activeRaw).slice(0, 3) : []

  const [upload, setUpload] = useState(false)
  const [checklist, setChecklist] = useState(false)
  const [calc, setCalc] = useState(false)
  const [amount, setAmount] = useState('')
  const [checked, setChecked] = useState({})
  const [toast, setToast] = useState('')

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 1800) }
  const fee = amount ? stampFee(Number(amount)) : 0
  const postage = amount ? serviceFee(2) : 0

  const docs = mine
    ? [
        { name: '소장', done: pct >= 60 },
        { name: '당사자 표시', done: !!(activeRaw.form?.pName && activeRaw.form?.dName) },
        { name: '증거자료', done: evidence.length > 0 },
        { name: '입증취지', done: evidence.length > 0 && evidence.every((e) => e.purpose) },
        { name: '서명 · 날인', done: !!activeRaw.form?.signature },
      ]
    : submitDocs
  const doneCount = docs.filter((d) => d.done).length

  const step = steps[shown]
  const guide = GUIDE[step?.key] || { desc: '', items: [] }
  const isNow = shown === cur

  if (!chosen && rawCases.length > 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">소송 절차 안내</h1>
          <p className="mt-1 text-sm text-ink-500">소송 진행 단계를 한눈에 확인하고 다음 단계를 준비하세요</p>
        </div>
        <Card className="p-6">
          <h2 className="text-[17px] font-bold text-ink-900">현재 진행 중인 소송을 선택해주세요.</h2>
          <div className="mt-5 grid justify-items-center gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {rawCases.map((c) => (
              <CasePick
                key={c.id}
                c={c}
                sum={myCases.find((m) => m.id === c.id)}
                onPick={() => { setActiveCaseId(c.id); setChosen(true) }}
              />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">소송 절차 안내</h1>
          <p className="mt-1 text-sm text-ink-500">지금 어느 단계에 있고, 그 단계에서 무엇을 해야 하는지 보여줍니다.</p>
        </div>
        {/* 사건 표시는 여기 한 줄뿐 — 아래에 배너를 또 두지 않는다 */}
        <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-ink-200 bg-white px-4 py-2.5">
          <FileText size={15} className="shrink-0 text-brand-300" />
          <span className="text-[13px] font-bold text-ink-900">
            {mine && type ? `${type.title} 청구` : activeCase?.title || '예시 사건'}
          </span>
          <span className="text-[12px] text-ink-500">{activeRaw?.caseNo || '사건번호 없음 (접수 전)'}</span>
          {!mine && <Badge tone="gray">예시</Badge>}
          <button type="button" onClick={() => setChosen(false)} className="text-[12px] font-semibold text-brand-500 hover:underline">사건 바꾸기</button>
        </div>
      </div>

      {/* ── 주인공: 가로 진행 스텝퍼 ── */}
      <Card className="px-6 pb-6 pt-7">
        <Stepper
          steps={steps.map((x) => ({
            ...x,
            note: x.at ? fmtDate(x.at) : x.pct !== undefined && !x.done ? `${x.pct}%` : '',
          }))}
          current={cur}
          picked={shown}
          onPick={setPick}
        />
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* ── 고른 단계에서 할 일 ── */}
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-bold text-ink-900">{step?.label}</h2>
            {isNow ? <Badge tone="blue">지금 여기</Badge> : step?.done ? <Badge tone="gray">지난 단계</Badge> : <Badge tone="gray">앞으로</Badge>}
            {!isNow && (
              <button type="button" onClick={() => setPick(null)} className="ml-auto text-[12px] font-semibold text-brand-500 hover:underline">
                지금 단계로
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{guide.desc}</p>

          <ul className="mt-4 space-y-2">
            {guide.items.map((it) => (
              <li key={it} className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" />{it}
              </li>
            ))}
          </ul>

          {/* 못 채운 것은 따로 경고하지 않고 이 단계의 할 일로 붙인다 */}
          {isNow && tasks.length > 0 && (
            <div className="mt-5 border-t border-ink-200 pt-4">
              <p className="text-[12px] font-bold text-ink-700">이 사건에서 아직 안 채운 것 <span className="text-red-500">{tasks.length}개</span></p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {tasks.map((t) => (
                  <Link
                    key={t.key} to={t.to}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[12px] text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
                  >
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-ink-100 text-[10px] font-bold tabular-nums text-ink-600">{t.missing}</span>
                    {t.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {guide.to && (
            <Button as={Link} to={guide.to} variant="soft" size="sm" className="mt-5">
              이 단계 이어서 하기 <ArrowRight size={14} />
            </Button>
          )}
        </Card>

        {/* ── 곁정보 ── */}
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-brand-300" />
              <h3 className="text-[13px] font-bold text-ink-900">예정된 일정</h3>
            </div>
            <div className="mt-3 space-y-2">
              {(upcoming.length ? upcoming : procedureSchedule).map((e) => (
                <div key={e.id || e.title} className="flex items-center gap-3 rounded-xl border border-ink-200 px-3 py-2.5">
                  {e.dday !== undefined && (
                    <span className={cx('shrink-0 rounded-md px-2 py-1 text-[11px] font-bold tabular-nums', e.dday < 0 ? 'bg-red-50 text-red-500' : e.dday <= 3 ? 'bg-brand-50 text-brand-600' : 'bg-ink-100 text-ink-600')}>
                      {e.dday < 0 ? `D+${-e.dday}` : e.dday === 0 ? 'D-DAY' : `D-${e.dday}`}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink-800">{e.text || e.title}</span>
                    <span className="block text-[11px] text-ink-400">{e.due ? fmtDate(e.due) : e.date}{e.place && ` · ${e.place}`}</span>
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-bold text-ink-900">제출 서류</h3>
              <span className="ml-auto text-[12px] font-bold tabular-nums text-ink-600">{doneCount}/{docs.length}</span>
            </div>
            <div className="mt-3"><Progress value={(doneCount / docs.length) * 100} /></div>
            <div className="mt-3 space-y-1">
              {docs.map((d) => (
                <div key={d.name} className="flex items-center justify-between py-1">
                  <span className={cx('text-[13px]', d.done ? 'text-ink-700' : 'text-ink-500')}>{d.name}</span>
                  {d.done ? <Check size={15} className="text-brand-300" /> : <Circle size={15} className="text-ink-300" />}
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => setUpload(true)}><Upload size={15} /> 업로드</Button>
              <Button size="sm" variant="neutral" className="flex-1" onClick={() => setChecklist(true)}>체크리스트</Button>
            </div>
          </Card>
        </div>
      </div>

      {/* upload */}
      <Modal
        open={upload} onClose={() => setUpload(false)}
        title="서류 업로드" sub={`${activeCase?.title || '사건'}에 대한 서류를 업로드합니다.`}
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
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs leading-relaxed text-red-500">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>서류는 법원 제출용 원본과 동일해야 합니다. 제출 기한을 반드시 확인하고, 서명·날인이 필요한 서류는 완료 후 업로드하세요.</span>
          </div>
        </div>
      </Modal>

      {/* checklist */}
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
                <button onClick={() => setChecked((c) => ({ ...c, [i]: !c[i] }))} className={cx('rounded-lg px-3 py-1.5 text-xs font-semibold', checked[i] ? 'bg-brand-50 text-brand-600' : 'bg-ink-100 text-ink-500')}>
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

      {/* calculator */}
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
          <div className="mt-4 space-y-2 rounded-xl bg-brand-50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-ink-600">예상 인지대 <span className="text-xs text-ink-400">민사소송등인지법 제2조</span></span>
              <span className="font-bold text-ink-800">{won(fee)}원</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-600">
                예상 송달료 <span className="text-xs text-ink-400">당사자 2명</span>
                {SERVICE_FEE_IS_ESTIMATE && <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">추정</span>}
              </span>
              <span className="font-bold text-ink-800">{won(postage)}원</span>
            </div>
            <div className="flex justify-between border-t border-brand-200 pt-2 text-sm"><span className="font-semibold text-ink-700">합계</span><span className="font-bold text-brand-500">{won(fee + postage)}원</span></div>
            {Number(amount) <= 30000000 && <p className="pt-1 text-xs text-brand-600">✓ 3천만원 이하 — 소액사건으로 간이 절차가 적용됩니다.</p>}
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
