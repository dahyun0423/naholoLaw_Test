// 랜딩 — 실서비스(sololaw.site) 기준으로 다시 맞춘 화면
//
// 실서비스의 뼈대를 그대로 옮긴다. 섹션은 다섯이고 순서가 곧 설명 순서다.
//   히어로(656) → 서비스 소개 → 기능 캐러셀 → 시작 유도 → 자주 묻는 질문
//
// 크기 규칙도 실서비스를 따른다.
//   헤더   고정 64 · 안쪽 폭 max-w-6xl(1152)
//   섹션   위아래 80(py-20) · 좌우 16(px-4)
//   본문   소개·기능 max-w-5xl(1024) / 시작 유도 max-w-xl(576) / FAQ max-w-2xl(672)
//
// 색은 우리 토큰으로 옮겨 적는다 — 실서비스의 gray-*/blue-*가 곧 ink-*/brand-*다.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from '../components/icons.jsx'
import { cx } from '../components/ui.jsx'

/* 캐러셀은 네 장이 돈다. 가운데 한 장이 크고, 좌우로 한 장씩 걸쳐 보인다. */
const features = [
  {
    id: 'document',
    title: 'AI 법률 문서 생성',
    description: '소송 유형 및 사용자 상황을 분석하여 소장, 준비서면 등 주요 법률 문서를 자동 생성합니다.',
    image: '/figma/landing/raw-07.png',
  },
  {
    id: 'precedent',
    title: '판례·법령 분석',
    description: '관련 판례 및 법령을 검색하고 핵심내용을 요약하여 제공합니다.',
    image: '/figma/landing/raw-06.png',
  },
  {
    id: 'procedure',
    title: '소송 절차 안내',
    description: '소송 진행 단계, 기일 일정, 제출 서류 등 필요한 절차를 단계별로 안내합니다.',
    image: '/figma/landing/raw-11.png',
  },
  {
    id: 'evidence',
    title: '증빙 자료 관리',
    description: '증거자료 업로드 및 분류 기능과 제출 여부 확인을 위한 체크 기능을 제공합니다.',
    image: '/figma/landing/raw-02.png',
  },
]

const faqs = [
  {
    q: '나홀로법에는 어떤 서비스인가요?',
    a: '나홀로법에는 변호사 없이 직접 소송을 준비하는 분들을 위한 AI 기반 법률 지원 플랫폼입니다. 소장 및 준비서면 작성, 판례·법령 분석, 절차 안내, 증빙자료 관리 등 소송 준비에 필요한 모든 과정을 한곳에서 지원합니다.',
  },
  {
    q: 'AI가 생성한 법률 문서를 그대로 사용해도 되나요?',
    a: 'AI가 생성한 문서는 초안으로 활용하시되, 반드시 본인의 상황에 맞게 검토하고 수정하셔야 합니다. 제출 전 사건번호·당사자·금액·청구 내용과 기한을 법원 원문과 대조해 주세요. 본 서비스는 법률 자문을 대체하지 않으며, 참고 자료로만 활용하시기 바랍니다.',
  },
  {
    q: '어떤 종류의 소송에 도움을 받을 수 있나요?',
    a: '민사소송, 소액사건, 가압류·가처분 등 다양한 소송 유형을 지원합니다. 다만, 형사사건이나 고도로 전문적인 법률 분쟁의 경우 변호사의 조력을 받으시는 것을 권장드립니다.',
  },
  {
    q: '유사 판례는 어떻게 보여주나요?',
    a: '입력한 사건 쟁점과 텍스트 관련성이 높은 공개 판례를 보여주며, 승소 확률로 표현하지 않습니다. 기본 이용자는 최대 5건, 프리미엄 이용자는 검색된 전체 결과를 원문 링크와 함께 볼 수 있습니다.',
  },
  {
    q: '법률 문서 작성 경험이 전혀 없어도 이용할 수 있나요?',
    a: '네, 가능합니다. 나홀로법에는 법률 지식이 없는 분들도 쉽게 이용하실 수 있도록 설계되었습니다. 단계별 안내와 쉬운 용어 설명을 통해 처음 소송을 준비하시는 분들도 부담 없이 시작하실 수 있습니다.',
  },
]

/* ── 캐러셀 한 칸의 자리 ─────────────────────────────────────
   가운데는 450×320, 좌우는 250×270. 컨테이너 한가운데를 기준으로
   가로 ±289 · 세로 살짝 위로 올려 세 장이 어긋나게 겹친다.
   네 번째 장은 왼쪽 자리에 투명하게 세워 둔다 — 다음 회전에서 그대로 걸어 나온다. */
const SLOT = {
  center: { className: 'z-10 h-[320px] w-[450px] opacity-100', style: { transform: 'translate(-225px, -120px)' } },
  left: { className: 'z-0 h-[270px] w-[250px] opacity-100', style: { transform: 'translate(-414px, -148.5px)' } },
  right: { className: 'z-0 h-[270px] w-[250px] opacity-100', style: { transform: 'translate(164px, -148.5px)' } },
  hidden: { className: 'z-0 h-[270px] w-[250px] opacity-0', style: { transform: 'translate(-414px, -148.5px)' } },
}

const slotOf = (index, active, total) => {
  const offset = (index - active + total) % total
  if (offset === 0) return 'center'
  if (offset === 1) return 'right'
  if (offset === total - 1) return 'left'
  return 'hidden'
}

function CarouselArrow({ direction, onClick }) {
  const prev = direction === 'prev'
  return (
    <button
      type="button"
      aria-label={prev ? '이전 기능' : '다음 기능'}
      onClick={onClick}
      className={cx(
        'absolute top-1/2 z-20 -translate-y-1/2 text-ink-100 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300',
        prev ? 'left-[10px]' : 'right-[10px]',
      )}
    >
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {prev ? <path d="M15 5 8 12l7 7" /> : <path d="M9 5l7 7-7 7" />}
      </svg>
    </button>
  )
}

function FaqItem({ item, open, onToggle }) {
  return (
    <div className="border-b border-ink-200 last:border-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-6 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <span className="text-[16px] font-semibold text-ink-700">{item.q}</span>
        <ChevronDown size={20} className={cx('shrink-0 text-ink-400 transition-transform duration-300', open && 'rotate-180')} />
      </button>
      {/* 여닫을 때 높이를 grid로 재면 내용 길이를 몰라도 부드럽게 열린다 */}
      <div className={cx('grid transition-[grid-template-rows] duration-300 ease-in-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <p className="pb-5 pr-6 text-sm leading-relaxed text-ink-600">{item.a}</p>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const [slide, setSlide] = useState(0)
  const [openFaq, setOpenFaq] = useState(-1)
  const current = features[slide]

  const move = (direction) => setSlide((value) => (value + direction + features.length) % features.length)

  return (
    <div className="bg-white">
      {/* ── 히어로 ── */}
      <section id="home" className="relative flex h-[560px] items-center justify-center overflow-hidden sm:h-[656px]">
        <img
          src="/figma/landing/raw-01.png"
          alt="법률 문서를 준비하는 작업 공간"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-ink-900/35" />
        <div className="relative z-10 px-4 text-center text-white">
          <h1 className="mb-4 text-[32px] font-bold leading-tight tracking-[-0.02em] sm:text-4xl">
            혼자 준비하는 소송의 시작<br />가장 든든한 법률 파트너와 함께
          </h1>
          <p className="mb-8 text-base text-ink-50 sm:text-lg">복잡한 소송 절차부터 문서 작성까지, AI가 단계별로 함께 도와드립니다</p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-[10px] rounded-[8px] border border-white/50 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur-[5px] transition-colors hover:bg-white hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span>지금 시작하기</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* ── 서비스 소개 ── */}
      <section id="service" className="scroll-mt-16 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-bold text-ink-900">혼자 준비하는 소송을 위해</h2>
            <p className="text-ink-700">나홀로 소송에 꼭 필요한 법률 서류를 한곳에서 제공합니다</p>
          </div>
          <div className="flex flex-col items-center gap-10 sm:flex-row">
            <div className="flex-shrink-0 sm:w-[45%]">
              <div className="aspect-[16/9] overflow-hidden rounded-xl">
                <img
                  src="/figma/landing/raw-04.jpeg"
                  alt="법과 정의를 상징하는 정의의 여신상"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <div className="space-y-5 sm:flex-1">
              <p className="text-[15px] leading-relaxed text-ink-700">
                나홀로 소송은 변호사 없이 직접 준비해야 하는 만큼, 절차를 이해하고 필요한 서류를 준비하는 과정이 쉽지 않습니다.
              </p>
              <p className="text-[15px] leading-relaxed text-ink-700">
                나홀로법에는 이러한 부담을 덜기 위해 만들어진 <span className="font-semibold text-ink-900">AI 기반 나홀로 소송 지원 서비스</span> 입니다.
              </p>
              <p className="text-[15px] leading-relaxed text-ink-700">
                문서 작성부터 판례·법령 분석, 절차 안내, 증빙자료 관리까지 소송 준비에 필요한 모든 과정을 한곳에서 쉽고 명확하게 도와드립니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 기능 캐러셀 ── */}
      <section id="guide" className="scroll-mt-16 overflow-x-hidden bg-ink-50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="mb-3 text-2xl font-bold text-ink-900">소송 준비, 이렇게 도와드려요</h2>
            <p className="text-ink-700">나홀로 소송에 필요한 모든 기능을 하나의 플랫폼에서</p>
          </div>

          <div className="relative">
            <div className="relative mx-auto h-[420px] w-[810px] max-w-full">
              {features.map((item, index) => {
                const slot = SLOT[slotOf(index, slide, features.length)]
                return (
                  <div
                    key={item.id}
                    aria-hidden={slot === SLOT.hidden}
                    className={cx(
                      'absolute left-1/2 top-1/2 overflow-hidden rounded-lg transition-all duration-500 ease-out',
                      slot.className,
                    )}
                    style={slot.style}
                  >
                    <img src={item.image} alt="" className="h-full w-full object-cover" />
                  </div>
                )
              })}
              <CarouselArrow direction="prev" onClick={() => move(-1)} />
              <CarouselArrow direction="next" onClick={() => move(1)} />
            </div>

            <div className="mt-4 text-center">
              <h3 className="mb-1 text-lg font-bold text-ink-900">{current.title}</h3>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-ink-500">{current.description}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 시작 유도 ── */}
      <section className="bg-brand-900 px-4 py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="mb-[28px] text-2xl font-bold text-ink-50">지금 바로 시작하세요</h2>
          <p className="mb-[24px] leading-relaxed text-ink-50">복잡한 소송 준비, 나홀로법에와 함께라면 쉽고 간편합니다</p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 rounded-[8px] border border-white/50 bg-white/10 px-5 py-4 text-white backdrop-blur-[5px] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            무료로 시작하기 →
          </Link>
        </div>
      </section>

      {/* ── 자주 묻는 질문 ── */}
      <section id="faq" className="scroll-mt-16 px-4 py-20">
        <div className="mx-auto max-w-2xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-bold text-ink-900">자주 묻는 질문</h2>
            <p className="text-ink-700">나홀로법에 서비스에 대해 궁금하신 점을 확인해보세요</p>
          </div>
          <div>
            {faqs.map((item, index) => (
              <FaqItem
                key={item.q}
                item={item}
                open={openFaq === index}
                onToggle={() => setOpenFaq(openFaq === index ? -1 : index)}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
