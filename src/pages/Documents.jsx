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
import { Card, Button, cx } from '../components/ui.jsx'
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
import { ArrowRight, FileText, Check, DocFolder } from '../components/icons.jsx'

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
  { key: 'complaint', title: '소장', desc: '소송을 제기하기 위한 기본 문서', axis: '사건 유형으로 갈려요' },
  { key: 'brief', title: '준비서면', desc: '주장과 증거를 정리한 문서', axis: '소송 진행 단계로 갈려요' },
  { key: 'evidence', title: '증거목록', desc: '제출할 증거의 목록', axis: '이미 모은 증거를 재구성해요' },
  { key: 'petition', title: '신청서', desc: '법원에 제출하는 각종 신청서', axis: '절차적 목적으로 갈려요' },
]

export default function Documents() {
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { activeRaw, rawCases, setActiveCaseId } = useWorkspace()
  const [selected, setSelected] = useState(null)
  const [wizard, setWizard] = useState(null)
  const [wizardCaseId, setWizardCaseId] = useState(null)
  const [deferCaseLink, setDeferCaseLink] = useState(false)
  const [browseWithoutCase, setBrowseWithoutCase] = useState(false)
  const [gate, setGate] = useState(null)      // 전제가 안 맞을 때 띄우는 안내
  const [pickCase, setPickCase] = useState(false)
  const [calc, setCalc] = useState(false)
  const [amount, setAmount] = useState('')
  const [template, setTemplate] = useState(false)
  const complaintCase = browseWithoutCase ? null : activeRaw

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
    const linkedCaseId = kind === 'complaint' ? complaintCase?.id || null : null
    openDoc(kind, linkedCaseId)
  }

  useEffect(() => {
    const kind = location.state?.openDoc
    const caseId = location.state?.caseId
    if (kind !== 'complaint' || !caseId) return
    if (rawCases.some((c) => c.id === caseId)) {
      setBrowseWithoutCase(false)
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
    { key: 'guide', title: '소장 비용 가이드', desc: '소장 제출 전 필수 준비사항과 체크리스트를 확인하세요.', img: guideImg, to: '/app/procedure' },
    { key: 'tpl', title: '템플릿 보기', desc: '실제 서식으로 만든 소장·준비서면·증거목록 예시를 읽어봅니다.', img: magnifierImg, on: () => setTemplate(true) },
    { key: 'ai', title: 'AI 맞춤 추천', desc: '현재 진행 중인 소송에 필요한 문서를 AI가 추천해드립니다.', img: laptopImg, on: () => { setSelected('brief'); openDoc('brief'); toast('지금 단계에서는 준비서면을 자주 작성합니다') } },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">법률 문서 작성 도우미</h1>
          <p className="mt-1 text-sm text-ink-500">필요한 정보를 입력하면 AI가 자동으로 법률 문서를 작성합니다</p>
        </div>

        {activeRaw && !browseWithoutCase && (
          <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-ink-200 bg-white px-4 py-2.5">
            <FileText size={15} className="shrink-0 text-brand-300" />
            <span className="text-[12px] text-ink-500">현재 선택된 사건</span>
            <span className="text-[13px] font-bold text-ink-900">{caseTitle(activeRaw)}</span>
            <span className="text-[12px] text-ink-500">{activeRaw.caseNo || '사건번호 없음'}</span>
            {rawCases.length > 1 && (
              <button type="button" onClick={() => setPickCase(true)} className="text-[12px] font-semibold text-brand-500 hover:underline">
                사건 바꾸기
              </button>
            )}
            <button
              type="button"
              onClick={() => { setBrowseWithoutCase(true); setSelected(null) }}
              className="text-[12px] font-semibold text-ink-500 hover:text-brand-500 hover:underline"
            >
              사건 없이 소장 둘러보기
            </button>
          </div>
        )}

        {activeRaw && browseWithoutCase && (
          <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5">
            <FileText size={15} className="shrink-0 text-brand-400" />
            <span className="text-[12px] font-bold text-brand-600">사건 없이 소장 둘러보는 중</span>
            <span className="text-[12px] text-brand-500">소장 유형을 자유롭게 선택할 수 있어요.</span>
            <button
              type="button"
              onClick={() => { setBrowseWithoutCase(false); setSelected(null) }}
              className="text-[12px] font-semibold text-brand-600 underline underline-offset-2"
            >
              선택한 사건으로 돌아가기
            </button>
          </div>
        )}
      </div>

      {/* 사건이 있으면 해당 유형으로 바로, 없으면 유형을 자유롭게 둘러본다. */}
      <Card data-guide="doc-types" className="p-6">
        <h2 className="text-[17px] font-bold text-ink-900">작성할 문서 유형을 선택하세요</h2>
        <p className="mt-1 text-[13px] leading-5 text-ink-500">
          {complaintCase
            ? `소장을 선택하면 「${caseTitle(complaintCase)}」 사건에 맞는 유형으로 바로 시작해요.`
            : browseWithoutCase
              ? '사건에 연결하지 않고 전체 소장 유형과 작성 화면을 자유롭게 둘러볼 수 있어요.'
              : '아직 사건이 없어도 괜찮아요. 소장을 선택하면 유형별 작성 화면을 자유롭게 둘러볼 수 있어요.'}
        </p>
        <div className="mt-5 grid justify-items-center gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {DOC_TYPES.map((d) => (
            <TypeCard
              key={d.key}
              d={d}
              on={selected === d.key}
              onClick={() => setSelected(d.key)}
              onOpen={() => openFromDocumentHome(d.key)}
            />
          ))}
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          {selected && (
            <span className="text-[13px] text-ink-500">
              {selected === 'complaint' && complaintCase
                ? '선택된 사건 유형으로 바로 시작해요'
                : DOC_TYPES.find((d) => d.key === selected)?.axis}
            </span>
          )}
          <Button disabled={!selected} onClick={() => openFromDocumentHome(selected)}>다음 <ArrowRight size={16} /></Button>
        </div>
      </Card>

      {/* ── 2. 만들기 전에 볼 것 ── */}
      <div data-guide="doc-tools" className="grid justify-items-center gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TOOLS.map((t) => <ToolCard key={t.key} t={t} />)}
      </div>

      {/* ── 3. 지금까지 만든 것 ──
          최근 5건까지만 편다 — 사건이 늘면 이 자리가 화면을 다 먹고,
          정작 위의 "무엇을 만들 것인가"가 밀려나 보이지 않는다.
          전체는 증빙자료에서 제출 상태와 함께 본다.

          두 카드는 격자의 stretch로 같은 높이를 쓴다 — 아래 끝이 어긋나면
          섹션이 두 조각으로 읽힌다. 그래서 제목 크기·안쪽 여백도 맞춰 둔다. */}
      <div data-guide="doc-recent" className="grid items-stretch gap-5 lg:grid-cols-[1.2fr_1fr]">
        <RecentDocs rows={created.slice(0, RECENT_LIMIT)} total={created.length} />

        <Card className="flex flex-col p-6">
          <h3 className="text-[18px] font-semibold leading-7 text-ink-900">작성 팁</h3>
          <ul className="mt-6 space-y-3">
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
        sub="고른 사건을 현재 작업 기준으로 사용합니다. 새 소장은 완성 후 따로 연결할 수 있어요."
        footer={<Button variant="neutral" onClick={() => setPickCase(false)}>닫기</Button>}
      >
        <div className="space-y-2">
          {rawCases.map((c) => {
            const on = c.id === activeRaw?.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setBrowseWithoutCase(false)
                  setActiveCaseId(c.id)
                  setPickCase(false)
                  toast(`「${caseTitle(c)}」 기준으로 봅니다`)
                }}
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
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[18px] font-semibold leading-7 text-ink-900">최근 생성 문서</h3>
        <Button as={Link} to="/app/evidence" size="sm" variant="ghost">
          {total > rows.length ? `전체 ${total}건 보기` : '완성된 문서 보기'} <ArrowRight size={14} />
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="mt-6 grid place-items-center gap-2 rounded-xl bg-ink-50 py-10 text-center">
          <FileText size={26} className="text-ink-300" />
          <p className="text-[13px] font-medium text-ink-500">아직 만든 문서가 없습니다</p>
          <p className="text-xs text-ink-400">문서를 끝까지 작성하면 여기에 파일로 남습니다.</p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          <div className={cx('grid items-center text-[14px] font-medium leading-7 text-ink-600', RECENT_COLS)}>
            <span>문서명</span>
            <span>유형</span>
            <span>생성일</span>
          </div>
          <ul>
            {rows.map((r) => (
              <li key={r.key}>
                <Link
                  to={`/app/evidence?case=${r.caseKey}`}
                  title={`${r.caseTitle} · ${r.title}`}
                  className="flex items-center gap-3 border-b border-ink-100 py-2 transition-colors hover:bg-ink-50"
                >
                  <DocFolder className="shrink-0" />
                  <span className={cx('grid min-w-0 flex-1 items-center py-2 text-[14px] font-medium leading-5 text-ink-600', RECENT_COLS)}>
                    <span className="truncate pr-2">{fileName(r.title)}</span>
                    <span className="truncate pr-2">{groupLabel(r.group)}</span>
                    <span className="tabular-nums">{ymd(r.madeAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
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

      {/* 일러스트는 서류함이 카드 바닥에 닿는 그림이라 **아래를 기준으로 붙인다.**
          위에서부터 흘려 두면 카드의 고정 높이에 서류함 밑동이 잘려 그림이 끊겨 보인다
          (원본 248×247, 이 칸은 219 — 잘릴 26px은 그림 위쪽의 빈 여백이다). */}
      <span className="relative mt-auto block h-[219px] w-full overflow-hidden">
        <img src={doctypeImg} alt="" aria-hidden
          className={cx('absolute inset-x-0 bottom-0 w-full transition-opacity duration-200', on ? 'opacity-0' : 'group-hover:opacity-0')} />
        <img src={doctypeOnImg} alt="" aria-hidden
          className={cx('absolute inset-x-0 bottom-0 w-full transition-opacity duration-200', on ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')} />
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
      {/* 사진을 위에서부터 흘리면 120 칸에 걸려 물건이 한가운데서 반토막 난다.
          아래를 기준으로 붙이면 물건은 온전하고, 잘리는 것은 사진 위쪽 여백뿐이다.
          오른쪽으로 20 삐져나가는 것은 Figma 그대로 — 카드가 잘라낸다. */}
      <span className="relative mt-auto block h-[120px] w-full overflow-hidden">
        <img
          src={t.img}
          alt=""
          aria-hidden
          className="absolute -right-5 bottom-0 h-[136px] w-[136px] max-w-none object-contain"
        />
      </span>
    </Comp>
  )
}
