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

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Badge, Button, inputCls, cx } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { caseFlow, flowIndex, caseTasks, caseTitle } from '../lib/casebook.js'
import { stageGuide, deadlineSpan } from '../lib/procedureGuide.js'
import { stampFee, serviceFee, won, fmtDate, findType, completeness, savedAgo, SERVICE_FEE_IS_ESTIMATE } from '../lib/complaint.js'
import { Check, FileText, AlertTriangle, ArrowRight, ArrowLeft, ChevronRight } from '../components/icons.jsx'

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
      className="group relative h-[284px] w-full max-w-[320px] self-start overflow-hidden rounded-[20px] border border-ink-200 bg-surface-sub text-left transition-colors hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
    >
      <img src="/figma/procedure/case-folder.svg" alt="" aria-hidden="true" className="pointer-events-none absolute left-[26px] top-[79px] h-[229px] w-[259px] max-w-none" />
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[105px] bg-[rgba(242,244,246,0.68)] backdrop-blur-[19px] transition-colors group-hover:bg-[rgba(198,225,255,0.34)]"
      />

      <span className="absolute left-5 right-5 top-5">
        <span className="block truncate text-[24px] font-semibold leading-snug text-ink-700 transition-colors group-hover:text-brand-400">
          {caseTitle(c)}
        </span>
        <span className="mt-0.5 block truncate text-[15px] font-medium text-ink-600">
          {[c.form?.court || '법원 미정', c.caseNo || '사건번호 없음'].join(' | ')}
        </span>
      </span>

      <span className="absolute bottom-[24px] left-[30px] text-[18px] font-medium leading-[1.6] tracking-[-0.36px] text-ink-400 transition-colors group-hover:text-brand-300">
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

export default function Procedure() {
  const { activeCase, activeRaw, rawCases, myCases, setActiveCaseId } = useWorkspace()
  // Figma 「소송절차안내」 시작 화면 — 사건이 있으면 어느 사건의 절차인지부터 고른다.
  // 절차의 **내용**은 사건마다 크게 다르지 않다. 다른 건 "지금 어디냐"뿐이다.
  // 그래서 사건이 없으면 문을 잠그지 않고, 아직 아무 칸도 지나지 않은 상태로
  // 일반 민사 소송 절차를 그대로 보여준다. 절차를 알아야 사건을 만들 마음이 든다.
  //   pick : 사건 고르기   ·   case : 고른 사건의 절차   ·   general : 사건 없는 기본 절차
  const [mode, setMode] = useState(() => (rawCases.length === 0 ? 'general' : 'pick'))
  const [pickPage, setPickPage] = useState(0)
  const pickPageCount = Math.max(1, Math.ceil(rawCases.length / 6))
  const safePickPage = Math.min(pickPage, pickPageCount - 1)
  const visiblePickCases = rawCases.slice(safePickPage * 6, safePickPage * 6 + 6)
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

  useEffect(() => {
    setPickPage((page) => Math.min(page, pickPageCount - 1))
  }, [pickPageCount])



  if (mode === 'pick') {
    return (
      <div className="mx-auto max-w-[1091px] space-y-6">
        <div>
          <h1 className="text-[30px] font-bold leading-[1.6] text-ink-900">소송 절차 안내</h1>
          <p className="text-[18px] font-medium leading-[1.4] tracking-[-0.36px] text-ink-700">소송 진행 단계를 한눈에 확인하고 다음 단계를 준비하세요</p>
        </div>
        <div data-guide="procedure-pick" className="rounded-[14px] bg-white py-6">
          <h2 className="px-6 text-[24px] font-bold leading-8 text-ink-900">현재 진행 중인 소송을 선택해주세요.</h2>

          <div
            role="region"
            aria-roledescription="캐러셀"
            aria-label="절차를 확인할 사건"
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') setPickPage((page) => Math.max(0, page - 1))
              if (event.key === 'ArrowRight') setPickPage((page) => Math.min(pickPageCount - 1, page + 1))
            }}
            className="mt-6 flex items-center gap-5"
          >
            <button
              type="button"
              onClick={() => setPickPage((page) => Math.max(0, page - 1))}
              disabled={safePickPage === 0}
              aria-label="이전 사건 목록"
              className="grid h-11 w-6 shrink-0 place-items-center text-ink-300 transition-colors hover:text-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={24} className="rotate-180" />
            </button>

            <ul aria-label={`${safePickPage + 1}페이지 사건 목록`} className="grid min-w-0 flex-1 gap-x-5 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
              {visiblePickCases.map((c) => (
                <li key={c.id} className="w-full max-w-[320px]">
                  <CasePick
                    c={c}
                    sum={myCases.find((m) => m.id === c.id)}
                    onPick={() => { setActiveCaseId(c.id); setMode('case') }}
                  />
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setPickPage((page) => Math.min(pickPageCount - 1, page + 1))}
              disabled={safePickPage >= pickPageCount - 1}
              aria-label="다음 사건 목록"
              className="grid h-11 w-6 shrink-0 place-items-center text-ink-300 transition-colors hover:text-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          <p className="sr-only" aria-live="polite">전체 {pickPageCount}페이지 중 {safePickPage + 1}페이지</p>
        </div>
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
              const g = stageGuide(mine ? activeRaw?.typeKey : '', s.key)
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
          <DeadlineCard step={steps[cur]} caseId={general ? null : activeRaw?.id} typeKey={mine ? activeRaw?.typeKey : ''} />
          <MaterialCard step={steps[cur]} typeKey={mine ? activeRaw?.typeKey : ''} />

          {/* 도구도 단계마다 다르다 — 분쟁이 막 생긴 사람에게 인지대 계산기는 아직 이르다 */}
          <Card data-guide="procedure-tools" className="p-5">
            <div className="flex items-center gap-2">
              <StepNum n={3} />
              <h3 className="text-[15px] font-bold text-ink-900">도구</h3>
            </div>
            <div className="mt-3 space-y-2">
              {stageGuide(mine ? activeRaw?.typeKey : '', steps[cur]?.key).tools.map((tool) => (
                tool.to
                  ? <Button key={tool.key} as={Link} to={tool.to} size="sm" variant="ghost" className="w-full">{tool.label} <ArrowRight size={14} /></Button>
                  : <Button key={tool.key} size="sm" variant="neutral" className="w-full" onClick={() => (tool.key === 'checklist' ? setChecklist(true) : setCalc(true))}>{tool.label}</Button>
              ))}
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

/** 날짜로 셀 수 있는 기한인가 — 「2기 연체」처럼 조건으로 정해지는 것은 못 센다 */
const countableDeadline = (d) => Number(d.years) > 0 || Number(d.weeks) > 0 || Number(d.days) !== 0

/** 기준일 + 기간 → 만료일과 D-day. 셀 수 없으면 null. */
function dueFrom(d, from) {
  if (!from || !countableDeadline(d)) return null
  const t = new Date(`${from}T12:00:00`)
  if (d.years) t.setFullYear(t.getFullYear() + d.years)
  else t.setDate(t.getDate() + (d.weeks ? d.weeks * 7 : d.days))
  const iso = t.toISOString().slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)
  const dday = Math.round((new Date(`${iso}T12:00:00`) - new Date(`${today}T12:00:00`)) / 86400000)
  return { iso, dday }
}

/**
 * 이 단계에서 챙길 기한.
 *
 * 기준일을 넣으면 그 자리에서 계산하고 **일정 관리에도 바로 넣는다.** 계산만 해 주고
 * 옮겨 적게 하면 그 사이에 잊는다 — 기한을 알려주는 화면이 기한을 놓치게 만드는 셈이다.
 * 되돌리고 싶으면 일정 관리에서 지우면 된다.
 */
function DeadlineCard({ step, caseId, typeKey }) {
  const { addTodo, removeTodo } = useWorkspace()
  const toast = useToast()
  const [base, setBase] = useState({})
  const [added, setAdded] = useState({})   // { [기한 key]: 만들어 둔 todo id }
  const items = stageGuide(typeKey, step?.key).deadlines

  const countable = countableDeadline
  const dueOf = (d) => dueFrom(d, base[d.key])


  /** 기준일을 고르면 계산하고, 그 결과를 사건 일정에 넣는다 */
  const onPickDate = (d, value) => {
    setBase((b) => ({ ...b, [d.key]: value }))
    if (!caseId) return

    // 같은 기한을 다시 고르면 앞서 넣은 것을 지우고 새로 넣는다 — 날짜만 바꿨는데
    // 일정이 두 줄로 남으면 어느 쪽이 맞는지 알 수 없다.
    if (added[d.key]) removeTodo(caseId, added[d.key])
    if (!value) { setAdded((a) => ({ ...a, [d.key]: null })); toast('일정에서 뺐어요'); return }

    const due = dueFrom(d, value)
    if (!due) return
    const saved = addTodo(caseId, d.label, due.iso, {
      typeKey: d.who === '원고' || d.who === '양쪽' ? 'filing' : 'prepare',
      remind: 3,
      source: 'procedure',
      basis: d.law,
    })
    const todo = saved?.todos?.[saved.todos.length - 1]
    setAdded((a) => ({ ...a, [d.key]: todo?.id || null }))
    toast(`「${d.label}」을 ${fmtDate(due.iso)} 일정으로 등록했어요`, 'success')
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
                  {d.base}부터 <b className="font-bold text-brand-500">{deadlineSpan(d)}</b>
                </p>
                <p className="mt-0.5 text-[11px] text-ink-400">{d.law}</p>
                {d.note && <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">{d.note}</p>}

                <div className={cx('mt-2.5 flex-wrap items-center gap-2', countable(d) ? 'flex' : 'hidden')}>
                  <input
                    type="date"
                    aria-label={`${d.base} 입력`}
                    value={base[d.key] || ''}
                    onChange={(e) => onPickDate(d, e.target.value)}
                    className="h-9 rounded-lg border border-ink-200 bg-white px-2.5 text-[12px] text-ink-700 outline-none focus:border-brand-300"
                  />
                  {r && (
                    <>
                      <span className={cx('rounded-md px-2 py-1 text-[11px] font-bold tabular-nums', r.dday < 0 ? 'bg-red-50 text-red-500' : r.dday <= 3 ? 'bg-brand-50 text-brand-600' : 'bg-ink-100 text-ink-600')}>
                        {fmtDate(r.iso)} · {r.dday < 0 ? `D+${-r.dday}` : r.dday === 0 ? 'D-DAY' : `D-${r.dday}`}
                      </span>
                      {caseId && added[d.key] && (
                        <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-500">
                          <Check size={12} /> 일정에 등록됨
                          <Link to="/app/schedule" className="ml-1 font-medium text-ink-400 underline hover:text-brand-500">보기</Link>
                        </span>
                      )}
                      {!caseId && (
                        <span className="text-[11.5px] text-ink-400">사건을 고르면 일정에도 자동으로 등록됩니다</span>
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

function MaterialCard({ step, typeKey }) {
  const items = stageGuide(typeKey, step?.key).materials
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
