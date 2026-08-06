import { useState } from 'react'
import { useToast } from '../context/ToastContext.jsx'
import { Card, Button, cx } from '../components/ui.jsx'
import ComplaintWizard from '../components/ComplaintWizard.jsx'
import BriefWizard from '../components/BriefWizard.jsx'
import EvidenceListBuilder from '../components/EvidenceListBuilder.jsx'
import PetitionWizard from '../components/PetitionWizard.jsx'
import { docTypes, recentDocs, writingTips } from '../data/mock.js'
import { Scroll, FileText, Folder, Gavel, Sparkles, ArrowRight, Clock } from '../components/icons.jsx'

const iconMap = { Scroll, FileText, Folder, Gavel }

// 문서마다 분기 축이 다르다. 그래서 하나의 공통 폼이 아니라 각자 전용 흐름을 탄다.
//   소장     — 사건 유형(청구원인)   → 자가진단 → 6단계 입력
//   준비서면 — 소송 진행 단계        → 상대방 주장 → 반박 포인트
//   증거목록 — 새 입력 없음          → 이미 모은 증거를 갑호증 표로 재구성
//   신청서   — 절차적 목적           → 유형별 입력
const wizards = {
  complaint: ComplaintWizard,
  brief: BriefWizard,
  evidence: EvidenceListBuilder,
  petition: PetitionWizard,
}

const axisLabel = {
  complaint: '사건 유형으로 갈려요',
  brief: '소송 진행 단계로 갈려요',
  evidence: '이미 모은 증거를 재구성해요',
  petition: '절차적 목적으로 갈려요',
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

export default function Documents() {
  const toast = useToast()
  const [selected, setSelected] = useState(null)
  const [wizard, setWizard] = useState(null)

  if (wizard) {
    const Wizard = wizards[wizard]
    return <Wizard onExit={() => { setWizard(null); setSelected(null) }} />
  }

  const recommend = () => { setSelected('brief'); setWizard('brief'); toast('지금 단계에서는 준비서면을 자주 작성합니다') }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">법률 문서 작성 도우미</h1>
        <p className="mt-1 text-sm text-ink-500">필요한 정보를 입력하면 문서 형식에 맞춰 초안을 작성해 드립니다.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-6">
            <h3 className="font-bold text-ink-900">작성할 문서를 선택하세요</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {docTypes.map((d) => {
                const Icon = iconMap[d.icon]
                const active = selected === d.key
                return (
                  <button
                    key={d.key}
                    onClick={() => setSelected(d.key)}
                    onDoubleClick={() => setWizard(d.key)}
                    className={cx('rounded-2xl border-2 p-5 text-left transition-all', active ? 'border-brand-300 bg-brand-50/50' : 'border-ink-200 hover:border-brand-200')}
                  >
                    <span className={cx('grid h-11 w-11 place-items-center rounded-xl', active ? 'bg-brand-300 text-white' : 'bg-brand-50 text-brand-400')}><Icon size={22} /></span>
                    <div className="mt-3 font-bold text-ink-900">{d.title}</div>
                    <div className="mt-1 text-sm text-ink-500">{d.desc}</div>
                    <div className="mt-2 text-xs font-medium text-brand-400">{axisLabel[d.key]}</div>
                  </button>
                )
              })}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button onClick={recommend} className="flex items-center gap-3 rounded-xl border border-ink-100 bg-ink-50 p-4 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/40">
                <Sparkles size={20} className="text-brand-400" />
                <div><p className="text-sm font-bold text-ink-800">AI 맞춤 추천</p><p className="text-xs text-ink-500">진행 단계에서 자주 작성하는 문서를 안내합니다.</p></div>
              </button>
              <button onClick={() => toast('각 문서 유형의 기본 템플릿을 불러옵니다')} className="flex items-center gap-3 rounded-xl border border-ink-100 bg-ink-50 p-4 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/40">
                <FileText size={20} className="text-brand-400" />
                <div><p className="text-sm font-bold text-ink-800">템플릿 보기</p><p className="text-xs text-ink-500">각 문서 유형의 기본 템플릿을 미리 확인합니다.</p></div>
              </button>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button disabled={!selected} onClick={() => setWizard(selected)}>다음 <ArrowRight size={16} /></Button>
          </div>
        </div>

        <RightRail />
      </div>
    </div>
  )
}
