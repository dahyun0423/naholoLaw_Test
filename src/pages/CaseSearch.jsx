// 판례·법령 검색
//
// 화면이 두 갈래인 이유:
//   「내 사건과 비슷한 판례」 — 사건을 기준으로 찾아 주는 쪽 (기본)
//   「키워드로 판례 검색」    — 사용자가 직접 찾는 쪽
//
// ── 목록 ↔ 상세를 모달로 나누지 않는다 ─────────────────────
// 판례는 **여러 건을 훑으며 비교하는** 물건이다. 모달을 띄우면 목록이 가려져
// 열고 닫기를 반복하게 된다. 그래서 왼쪽은 목록으로 두고 **오른쪽에서 펼친다.**
// 목록에서 다른 줄을 누르면 오른쪽만 바뀐다.
//
// ── 이 화면에서 제일 조심할 것 ─────────────────────────────
// 판례 검색은 "이기겠네" 로 읽히기 쉽다. 숫자 옆에는 반드시 무엇을 세었고
// 무엇을 세지 않았는지를 붙인다. 승소 확률·재판 예측은 만들지 않는다.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, Button, Progress, cx } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { precedents, precedentFullText, winrate } from '../data/mock.js'
import { findType } from '../lib/complaint.js'
import {
  Search, Star, ExternalLink, FileText, Copy, Scale, TrendingUp, Book,
  Lightbulb, Check, HelpCircle, AlertTriangle, X,
} from '../components/icons.jsx'

const TABS = ['내 사건과 비슷한 판례', '키워드로 판례 검색']
const KIND = ['전체', '민사', '형사', '행정', '가사']
const SCOPE = ['대법원', '하급심', '최근 3년']
const SUGGEST = ['명예훼손 위자료', '합의금', '모욕죄']

export default function CaseSearch() {
  const navigate = useNavigate()
  const toast = useToast()
  const {
    activeCase, activeRaw,
    savedNos, toggleSave, citedNos, addCitation, removeCitation, savedList, citedList,
  } = useWorkspace()

  const [tab, setTab] = useState(TABS[0])
  const [query, setQuery] = useState('')
  const [sent, setSent] = useState('')
  const [kind, setKind] = useState('전체')
  const [scope, setScope] = useState([])
  const [view, setView] = useState('results')
  const [openNo, setOpenNo] = useState(null)        // 오른쪽에 펼친 판례
  const [citeModal, setCiteModal] = useState(false)

  const toggleScope = (s) => setScope((v) => (v.includes(s) ? v.filter((x) => x !== s) : [...v, s]))

  const similar = useMemo(() => precedents.slice(0, 3), [])

  const results = useMemo(() => {
    if (!sent.trim()) return null
    let r = precedents.filter((p) => (p.title + p.point + p.apply).includes(sent.trim()))
    if (scope.includes('대법원')) r = r.filter((p) => p.court === '대법원')
    if (scope.includes('하급심')) r = r.filter((p) => p.court !== '대법원')
    if (scope.includes('최근 3년')) r = r.filter((p) => Number(String(p.date).slice(0, 4)) >= new Date().getFullYear() - 3)
    return r
  }, [sent, scope])

  const list = tab === TABS[0] ? similar : (view === 'saved' ? savedList : (results || []))
  const open = openNo ? precedents.find((p) => p.no === openNo) : null

  // 탭·목록이 바뀌면 오른쪽에 남아 있던 판례를 닫는다 — 목록에 없는 걸 펼쳐두면 헷갈린다
  useEffect(() => { setOpenNo(null) }, [tab, view, sent])

  const onCite = (p) => {
    if (citedNos.includes(p.no)) { toast('이미 인용 목록에 있습니다'); return }
    addCitation(p.no); toast('인용 목록에 담았습니다', 'success')
  }
  const onSave = (p) => {
    const was = savedNos.includes(p.no)
    toggleSave(p.no)
    toast(was ? '저장을 취소했습니다' : '저장한 판례에 추가했습니다', was ? 'default' : 'success')
  }
  const onCopy = (p) => {
    navigator.clipboard?.writeText(`${p.title} (${p.court} ${p.no}, ${p.date})\n참고 내용: ${p.point}`).catch(() => {})
    toast('클립보드에 복사했습니다', 'success')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">판례·법령 검색</h1>
          <p className="mt-1 text-sm text-ink-500">AI가 관련 판례와 법령을 분석하여 핵심 내용을 제공합니다</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCiteModal(true)}>
          <FileText size={15} /> 내 인용 목록
          <span className={cx('ml-1 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[11px] font-bold', citedNos.length ? 'bg-brand-300 text-white' : 'bg-ink-200 text-ink-500')}>
            {citedNos.length}
          </span>
        </Button>
      </div>

      <div className="flex items-end gap-1 border-b border-ink-200">
        {TABS.map((t) => (
          <button
            key={t} type="button" onClick={() => setTab(t)}
            className={cx(
              'relative -mb-px rounded-t-xl border border-b-0 px-5 py-3 text-[14px] font-bold transition-colors',
              tab === t ? 'border-ink-200 bg-white text-ink-900' : 'border-transparent bg-ink-100/70 text-ink-500 hover:text-ink-700',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 키워드 탭에서만 검색바 */}
      {tab === TABS[1] && (
        <Card className="p-4">
          <form onSubmit={(e) => { e.preventDefault(); setSent(query) }} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
              <input
                value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="키워드나 사건 내용을 입력하세요 (예: 임대차 보증금 반환 거부, 동시이행)"
                className="h-11 w-full rounded-xl border border-ink-200 pl-10 pr-3 text-sm text-ink-700 outline-none transition placeholder:text-ink-300 focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
              />
            </div>
            <Button type="submit">검색</Button>
          </form>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {KIND.map((t) => <Chip key={t} on={kind === t} onClick={() => setKind(t)}>{t}</Chip>)}
            <span className="mx-1 h-4 w-px bg-ink-200" />
            {SCOPE.map((t) => <Chip key={t} on={scope.includes(t)} onClick={() => toggleScope(t)}>{t}</Chip>)}
          </div>
        </Card>
      )}

      {/* 왼쪽 목록 · 오른쪽 펼침 */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="space-y-3">
          {tab === TABS[0] && <BasisBanner activeCase={activeCase} activeRaw={activeRaw} />}

          <div className="flex flex-wrap items-center gap-2 px-1">
            <h2 className="text-[15px] font-bold text-ink-900">
              {tab === TABS[0] ? '내 사건과 비슷한 판례' : '관련 판례'} <span className="text-brand-500">{list.length}건</span>
            </h2>
            {tab === TABS[1] && (
              <div className="ml-auto inline-flex gap-1 rounded-lg bg-ink-100 p-1">
                <Seg on={view === 'results'} onClick={() => setView('results')}>검색 결과</Seg>
                <Seg on={view === 'saved'} onClick={() => setView('saved')}>저장됨({savedNos.length})</Seg>
              </div>
            )}
          </div>

          {list.length === 0 ? (
            <EmptyList view={view} searched={results !== null} onSuggest={(s) => { setQuery(s); setSent(s) }} />
          ) : (
            <ul className="space-y-2">
              {list.map((p) => (
                <li key={p.no}>
                  <Row
                    p={p}
                    on={openNo === p.no}
                    cited={citedNos.includes(p.no)}
                    saved={savedNos.includes(p.no)}
                    onClick={() => setOpenNo(openNo === p.no ? null : p.no)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 오른쪽 — 펼친 판례가 있으면 상세, 없으면 곁정보 */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          {open ? (
            <Detail
              p={open}
              cited={citedNos.includes(open.no)}
              saved={savedNos.includes(open.no)}
              onCite={onCite} onSave={onSave} onCopy={onCopy}
              onClose={() => setOpenNo(null)}
            />
          ) : (
            <div className="space-y-4">
              {tab === TABS[0] && <StatsCard />}
              <LawsCard />
              {tab === TABS[1] && <TipsCard />}
              <AboutCard />
            </div>
          )}
        </div>
      </div>

      <Modal
        open={citeModal} onClose={() => setCiteModal(false)} maxW="max-w-lg"
        title={`내 인용 목록 (${citedList.length})`}
        sub="문서 생성 시 청구원인·준비서면에 자동으로 반영됩니다."
        footer={
          <>
            <Button variant="neutral" onClick={() => setCiteModal(false)}>닫기</Button>
            <Button disabled={citedList.length === 0} onClick={() => { setCiteModal(false); navigate('/app/documents') }}>
              문서 생성으로 보내기 →
            </Button>
          </>
        }
      >
        {citedList.length === 0 ? (
          <div className="grid place-items-center py-10 text-center text-sm text-ink-400">
            <FileText size={28} className="mb-2 text-ink-300" />
            아직 인용한 판례가 없습니다.<br />판례를 열고 [내 문서에 인용]을 눌러 담아보세요.
          </div>
        ) : (
          <div className="space-y-2">
            {citedList.map((p) => (
              <div key={p.no} className="flex items-start justify-between gap-3 rounded-xl border border-ink-100 p-3">
                <div>
                  <p className="text-sm font-semibold text-ink-800">{p.title}</p>
                  <p className="text-xs text-ink-400">{p.court} · {p.no} · {p.date}</p>
                </div>
                <button onClick={() => removeCitation(p.no)} className="shrink-0 text-xs font-medium text-red-500 hover:underline">제거</button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ══════════════ 목록 한 줄 ══════════════ */
// 카드가 아니라 줄이다. 여러 건을 훑는 화면이라 한 줄이 짧아야 눈이 내려간다.

function Row({ p, on, cited, saved, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={on}
      className={cx(
        'relative w-full overflow-hidden rounded-xl border px-4 py-3.5 text-left transition-colors',
        on ? 'border-brand-300 bg-brand-50' : 'border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50',
      )}
    >
      {on && <span className="absolute inset-y-0 left-0 w-1 bg-brand-300" />}
      <div className="flex items-start gap-2">
        <span className={cx('min-w-0 flex-1 truncate text-[14px] font-bold', on ? 'text-brand-600' : 'text-ink-900')}>{p.title}</span>
        <Badge tone={p.tone}>{p.result}</Badge>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-ink-500">
        <span>{p.court}</span><span>{p.no}</span><span>{p.date}</span>
        <span className="text-brand-500">관련성 {p.relevance >= 90 ? '높음' : p.relevance >= 75 ? '보통' : '낮음'}</span>
        {cited && <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-600">인용됨</span>}
        {saved && <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-600">저장됨</span>}
      </div>
    </button>
  )
}

/* ══════════════ 오른쪽 상세 ══════════════ */

function Detail({ p, cited, saved, onCite, onSave, onCopy, onClose }) {
  const ft = precedentFullText[p.no]
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-2 border-b border-ink-200 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-bold leading-snug text-ink-900">{p.title}</h2>
            <Badge tone={p.tone}>{p.result}</Badge>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2.5 text-[12px] text-ink-500">
            <span className="flex items-center gap-1"><Scale size={12} className="text-ink-300" />{p.court}</span>
            <span>{p.no}</span><span>{p.date}</span>
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="닫기" className="shrink-0 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700">
          <X size={16} />
        </button>
      </div>

      <div className="max-h-[54vh] overflow-y-auto px-5 py-4">
        <p className="text-[11px] font-bold text-ink-500">참고할 수 있는 내용</p>
        <p className="mt-1.5 rounded-xl bg-ink-50 p-3.5 text-[13px] leading-relaxed text-ink-700">{p.point}</p>

        {p.apply && (
          <>
            <p className="mt-4 text-[11px] font-bold text-ink-500">내 사건에 쓰려면</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-700">{p.apply}</p>
          </>
        )}

        {ft && (
          <>
            <p className="mt-5 flex items-center gap-1.5 text-[11px] font-bold text-ink-500">
              판결문 요약 <ExternalLink size={11} className="text-ink-300" />
            </p>
            <div className="mt-1.5 space-y-2.5 rounded-xl border border-ink-200 bg-white p-4 font-serif text-[13px] leading-loose text-ink-700">
              {ft.body.map((para, i) => <p key={i}>{para}</p>)}
              <p className="pt-1 text-center font-sans text-[11px] text-ink-400">— 이하 생략 (데모용 요약 판결문) —</p>
            </div>
          </>
        )}

        <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-400">
          <AlertTriangle size={12} className="mt-0.5 shrink-0 text-ink-300" />
          판례의 일반적인 내용을 참고용으로 정리한 것입니다. 구체적인 적용 여부는 사건의 사실관계에 따라 달라집니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-ink-200 px-5 py-3.5">
        <Button size="sm" variant={cited ? 'soft' : 'primary'} onClick={() => onCite(p)}>
          {cited ? <><Check size={15} /> 인용됨</> : <><FileText size={15} /> 내 문서에 인용</>}
        </Button>
        <Button size="sm" variant="neutral" onClick={() => onCopy(p)}><Copy size={15} /> 복사</Button>
        <Button size="sm" variant={saved ? 'soft' : 'neutral'} onClick={() => onSave(p)}>
          <Star size={15} /> {saved ? '저장됨' : '저장'}
        </Button>
      </div>
    </Card>
  )
}

/* ══════════════ 조각 ══════════════ */

const Chip = ({ on, onClick, children }) => (
  <button
    type="button" onClick={onClick}
    className={cx('rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors', on ? 'bg-brand-300 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200')}
  >
    {children}
  </button>
)

const Seg = ({ on, onClick, children }) => (
  <button
    type="button" onClick={onClick}
    className={cx('rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors', on ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700')}
  >
    {children}
  </button>
)

function BasisBanner({ activeCase, activeRaw }) {
  const type = activeRaw ? findType(activeRaw.typeKey) : null
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
      <FileText size={16} className="shrink-0 text-brand-300" />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] text-brand-600">분석 기준 사건</span>
        <span className="block truncate text-[13px] font-bold text-ink-900">
          {type ? `${type.title} 청구` : activeCase?.title || '사건 없음'}
          <span className="ml-1.5 font-normal text-ink-500">{activeRaw?.caseNo || '사건번호 없음'}</span>
        </span>
      </span>
      <a href="/app/cases" className="shrink-0 text-[12px] font-semibold text-brand-600 hover:underline">사건 바꾸기</a>
    </div>
  )
}

function EmptyList({ view, searched, onSuggest }) {
  return (
    <Card className="grid place-items-center gap-3 px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-ink-100 text-ink-300"><Search size={22} /></span>
      <p className="font-semibold text-ink-700">
        {view === 'saved' ? '저장한 판례가 없어요' : searched ? '검색 결과가 없어요' : '찾고 싶은 내용을 입력해 주세요'}
      </p>
      <p className="max-w-sm whitespace-pre-line text-[12.5px] leading-relaxed text-ink-500">
        {view === 'saved'
          ? '판례를 열고 ⭐ 저장을 누르면 여기 모입니다.'
          : searched
            ? '입력하신 키워드와 관련된 공개 판례를 찾지 못했어요.\n키워드를 줄이거나 다른 표현으로 다시 검색해보세요.'
            : '사건 내용을 문장 그대로 넣어도 괜찮아요.\n쟁점·금액을 함께 적으면 더 가까운 판례가 나옵니다.'}
      </p>
      {view !== 'saved' && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
          <span className="text-[12px] text-ink-400">추천</span>
          {SUGGEST.map((s) => (
            <button key={s} type="button" onClick={() => onSuggest(s)} className="rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-semibold text-brand-600 hover:bg-brand-100">
              {s}
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

/** 유사 판례 통계 — 비율보다 **건수**를 먼저. 모수를 숨기면 확률처럼 읽힌다. */
function StatsCard() {
  const rows = [
    { name: '원고 승소', n: 8 },
    { name: '원고 일부승소', n: 3 },
    { name: '원고 패소', n: 1 },
  ]
  const total = rows.reduce((s, r) => s + r.n, 0)
  const win = Math.round((rows[0].n / total) * 100)

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <TrendingUp size={15} className="text-brand-300" />
        <h3 className="text-[13px] font-bold text-ink-900">유사 판례 통계</h3>
        <span className="ml-auto rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500">샘플</span>
      </div>
      <p className="mt-4 flex items-baseline gap-2">
        <span className="text-[34px] font-bold leading-none tabular-nums text-brand-500">{win}%</span>
        <span className="text-[13px] font-semibold text-ink-600">원고 승소</span>
      </p>
      <p className="mt-1 text-[12px] text-ink-500">이 사건과 유사한 판례 {total}건 중 {rows[0].n}건 승소</p>
      <div className="mt-4 space-y-2.5">
        {rows.map((r) => (
          <div key={r.name}>
            <div className="flex justify-between text-[12px]">
              <span className="text-ink-600">{r.name}</span>
              <span className="font-bold tabular-nums text-ink-700">{r.n}건</span>
            </div>
            <div className="mt-1"><Progress value={(r.n / total) * 100} /></div>
          </div>
        ))}
      </div>
      <p className="mt-4 flex items-start gap-1.5 rounded-xl bg-ink-50 p-3 text-[11px] leading-relaxed text-ink-500">
        <AlertTriangle size={12} className="mt-0.5 shrink-0 text-ink-300" />
        검색된 판례 표본 기준이에요. 전국 통계나 재판 결과 예측이 아니며, 전체 판례를 대표하지 않습니다.
      </p>
    </Card>
  )
}

function LawsCard() {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Book size={15} className="text-brand-300" />
        <h3 className="text-[13px] font-bold text-ink-900">관련 법령</h3>
      </div>
      <div className="mt-3 space-y-2">
        {winrate.laws.map((l) => (
          <div key={l.name} className="rounded-xl border border-ink-200 p-3">
            <p className="text-[13px] font-semibold text-ink-800">{l.name}</p>
            <p className="mt-0.5 text-[11px] text-ink-400">관련 가능성이 있는 조항입니다</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

function TipsCard() {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Lightbulb size={15} className="text-brand-300" />
        <h3 className="text-[13px] font-bold text-ink-900">AI 팁</h3>
      </div>
      <ul className="mt-3 space-y-2">
        {winrate.tips.map((t) => (
          <li key={t} className="flex gap-1.5 text-[12px] leading-relaxed text-ink-600"><span className="text-brand-300">•</span>{t}</li>
        ))}
      </ul>
    </Card>
  )
}

/** 무엇을 세었고 무엇을 세지 않았는지 — 없으면 결과가 "전부"이자 "예측"으로 읽힌다 */
function AboutCard() {
  const rows = [
    ['데이터 출처', '공개된 대법원·일부 하급심 판례와 법령'],
    ['제공하지 않는 것', '승소·재판 결과 예측, 전국 통계'],
    ['「관련성」 의미', '입력 내용과의 텍스트 유사도이며, 법적 중요도가 아닙니다'],
    ['한계', '공개 판례 일부만 대상이라 전체를 대표하지 않습니다'],
  ]
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <HelpCircle size={15} className="text-ink-400" />
        <h3 className="text-[13px] font-bold text-ink-900">이 검색에 대하여</h3>
      </div>
      <dl className="mt-3 space-y-3">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[12px] font-bold text-ink-700">{k}</dt>
            <dd className="mt-0.5 text-[11.5px] leading-relaxed text-ink-500">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
