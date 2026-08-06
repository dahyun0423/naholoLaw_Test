import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, Button, Progress, cx } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { precedents, precedentFullText, winrate } from '../data/mock.js'
import { Search, Star, ExternalLink, FileText, Copy, Scale, TrendingUp, Book, Lightbulb, Check } from '../components/icons.jsx'

const tabs = ['전체', '민사', '형사', '행정', '가사']

function PrecedentCard({ p, cited, saved, onCite, onSave, onCopy, onOriginal }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-ink-900">{p.title}</h3>
          <Badge tone={p.tone}>{p.result}</Badge>
        </div>
        <button className="flex items-center gap-1 text-xs text-ink-400 hover:text-brand-400" onClick={() => onOriginal(p)}>원문보기 <ExternalLink size={13} /></button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
        <span>{p.court}</span><span>·</span><span>{p.no}</span><span>·</span><span>{p.date}</span>
        <span className="flex items-center gap-0.5 font-semibold text-amber-500"><Star size={12} /> 관련도 {p.relevance}%</span>
      </div>

      <div className="mt-4 rounded-xl bg-brand-50/60 p-3.5">
        <p className="text-xs font-bold text-brand-500">📌 이 판례에서 참고할 수 있는 내용</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-700">{p.point}</p>
      </div>
      <div className="mt-2 rounded-xl bg-ink-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-400">
        이 정보는 법률 조언이 아니라 판례의 일반적인 내용을 참고용으로 정리한 것입니다. 구체적인 적용 여부는 사건의 사실관계에 따라 달라질 수 있습니다.
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
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

export default function CaseSearch() {
  const navigate = useNavigate()
  const toast = useToast()
  const {
    cases, activeCase, setActiveCaseId,
    savedNos, toggleSave, citedNos, addCitation, removeCitation, savedList, citedList,
  } = useWorkspace()

  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('전체')
  const [view, setView] = useState('results') // results | saved
  const [caseModal, setCaseModal] = useState(false)
  const [fullText, setFullText] = useState(null)
  const [citeModal, setCiteModal] = useState(false)

  const results = useMemo(() => {
    let r = precedents
    if (query.trim()) r = r.filter((p) => (p.title + p.point + p.apply).includes(query.trim()))
    return r
  }, [query])

  const list = view === 'saved' ? savedList : results

  const onCite = (p) => {
    if (citedNos.includes(p.no)) { toast('이미 인용 목록에 있습니다'); return }
    addCitation(p.no); toast('인용 목록에 담았습니다', 'success')
  }
  const onSave = (p) => {
    toggleSave(p.no)
    toast(savedNos.includes(p.no) ? '저장을 취소했습니다' : '저장한 판례에 추가했습니다', savedNos.includes(p.no) ? 'default' : 'success')
  }
  const onCopy = (p) => {
    const text = `${p.title} (${p.court} ${p.no}, ${p.date})\n참고 내용: ${p.point}`
    navigator.clipboard?.writeText(text).catch(() => {})
    toast('클립보드에 복사했습니다', 'success')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">판례·법령 검색</h1>
          <p className="mt-1 text-sm text-ink-500">AI가 관련 판례와 법령을 분석하여 핵심 내용을 제공합니다.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCiteModal(true)}>
          <FileText size={15} /> 내 인용 목록 {citedNos.length > 0 && <span className="ml-0.5 rounded-full bg-brand-300 px-1.5 text-xs text-white">{citedNos.length}</span>}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* main */}
        <div className="space-y-5 lg:col-span-2">
          <Card className="flex flex-wrap items-center justify-between gap-3 border-brand-200 bg-brand-50/50 p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand-400"><FileText size={20} /></span>
              <div>
                <p className="text-xs text-ink-500">현재 진행 중인 사건 기준으로 분석</p>
                <p className="text-sm font-bold text-ink-800">{activeCase.title} <span className="font-normal text-ink-400">({activeCase.id} · {activeCase.type})</span></p>
              </div>
            </div>
            <Button variant="neutral" size="sm" onClick={() => setCaseModal(true)}>다른 사건 선택</Button>
          </Card>

          <Card className="p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setView('results') }}
                  placeholder="키워드로 판례 검색 (예: 보증금 반환, 임대차 계약)"
                  className="h-11 w-full rounded-xl border border-ink-200 pl-10 pr-3 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
                />
              </div>
              <Button onClick={() => { setView('results'); toast('판례를 검색했습니다') }}>검색</Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {tabs.map((t) => (
                <button key={t} onClick={() => setTab(t)} className={cx('rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors', tab === t ? 'bg-brand-300 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200')}>{t}</button>
              ))}
            </div>
          </Card>

          {/* view toggle */}
          <div className="flex items-center justify-between px-1">
            <div className="inline-flex rounded-xl bg-ink-100 p-1">
              <button onClick={() => setView('results')} className={cx('rounded-lg px-3.5 py-1.5 text-sm font-medium', view === 'results' ? 'bg-white text-ink-800 shadow-sm' : 'text-ink-500')}>검색 결과</button>
              <button onClick={() => setView('saved')} className={cx('rounded-lg px-3.5 py-1.5 text-sm font-medium', view === 'saved' ? 'bg-white text-ink-800 shadow-sm' : 'text-ink-500')}>저장됨 {savedNos.length > 0 && `(${savedNos.length})`}</button>
            </div>
            {view === 'results' && <p className="text-sm text-ink-500">총 <b className="text-ink-800">{results.length}건</b></p>}
          </div>

          {list.length === 0 ? (
            <Card className="grid place-items-center py-16 text-center text-sm text-ink-400">
              <Star size={28} className="mb-2 text-ink-300" />
              {view === 'saved' ? '저장한 판례가 없습니다. 판례 카드의 ⭐ 저장을 눌러보세요.' : '검색 결과가 없습니다.'}
            </Card>
          ) : (
            list.map((p) => (
              <PrecedentCard
                key={p.no} p={p}
                cited={citedNos.includes(p.no)} saved={savedNos.includes(p.no)}
                onCite={onCite} onSave={onSave} onCopy={onCopy} onOriginal={setFullText}
              />
            ))
          )}
        </div>

        {/* sidebar */}
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-ink-700">
              <TrendingUp size={16} className="text-brand-400" /><span className="text-sm font-bold">유사 판례 통계</span>
              <span className="ml-auto rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500">샘플 데이터</span>
            </div>
            <div className="mt-3 text-center">
              <div className="text-2xl font-bold text-brand-500">{winrate.overall}%</div>
              <p className="mt-1 text-xs text-ink-500">유사 판례 중 원고 승소 비율 <span className="font-semibold text-emerald-500">{winrate.trend} 최근 1년</span></p>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs"><span className="text-ink-500">내 사건과 유사한 판례</span><span className="font-bold text-brand-500">{winrate.similar}%</span></div>
              <div className="mt-1.5"><Progress value={winrate.similar} /></div>
            </div>
            <div className="mt-4 border-l-2 border-amber-300 pl-3 text-[11px] leading-relaxed text-ink-500">
              <b className="font-semibold text-ink-700">아직 실제 판례를 집계한 수치가 아닙니다.</b> 화면 구성을 보여주기 위한 샘플 값이에요.
              집계가 붙더라도 통계적 경향일 뿐이라 재판 결과를 예측하거나 보장하지 않습니다. 이 숫자를 근거로 소송 여부를 정하지 마세요.
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-ink-700">
              <Scale size={16} className="text-brand-400" /><span className="text-sm font-bold">주요 쟁점별 원고 승소 비율</span>
              <span className="ml-auto rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500">샘플</span>
            </div>
            <div className="mt-4 space-y-3">
              {winrate.issues.map((i) => (
                <div key={i.name}>
                  <div className="flex justify-between text-xs"><span className="text-ink-600">{i.name}</span><span className="font-bold text-ink-700">{i.rate}%</span></div>
                  <div className="mt-1.5"><Progress value={i.rate} tone={i.tone} /></div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 text-ink-700"><Book size={16} className="text-brand-400" /><span className="text-sm font-bold">관련 법령</span></div>
            <div className="mt-3 space-y-2">
              {winrate.laws.map((l) => (
                <div key={l.name} className="rounded-xl border border-ink-100 p-3">
                  <span className="text-[13px] font-medium text-ink-700">{l.name}</span>
                  <p className="mt-1 text-[11px] text-ink-400">관련 가능성이 있는 조항입니다</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-amber-200 bg-amber-50/60 p-5">
            <div className="flex items-center gap-2 text-amber-700"><Lightbulb size={16} /><span className="text-sm font-bold">AI 팁</span></div>
            <ul className="mt-3 space-y-2">
              {winrate.tips.map((t) => <li key={t} className="text-[13px] leading-relaxed text-amber-800">• {t}</li>)}
            </ul>
          </Card>
        </div>
      </div>

      {/* 사건 선택 모달 */}
      <Modal open={caseModal} onClose={() => setCaseModal(false)} title="기준 사건 선택" sub="판례 분석의 기준이 될 사건을 선택하세요."
        footer={<Button variant="neutral" onClick={() => setCaseModal(false)}>닫기</Button>}>
        <div className="space-y-2">
          {cases.map((c) => {
            const active = c.id === activeCase.id
            return (
              <button key={c.id} onClick={() => { setActiveCaseId(c.id); setCaseModal(false); toast(`기준 사건을 '${c.title}'로 변경했습니다`, 'success') }}
                className={cx('flex w-full items-center justify-between rounded-xl border p-4 text-left', active ? 'border-brand-300 bg-brand-50/50' : 'border-ink-200 hover:bg-ink-50')}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink-800">{c.title}</span>
                    <Badge tone={c.badge === '진행 중' ? 'blue' : 'amber'}>{c.badge}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-400">{c.id} · {c.court} · {c.type}</p>
                </div>
                {active && <Check size={18} className="text-brand-400" />}
              </button>
            )
          })}
        </div>
      </Modal>

      {/* 원문 모달 */}
      <Modal open={!!fullText} onClose={() => setFullText(null)} maxW="max-w-2xl"
        title={fullText && (precedentFullText[fullText.no]?.title || fullText.title)}
        footer={<><Button variant="neutral" onClick={() => setFullText(null)}>닫기</Button><Button onClick={() => { onCite(fullText); setFullText(null) }}>내 문서에 인용</Button></>}>
        {fullText && (() => {
          const ft = precedentFullText[fullText.no]
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={fullText.tone}>{fullText.result}</Badge>
                <span className="text-xs text-ink-500">{fullText.court} · {fullText.no} · {fullText.date}</span>
              </div>
              {ft ? (
                <>
                  <div className="rounded-xl bg-brand-50/60 p-3.5 text-[13px] font-medium text-brand-600">{ft.summary}</div>
                  <div className="max-h-[48vh] space-y-3 overflow-y-auto rounded-xl border border-ink-200 bg-ink-50 p-4 font-serif text-[13px] leading-loose text-ink-700">
                    {ft.body.map((para, i) => <p key={i}>{para}</p>)}
                    <p className="pt-2 text-center text-ink-400">— 이하 생략 (데모용 요약 판결문) —</p>
                  </div>
                </>
              ) : <p className="text-sm text-ink-500">원문 데이터가 준비 중입니다.</p>}
            </div>
          )
        })()}
      </Modal>

      {/* 인용 목록 모달 */}
      <Modal open={citeModal} onClose={() => setCiteModal(false)} title={`내 인용 목록 (${citedList.length})`} sub="준비서면과 일부 신청서에서 쓸 수 있어요. 소장에는 판례를 넣지 않습니다." maxW="max-w-lg"
        footer={<><Button variant="neutral" onClick={() => setCiteModal(false)}>닫기</Button><Button disabled={citedList.length === 0} onClick={() => { setCiteModal(false); navigate('/app/documents') }}>문서 생성으로 보내기 →</Button></>}>
        {citedList.length === 0 ? (
          <div className="grid place-items-center py-10 text-center text-sm text-ink-400">
            <FileText size={28} className="mb-2 text-ink-300" />
            아직 인용한 판례가 없습니다.<br />판례 카드의 [내 문서에 인용]을 눌러 담아보세요.
          </div>
        ) : (
          <div className="space-y-2">
            {citedList.map((p) => (
              <div key={p.no} className="flex items-start justify-between gap-3 rounded-xl border border-ink-100 p-3">
                <div>
                  <p className="text-sm font-semibold text-ink-800">{p.title}</p>
                  <p className="text-xs text-ink-400">{p.court} · {p.no} · {p.date}</p>
                </div>
                <button onClick={() => removeCitation(p.no)} className="shrink-0 text-xs font-medium text-red-400 hover:text-red-500">제거</button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
