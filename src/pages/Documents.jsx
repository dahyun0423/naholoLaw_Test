import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../context/ToastContext.jsx'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { Card, Badge, Button, Tip, inputCls, cx } from '../components/ui.jsx'
import { docTypes, recentDocs, writingTips } from '../data/mock.js'
import {
  Scroll, FileText, Folder, Gavel, Sparkles, ArrowLeft, ArrowRight,
  Upload, Check, Plus, Clock, Scale,
} from '../components/icons.jsx'

function CitedPrecedents() {
  const { citedList, removeCitation } = useWorkspace()
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="flex items-center gap-2 font-bold text-ink-900"><Scale size={18} className="text-brand-400" /> 인용할 판례 ({citedList.length})</h4>
        <Link to="/app/search" className="text-xs font-medium text-brand-400">판례 검색 →</Link>
      </div>
      {citedList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50 p-4 text-center text-[13px] text-ink-400">
          판례 검색에서 <b className="text-ink-500">[내 문서에 인용]</b>으로 담은 판례가 여기에 표시되고, AI가 청구원인에 반영합니다.
        </div>
      ) : (
        <div className="space-y-2">
          {citedList.map((p) => (
            <div key={p.no} className="flex items-start justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50/40 p-3">
              <div>
                <p className="text-sm font-semibold text-ink-800">{p.title} <span className="text-xs font-normal text-ink-400">({p.no})</span></p>
                <p className="mt-0.5 text-[12px] text-ink-500">{p.point}</p>
              </div>
              <button onClick={() => removeCitation(p.no)} className="shrink-0 text-xs font-medium text-red-400 hover:text-red-500">제거</button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

const iconMap = { Scroll, FileText, Folder, Gavel }
const stepLabels = ['문서 선택', '정보 입력', '문서 생성']

function Stepper({ step }) {
  return (
    <div className="flex items-center gap-2">
      {stepLabels.map((l, i) => (
        <div key={l} className="flex items-center gap-2">
          <span className={cx('grid h-7 w-7 place-items-center rounded-full text-sm font-bold', i <= step ? 'bg-brand-300 text-white' : 'bg-ink-100 text-ink-400')}>{i + 1}</span>
          <span className={cx('text-sm font-medium', i <= step ? 'text-ink-800' : 'text-ink-400')}>{l}</span>
          {i < 2 && <ArrowRight size={14} className="mx-1 text-ink-300" />}
        </div>
      ))}
    </div>
  )
}

function RightRail() {
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex items-center gap-2"><Clock size={16} className="text-brand-400" /><h3 className="text-sm font-bold text-ink-900">최근 생성 문서</h3></div>
        <div className="mt-3 space-y-2">
          {recentDocs.map((d) => (
            <div key={d.name} className="flex items-center gap-3 rounded-xl border border-ink-100 p-3">
              <FileText size={18} className="text-brand-400" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-brand-400">{d.type}</p>
                <p className="truncate text-sm text-ink-700">{d.name}</p>
                <p className="text-xs text-ink-400">{d.date}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <h3 className="text-sm font-bold text-ink-900">작성 팁</h3>
        <ul className="mt-3 space-y-2">
          {writingTips.map((t) => <li key={t} className="flex gap-2 text-[13px] leading-relaxed text-ink-600"><span className="text-brand-300">•</span>{t}</li>)}
        </ul>
      </Card>
    </div>
  )
}

function ComplaintForm() {
  return (
    <div className="space-y-5">
      <Tip title="AI 팁 — 청구금액부터 입력하세요">청구금액을 입력하면 소액사건 여부가 자동 판단되고 인지대도 자동 계산됩니다. 2천만원 이하는 소액사건으로 간이절차가 적용됩니다.</Tip>

      <section>
        <h4 className="mb-3 flex items-center gap-2 font-bold text-ink-900">📋 사건 기본 정보</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">법원 선택 <span className="text-brand-400">*</span></span><input className={inputCls} placeholder="관할 법원을 모르면 AI가 추천" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">소송 유형 <span className="text-brand-400">*</span></span>
            <select className={inputCls}><option>대여금 청구</option><option>임대차 보증금 반환</option><option>손해배상</option><option>물품대금</option></select>
          </label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">청구 금액</span><div className="relative"><input className={cx(inputCls, 'pr-9')} placeholder="0" inputMode="numeric" /><span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-400">원</span></div></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">소송 목적 가액</span><div className="relative"><input className={cx(inputCls, 'pr-9')} placeholder="0" inputMode="numeric" /><span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-400">원</span></div></label>
        </div>
      </section>

      <section>
        <h4 className="mb-3 flex items-center gap-2 font-bold text-ink-900">👤 당사자 정보</h4>
        <div className="mb-3 inline-flex rounded-xl bg-ink-100 p-1">
          <span className="rounded-lg bg-brand-300 px-4 py-1.5 text-sm font-semibold text-white">원고 (나)</span>
          <span className="px-4 py-1.5 text-sm font-medium text-ink-500">피고 (상대방)</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">이름/상호 <span className="text-brand-400">*</span></span><input className={inputCls} placeholder="홍길동" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">주민등록번호</span><input className={inputCls} placeholder="법원 제출용 자동 보호" /></label>
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-medium text-ink-700">주소 <span className="text-brand-400">*</span></span><input className={inputCls} placeholder="도로명 주소 검색" /></label>
        </div>
        <button className="mt-2 flex items-center gap-1 text-sm font-medium text-brand-400"><Plus size={15} /> 원고 추가 (공동소송)</button>
      </section>

      <section>
        <h4 className="mb-3 flex items-center gap-2 font-bold text-ink-900">📝 청구 원인</h4>
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">어떤 일이 있었나요? <span className="text-brand-400">*</span></span>
          <textarea rows={4} className={cx(inputCls, 'h-auto py-2.5')} placeholder="복잡하지 않아도 괜찮아요. 간단히 설명해주세요. AI가 법률 문서로 변환합니다." />
        </label>
        <label className="mt-3 block"><span className="mb-1.5 block text-sm font-medium text-ink-700">핵심 날짜</span><input className={inputCls} placeholder="사건 발생일, 계약일 등" /></label>
        <div className="mt-3"><Tip title="AI 팁 — 일상 언어로 편하게 쓰세요">"보증금을 안 돌려줘요", "월급을 안 줬어요" 같은 일상 표현을 그대로 입력하세요. AI가 "임대차보증금 반환 거부", "임금 미지급" 같은 법률 용어로 자동 변환합니다.</Tip></div>
      </section>

      <section>
        <h4 className="mb-3 flex items-center gap-2 font-bold text-ink-900">📎 첨부 증거 (선택)</h4>
        <div className="grid gap-3 sm:grid-cols-3">
          {['계약서', '카카오톡 등', '기타'].map((t) => (
            <div key={t} className="grid place-items-center rounded-xl border-2 border-dashed border-ink-200 bg-ink-50 py-6 text-center hover:border-brand-200">
              <Upload size={22} className="text-ink-400" /><span className="mt-1.5 text-sm text-ink-600">{t}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 rounded-lg bg-brand-50/60 px-3 py-2 text-xs text-brand-500">증거를 올리면 AI가 내용을 분석해 청구문 작성에 활용합니다.</p>
      </section>
    </div>
  )
}

function EvidenceForm() {
  return (
    <div className="space-y-5">
      <Tip title="AI 팁 — 파일만 올리면 끝!">증거 파일을 업로드하면 AI가 자동으로 유형을 분류하고 "갑 제1호증" 같은 번호를 매깁니다. 순서는 드래그로 쉽게 조정할 수 있어요.</Tip>
      <section>
        <h4 className="mb-3 font-bold text-ink-900">📋 사건 정보</h4>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">사건번호</span><input className={inputCls} placeholder="2024가단***" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">원고</span><input className={inputCls} placeholder="홍길동" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">피고</span><input className={inputCls} placeholder="김철수" /></label>
        </div>
      </section>
      <section>
        <h4 className="mb-3 font-bold text-ink-900">📄 증거 등록</h4>
        <div className="grid place-items-center rounded-xl border-2 border-dashed border-ink-200 bg-ink-50 py-10 text-center">
          <Upload size={28} className="text-ink-400" />
          <p className="mt-2 text-sm font-medium text-ink-600">파일을 드래그하거나 클릭해서 업로드</p>
          <p className="text-xs text-ink-400">PDF, JPG, PNG, 카카오톡 내보내기 등</p>
        </div>
        <button className="mt-2 flex items-center gap-1 text-sm font-medium text-brand-400"><Plus size={15} /> 증거 직접 입력 (파일 없는 경우)</button>
      </section>
      <section>
        <h4 className="mb-3 font-bold text-ink-900">🔢 증거 번호 체계</h4>
        <div className="inline-flex rounded-xl bg-ink-100 p-1">
          <span className="rounded-lg bg-brand-300 px-4 py-1.5 text-sm font-semibold text-white">갑호증 (원고)</span>
          <span className="px-4 py-1.5 text-sm font-medium text-ink-500">을호증 (피고)</span>
          <span className="px-4 py-1.5 text-sm font-medium text-ink-500">병호증 (제3자)</span>
        </div>
        <div className="mt-3"><Tip title="AI 팁 — 증거 순서가 중요합니다">증거는 제출 순서대로 "갑 제1호증", "갑 제2호증" 번호가 매겨집니다. 중요한 증거를 앞쪽에 배치하세요.</Tip></div>
      </section>
    </div>
  )
}

function GenericForm({ type }) {
  return (
    <div className="space-y-5">
      <Tip title={`AI 팁 — ${type} 작성`}>핵심 사실과 주장을 입력하면 AI가 {type} 형식에 맞춰 초안을 작성합니다. 일상 언어로 편하게 작성하세요.</Tip>
      <section>
        <h4 className="mb-3 font-bold text-ink-900">📋 사건 정보</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">사건번호</span><input className={inputCls} placeholder="2024가단***" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">{type === '신청서' ? '신청 종류' : '문서 제목'}</span><input className={inputCls} placeholder={type === '신청서' ? '예: 기일변경신청' : `${type} 제목`} /></label>
        </div>
      </section>
      <section>
        <h4 className="mb-3 font-bold text-ink-900">📝 {type === '준비서면' ? '주장 내용' : '신청 취지·이유'}</h4>
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-700">{type === '준비서면' ? '상대방 주장 요지' : '신청 취지'}</span>
          <textarea rows={3} className={cx(inputCls, 'h-auto py-2.5')} placeholder="핵심 내용을 입력하세요" />
        </label>
        <label className="mt-3 block"><span className="mb-1.5 block text-sm font-medium text-ink-700">{type === '준비서면' ? '반박 내용' : '신청 이유'}</span>
          <textarea rows={4} className={cx(inputCls, 'h-auto py-2.5')} placeholder="자세히 작성할수록 정확한 초안이 생성됩니다" />
        </label>
      </section>
    </div>
  )
}

export default function Documents() {
  const toast = useToast()
  const { citedList } = useWorkspace()
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState(null)
  const [generating, setGenerating] = useState(false)

  const doc = docTypes.find((d) => d.key === selected)

  const generate = () => {
    setGenerating(true)
    setTimeout(() => { setGenerating(false); setStep(2); toast(`${doc?.title} 초안이 생성되었습니다`, 'success') }, 1600)
  }
  const recommend = () => { setSelected('brief'); setStep(1); toast('AI 추천: 지금은 준비서면 작성이 필요해요') }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">법률 문서 작성 도우미</h1>
        <p className="mt-1 text-sm text-ink-500">필요한 정보를 입력하면 AI가 자동으로 법률 문서를 작성합니다.</p>
      </div>

      <Card className="p-5"><Stepper step={step} /></Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* STEP 1 */}
          {step === 0 && (
            <div className="space-y-5">
              <Card className="p-6">
                <h3 className="font-bold text-ink-900">작성할 문서를 선택하세요</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {docTypes.map((d) => {
                    const Icon = iconMap[d.icon]
                    const active = selected === d.key
                    return (
                      <button key={d.key} onClick={() => setSelected(d.key)} className={cx('rounded-2xl border-2 p-5 text-left transition-all', active ? 'border-brand-300 bg-brand-50/50' : 'border-ink-200 hover:border-brand-200')}>
                        <span className={cx('grid h-11 w-11 place-items-center rounded-xl', active ? 'bg-brand-300 text-white' : 'bg-brand-50 text-brand-400')}><Icon size={22} /></span>
                        <div className="mt-3 font-bold text-ink-900">{d.title}</div>
                        <div className="mt-1 text-sm text-ink-500">{d.desc}</div>
                      </button>
                    )
                  })}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button onClick={recommend} className="flex items-center gap-3 rounded-xl border border-ink-100 bg-ink-50 p-4 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/40">
                    <Sparkles size={20} className="text-brand-400" />
                    <div><p className="text-sm font-bold text-ink-800">AI 맞춤 추천</p><p className="text-xs text-ink-500">진행 중인 소송에 필요한 문서를 AI가 추천합니다.</p></div>
                  </button>
                  <button onClick={() => toast('각 문서 유형의 기본 템플릿을 불러옵니다')} className="flex items-center gap-3 rounded-xl border border-ink-100 bg-ink-50 p-4 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/40">
                    <FileText size={20} className="text-brand-400" />
                    <div><p className="text-sm font-bold text-ink-800">템플릿 보기</p><p className="text-xs text-ink-500">각 문서 유형의 기본 템플릿을 미리 확인합니다.</p></div>
                  </button>
                </div>
              </Card>
              <div className="flex justify-end">
                <Button disabled={!selected} onClick={() => setStep(1)}>다음 <ArrowRight size={16} /></Button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 1 && (
            <div className="space-y-5">
              <Card className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-ink-900">{doc?.title} — 정보 입력</h3>
                  <Badge tone="blue">{doc?.title}</Badge>
                </div>
                {selected === 'complaint' && <ComplaintForm />}
                {selected === 'evidence' && <EvidenceForm />}
                {selected === 'brief' && <GenericForm type="준비서면" />}
                {selected === 'petition' && <GenericForm type="신청서" />}
                {(selected === 'complaint' || selected === 'brief') && (
                  <div className="mt-5 border-t border-ink-100 pt-5"><CitedPrecedents /></div>
                )}
              </Card>
              <div className="flex justify-between">
                <Button variant="neutral" onClick={() => setStep(0)}><ArrowLeft size={16} /> 이전</Button>
                <Button onClick={generate} disabled={generating}>
                  {generating ? <>AI가 작성 중…</> : <><Sparkles size={16} /> AI 문서 생성하기</>}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 2 && (
            <div className="space-y-5">
              <Card className="p-8 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-500"><Check size={30} /></span>
                <h3 className="mt-4 text-xl font-bold text-ink-900">{doc?.title} 초안이 생성되었습니다</h3>
                <p className="mt-1 text-sm text-ink-500">AI가 입력하신 정보를 바탕으로 문서를 작성했어요. 내용을 검토하고 수정하세요.</p>
              </Card>
              <Card className="p-6">
                <div className="rounded-xl border border-ink-200 bg-ink-50 p-6 font-serif text-sm leading-loose text-ink-700">
                  <p className="text-center text-lg font-bold tracking-widest text-ink-900">{doc?.title}</p>
                  <p className="mt-5">원　고　홍길동 (서울특별시 ○○구 ○○로 12)</p>
                  <p>피　고　김철수 (서울특별시 △△구 △△로 34)</p>
                  <p className="mt-4 font-semibold">청구취지</p>
                  <p>1. 피고는 원고에게 10,000,000원 및 이에 대하여 이 사건 소장 부본 송달 다음 날부터 다 갚는 날까지 연 12%의 비율로 계산한 돈을 지급하라.</p>
                  <p>2. 소송비용은 피고가 부담한다.</p>
                  <p className="mt-4 font-semibold">청구원인</p>
                  <p>1. 원고는 2024. 3. 1. 피고와 임대차계약을 체결하고 보증금 10,000,000원을 지급하였습니다. …</p>
                  {citedList.length > 0 && (
                    <>
                      <p className="mt-4 font-semibold">참조 판례</p>
                      {citedList.map((p, i) => (
                        <p key={p.no}>{i + 1}. {p.court} {p.no} 판결 — {p.point}</p>
                      ))}
                    </>
                  )}
                  <p className="mt-6 text-center text-ink-400">— AI 생성 초안 (검토·수정 필요) —</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button onClick={() => toast('PDF로 저장했습니다 (데모)', 'success')}><FileText size={16} /> PDF 다운로드</Button>
                  <Button variant="neutral" onClick={() => setStep(1)}>수정하기</Button>
                  <Button variant="neutral" onClick={() => { setStep(0); setSelected(null) }}>새 문서 작성</Button>
                </div>
              </Card>
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-700">
                ⚠️ 본 문서는 AI가 생성한 초안입니다. 법률 자문이 아니며, 제출 전 반드시 본인 상황에 맞게 검토·수정하세요.
              </div>
            </div>
          )}
        </div>

        <RightRail />
      </div>
    </div>
  )
}
