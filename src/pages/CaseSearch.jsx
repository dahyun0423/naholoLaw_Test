// 판례·법령 검색 — Figma 「판례 검색」 (2079:21487 ~ 2085:50990) 그대로
//
// 화면이 두 갈래인 이유:
//   「내 사건과 비슷한 판례」 — 내 사건을 기준으로 찾아 주는 쪽 (기본)
//   「키워드로 판례 검색」    — 사용자가 직접 찾는 쪽
//
// ── 내 사건 탭은 **분석을 준비하는 화면**이다 ─────────────────
// 1) 어떤 사건으로 분석할지 고르고 → 2) 무엇을 근거로 쓸지 확인하고 → 분석.
// 근거가 얼마나 모였는지를 「정확도」로 먼저 알려 준다. 결과부터 던지면
// 사용자는 그 숫자가 무엇으로 나왔는지 모른 채 믿게 된다.
//
// ── 이 화면에서 제일 조심할 것 ─────────────────────────────
// 판례 검색은 "이기겠네" 로 읽히기 쉽다. 숫자 옆에는 반드시 무엇을 세었고
// 무엇을 세지 않았는지를 붙인다. 승소 확률·재판 예측은 만들지 않는다.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cx } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import PrecedentPlanModal from '../components/PrecedentPlanModal.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { usePrecedentSubscription } from '../hooks/usePrecedentSubscription.js'
import { findType, completeness } from '../lib/complaint.js'
import { caseTitle, caseEvidence } from '../lib/casebook.js'
import { buildCaseSearchProfile, buildKeywordSearchProfile } from '../lib/legalSearchProfile.js'
import { precedentSessionId } from '../lib/precedentIdentity.js'
import {
  Search, Star, FileText, Copy, Gavel, TrendingUp, Check,
  HelpCircle, ChevronRight, ArrowRight, ExternalLink,
} from '../components/icons.jsx'

const TABS = ['내 사건과 비슷한 판례', '키워드로 판례 검색']
const CHIPS = ['전체', '민사', '대여금', '임대차']
const SUGGEST = ['대여금', '민사', '임대차']
const PER_PAGE = 5
const officialPrecedentUrl = (id) => `https://www.law.go.kr/LSW/precInfoP.do?precSeq=${encodeURIComponent(id)}`

/* Figma 변수에 없는 단 하나의 색 — 관련성·정확도 보통에 쓰이는 yellow500 */
const YELLOW = '#ffc342'
const YELLOW_BG = '#fff9e7'

/** 관련성은 점수가 아니라 세 칸이다 — 89.4% 같은 숫자는 정밀해 보여서 더 위험하다 */
const relLabel = (n) => (n >= 90 ? '높음' : n >= 75 ? '보통' : '낮음')

export default function CaseSearch() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const precedentBilling = usePrecedentSubscription()
  const {
    activeRaw, rawCases, setActiveCaseId,
    savedNos, toggleSave, citedNos, addCitation, removeCitation, savedList, citedList, registerPrecedents,
  } = useWorkspace()

  const [tab, setTab] = useState(TABS[0])

  /* ── 내 사건 탭 ── */
  // select : 사건을 고르는 중        confirm : 근거를 확인하는 중
  // loading: 분석 중                 done    : 결과
  const [phase, setPhase] = useState('select')
  const [picked, setPicked] = useState(null)     // 사건 id · 또는 'free' (직접 입력)
  const [free, setFree] = useState('')           // 사건 없이 적은 상황
  const [context, setContext] = useState('')     // 맥락 추가
  const [similar, setSimilar] = useState([])
  const [searchMeta, setSearchMeta] = useState(null)
  const [searchError, setSearchError] = useState('')

  /* ── 키워드 탭 ── */
  const [query, setQuery] = useState('')
  const [sent, setSent] = useState('')
  const [chip, setChip] = useState('전체')
  const [page, setPage] = useState(1)
  const [keywordResults, setKeywordResults] = useState([])
  const [keywordLoading, setKeywordLoading] = useState(false)

  const [view, setView] = useState('results')    // results | saved
  const [citeOpen, setCiteOpen] = useState(false)
  const [premiumOpen, setPremiumOpen] = useState(false)

  const pickedCase = picked && picked !== 'free' ? rawCases.find((c) => c.id === picked) : null

  /* 분석에 쓸 수 있는 근거 — 사건에서 실제로 읽어 온다. 없으면 없다고 적는다. */
  const sources = useMemo(() => {
    const c = pickedCase
    const form = c?.form || {}
    const type = c ? findType(c.typeKey) : null
    const pct = c && type ? completeness(type, form) : 0
    const ev = c ? caseEvidence(c) : []
    const briefs = (c?.docs || []).filter((d) => d.kind === 'brief').length
    return [
      {
        key: 'basic', label: '사건 기본 정보',
        on: !!(form.pName || form.dName || form.amount || form.court),
        onDesc: '유형·청구금액·상대방 자동 반영',
        to: '/app/cases',
      },
      {
        key: 'complaint', label: '소장',
        on: pct > 0,
        onDesc: c ? `${caseTitle(c)}_소장 내용 자동 반영` : '',
        to: '/app/documents',
      },
      {
        key: 'evidence', label: '증거·준비서면',
        on: ev.length > 0 || briefs > 0,
        onDesc: `증거 ${ev.length}건${briefs ? `·준비서면 ${briefs}차` : ''} 자동 반영됨`,
        to: '/app/evidence',
      },
    ]
  }, [pickedCase])

  const filled = sources.filter((s) => s.on).length
  const accuracy = filled >= 3 ? '높음' : filled === 2 ? '보통' : '낮음'

  /* 결과 목록 ─────────────────────────────────────────────── */

  const searched = sent.trim() ? keywordResults : null

  const isPremium = precedentBilling.subscription.planId === 'premium'
  const visibleSimilar = isPremium ? similar : similar.slice(0, 5)
  const list = tab === TABS[0]
    ? (view === 'saved' ? savedList : (phase === 'done' ? visibleSimilar : []))
    : (view === 'saved' ? savedList : (searched || []))
  const totalSimilarCount = Math.max(similar.length, Number(searchMeta?.totalCandidates) || 0)
  const hasLockedSimilar = tab === TABS[0] && view === 'results' && phase === 'done' && !isPremium && totalSimilarCount > 5

  const pageCount = Math.max(1, Math.ceil(list.length / PER_PAGE))
  const paged = tab === TABS[1] && view === 'results' ? list.slice((page - 1) * PER_PAGE, page * PER_PAGE) : list

  useEffect(() => { setPage(1) }, [sent, chip, view, tab])
  useEffect(() => { setView('results') }, [tab])
  useEffect(() => {
    if (!precedentBilling.notice) return
    toast(precedentBilling.notice, 'success')
    precedentBilling.clearNotice()
  }, [precedentBilling.notice, toast])

  /* 동작 ─────────────────────────────────────────────────── */

  const requestPrecedents = async (profile) => {
    const response = await fetch('/api/legal/similar-precedents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...profile, precedentSessionId: precedentSessionId() }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || '공개 판례를 조회하지 못했습니다.')
    return data
  }

  const analyze = async () => {
    setPhase('loading')
    setSearchError('')
    try {
      const data = await requestPrecedents(pickedCase
        ? buildCaseSearchProfile(pickedCase, context)
        : buildKeywordSearchProfile(`${free} ${context}`))
      setSimilar(data.items || [])
      setSearchMeta(data)
      setPhase('done')
    } catch (error) {
      setSearchError(error?.message || '공개 판례를 조회하지 못했습니다.')
      setPhase('error')
    }
  }

  const searchKeywords = async (value = query, filterChip = chip) => {
    const clean = String(value || '').trim()
    if (!clean) return
    setSent(clean)
    setView('results')
    setKeywordLoading(true)
    setSearchError('')
    try {
      const data = await requestPrecedents(buildKeywordSearchProfile(clean, filterChip))
      setKeywordResults(data.items || [])
      setSearchMeta(data)
    } catch (error) {
      setKeywordResults([])
      setSearchError(error?.message || '공개 판례를 조회하지 못했습니다.')
    } finally {
      setKeywordLoading(false)
    }
  }

  const onCite = (p) => {
    if (!activeRaw) { toast('먼저 사건을 만들어 주세요 — 인용은 사건별로 담깁니다', 'error'); return }
    if (citedNos.includes(p.no)) { toast('이미 인용목록에 있습니다'); return }
    registerPrecedents([p])
    addCitation(p.no, p.title)
    toast('인용 목록에 담았습니다.', 'success')
  }
  const onSave = (p) => {
    const was = savedNos.includes(p.no)
    toggleSave(p)
    toast(was ? '저장을 취소했습니다' : '저장한 판례에 추가했습니다', was ? 'default' : 'success')
  }
  const onCopy = (p) => {
    navigator.clipboard?.writeText(`${p.title} (${p.court} ${p.no}, ${p.date})\n참고 내용: ${p.point}`).catch(() => {})
    toast('클립보드에 복사했습니다', 'success')
  }

  const analyzed = tab === TABS[0] && ['loading', 'done', 'error'].includes(phase)
  const basisLabel = pickedCase
    ? `${caseTitle(pickedCase)}${pickedCase.caseNo ? ` · ${pickedCase.caseNo}` : ''}`
    : '직접 입력한 상황'

  return (
    <div>
      {/* ── 제목 ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold leading-tight text-ink-900">판례·법령 검색</h1>
          <p className="mt-2 flex flex-wrap gap-x-2.5 text-[15px] text-ink-500">
            <span>소송 진행 단계를 한눈에 확인하고 다음 단계를 준비하세요</span>
            <span>국가법령정보센터의 공개 판례를 사건 쟁점에 맞춰 찾아드립니다</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPremiumOpen(true)}
          className="rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-left transition-colors hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          <span className="block text-[11px] font-semibold text-ink-400">판례검색 이용권</span>
          <span className="mt-0.5 block text-[13px] font-bold text-ink-800">
            {precedentBilling.checking ? '확인 중' : isPremium ? '프리미엄 · 전체 결과' : '기본 · 유사 판례 5건'}
          </span>
        </button>
      </div>

      {/* ── 탭 ── */}
      <div className="mt-6 flex items-end">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cx(
              'relative h-[50px] rounded-t-[14px] px-8 text-[16px] font-semibold transition-colors',
              tab === t
                ? 'z-[1] bg-white text-ink-900'
                : '-ml-3 bg-ink-200 pl-11 text-ink-500 hover:text-ink-700',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── 본문 판 ── */}
      <div className={cx('rounded-2xl bg-white p-6', tab === TABS[0] && 'rounded-tl-none')}>
        {/* 키워드 탭 — 검색바 */}
        {tab === TABS[1] && (
          <div className="mb-6 rounded-2xl border border-ink-200 p-5">
            <form
              onSubmit={(e) => { e.preventDefault(); searchKeywords() }}
              className="flex items-center gap-2.5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-ink-200 px-3.5 py-3">
                <Search size={18} className="shrink-0 text-ink-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="키워드나 사건 내용을 입력하세요 (예: 임대차 보증금 반환 거부, 동시이행)"
                  className="min-w-0 flex-1 bg-transparent text-[16px] text-ink-700 outline-none placeholder:text-ink-400"
                />
              </div>
              <button type="submit" disabled={keywordLoading} className="shrink-0 rounded-lg bg-brand-300 px-5 py-3 text-[14px] font-semibold text-ink-50 transition-colors hover:bg-brand-400 disabled:opacity-50">
                {keywordLoading ? '검색 중' : '검색'}
              </button>
            </form>
            <div className="mt-3.5 flex flex-wrap gap-2">
              {CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setChip(c); if (sent) searchKeywords(sent, c) }}
                  className={cx(
                    'rounded-full px-4 py-2 text-[12px] font-semibold transition-colors',
                    chip === c ? 'bg-brand-300 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-400">공개 판례 검색으로 전송됩니다. 이름·주소·주민등록번호 같은 개인정보는 입력하지 마세요.</p>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,643fr)_380px]">
          {/* ═══ 왼쪽 ═══ */}
          <div className="min-w-0 space-y-4">
            {tab === TABS[0] && !analyzed && (
              <>
                <SelectCaseCard
                  cases={rawCases}
                  picked={picked}
                  onPick={(id) => { setPicked(id); setActiveCaseId(id) }}
                  onDone={() => setPhase('confirm')}
                  free={free}
                  onFree={setFree}
                  onFreeAnalyze={() => { setPicked('free'); analyze() }}
                  onCreate={() => navigate('/app/documents')}
                  confirmed={phase === 'confirm'}
                />

                {phase === 'confirm' && (
                  <InfoCard
                    sources={sources}
                    accuracy={accuracy}
                    context={context}
                    onContext={setContext}
                    onGo={(to) => navigate(to)}
                    onAnalyze={analyze}
                  />
                )}

                <EmptyBoard
                  title={phase === 'confirm' ? '아직 분석 전이에요' : '사건을 선택하면 관련 판례와 통계를 보여드려요'}
                  sub={phase === 'confirm'
                    ? <>위 정보를 확인하고 [이 정보로 유사 판례 분석]을 누르면<br />관련 판례와 통계가 여기에 표시됩니다.</>
                    : '위에서 분석할 사건을 고르고 [이 사건과 유사한 판례 분석] 버튼을 눌러보세요.'}
                />
              </>
            )}

            {analyzed && (
              <BasisBar
                label={basisLabel}
                onChange={() => { setPhase('select'); setPicked(null); setView('results') }}
              />
            )}

            {tab === TABS[0] && phase === 'loading' && <Analyzing />}
            {tab === TABS[0] && phase === 'error' && <SearchError message={searchError} onRetry={analyze} />}
            {tab === TABS[1] && keywordLoading && <Analyzing />}
            {tab === TABS[1] && !keywordLoading && searchError && <SearchError message={searchError} onRetry={() => searchKeywords(sent)} />}

            {((tab === TABS[0] && phase === 'done') || (tab === TABS[1] && !keywordLoading)) && (
              <>
                <ResultsHeader
                  title={tab === TABS[0]
                    ? (view === 'saved' ? '저장된 판례' : '내 사건과 유사한 판례')
                    : (view === 'saved' ? '저장된 판례' : '관련 판례')}
                  count={list.length}
                  view={view}
                  onView={setView}
                  savedCount={savedNos.length}
                  citedCount={citedNos.length}
                  onCite={() => setCiteOpen(true)}
                />

                {paged.length === 0 ? (
                  <EmptyList
                    view={view}
                    searched={tab === TABS[1] && searched !== null}
                    onSuggest={(s) => { setQuery(s); searchKeywords(s) }}
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    {paged.map((p) => (
                      <PrecedentCard
                        key={p.no}
                        p={p}
                        cited={citedNos.includes(p.no)}
                        saved={savedNos.includes(p.no)}
                        onCite={onCite} onCopy={onCopy} onSave={onSave}
                      />
                    ))}
                  </div>
                )}

                {hasLockedSimilar && (
                  <PremiumResultsGate total={totalSimilarCount} onOpen={() => setPremiumOpen(true)} />
                )}

                {tab === TABS[1] && view === 'results' && list.length > PER_PAGE && (
                  <Pager page={page} count={pageCount} onPage={setPage} />
                )}
              </>
            )}
          </div>

          {/* ═══ 오른쪽 ═══ */}
          <div className="space-y-5">
            {tab === TABS[0] && (phase === 'done' ? <SearchSummary meta={searchMeta} count={similar.length} /> : <StatsPlaceholder />)}
            <LawsCard laws={searchMeta?.relatedLaws || []} show={(tab === TABS[0] && phase === 'done') || (tab === TABS[1] && !!sent)} />
            {tab === TABS[1] && <SearchNotice />}
            <AboutCard />
          </div>
        </div>
      </div>

      {/* ── 내 인용 목록 ── */}
      <Modal
        open={citeOpen} onClose={() => setCiteOpen(false)} maxW="max-w-[560px]"
        title={`내 인용 목록 (${citedList.length})`}
        sub="문서 생성 시 청구원인·준비서면에 자동으로 반영됩니다."
        footer={
          <button
            disabled={citedList.length === 0}
            onClick={() => { setCiteOpen(false); navigate('/app/documents') }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-300 px-5 py-3 text-[14px] font-semibold text-ink-50 disabled:opacity-50"
          >
            문서 생성으로 보내기 <ArrowRight size={16} />
          </button>
        }
      >
        {citedList.length === 0 ? (
          <div className="grid place-items-center gap-2 py-8 text-center">
            <FileText size={32} className="text-ink-300" />
            <p className="text-[14px] leading-relaxed text-ink-400">
              아직 인용한 판례가 없습니다.<br />판례 카드의 [내 문서에 인용]을 눌러 담아보세요.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {citedList.map((p) => (
              <div key={p.no} className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-ink-700">{p.title}</p>
                  <p className="mt-0.5 truncate text-[12px] text-ink-400">{p.no} · {p.court}</p>
                </div>
                <button onClick={() => removeCitation(p.no)} className="shrink-0 text-[13px] font-semibold text-red-500 hover:underline">제거</button>
              </div>
            ))}
          </div>
        )}
      </Modal>
      <PrecedentPlanModal
        open={premiumOpen}
        onClose={() => setPremiumOpen(false)}
        subscription={precedentBilling.subscription}
        checking={precedentBilling.checking}
        busyPlan={precedentBilling.busyPlan}
        error={precedentBilling.error}
        onSubscribe={() => precedentBilling.startCheckout(user?.email)}
        onManage={precedentBilling.openPortal}
      />
    </div>
  )
}

/* ══════════════ 1. 분석할 내 사건 선택 ══════════════ */

function SelectCaseCard({ cases, picked, onPick, onDone, free, onFree, onFreeAnalyze, onCreate, confirmed }) {
  const none = cases.length === 0

  return (
    <section className="rounded-2xl border border-ink-200 p-6">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {!none && <Num n={1} />}
          <h2 className="text-[20px] font-semibold leading-7 text-ink-900">분석할 내 사건 선택</h2>
        </div>
        <Tag tone="blue">AI 분석</Tag>
      </div>

      {none ? (
        <>
          {/* 기준이 될 사건이 없다 — 만들러 보내되, 지금 당장 보고 싶은 길도 남긴다 */}
          <div className="mt-3.5 flex items-start gap-3 rounded-lg border border-ink-200 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-ink-700">등록된 사건이 없어요</p>
              <p className="mt-0.5 text-[12px] text-ink-400">판례를 분석하려면 먼저 내 사건을 등록해야 해요.</p>
            </div>
            <button onClick={onCreate} className="shrink-0 rounded-lg bg-brand-300 px-5 py-3 text-[14px] font-semibold text-ink-50 transition-colors hover:bg-brand-400">
              사건 만들기
            </button>
          </div>

          <div className="my-3.5 flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-ink-200" />
            <span className="text-[12px] text-ink-500">또는</span>
            <span className="h-px flex-1 bg-ink-200" />
          </div>

          <label className="block">
            <span className="text-[14px] font-medium leading-5 text-ink-700">사건 등록 없이, 상황만 적고 바로 분석하기</span>
            <textarea
              value={free}
              onChange={(e) => onFree(e.target.value)}
              placeholder="예: 임대차 계약이 끝나서 집을 비워줬는데, 집주인이 원상회복 비용을 이유로 보증금 1,000만원을 돌려주지 않고 있어요."
              className="mt-2 h-[102px] w-full resize-none rounded-[10px] border border-ink-200 px-4 py-2.5 text-[14px] leading-relaxed text-ink-700 outline-none transition placeholder:text-ink-400 focus:border-brand-300"
            />
          </label>

          <button
            onClick={onFreeAnalyze}
            disabled={!free.trim()}
            className="mt-3.5 w-full rounded-lg bg-brand-300 px-5 py-3 text-[14px] font-semibold text-ink-50 transition-colors hover:bg-brand-400 disabled:opacity-50"
          >
            이 내용으로 유사 판례 분석
          </button>
          <p className="mt-3.5 text-[12px] leading-tight tracking-[-0.3px] text-ink-400">
            직접 입력만으로 분석하면 정확도가 낮을 수 있어요. 사건을 등록하면 소장·증거까지 반영돼 더 정확해집니다.
          </p>
        </>
      ) : (
        <>
          <div className="mt-3.5 flex flex-col gap-3.5">
            {cases.map((c) => {
              const on = picked === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onPick(c.id)}
                  className={cx(
                    'flex w-full items-center gap-4 rounded-lg border px-4 py-3 text-left transition-colors',
                    on ? 'border-brand-200 bg-brand-50' : 'border-ink-200 bg-white hover:border-ink-300',
                  )}
                >
                  <Dot on={on} />
                  <span className="min-w-0 flex-1">
                    <span className={cx('block truncate text-[14px] font-semibold', on ? 'text-brand-500' : 'text-ink-700')}>
                      {caseTitle(c)}
                    </span>
                    <span className={cx('block truncate text-[12px]', on ? 'text-brand-400' : 'text-ink-400')}>
                      {c.caseNo || '사건번호 없음'} · 민사
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <p className="mt-3.5 text-[12px] leading-tight tracking-[-0.3px] text-ink-400">
            선택한 사건의 쟁점을 분석해 관련도 높은 공개 판례와 검색 범위를 보여드려요.
          </p>
          <button
            onClick={onDone}
            disabled={!picked || confirmed}
            className="mt-3.5 w-full rounded-lg bg-brand-300 px-5 py-3 text-[14px] font-semibold text-ink-50 transition-colors hover:bg-brand-400 disabled:opacity-50"
          >
            {confirmed ? '선택 완료됨' : '선택 완료'}
          </button>
        </>
      )}
    </section>
  )
}

/* ══════════════ 2. 분석에 사용할 정보 ══════════════ */
// 정확도는 장식이 아니다. "무엇이 비어서 낮은지"를 같은 카드 안에서 보여준다.

const ACCURACY = {
  낮음: { bg: 'bg-red-50', text: 'text-red-500' },
  보통: { bg: '', text: '' },      // yellow500은 팔레트 밖이라 style로 준다
  높음: { bg: 'bg-brand-50', text: 'text-brand-500' },
}

function InfoCard({ sources, accuracy, context, onContext, onGo, onAnalyze }) {
  const a = ACCURACY[accuracy]
  return (
    <section className="rounded-2xl border border-ink-200 p-6">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Num n={2} />
          <h2 className="text-[20px] font-semibold leading-7 text-ink-900">분석에 사용할 정보</h2>
        </div>
        <span
          className={cx('shrink-0 rounded-xl px-3 py-1 text-[13px] font-semibold', a.bg, a.text)}
          style={accuracy === '보통' ? { background: YELLOW_BG, color: YELLOW } : undefined}
        >
          정확도 {accuracy}
        </span>
      </div>

      <p className="mt-3.5 text-[12px] leading-tight tracking-[-0.3px] text-ink-400">
        선택한 사건의 쟁점을 분석해 관련도 높은 판례와 승소율(표본)을 보여드려요.
      </p>

      <div className="mt-3.5 flex flex-col gap-2">
        {sources.map((s) => (
          <div
            key={s.key}
            className={cx(
              'flex min-h-[65px] items-center gap-4 rounded-lg border px-4 py-3',
              s.on ? 'border-brand-200 bg-brand-50' : 'border-ink-200 bg-white',
            )}
          >
            <Dot on={s.on} check />
            <div className="min-w-0 flex-1">
              <p className={cx('truncate text-[14px] font-semibold', s.on ? 'text-brand-500' : 'text-ink-700')}>{s.label}</p>
              <p className={cx('truncate text-[12px]', s.on ? 'text-brand-400' : 'text-ink-400')}>
                {s.on ? s.onDesc : '아직 없음 - 작성하면 정확도가 크게 올라요'}
              </p>
            </div>
            {!s.on && (
              <button
                onClick={() => onGo(s.to)}
                className="shrink-0 rounded-lg bg-brand-50 px-3 py-2 text-[14px] font-semibold text-brand-300 transition-colors hover:bg-brand-100"
              >
                등록하기
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3.5">
        <p className="flex flex-wrap items-center gap-x-2.5">
          <span className="text-[14px] font-semibold leading-5 text-ink-700">
            맥락 추가 <span className="text-[12px] font-medium text-ink-500">(선택)</span>
          </span>
          <span className="text-[14px] font-medium leading-5 text-ink-700">— 자유롭게 적으면 정확도가 더 올라가요</span>
        </p>
        <textarea
          value={context}
          onChange={(e) => onContext(e.target.value)}
          placeholder="예: 명도는 완료했는데 임대인이 원상회복 비용을 이유로 보증금 반환을 미루고 있어요."
          className="mt-2 h-[102px] w-full resize-none rounded-[10px] border border-ink-200 px-4 py-2.5 text-[16px] leading-normal text-ink-700 outline-none transition placeholder:text-ink-300 focus:border-brand-300"
        />
      </div>

      {/* 근거가 다 모였을 때만 — 아니면 "충분하다"는 거짓말이 된다 */}
      {sources.every((s) => s.on) && (
        <p className="mt-3.5 rounded-lg bg-brand-50 px-4 py-2 text-center text-[13px] font-medium text-brand-300">
          소장·증거까지 충분한 정보로 분석했어요. 사건 쟁점과 가장 관련도 높은 판례를 보여드립니다.
        </p>
      )}

      <div className="mt-3.5 flex justify-end">
        <button
          onClick={onAnalyze}
          className="rounded-lg bg-brand-300 px-5 py-3 text-[14px] font-semibold text-ink-50 transition-colors hover:bg-brand-400"
        >
          이 정보로 유사 판례 분석
        </button>
      </div>
    </section>
  )
}

/* ══════════════ 분석 기준 사건 ══════════════ */

function BasisBar({ label, onChange }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-ink-200 p-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Num n={1} />
        <span className="min-w-0">
          <span className="block text-[14px] font-medium text-ink-400">분석 기준 사건</span>
          <span className="block truncate text-[20px] font-semibold leading-7 text-ink-900">{label}</span>
        </span>
      </div>
      <button
        onClick={onChange}
        className="shrink-0 rounded-xl bg-ink-100 px-3 py-1 text-[13px] font-semibold text-ink-600 transition-colors hover:bg-ink-200"
      >
        변경
      </button>
    </div>
  )
}

/* ══════════════ 분석 중 ══════════════ */

function Analyzing() {
  return (
    <>
      <div className="grid place-items-center gap-3 rounded-2xl border border-ink-200 py-14 text-center">
        <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-300" />
        <p className="text-[18px] font-semibold text-brand-400">공개 판례를 검색하고 있어요</p>
        <p className="text-[14px] text-ink-400">개인정보를 제외한 사건 유형·법적 쟁점으로 국가법령정보센터를 조회합니다.</p>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-ink-200 p-6">
          <div className="flex items-center gap-3">
            <span className="h-4 w-48 animate-pulse rounded bg-ink-100" />
            <span className="h-4 w-14 animate-pulse rounded bg-ink-100" />
          </div>
          <span className="mt-3 block h-3 w-72 animate-pulse rounded bg-ink-100" />
          <span className="mt-3 block h-14 w-full animate-pulse rounded-lg bg-ink-100" />
          <div className="mt-3 flex gap-2">
            <span className="h-8 w-24 animate-pulse rounded-lg bg-ink-100" />
            <span className="h-8 w-16 animate-pulse rounded-lg bg-ink-100" />
            <span className="h-8 w-16 animate-pulse rounded-lg bg-ink-100" />
          </div>
        </div>
      ))}
    </>
  )
}

function SearchError({ message, onRetry }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="font-semibold text-red-500">{message}</p>
      <button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50">다시 조회</button>
    </div>
  )
}

/* ══════════════ 결과 머리 ══════════════ */

function ResultsHeader({ title, count, view, onView, savedCount, citedCount, onCite }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="flex flex-1 items-baseline gap-1.5 text-[20px] font-semibold">
        <span className="leading-7 text-ink-900">{title}</span>
        <span className="text-brand-500">{count}건</span>
      </h2>

      {/* 담아둔 판례로 가는 유일한 문 — 없으면 인용은 담기만 하고 볼 수 없다 */}
      <button
        type="button"
        onClick={onCite}
        className="text-[13px] font-semibold text-ink-500 underline decoration-ink-300 underline-offset-2 hover:text-brand-500"
      >
        내 인용 목록 ({citedCount})
      </button>

      <div className="flex items-center gap-0 rounded-[10px] bg-ink-200 px-1 py-[5px]">
        <Seg on={view === 'results'} onClick={() => onView('results')}>검색 결과</Seg>
        <Seg on={view === 'saved'} onClick={() => onView('saved')}>저장됨({savedCount})</Seg>
      </div>
    </div>
  )
}

const Seg = ({ on, onClick, children }) => (
  <button
    type="button" onClick={onClick}
    className={cx(
      'rounded-lg px-3 py-1 text-center text-[12px] transition-colors',
      on ? 'bg-white font-semibold text-ink-600 shadow-[1px_1px_4px_0_rgba(0,0,0,0.05)]' : 'font-medium text-ink-600',
    )}
  >
    {children}
  </button>
)

/* ══════════════ 판례 한 장 ══════════════ */

function PrecedentCard({ p, cited, saved, onCite, onCopy, onSave }) {
  const [expanded, setExpanded] = useState(false)
  const long = `${p.title || ''}${p.point || ''}${p.apply || ''}`.length > 260
  return (
    <article className="min-w-0 overflow-hidden border-y border-ink-200 py-5">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
        <h3 className={cx('min-w-0 flex-1 break-words [overflow-wrap:anywhere] text-[18px] font-semibold leading-7 text-ink-900', !expanded && 'line-clamp-3')}>{p.title}</h3>
        <Tag tone="blue" className="mt-1 shrink-0">{p.result}</Tag>
        <a
          href={officialPrecedentUrl(p.officialId)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center gap-1 self-start py-2 text-[14px] font-medium text-ink-500 underline underline-offset-2 hover:text-brand-500 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 sm:ml-auto"
          aria-label={`${p.court} ${p.no} 판례 원문을 국가법령정보센터에서 열기`}
        >
          공식 원문 <ExternalLink size={15} />
        </a>
      </div>

      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-[13px] font-medium text-ink-400">
        <span>{p.court}</span>
        <span className="text-ink-200">|</span>
        <span className="max-w-full break-all">{p.no}</span>
        <span className="text-ink-200">|</span>
        <span>{p.date}</span>
        <span className="flex items-center gap-[3px] rounded-full py-[3px] pl-2 pr-2.5 font-bold" style={{ color: YELLOW }}>
          <Star size={14} fill={YELLOW} /> 관련성 {relLabel(p.relevance)}
        </span>
      </div>

      <p className={cx('mt-3 break-words [overflow-wrap:anywhere] rounded-lg bg-ink-50 px-5 py-3 text-[14px] font-medium leading-6 text-ink-500', !expanded && 'line-clamp-5')}>{p.point}</p>
      {p.apply && <p className={cx('mt-3 break-words [overflow-wrap:anywhere] text-[13px] font-medium leading-6 text-brand-600', !expanded && 'line-clamp-2')}><span className="font-bold">검색 근거</span> · {p.apply}</p>}
      {long && (
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className="mt-2 rounded-md text-[13px] font-semibold text-ink-500 underline underline-offset-2 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
          {expanded ? '내용 접기' : '긴 내용 더 보기'}
        </button>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <RowButton
          on={cited} onClick={() => onCite(p)}
          icon={cited ? <Check size={20} /> : <FileText size={20} />}
        >
          {cited ? '인용됨' : '내 문서에 인용'}
        </RowButton>
        <button
          type="button" onClick={() => onCopy(p)}
          className="inline-flex items-center gap-1 rounded-lg border border-ink-200 bg-white px-5 py-2 text-[14px] font-semibold text-ink-400 transition-colors hover:bg-ink-50"
        >
          <Copy size={20} /> 복사
        </button>
        <button
          type="button" onClick={() => onSave(p)}
          className={cx(
            'inline-flex items-center gap-1 rounded-lg border px-5 py-2 text-[14px] font-semibold transition-colors',
            saved ? 'border-brand-200 bg-brand-50 text-brand-300' : 'border-ink-200 bg-white text-ink-400 hover:bg-ink-50',
          )}
        >
          <Star size={20} fill={saved ? 'currentColor' : 'none'} /> 저장
        </button>
      </div>
    </article>
  )
}

function PremiumResultsGate({ total, onOpen }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand-200 bg-brand-50 px-5 py-6 text-center">
      <div className="pointer-events-none absolute inset-x-8 -top-5 flex flex-col gap-2 opacity-30 blur-[2px]" aria-hidden="true">
        <span className="h-10 rounded-lg bg-white" />
        <span className="h-10 rounded-lg bg-white" />
      </div>
      <p className="relative text-[12px] font-bold tracking-[0.08em] text-brand-500">PREMIUM</p>
      <h3 className="relative mt-2 text-[17px] font-bold text-ink-900">기본 이용자는 가장 가까운 판례 5건까지 볼 수 있어요</h3>
      <p className="relative mt-1 text-[13px] leading-6 text-ink-600">이번 검색에서 확인된 후보 {total}건의 전체 결과와 공식 원문을 프리미엄에서 이어서 확인하세요.</p>
      <button type="button" onClick={onOpen} className="relative mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-300 px-5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2">
        프리미엄으로 전체보기 <ArrowRight size={15} />
      </button>
    </section>
  )
}

const RowButton = ({ on, onClick, icon, children }) => (
  <button
    type="button" onClick={onClick}
    className={cx(
      'inline-flex items-center gap-1 rounded-lg px-5 py-2 text-[14px] font-semibold transition-colors',
      on ? 'border border-brand-200 bg-brand-50 text-brand-400' : 'bg-brand-300 text-ink-50 hover:bg-brand-400',
    )}
  >
    {icon}{children}
  </button>
)

/* ══════════════ 비어 있을 때 ══════════════ */

function EmptyBoard({ title, sub }) {
  return (
    <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-ink-200 py-16 text-center">
      <Gavel size={40} className="text-ink-300" />
      <p className="text-[18px] font-semibold text-ink-700">{title}</p>
      <p className="text-[14px] font-medium leading-relaxed text-ink-400">{sub}</p>
    </div>
  )
}

function EmptyList({ view, searched, onSuggest }) {
  if (view === 'saved') {
    return (
      <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-ink-200 py-16 text-center">
        <Star size={40} className="text-ink-300" />
        <p className="text-[14px] font-medium text-ink-400">저장한 판례가 없습니다. 판례 카드의 ☆ 저장을 눌러보세요.</p>
      </div>
    )
  }
  return (
    <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-ink-200 py-14 text-center">
      <Search size={40} className="text-ink-300" />
      <p className="text-[18px] font-semibold text-ink-700">{searched ? '검색 결과가 없어요' : '찾고 싶은 내용을 입력해 주세요'}</p>
      <p className="whitespace-pre-line text-[14px] font-medium leading-relaxed text-ink-400">
        {searched
          ? '입력하신 키워드와 관련된 공개 판례를 찾지 못했어요.\n키워드를 줄이거나 다른 표현으로 다시 검색해보세요.'
          : '사건 내용을 문장 그대로 넣어도 괜찮아요.\n쟁점·금액을 함께 적으면 더 가까운 판례가 나옵니다.'}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-[13px] text-ink-400">추천</span>
        {SUGGEST.map((s) => (
          <button
            key={s} type="button" onClick={() => onSuggest(s)}
            className="rounded-full bg-brand-50 px-3 py-1 text-[13px] font-semibold text-brand-500 hover:bg-brand-100"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ══════════════ 쪽 넘김 ══════════════ */

function Pager({ page, count, onPage }) {
  return (
    <div className="mt-6 flex items-center justify-center gap-1.5">
      <PagerBtn disabled={page === 1} onClick={() => onPage(page - 1)}>‹</PagerBtn>
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
        <button
          key={n} type="button" onClick={() => onPage(n)}
          className={cx(
            'h-8 w-8 rounded-lg text-[13px] font-semibold transition-colors',
            n === page ? 'bg-brand-300 text-white' : 'text-ink-500 hover:bg-ink-100',
          )}
        >
          {n}
        </button>
      ))}
      <PagerBtn disabled={page === count} onClick={() => onPage(page + 1)}>›</PagerBtn>
    </div>
  )
}

const PagerBtn = ({ disabled, onClick, children }) => (
  <button
    type="button" disabled={disabled} onClick={onClick}
    className="h-8 w-8 rounded-lg text-[15px] text-ink-400 transition-colors hover:bg-ink-100 disabled:opacity-40 disabled:hover:bg-transparent"
  >
    {children}
  </button>
)

/* ══════════════ 오른쪽 곁정보 ══════════════ */

function StatsPlaceholder() {
  return (
    <div className="grid place-items-center gap-2 rounded-[14px] border-[0.7px] border-ink-300 bg-white p-6 text-center">
      <TrendingUp size={20} className="text-ink-300" />
      <p className="text-[14px] leading-relaxed text-ink-400">사건을 선택하면<br />공개 판례 검색 범위가 표시됩니다</p>
    </div>
  )
}

function SearchSummary({ meta, count }) {
  return (
    <section className="rounded-[14px] border-[0.7px] border-ink-300 bg-white p-6">
      <h3 className="text-[18px] font-semibold leading-7 text-ink-900">이번 검색 범위</h3>
      <p className="mt-4"><span className="text-[32px] font-bold text-brand-400">{count}</span><span className="ml-1 text-sm font-semibold text-ink-600">건 표시</span></p>
      <dl className="mt-3 space-y-2 text-[13px]">
        <div className="flex justify-between gap-3"><dt className="text-ink-400">공개 판례 후보</dt><dd className="font-semibold text-ink-700">{meta?.totalCandidates ?? count}건</dd></div>
        <div><dt className="text-ink-400">사용한 검색어</dt><dd className="mt-1 font-semibold leading-relaxed text-ink-700">{meta?.searchedQueries?.join(' · ') || '-'}</dd></div>
      </dl>
      <p className="mt-4 rounded-lg bg-ink-50 p-3 text-[12px] font-medium leading-relaxed text-ink-500">
        {meta?.notice || '검색 결과는 승소율이나 재판 결과 예측이 아닙니다.'}
      </p>
    </section>
  )
}

function LawsCard({ show, laws }) {
  return (
    <section className="rounded-[14px] border-[0.7px] border-ink-300 bg-white p-6">
      <h3 className="text-[18px] font-semibold leading-7 text-ink-900">관련 법령</h3>
      {show ? (
        <div className="mt-4 flex flex-col gap-3">
          {laws.map((l) => (
            <a
              key={l.name}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-h-20 items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 transition-colors hover:border-brand-200 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              aria-label={`${l.name} 조문을 국가법령정보센터에서 열기`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold leading-relaxed text-ink-700 group-hover:text-brand-500">{l.name}</span>
                <span className="block text-[13px] font-medium leading-relaxed text-ink-400">국가법령정보센터의 해당 조문으로 이동</span>
              </span>
              <ExternalLink size={16} className="shrink-0 text-ink-400 group-hover:text-brand-500" />
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-[14px] text-ink-400">사건을 선택하면 관련 법령이 표시됩니다</p>
      )}
    </section>
  )
}

function SearchNotice() {
  return (
    <div className="rounded-lg bg-brand-50 px-4 py-3">
      <p className="text-[14px] font-semibold text-brand-500">! 검색 결과는 참고 자료입니다</p>
      <p className="mt-1 text-[12px] font-medium leading-relaxed text-brand-400">
        공개된 일부 판례·법령을 대상으로 하며, 승소 가능성이나 통계는 제공하지 않습니다.
        검색 결과가 전체 판례를 대표하지 않으니, 구체적 적용은 반드시 직접·전문가 검토가 필요합니다.
      </p>
    </div>
  )
}

/** 무엇을 세었고 무엇을 세지 않았는지 — 없으면 결과가 "전부"이자 "예측"으로 읽힌다 */
function AboutCard() {
  const rows = [
    ['데이터 출처', '국가법령정보센터 공개 판례·법령 Open API'],
    ['제공하지 않는 것', '승소율·재판 결과 예측·전국 통계'],
    ["'관련성' 의미", '입력 내용과의 텍스트 유사도이며, 법적 중요도가 아닙니다'],
    ['한계', '공개 판례 일부만 대상이라 전체를 대표하지 않습니다'],
  ]
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 px-6">
        <HelpCircle size={24} className="text-ink-400" />
        <h3 className="text-[18px] font-semibold leading-7 text-ink-900">이 검색에 대하여</h3>
      </div>
      <dl className="flex flex-col gap-3 px-6">
        {rows.map(([k, v]) => (
          <div key={k} className="px-1">
            <dt className="text-[14px] font-semibold leading-relaxed text-ink-500">{k}</dt>
            <dd className="text-[12px] font-medium leading-relaxed text-ink-400">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/* ══════════════ 작은 조각 ══════════════ */

const Num = ({ n }) => (
  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-[16px] font-semibold text-brand-300">
    {n}
  </span>
)

const Tag = ({ tone = 'blue', className, children }) => (
  <span
    className={cx(
      'inline-flex items-center rounded-xl px-3 py-1 text-[13px] font-semibold',
      tone === 'blue' ? 'bg-brand-50 text-brand-500' : 'bg-ink-100 text-ink-600',
      className,
    )}
  >
    {children}
  </span>
)

/** Figma 「dot」 — 라디오이자 체크. 켜지면 파란 원 안에 흰 표시 */
const Dot = ({ on, check }) => (
  <span
    className={cx(
      'grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full border transition-colors',
      on ? 'border-brand-300 bg-brand-300 text-white' : 'border-ink-300 bg-white',
    )}
  >
    {on && (check
      ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      : <span className="h-1 w-1 rounded-full bg-white" />)}
  </span>
)
