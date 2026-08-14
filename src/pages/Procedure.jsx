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
import { Card, Badge, Button, inputCls, cx } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { caseFlow, flowIndex, caseTasks, caseTitle } from '../lib/casebook.js'
import { stampFee, serviceFee, won, fmtDate, findType, completeness, savedAgo, SERVICE_FEE_IS_ESTIMATE } from '../lib/complaint.js'
import { Check, FileText, AlertTriangle, ArrowRight, ArrowLeft } from '../components/icons.jsx'

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
          {caseTitle(c)}
        </span>
        <span className="mt-0.5 block truncate text-[15px] font-medium text-ink-600">
          {[c.form?.court || '법원 미정', c.caseNo || '사건번호 없음'].join(' | ')}
        </span>
      </span>

      {/* 마지막 업데이트 — 포켓 안 @30,225 */}
      <span className="absolute bottom-[6%] left-[9.4%] text-[18px] font-medium text-ink-400">
        마지막 업데이트: {savedAgo(c.updatedAt)}
      </span>
    </button>
  )
}

/** Figma 「numbering」 — 곁정보 카드 세 장을 1·2·3으로 세어 준다 */
const StepNum = ({ n }) => (
  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-[13px] font-bold text-brand-300">
    {n}
  </span>
)

/**
 * 단계마다 걸리는 **법정 기한**.
 *
 * 우리는 법원 시스템을 조회할 수 없어서 송달일·기일을 알 수 없다. 대신
 * "무엇을 기준으로 며칠인지"를 알려 주고, 사용자가 기준일을 넣으면 계산해 준다.
 * 날짜를 아는 척하는 것보다 세는 법을 알려 주는 편이 정직하고 실제로 쓸모 있다.
 */
const DEADLINES = {
  file: [
    { key: 'fix', label: '보정명령 이행', base: '보정명령을 받은 날', days: 7, law: '법원이 정한 기간', who: '원고',
      note: '기간은 명령서에 적힌 것을 따르세요. 넘기면 소장이 각하될 수 있어요.' },
  ],
  trial: [
    { key: 'answer', label: '답변서 제출', base: '소장 부본을 송달받은 날', days: 30, law: '민사소송법 제256조 제1항', who: '피고',
      note: '피고가 30일 안에 답변서를 내지 않으면 변론 없이 판결이 날 수 있어요.' },
    { key: 'brief', label: '준비서면 제출', base: '변론기일', days: -7, law: '민사소송규칙 제69조의4', who: '양쪽',
      note: '상대방이 준비할 시간을 두고 미리 냅니다.' },
  ],
  judge: [
    { key: 'appeal', label: '항소', base: '판결서를 송달받은 날', days: 14, law: '민사소송법 제396조', who: '진 쪽',
      note: '2주가 지나면 판결이 확정돼 더는 다툴 수 없어요.' },
  ],
}

/** 단계마다 실제로 손에 들고 있어야 하는 것 */
const MATERIALS = {
  deal: ['계약서·차용증 등 원본', '이체내역·영수증', '문자·카톡 대화 기록'],
  notice: ['내용증명 3부 (상대방·우체국·본인)', '배달증명 영수증'],
  draft: ['당사자 인적사항 (주소·주민등록번호)', '갑호증으로 낼 자료', '인지대·송달료'],
  file: ['소장 정본 1부 + 부본 (피고 수만큼)', '증거 사본 (피고 수 + 1부)', '인지·송달료 납부 영수증'],
  trial: ['상대방 답변서·준비서면', '반박할 증거', '준비서면 (상대방 수 + 1부)'],
  judge: ['판결정본', '송달증명원·확정증명원', '(강제집행 시) 집행문'],
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
  // Figma 「소송절차안내」 시작 화면 — 사건이 있으면 어느 사건의 절차인지부터 고른다.
  // 절차의 **내용**은 사건마다 크게 다르지 않다. 다른 건 "지금 어디냐"뿐이다.
  // 그래서 사건이 없으면 문을 잠그지 않고, 아직 아무 칸도 지나지 않은 상태로
  // 일반 민사 소송 절차를 그대로 보여준다. 절차를 알아야 사건을 만들 마음이 든다.
  //   pick : 사건 고르기   ·   case : 고른 사건의 절차   ·   general : 사건 없는 기본 절차
  const [mode, setMode] = useState(() => (rawCases.length === 0 ? 'general' : 'pick'))
  const general = mode === 'general'
  const mine = !general && !!activeRaw

  const steps = mine ? caseFlow(activeRaw) : caseFlow(null)
  const cur = mine ? flowIndex(activeRaw) : 0

  const type = mine ? findType(activeRaw.typeKey) : null
  const pct = mine && type ? completeness(type, activeRaw.form || {}) : 0
  const tasks = mine ? caseTasks(activeRaw).filter((t) => !t.done) : []

  const [checklist, setChecklist] = useState(false)
  const [calc, setCalc] = useState(false)
  const [amount, setAmount] = useState('')
  const [checked, setChecked] = useState({})
  const [toast, setToast] = useState('')

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 1800) }
  const fee = amount ? stampFee(Number(amount)) : 0
  const postage = amount ? serviceFee(2) : 0



  if (mode === 'pick') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">소송 절차 안내</h1>
          <p className="mt-1 text-sm text-ink-500">소송 진행 단계를 한눈에 확인하고 다음 단계를 준비하세요</p>
        </div>
        <Card data-guide="procedure-pick" className="p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[17px] font-bold text-ink-900">현재 진행 중인 소송을 선택해주세요.</h2>
            {/* 사건을 고르지 않고도 절차 자체는 읽을 수 있어야 한다 */}
            <button
              type="button"
              onClick={() => setMode('general')}
              className="text-[13px] font-semibold text-brand-500 hover:underline"
            >
              사건 없이 기본 절차만 보기
            </button>
          </div>
          <div className="mt-5 grid justify-items-center gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {rawCases.map((c) => (
              <CasePick
                key={c.id}
                c={c}
                sum={myCases.find((m) => m.id === c.id)}
                onPick={() => { setActiveCaseId(c.id); setMode('case') }}
              />
            ))}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        {/* Figma: 제목 위 한 줄. 사건이 없으면 돌아갈 곳이 없으니 대신 무엇을 보고 있는지 밝힌다 */}
        {rawCases.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('pick')}
              className="flex items-center gap-1 text-[13px] font-medium text-ink-500 hover:text-brand-500"
            >
              <ArrowLeft size={16} /> 사건 다시 고르기
            </button>
            <span className="text-[13px] text-ink-400">
              {general ? '일반 민사 소송 절차' : caseTitle(activeRaw) || activeCase?.title}
            </span>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-[12px] font-semibold text-ink-600">
            일반 민사 소송 절차
          </span>
        )}

        <h1 className="mt-2 text-2xl font-bold text-ink-900">소송 절차 안내</h1>
        <p className="mt-1 text-sm text-ink-500">
          {general
            ? '등록된 사건이 없어도 괜찮아요. 민사 소송이 어떤 순서로 흘러가는지 먼저 보여드립니다.'
            : '지금 어느 단계에 있고, 그 단계에서 무엇을 해야 하는지 보여줍니다.'}
        </p>
      </div>

      {/* 사건이 없을 때만 — 지금 보는 것이 '내 절차'가 아니라는 걸 분명히 한다 */}
      {general && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
          <FileText size={16} className="shrink-0 text-brand-300" />
          <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink-700">
            아직 등록된 사건이 없어 <b className="font-bold">아무 단계도 지나지 않은 상태</b>로 보여드리고 있어요.
            사건을 만들면 지금 서 있는 칸과 남은 기한이 여기에 표시됩니다.
          </p>
          <Button as={Link} to="/app/documents" size="sm" className="shrink-0">소장 작성하러 가기 <ArrowRight size={14} /></Button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── 주인공: 세로 진행 단계 — 전 단계를 한 번에 본다 ── */}
        <Card data-guide="procedure-flow" className="p-6">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-[17px] font-bold text-ink-900">소송 진행 단계</h2>
            <span className="text-xs text-ink-400">지금 어디인지와 각 단계에서 할 일을 함께 봅니다</span>
          </div>

          <ol className="mt-5">
            {steps.map((s, i) => {
              const now = i === cur
              const g = GUIDE[s.key] || { desc: '', items: [] }
              const last = i === steps.length - 1
              return (
                <li key={s.key} className="relative flex gap-4 pb-7 last:pb-0">
                  {/* 점과 선 — 가로 스텝퍼와 같은 모양, 방향만 세로 */}
                  <span className="relative flex w-[15px] shrink-0 justify-center">
                    {!last && (
                      <span aria-hidden className={cx('absolute top-4 bottom-[-28px] w-1 rounded-full', i < cur ? 'bg-brand-300' : 'bg-ink-200')} />
                    )}
                    <span
                      className={cx(
                        'relative z-[1] mt-1 rounded-full',
                        // 앞 칸은 건너뛰었더라도 '지나온 것'이다 — 선과 점이 따로 놀면 안 된다
                        now ? 'step-now h-[15px] w-[15px] bg-brand-300'
                          : (s.done || i < cur) ? 'h-[11px] w-[11px] bg-brand-300' : 'h-[11px] w-[11px] bg-ink-300',
                      )}
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={cx('text-[15px] font-bold', now ? 'text-brand-500' : s.done ? 'text-ink-800' : 'text-ink-500')}>
                        {s.label}
                      </h3>
                      {s.optional && <span className="text-[10px] text-ink-400">선택</span>}
                      {now && <Badge tone="blue">지금은 여기!</Badge>}
                      {(s.done || i < cur) && !now && <Check size={13} className="text-brand-300" />}
                      <span className="text-[11px] tabular-nums text-ink-400">
                        {s.at ? fmtDate(s.at) : s.pct !== undefined && !s.done ? `${s.pct}%` : ''}
                      </span>
                    </div>

                    <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{g.desc}</p>

                    <ul className="mt-2 space-y-1">
                      {g.items.map((it) => (
                        <li key={it} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-700">
                          <span className={cx('mt-1.5 h-1 w-1 shrink-0 rounded-full', now ? 'bg-brand-300' : 'bg-ink-300')} />{it}
                        </li>
                      ))}
                    </ul>

                    {/* 못 채운 것은 지금 단계에만 붙인다 */}
                    {now && tasks.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-ink-500">아직 안 채운 것</span>
                        {tasks.map((t) => (
                          <Link
                            key={t.key} to={t.to}
                            className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[12px] text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
                          >
                            <span className="grid h-4 w-4 place-items-center rounded-full bg-ink-100 text-[10px] font-bold tabular-nums text-ink-600">{t.missing}</span>
                            {t.label}
                          </Link>
                        ))}
                      </div>
                    )}

                    {now && g.to && (
                      <Button as={Link} to={g.to} variant="soft" size="sm" className="mt-3">
                        이 단계 이어서 하기 <ArrowRight size={14} />
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </Card>

        {/* ── 곁정보 ── */}
        <div data-guide="procedure-side" className="space-y-5">
          <DeadlineCard step={steps[cur]} caseId={general ? null : activeRaw?.id} />
          <MaterialCard step={steps[cur]} />

          <Card data-guide="procedure-tools" className="p-5">
            <div className="flex items-center gap-2">
              <StepNum n={3} />
              <h3 className="text-[15px] font-bold text-ink-900">도구</h3>
            </div>
            <div className="mt-3 space-y-2">
              <Button size="sm" variant="neutral" className="w-full" onClick={() => setChecklist(true)}>소장 제출 전 체크리스트</Button>
              <Button size="sm" variant="neutral" className="w-full" onClick={() => setCalc(true)}>소송 비용 계산기</Button>
              <Button as={Link} to="/app/evidence" size="sm" variant="ghost" className="w-full">증빙자료 올리러 가기 <ArrowRight size={14} /></Button>
            </div>
          </Card>
        </div>
      </div>

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

/* ══════════════ 이 단계에서 챙길 기한 ══════════════
   전자소송포털과 연결되어 있지 않아 송달일·기일을 알 수 없다.
   그래서 날짜를 보여주는 대신 **세는 법**을 알려 주고, 기준일을 넣으면 계산한다. */

function DeadlineCard({ step, caseId }) {
  const { addTodo } = useWorkspace()
  const toast = useToast()
  const [base, setBase] = useState({})
  const items = DEADLINES[step?.key] || []

  const dueOf = (d) => {
    const from = base[d.key]
    if (!from) return null
    const t = new Date(from)
    t.setDate(t.getDate() + d.days)
    const iso = t.toISOString().slice(0, 10)
    const dday = Math.round((t - new Date(new Date().toISOString().slice(0, 10))) / 86400000)
    return { iso, dday }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <StepNum n={1} />
        <h3 className="text-[15px] font-bold text-ink-900">이 단계에서 챙길 기한</h3>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 rounded-xl bg-ink-50 p-4 text-center text-[12.5px] leading-relaxed text-ink-500">
          이 단계에는 법으로 정해진 기한이 없어요.<br />다만 청구권은 시효로 사라지니 미루지 마세요.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {items.map((d) => {
            const r = dueOf(d)
            return (
              <div key={d.key} className="rounded-xl border border-ink-200 p-3.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[13px] font-bold text-ink-800">{d.label}</span>
                  <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-600">{d.who}</span>
                </div>
                <p className="mt-1 text-[12px] text-ink-600">
                  {d.base}부터 <b className="font-bold text-brand-500">{Math.abs(d.days)}일 {d.days < 0 ? '전' : ''}</b>
                </p>
                <p className="mt-0.5 text-[11px] text-ink-400">{d.law}</p>
                {d.note && <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">{d.note}</p>}

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    aria-label={`${d.base} 입력`}
                    value={base[d.key] || ''}
                    onChange={(e) => setBase((b) => ({ ...b, [d.key]: e.target.value }))}
                    className="h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-[12px] text-ink-700 outline-none focus:border-brand-300"
                  />
                  {r && (
                    <>
                      <span className={cx('rounded-md px-2 py-1 text-[11px] font-bold tabular-nums', r.dday < 0 ? 'bg-red-50 text-red-500' : r.dday <= 3 ? 'bg-brand-50 text-brand-600' : 'bg-ink-100 text-ink-600')}>
                        {fmtDate(r.iso)} · {r.dday < 0 ? `D+${-r.dday}` : r.dday === 0 ? 'D-DAY' : `D-${r.dday}`}
                      </span>
                      {caseId && (
                        <button
                          type="button"
                          onClick={() => { addTodo(caseId, d.label, r.iso); toast('준비사항에 담았어요') }}
                          className="text-[12px] font-semibold text-brand-500 hover:underline"
                        >
                          준비사항에 담기
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-400">
        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
        송달일·기일은 법원이 정해 알려 줍니다. 저희가 조회할 수 없으니 통지서를 보고 직접 넣어 주세요.
      </p>
    </Card>
  )
}

/* ══════════════ 이 단계 준비물 ══════════════ */

function MaterialCard({ step }) {
  const items = MATERIALS[step?.key] || []
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <StepNum n={2} />
        <h3 className="text-[15px] font-bold text-ink-900">이 단계 준비물은?</h3>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((m) => (
          <li key={m} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-700">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-300" />{m}
          </li>
        ))}
      </ul>
    </Card>
  )
}
