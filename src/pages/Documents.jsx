// 문서 생성 — Figma 「문서 생성 기본」 기준
//
// 화면은 세 덩이다.
//   1. 무엇을 만들 것인가   — 문서 유형 4개
//   2. 만들기 전에 볼 것    — 비용 계산기 · 가이드 · 템플릿 · AI 추천
//   3. 지금까지 만든 것     — 최근 생성 문서 + 작성 팁
//
// 문서마다 분기 축이 다르다. 그래서 하나의 공통 폼이 아니라 각자 전용 흐름을 탄다.
//   소장     — 사건 유형(청구원인)   → 자가진단 → 6단계 입력
//   준비서면 — 소송 진행 단계        → 상대방 주장 → 반박 포인트
//   증거목록 — 새 입력 없음          → 이미 모은 증거를 갑호증 표로 재구성
//   신청서   — 절차적 목적           → 유형별 입력

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { Card, Button, Badge, inputCls, cx } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import ComplaintWizard from '../components/ComplaintWizard.jsx'
import BriefWizard from '../components/BriefWizard.jsx'
import EvidenceListBuilder from '../components/EvidenceListBuilder.jsx'
import PetitionWizard from '../components/PetitionWizard.jsx'
import { recentDocs, writingTips } from '../data/mock.js'
import { caseDocs, caseTitle } from '../lib/casebook.js'
import { checkDoc } from '../lib/docgate.js'
import { stampFee, serviceFee, won, savedAgo, SERVICE_FEE_IS_ESTIMATE } from '../lib/complaint.js'
import { ArrowRight, FileText, AlertTriangle, Check } from '../components/icons.jsx'

import calcImg from '../assets/doc/calculator.png'
import guideImg from '../assets/doc/guidebook.png'
import magnifierImg from '../assets/doc/magnifier.png'
import laptopImg from '../assets/doc/laptop.png'
import doctypeImg from '../assets/doc/doctype.png'
import doctypeOnImg from '../assets/doc/doctype-on.png'

const wizards = {
  complaint: ComplaintWizard,
  brief: BriefWizard,
  evidence: EvidenceListBuilder,
  petition: PetitionWizard,
}

const DOC_TYPES = [
  { key: 'complaint', title: '소장', desc: '소송을 제기하기 위한 기본 문서', axis: '사건 유형으로 갈려요' },
  { key: 'brief', title: '준비서면', desc: '주장과 증거를 정리한 문서', axis: '소송 진행 단계로 갈려요' },
  { key: 'evidence', title: '증거목록', desc: '제출할 증거의 목록', axis: '이미 모은 증거를 재구성해요' },
  { key: 'petition', title: '신청서', desc: '법원에 제출하는 각종 신청서', axis: '절차적 목적으로 갈려요' },
]

export default function Documents() {
  const toast = useToast()
  const navigate = useNavigate()
  const { activeRaw, rawCases, setActiveCaseId } = useWorkspace()
  const [selected, setSelected] = useState(null)
  const [wizard, setWizard] = useState(null)
  const [gate, setGate] = useState(null)      // 전제가 안 맞을 때 띄우는 안내
  const [pickCase, setPickCase] = useState(false)
  const [calc, setCalc] = useState(false)
  const [amount, setAmount] = useState('')

  /** 문서를 열기 전에 전제를 확인한다 — 안 맞으면 막지 않고 알린다 */
  const openDoc = (kind) => {
    const g = checkDoc(kind, rawCases)
    if (g) { setGate({ ...g, kind }); return }
    setWizard(kind)
  }

  if (wizard) {
    const Wizard = wizards[wizard]
    return <Wizard onExit={() => { setWizard(null); setSelected(null) }} />
  }

  const fee = amount ? stampFee(Number(amount)) : 0
  const postage = amount ? serviceFee(2) : 0

  // 만들어 둔 문서가 있으면 그것을 보여주고, 없으면 예시로 화면을 채운다
  const mine = activeRaw ? caseDocs(activeRaw) : []
  const docs = mine.length
    ? mine.map((d) => ({ name: d.title, type: d.label, date: savedAgo(d.updatedAt) }))
    : recentDocs.map((d) => ({ ...d, sample: true }))

  const TOOLS = [
    { key: 'calc', title: '소송 비용 계산기', desc: '청구 금액에 따른 인지대와 송달료를 자동으로 계산합니다.', img: calcImg, on: () => setCalc(true) },
    { key: 'guide', title: '소장 비용 가이드', desc: '소장 제출 전 필수 준비사항과 체크리스트를 확인하세요.', img: guideImg, to: '/app/procedure' },
    { key: 'tpl', title: '템플릿 보기', desc: '각 문서 유형의 기본 템플릿을 미리 확인할 수 있습니다.', img: magnifierImg, on: () => toast('각 문서 유형의 기본 템플릿을 불러옵니다') },
    { key: 'ai', title: 'AI 맞춤 추천', desc: '현재 진행 중인 소송에 필요한 문서를 AI가 추천해드립니다.', img: laptopImg, on: () => { setSelected('brief'); openDoc('brief'); toast('지금 단계에서는 준비서면을 자주 작성합니다') } },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">법률 문서 작성 도우미</h1>
          <p className="mt-1 text-sm text-ink-500">필요한 정보를 입력하면 AI가 자동으로 법률 문서를 작성합니다</p>
        </div>

        {/* 문서는 반드시 어떤 사건에 붙는다. 어느 사건인지 안 보이면
            사건이 여러 건일 때 남의 사건 소장을 덮어쓴다. */}
        {activeRaw ? (
          <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-ink-200 bg-white px-4 py-2.5">
            <FileText size={15} className="shrink-0 text-brand-300" />
            <span className="text-[12px] text-ink-500">이 사건의 문서</span>
            <span className="text-[13px] font-bold text-ink-900">{caseTitle(activeRaw)}</span>
            <span className="text-[12px] text-ink-500">{activeRaw.caseNo || '사건번호 없음'}</span>
            {rawCases.length > 1 && (
              <button type="button" onClick={() => setPickCase(true)} className="text-[12px] font-semibold text-brand-500 hover:underline">
                사건 바꾸기
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5">
            <AlertTriangle size={15} className="shrink-0 text-brand-300" />
            <span className="text-[12.5px] text-brand-600">아직 사건이 없어요 — 문서를 만들면 새 사건이 함께 생깁니다</span>
            <Link to="/app/cases" className="text-[12px] font-semibold text-brand-600 hover:underline">사건 먼저 만들기</Link>
          </div>
        )}
      </div>

      {/* ── 1. 무엇을 만들 것인가 ── */}
      <Card className="p-6">
        <h2 className="text-[17px] font-bold text-ink-900">작성할 문서 유형을 선택하세요</h2>
        <div className="mt-5 grid justify-items-center gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {DOC_TYPES.map((d) => (
            <TypeCard
              key={d.key}
              d={d}
              on={selected === d.key}
              onClick={() => setSelected(d.key)}
              onOpen={() => openDoc(d.key)}
            />
          ))}
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          {selected && <span className="text-[13px] text-ink-500">{DOC_TYPES.find((d) => d.key === selected)?.axis}</span>}
          <Button disabled={!selected} onClick={() => openDoc(selected)}>다음 <ArrowRight size={16} /></Button>
        </div>
      </Card>

      {/* ── 2. 만들기 전에 볼 것 ── */}
      <div className="grid justify-items-center gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TOOLS.map((t) => <ToolCard key={t.key} t={t} />)}
      </div>

      {/* ── 3. 지금까지 만든 것 ── */}
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-bold text-ink-900">최근 생성 문서</h3>
            {docs[0]?.sample && <Badge tone="gray">예시</Badge>}
          </div>
          <table className="mt-4 w-full text-left">
            <thead>
              <tr className="border-b border-ink-200 text-[12px] text-ink-500">
                <th className="pb-2.5 font-medium">문서명</th>
                <th className="w-24 pb-2.5 font-medium">유형</th>
                <th className="w-28 pb-2.5 font-medium">생성일</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.name} className="border-b border-ink-100 last:border-0">
                  <td className="py-3">
                    <span className="flex items-center gap-2.5">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-300"><FileText size={14} /></span>
                      <span className="min-w-0 truncate text-[13px] text-ink-800">{d.name}</span>
                    </span>
                  </td>
                  <td className="py-3 text-[13px] text-ink-600">{d.type}</td>
                  <td className="py-3 text-[13px] tabular-nums text-ink-500">{d.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-6">
          <h3 className="text-[15px] font-bold text-ink-900">작성 팁</h3>
          <ul className="mt-4 space-y-3">
            {writingTips.map((t) => (
              <li key={t} className="flex gap-2 text-[13px] leading-relaxed text-ink-600">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-300" />{t}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* 어느 사건의 문서인지 바꾼다 */}
      <Modal
        open={pickCase}
        onClose={() => setPickCase(false)}
        maxW="max-w-md"
        title="어느 사건의 문서인가요?"
        sub="고른 사건에 이 문서가 붙습니다."
        footer={<Button variant="neutral" onClick={() => setPickCase(false)}>닫기</Button>}
      >
        <div className="space-y-2">
          {rawCases.map((c) => {
            const on = c.id === activeRaw?.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => { setActiveCaseId(c.id); setPickCase(false); toast(`「${caseTitle(c)}」 기준으로 봅니다`) }}
                className={cx(
                  'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                  on ? 'border-brand-300 bg-brand-50' : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold text-ink-900">{caseTitle(c)}</span>
                  <span className="block truncate text-[12px] text-ink-500">
                    {[c.caseNo || '사건번호 없음', c.form?.court, c.status].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {on && <Check size={16} className="shrink-0 text-brand-400" />}
              </button>
            )
          })}
        </div>
      </Modal>

      {/* 전제 안내 — 이 문서를 언제 쓰는 것인지 */}
      <Modal
        open={!!gate}
        onClose={() => setGate(null)}
        maxW="max-w-lg"
        title={gate?.title}
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => { const k = gate.kind; setGate(null); setWizard(k) }}
              className="text-[13px] font-semibold text-ink-500 underline underline-offset-2 hover:text-ink-700"
            >
              {gate?.proceed}
            </button>
            <div className="flex flex-wrap gap-2">
              {gate?.actions?.map((a) => (
                <Button
                  key={a.label}
                  onClick={() => {
                    setGate(null)
                    if (a.pick) { setSelected(a.pick); setWizard(a.pick) }
                    else if (a.to) navigate(a.to)
                  }}
                >
                  {a.label} <ArrowRight size={15} />
                </Button>
              ))}
            </div>
          </div>
        }
      >
        {gate && (
          <div className="space-y-4">
            <p className="text-[13px] leading-relaxed text-ink-600">
              {gate.why.split('**').map((part, i) => (i % 2 ? <b key={i} className="text-ink-800">{part}</b> : part))}
            </p>

            <div className="flex flex-wrap gap-2">
              {gate.facts.map(([k, v]) => (
                <span key={k} className="rounded-lg bg-ink-50 px-3 py-2 text-[12px] text-ink-600">
                  {k} <b className="ml-1 font-bold tabular-nums text-ink-800">{v}</b>
                </span>
              ))}
            </div>

            {/* 순서를 보여주면 "지금 내가 어디인지"가 바로 잡힌다 */}
            <div>
              <p className="text-[12px] font-bold text-ink-700">이 문서까지 가는 순서</p>
              <ol className="mt-2 space-y-1.5">
                {gate.order.map((step, i) => {
                  const last = i === gate.order.length - 1
                  return (
                    <li key={step} className="flex items-center gap-2 text-[13px]">
                      <span className={cx(
                        'grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                        last ? 'bg-brand-300 text-white' : 'bg-ink-100 text-ink-500',
                      )}>
                        {i + 1}
                      </span>
                      <span className={last ? 'font-semibold text-ink-800' : 'text-ink-600'}>{step}</span>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        )}
      </Modal>

      {/* 소송 비용 계산기 */}
      <Modal
        open={calc} onClose={() => setCalc(false)}
        title="소송 비용 계산기" sub="청구 금액을 입력하면 인지대와 송달료가 자동으로 계산됩니다."
        footer={<Button onClick={() => setCalc(false)}>확인</Button>}
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-ink-700">청구 금액</span>
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
            <div className="flex justify-between border-t border-brand-200 pt-2 text-sm">
              <span className="font-semibold text-ink-700">합계</span>
              <span className="font-bold text-brand-500">{won(fee + postage)}원</span>
            </div>
            {Number(amount) <= 30000000 && <p className="pt-1 text-xs text-brand-600">✓ 3천만원 이하 — 소액사건으로 간이 절차가 적용됩니다.</p>}
            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-400">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              참고용 계산이며 나홀로법에에서 결제하지 않습니다. 실제 납부는 법원 또는 전자소송포털에서 하시고,
              송달료는 사건 종류별 예납 회차·우편요금에 따라 달라지므로 접수 전에 확인하세요.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ────────────────── 문서 유형 카드 ──────────────────
   Figma 컴포넌트셋 「Component 2」의 두 variant를 그대로 옮긴다.

     속성1=카드      248×296 · bg grey100(#f2f4f6) · 선 grey200 · 제목 grey700 · 설명 grey500
     속성1=카드_호버 250×298 · bg blue50(#e8f3ff) · 선 blue200 · 제목 blue400 · 설명 blue300
     공통  radius 20 · paddingTop 8 · gap 8 · 본문 폭 205
           제목 24 SemiBold / 설명 15 Medium / 일러스트 248×219 하단 밀착

   일러스트도 variant마다 다른 그림이다(기본=회색, 호버=파랑). 두 장을 겹쳐 두고
   opacity로 바꾼다 — 넘길 때 깜빡이지 않는다. */

function TypeCard({ d, on, onClick, onOpen }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={onOpen}
      className={cx(
        // 높이를 Figma의 296으로 고정한다. 안 그러면 그리드가 형제 카드에 맞춰 늘이고,
        // 늘어난 만큼 텍스트와 일러스트가 벌어져 카드가 두 조각으로 보인다.
        'group flex h-[296px] w-full max-w-[248px] flex-col items-center gap-2 self-start overflow-hidden rounded-[20px] border pt-2 text-left transition-colors',
        on ? 'border-brand-200 bg-brand-50' : 'border-ink-200 bg-ink-100 hover:border-brand-200 hover:bg-brand-50',
      )}
    >
      <span className="w-[205px] max-w-full">
        <span className={cx(
          'block truncate text-[24px] font-semibold leading-tight transition-colors',
          on ? 'text-brand-400' : 'text-ink-700 group-hover:text-brand-400',
        )}>
          {d.title}
        </span>
        <span className={cx(
          'mt-1.5 block truncate text-[15px] font-medium leading-snug transition-colors',
          on ? 'text-brand-300' : 'text-ink-500 group-hover:text-brand-300',
        )}>
          {d.desc}
        </span>
      </span>

      {/* 일러스트는 텍스트 바로 아래에 붙는다 — 사이를 벌리지 않는다 */}
      <span className="relative block w-full">
        <img src={doctypeImg} alt="" aria-hidden
          className={cx('w-full transition-opacity duration-200', on ? 'opacity-0' : 'group-hover:opacity-0')} />
        <img src={doctypeOnImg} alt="" aria-hidden
          className={cx('absolute inset-0 w-full transition-opacity duration-200', on ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')} />
      </span>
    </button>
  )
}

/* ────────────────── 도구 카드 ──────────────────
   Figma 컴포넌트셋 「카드」의 두 variant 그대로.
     속성1=기본       248×224 · bg white · 선 grey200 · 제목 grey700 · 설명 grey500
     속성1=호버 및 클릭 bg blue50 · 선 blue200 · 제목 blue400 · 설명 blue300
     공통  radius 20 · paddingTop 20 · gap 10 · 본문 폭 200
           제목 18 SemiBold / 설명 12 Medium
           이미지칸 246×120 안에 194×209 사진을 x=72(=오른쪽으로 20 삐져나감)에 두고 잘라낸다 */

function ToolCard({ t }) {
  const Comp = t.to ? Link : 'button'
  return (
    <Comp
      {...(t.to ? { to: t.to } : { type: 'button', onClick: t.on })}
      className="group flex h-[224px] w-full max-w-[248px] flex-col items-center gap-[10px] self-start overflow-hidden rounded-[20px] border border-ink-200 bg-white pt-5 text-left transition-colors hover:border-brand-200 hover:bg-brand-50"
    >
      <span className="w-[200px] max-w-full">
        <span className="block text-[18px] font-semibold leading-tight text-ink-700 transition-colors group-hover:text-brand-400">{t.title}</span>
        <span className="mt-1 block text-[12px] font-medium leading-[1.55] text-ink-500 transition-colors group-hover:text-brand-300">{t.desc}</span>
      </span>
      <span className="relative mt-auto block h-[120px] w-full overflow-hidden">
        <img
          src={t.img}
          alt=""
          aria-hidden
          className="absolute -right-5 top-0 h-[209px] w-[194px] max-w-none object-contain"
        />
      </span>
    </Comp>
  )
}
