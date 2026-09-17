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

import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { Button, cx } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import ComplaintWizard from '../components/ComplaintWizard.jsx'
import BriefWizard from '../components/BriefWizard.jsx'
import EvidenceListBuilder from '../components/EvidenceListBuilder.jsx'
import PetitionWizard from '../components/PetitionWizard.jsx'
import CostCalculator from '../components/CostCalculator.jsx'
import TemplateViewer from '../components/TemplateViewer.jsx'
import { writingTips } from '../data/mock.js'
import { caseTitle } from '../lib/casebook.js'
import { boardRows, groupLabel } from '../lib/docboard.js'
import { checkDoc } from '../lib/docgate.js'
import { ArrowRight, Check, DocFolder } from '../components/icons.jsx'

import calcImg from '../assets/doc/calculator.png'
import guideImg from '../assets/doc/guidebook.png'
import magnifierImg from '../assets/doc/magnifier.png'
import laptopImg from '../assets/doc/laptop.png'

const wizards = {
  complaint: ComplaintWizard,
  brief: BriefWizard,
  evidence: EvidenceListBuilder,
  petition: PetitionWizard,
}

/** 목록은 손에 잡히는 만큼만 편다 — 나머지는 각자의 전체 화면에서 본다 */
const RECENT_LIMIT = 5

const timeOf = (v) => {
  const t = typeof v === 'number' ? v : new Date(v || 0).getTime()
  return Number.isFinite(t) ? t : 0
}

/** 생성일은 날짜만 보여준다 — 시각까지 적으면 열이 흔들린다 */
const ymd = (v) => {
  if (!v) return '—'
  if (typeof v === 'string') return v.slice(0, 10)
  const d = new Date(v)
  if (!Number.isFinite(d.getTime())) return '—'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 문서 제목 → 실제로 내려받는 파일 이름. 제목의 설명용 줄표는 파일명에서 뺀다 */
const fileName = (title) => {
  const clean = String(title || '문서').replace(/[—–]/g, ' ').trim().replace(/\s+/g, '_')
  return `${clean || '문서'}.pdf`
}

const DOC_TYPES = [
  { key: 'complaint', title: '소장', desc: '소송을 제기하기 위한 기본 문서' },
  { key: 'brief', title: '준비서면', desc: '주장과 증거를 정리한 문서' },
  { key: 'evidence', title: '증거목록', desc: '제출할 증거의 목록' },
  { key: 'petition', title: '신청서', desc: '법원에 제출하는 각종 신청서' },
]

export default function Documents() {
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { rawCases, setActiveCaseId } = useWorkspace()
  const [selected, setSelected] = useState(null)
  const [wizard, setWizard] = useState(null)
  const [wizardCaseId, setWizardCaseId] = useState(null)
  const [deferCaseLink, setDeferCaseLink] = useState(false)
  const [documentCaseId, setDocumentCaseId] = useState(null)
  const [pendingCaseId, setPendingCaseId] = useState(null)
  const [gate, setGate] = useState(null)      // 전제가 안 맞을 때 띄우는 안내
  const [pickCase, setPickCase] = useState(false)
  const [calc, setCalc] = useState(false)
  const [amount, setAmount] = useState('')
  const [template, setTemplate] = useState(false)
  const documentCase = documentCaseId
    ? rawCases.find((c) => c.id === documentCaseId) || null
    : null

  /** 문서를 열기 전에 전제를 확인한다 — 안 맞으면 막지 않고 알린다 */
  const openDoc = (kind, caseId = null) => {
    // 사건과 함께 여는 소장은 그 사건의 유형을 그대로 쓴다.
    // 사건 없이 구경하거나 시작한 소장만 유형을 고르고, 완성된 뒤 사건에 연결한다.
    const shouldDeferCaseLink = kind === 'complaint' && !caseId
    const g = checkDoc(kind, rawCases)
    if (g) { setGate({ ...g, kind, caseId, deferCaseLink: shouldDeferCaseLink }); return }
    setSelected(kind)
    setWizardCaseId(caseId)
    setDeferCaseLink(shouldDeferCaseLink)
    setWizard(kind)
  }

  const openFromDocumentHome = (kind) => {
    openDoc(kind, documentCase?.id || null)
  }

  const openCasePicker = () => {
    if (rawCases.length === 0) {
      toast('등록된 사건이 없어요. 사건 관리에서 먼저 사건을 등록해주세요.', 'error')
      return
    }
    setPendingCaseId(null)
    setPickCase(true)
  }

  const confirmCase = () => {
    if (!pendingCaseId) return
    setDocumentCaseId(pendingCaseId)
    setActiveCaseId(pendingCaseId)
    setPickCase(false)
    setPendingCaseId(null)
    setSelected(null)
  }

  useEffect(() => {
    const kind = location.state?.openDoc
    const caseId = location.state?.caseId
    if (kind !== 'complaint' || !caseId) return
    if (rawCases.some((c) => c.id === caseId)) {
      setDocumentCaseId(caseId)
      setActiveCaseId(caseId)
      setSelected(kind)
      setWizardCaseId(caseId)
      setDeferCaseLink(false)
      setWizard(kind)
    }
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.state, navigate, rawCases, setActiveCaseId])

  if (wizard) {
    const Wizard = wizards[wizard]
    const linkedCase = wizardCaseId ? rawCases.find((c) => c.id === wizardCaseId) || null : null
    return (
      <Wizard
        initialCase={linkedCase}
        deferCaseLink={deferCaseLink}
        onExit={() => {
          setWizard(null)
          setWizardCaseId(null)
          setDeferCaseLink(false)
          setSelected(null)
        }}
      />
    )
  }

  // 실제로 파일이 만들어진 문서 — 증거 업로드는 '생성'이 아니라 빼 둔다
  const created = boardRows(rawCases)
    .filter((r) => r.group !== 'evidence')
    .map((r) => ({ ...r, madeAt: r.latest?.createdAt || r.updatedAt || r.createdAt }))
    .sort((a, b) => timeOf(b.madeAt) - timeOf(a.madeAt))

  const TOOLS = [
    { key: 'calc', title: '소송 비용 계산기', desc: '청구 금액에 따른 인지대와 송달료를 자동으로 계산합니다.', img: calcImg, on: () => setCalc(true) },
    { key: 'guide', title: '소송 절차 안내', desc: '소장 제출 전 필수 준비사항과 체크리스트를 확인하세요.', img: guideImg, to: '/app/procedure' },
    { key: 'tpl', title: '템플릿 보기', desc: '각 문서 유형의 기본 템플릿을 미리 확인할 수 있습니다.', img: magnifierImg, on: () => setTemplate(true) },
    { key: 'ai', title: 'AI 맞춤 추천', desc: '현재 진행 중인 소송에 필요한 문서를 AI가 추천해드립니다.', img: laptopImg, on: () => { setSelected('brief'); openDoc('brief'); toast('지금 단계에서는 준비서면을 자주 작성합니다') } },
  ]

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* ── 제목 + 사건 기준 고르기 ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">법률 문서 작성 도우미</h1>
          <p className="text-base text-ink-500">필요한 정보를 입력하면 AI가 자동으로 법률 문서를 작성합니다</p>
        </div>

        <div className="flex min-h-11 items-center gap-4 self-start rounded-[10px] border border-ink-200 bg-white px-4 py-2 text-[13px]">
          {documentCase && (
            <span className="mr-1 min-w-0 border-r border-ink-200 pr-4">
              <span className="block max-w-52 truncate font-semibold leading-5 text-ink-700">{caseTitle(documentCase)}</span>
              <span className="block truncate text-[11px] leading-4 text-ink-400">{documentCase.caseNo || '사건번호 없음'}</span>
            </span>
          )}
          <button
            type="button"
            onClick={openCasePicker}
            className="font-semibold text-brand-500 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            {documentCase ? '사건 바꾸기' : '사건 선택하기'}
          </button>
          <span className="h-4 w-px bg-ink-200" />
          <button
            type="button"
            onClick={() => { setDocumentCaseId(null); setSelected(null) }}
            className="text-ink-300 hover:text-ink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            사건 없이 둘러보기
          </button>
        </div>
      </div>

      {/* 사건이 있으면 해당 유형으로 바로, 없으면 유형을 자유롭게 둘러본다.
          바깥 판은 실서비스 것을 따르고, 안의 카드 넉 장은 우리가 만든 것을 그대로 쓴다. */}
      <section data-guide="doc-types" className="rounded-[14px] bg-white p-6">
        <h2 className="text-lg font-bold text-ink-900">작성할 문서 유형을 선택하세요</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DOC_TYPES.map((d) => (
            <TypeCard
              key={d.key}
              d={d}
              on={selected === d.key}
              onClick={() => {
                setSelected(d.key)
                openFromDocumentHome(d.key)
              }}
            />
          ))}
        </div>
      </section>

      {/* ── 2. 만들기 전에 볼 것 ── */}
      <section data-guide="doc-tools" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TOOLS.map((t) => <ToolCard key={t.key} t={t} />)}
      </section>

      {/* ── 3. 지금까지 만든 것 ──
          최근 5건까지만 편다 — 사건이 늘면 이 자리가 화면을 다 먹고,
          정작 위의 "무엇을 만들 것인가"가 밀려나 보이지 않는다.
          전체는 증빙자료에서 제출 상태와 함께 본다.

          두 카드는 격자의 stretch로 같은 높이를 쓴다 — 아래 끝이 어긋나면
          섹션이 두 조각으로 읽힌다. 그래서 제목 크기·안쪽 여백도 맞춰 둔다. */}
      <div data-guide="doc-recent" className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_291px]">
        <RecentDocs rows={created.slice(0, RECENT_LIMIT)} total={created.length} />

        <section className="rounded-[14px] bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-ink-900">작성 팁</h2>
          <ul className="flex flex-col gap-3">
            {writingTips.map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm text-ink-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" />{t}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* 어느 사건의 문서인지 바꾼다 */}
      <Modal
        open={pickCase}
        onClose={() => { setPickCase(false); setPendingCaseId(null) }}
        maxW="max-w-[560px]"
        variant="casePicker"
        title="어느 사건인가요?"
        sub="고른 사건을 현재 작업 기준으로 사용합니다. 새 소장은 완성 후 따로 연결할 수 있어요."
        footer={<Button size="sm" disabled={!pendingCaseId} onClick={confirmCase}>확인</Button>}
      >
        <div className="space-y-2">
          {rawCases.map((c) => {
            const on = c.id === pendingCaseId
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => setPendingCaseId(c.id)}
                className={cx(
                  'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
                  on ? 'border-brand-300 bg-brand-50' : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold text-ink-900">{caseTitle(c)}</span>
                  <span className="block truncate text-[12px] text-ink-500">
                    {[c.caseNo || '사건번호 없음', c.form?.court].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-semibold text-brand-500">
                  {c.status?.replace(/\s/g, '') || '진행중'}
                </span>
                {on && <Check size={16} className="shrink-0 text-brand-400" aria-hidden="true" />}
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
              onClick={() => {
                const { kind, caseId, deferCaseLink: shouldDefer } = gate
                setGate(null)
                setWizardCaseId(caseId || null)
                setDeferCaseLink(!!shouldDefer)
                setWizard(kind)
              }}
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
                    if (a.pick) {
                      setSelected(a.pick)
                      setWizardCaseId(gate.caseId || null)
                      setDeferCaseLink(!!gate.deferCaseLink)
                      setWizard(a.pick)
                    }
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

      <CostCalculator open={calc} onClose={() => setCalc(false)} initialAmount={amount} />
      <TemplateViewer open={template} onClose={() => setTemplate(false)} />
    </div>
  )
}

/* ────────────────── 최근 생성 문서 ──────────────────
   Figma 「최근 생성 문서」(1972:41038) 그대로.

     카드   흰 면 · radius 14 · padding 24 · 제목과 표 사이 24
     제목   18 SemiBold grey900
     머리글 14 Medium grey600 · 문서명 / 유형 / 생성일
     줄     폴더 26×18 + gap 12 · 위아래 8 · 안쪽 글 14 Medium grey600 · 밑선 grey100

   머리글은 폴더 자리만큼 들여쓰지 않는다(피그마 그대로). 대신 두 격자의
   고정 열 폭을 같게 두어 「유형」·「생성일」이 정확히 같은 x에서 시작한다. */

const RECENT_COLS = 'grid-cols-[minmax(0,1fr)_84px_96px] sm:grid-cols-[minmax(0,1fr)_120px_120px]'

function RecentDocs({ rows, total }) {
  return (
    <section className="rounded-[14px] bg-white p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-ink-900">최근 생성 문서</h2>
        <Link to="/app/evidence" className="text-sm text-brand-400 hover:underline">
          {total > rows.length ? `전체 ${total}건 보기 →` : '완성된 문서 보기 →'}
        </Link>
      </div>

      <div className="flex flex-col">
        <div className={cx('grid items-center gap-4 border-b border-ink-100 pb-2 text-sm text-ink-400', RECENT_COLS)}>
          <span>문서명</span>
          <span>유형</span>
          <span>생성일</span>
        </div>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">아직 생성한 문서가 없어요.</p>
        ) : (
          <ul className="flex flex-col">
            {rows.map((r) => (
              <li key={r.key} className="border-b border-ink-50 last:border-b-0">
                <Link
                  to={`/app/evidence?case=${r.caseKey}`}
                  title={`${r.caseTitle} · ${r.title}`}
                  className={cx('grid items-center gap-4 py-3 text-sm transition-colors hover:bg-ink-50', RECENT_COLS)}
                >
                  <span className="flex min-w-0 items-center gap-2 truncate text-ink-800">
                    <DocFolder className="shrink-0" />
                    <span className="truncate">{fileName(r.title)}</span>
                  </span>
                  <span className="truncate text-ink-500">{groupLabel(r.group)}</span>
                  <span className="tabular-nums text-ink-400">{ymd(r.madeAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
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

function TypeCard({ d, on, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'group relative flex w-full flex-col items-start gap-1 overflow-hidden rounded-2xl border p-6 text-left transition-[background-color,border-color,transform] duration-200 active:scale-[0.995]',
        on ? 'border-brand-200 bg-brand-50' : 'border-ink-200 bg-ink-100 hover:border-brand-200 hover:bg-brand-50',
      )}
    >
      <span className={cx(
        'text-lg font-bold leading-7 transition-colors duration-200',
        on ? 'text-brand-400' : 'text-ink-700 group-hover:text-brand-400',
      )}>
        {d.title}
      </span>
      <span className={cx(
        'text-sm leading-5 transition-colors duration-200',
        on ? 'text-brand-300' : 'text-ink-500 group-hover:text-brand-300',
      )}>
        {d.desc}
      </span>

      {/* Figma는 완성 이미지를 교체하지 않는다. 종이 두 장과 하단 반투명 판이
          각각 움직이는 variant라서, 같은 레이어를 유지한 채 회전·이동·색만 보간한다. */}
      <span className="relative mt-6 block aspect-[248/255] w-full overflow-hidden" aria-hidden="true">
        <span
          className={cx(
            'absolute left-[27%] top-[7%] h-[76%] w-[66%] rounded-[8%] bg-[#c0cad7] transition-[left,top,transform] duration-300 ease-out',
            on ? 'left-[23%] top-[1%] rotate-[14.22deg]' : 'rotate-[5.54deg] group-hover:left-[23%] group-hover:top-[1%] group-hover:rotate-[14.22deg]',
          )}
        />
        <span
          className={cx(
            'absolute left-[10%] top-[6%] h-[76%] w-[66%] rounded-[8%] bg-white shadow-[0_0_22px_rgba(0,0,0,0.10)] transition-[left,top,transform] duration-300 ease-out',
            on ? 'left-[8%] top-[2%] -rotate-[7.28deg]' : '-rotate-[4.3deg] group-hover:left-[8%] group-hover:top-[2%] group-hover:-rotate-[7.28deg]',
          )}
        />
        <span
          className={cx(
            'absolute inset-x-0 bottom-0 h-[36.25%] rounded-b-[20px] transition-colors duration-300',
            on ? 'bg-[rgba(198,225,255,0.34)]' : 'bg-[rgba(242,244,246,0.68)] group-hover:bg-[rgba(198,225,255,0.34)]',
          )}
        />
      </span>
    </button>
  )
}

/* ────────────────── 도구 카드 ──────────────────
   Figma 카드 248×224. 사진마다 원본의 마스크 위치가 달라 같은 object-fit을 쓰지 않는다. */

const TOOL_IMAGE_CLASSES = {
  calc: '-right-[52px] top-[-34px] h-[279px] w-[279px]',
  guide: 'right-[14px] top-[-36px] h-[289px] w-[203px]',
  tpl: '-right-[48px] top-[-22px] h-[257px] w-[253px]',
  ai: '-right-[4px] top-[-24px] h-[257px] w-[194px]',
}

function ToolCard({ t }) {
  const Comp = t.to ? Link : 'button'
  return (
    <Comp
      {...(t.to ? { to: t.to } : { type: 'button', onClick: t.on })}
      className="group flex h-[224px] w-full flex-col justify-between gap-6 overflow-hidden rounded-2xl border border-ink-200 bg-white text-left transition-[background-color,border-color,transform] duration-200 hover:border-brand-200 hover:bg-brand-50 active:scale-[0.995]"
    >
      <span className="flex flex-col gap-1 px-6 pt-6">
        <span className="text-base font-bold leading-6 text-ink-700 transition-colors duration-200 group-hover:text-brand-400">{t.title}</span>
        <span className="text-sm leading-5 text-ink-500 transition-colors duration-200 group-hover:text-brand-300">{t.desc}</span>
      </span>
      <span className="relative block h-[120px] w-full shrink-0 overflow-hidden">
        <img
          src={t.img}
          alt=""
          aria-hidden
          className={cx('absolute max-w-none transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.02]', TOOL_IMAGE_CLASSES[t.key])}
        />
      </span>
    </Comp>
  )
}
