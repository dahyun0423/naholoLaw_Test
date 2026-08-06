import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, Button } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import HelpMedia from '../components/HelpMedia.jsx'
import { Video, Book, Scroll, ChevronRight } from '../components/icons.jsx'

const guides = [
  { icon: Book, type: '가이드', title: '나홀로 소송, 어떻게 시작하나요?', desc: '소장 접수부터 판결까지 전체 흐름을 한눈에 정리했습니다.', to: '/app/procedure', cta: '절차 안내 보기',
    body: '민사 소송은 ① 소장 접수 → ② 답변서 확인 → ③ 변론 준비 → ④ 변론기일 출석 → ⑤ 판결 선고·집행 순으로 진행됩니다. 각 단계에서 제출해야 할 서류와 기한이 다르므로, 절차 안내에서 내 사건의 현재 단계를 확인하고 다음 준비물을 챙기세요.' },
  { icon: Video, type: '동영상', title: '준비서면 작성 방법', desc: '상대방 주장에 효과적으로 반박하는 준비서면 작성법.', to: '/app/documents', cta: '준비서면 작성하기',
    body: '준비서면은 ① 상대방 주장 요지 정리 → ② 쟁점별 반박 → ③ 관련 판례·증거 인용 순으로 작성합니다. 감정적 표현은 피하고 사실과 법리 중심으로 간결하게 작성하는 것이 핵심입니다.' },
  { icon: Scroll, type: '템플릿', title: '소장 표준 양식', desc: '바로 활용 가능한 소장 템플릿과 작성 예시.', to: '/app/documents', cta: '소장 작성하기',
    body: '소장에는 당사자 표시(원고·피고), 청구취지, 청구원인, 입증방법이 반드시 포함되어야 합니다. 문서 생성에서 소장을 선택하면 AI가 항목별로 안내하며 초안을 작성해 줍니다.' },
  { icon: Scroll, type: '템플릿', title: '기일변경신청서', desc: '부득이한 사정으로 기일 변경이 필요할 때.', to: '/app/documents', cta: '신청서 작성하기',
    body: '질병·출장 등 부득이한 사유로 변론기일에 출석하기 어려울 때 제출합니다. 사유를 구체적으로 적고, 증빙(진단서 등)을 함께 제출하면 인정받기 쉽습니다.' },
  { icon: Book, type: '가이드', title: '증거, 어떻게 정리하나요?', desc: '갑호증·을호증 번호 체계와 입증 취지 작성법.', to: '/app/evidence', cta: '증빙 자료 관리',
    body: '원고가 내는 증거는 "갑 제1호증", 피고가 내는 증거는 "을 제1호증"으로 번호를 매깁니다. 각 증거에는 "왜 이 증거가 필요한지"(입증 취지)를 함께 적어야 합니다.' },
  { icon: Book, type: '가이드', title: '소송 비용(인지대·송달료) 계산', desc: '청구 금액에 따른 비용 산정 기준 안내.', to: '/app/procedure', cta: '비용 계산기 열기',
    body: '인지대는 청구 금액(소가)에 비례해 산정되고, 송달료는 당사자 수에 따라 정해집니다. 절차 안내의 소송 비용 계산기에서 청구 금액만 입력하면 자동으로 계산됩니다.' },
]
const tone = { 가이드: 'blue', 동영상: 'purple', 템플릿: 'green' }

export default function Guide() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">가이드</h1>
        <p className="mt-1 text-sm text-ink-500">나홀로 소송에 필요한 가이드와 템플릿을 확인하세요.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map((g) => (
          <Card key={g.title} onClick={() => setOpen(g)} className="cursor-pointer p-6 transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-400"><g.icon size={22} /></span>
              <Badge tone={tone[g.type]}>{g.type}</Badge>
            </div>
            <h3 className="mt-4 font-bold text-ink-900">{g.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{g.desc}</p>
            <p className="mt-4 flex items-center gap-1 text-sm font-medium text-brand-400">
              {g.type === '동영상' ? '▶ 영상 보기' : g.type === '템플릿' ? '양식 다운로드' : '자세히 보기'} <ChevronRight size={15} />
            </p>
          </Card>
        ))}
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title}
        footer={<Button variant="neutral" onClick={() => setOpen(null)}>닫기</Button>}>
        {open && (
          <div className="space-y-3">
            <Badge tone={tone[open.type]}>{open.type}</Badge>
            <p className="text-[15px] leading-relaxed text-ink-700">{open.body}</p>
            <HelpMedia item={open} navigate={navigate} onClose={() => setOpen(null)} />
          </div>
        )}
      </Modal>
    </div>
  )
}
