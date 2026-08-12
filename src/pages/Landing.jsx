import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronDown } from '../components/icons.jsx'
import { cx } from '../components/ui.jsx'

const slides = [
  {
    title: '증빙 자료 관리',
    description: '사건별 자료를 종류와 제출 상태로 나누어, 필요한 증거를 빠르게 찾고 제출 기한까지 함께 관리해요.',
    image: '/figma/landing/raw-02.png',
  },
  {
    title: 'AI 법률 문서 생성',
    description: '사건에 필요한 정보를 입력하면 소장·준비서면·증거목록 등 법률 문서의 초안을 자동으로 작성해요.',
    image: '/figma/landing/raw-07.png',
  },
  {
    title: '판례·법령 분석',
    description: '내 사건의 쟁점을 기준으로 공개 판례와 관련 법령을 찾아 원문과 함께 확인할 수 있어요.',
    image: '/figma/landing/raw-06.png',
  },
]

const faqs = [
  {
    q: '나홀로법에는 어떤 서비스인가요?',
    a: '변호사 없이 소송을 준비하는 분이 사건 정보, 문서 초안, 증빙자료, 공개 판례·법령, 일정을 한곳에서 정리하도록 돕는 나홀로소송 준비 도구입니다.',
  },
  {
    q: '법률 자문이나 승소 가능성도 알려주나요?',
    a: '아니요. 나홀로법에는 변호사나 법률사무소가 아니며 법률 자문, 소송 전략 판단, 소송대리를 제공하지 않습니다. 복잡하거나 결과의 영향이 큰 사안은 반드시 변호사와 상담해 주세요.',
  },
  {
    q: 'AI가 만든 문서를 그대로 제출해도 되나요?',
    a: '생성 문서는 준비를 돕는 초안입니다. 제출 전 사건번호, 당사자, 금액, 청구 내용과 기한을 법원 원문 및 본인의 자료와 대조하고 필요한 경우 변호사의 검토를 받아야 합니다.',
  },
  {
    q: '유사 판례는 어떻게 보여주나요?',
    a: '입력한 사건 쟁점과 텍스트 관련성이 높은 공개 판례를 보여주며, 승소 확률로 표현하지 않습니다. 기본 이용자는 최대 5건, 프리미엄 이용자는 검색된 전체 결과를 원문 링크와 함께 볼 수 있습니다.',
  },
  {
    q: '법원 통지서의 기한도 자동 등록되나요?',
    a: '통지서에서 날짜와 할 일을 추출해 일정 후보로 제안합니다. 오인식 가능성이 있으므로 사용자가 법원 원문과 확인한 뒤에만 사건 일정으로 등록됩니다.',
  },
]

function FaqItem({ item, open, onToggle }) {
  return (
    <div className="border-b border-ink-200">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-6 py-[25px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <span className="text-[16px] font-semibold text-ink-900 sm:text-[17px]">{item.q}</span>
        <ChevronDown size={21} className={cx('shrink-0 text-ink-500 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <p className="max-w-[940px] pb-6 pr-12 text-[14px] leading-7 text-ink-600 sm:text-[15px]">{item.a}</p>}
    </div>
  )
}

export default function Landing() {
  const [slide, setSlide] = useState(1)
  const [openFaq, setOpenFaq] = useState(-1)
  const current = slides[slide]
  const previous = slides[(slide + slides.length - 1) % slides.length]
  const next = slides[(slide + 1) % slides.length]

  const move = (direction) => setSlide((value) => (value + direction + slides.length) % slides.length)

  return (
    <div className="overflow-hidden bg-white">
      <section className="relative flex min-h-[560px] items-center justify-center overflow-hidden text-center text-white sm:min-h-[656px]">
        <img src="/figma/landing/raw-01.png" alt="법률 문서를 준비하는 작업 공간" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[#292929]/45" />
        <div className="relative z-10 mx-auto max-w-[850px] px-5 pt-2">
          <h1 className="text-[36px] font-bold leading-[1.24] tracking-[-0.03em] sm:text-[48px]">
            혼자 준비하는 소송의 시작<br />가장 든든한 법률 파트너와 함께
          </h1>
          <p className="mt-6 text-[16px] font-medium text-white/90 sm:text-[18px]">복잡한 소송 절차부터 문서 작성까지, AI가 단계별로 함께 도와드립니다.</p>
          <Link
            to="/signup"
            className="mt-9 inline-flex h-[52px] items-center gap-3 rounded-[15px] border border-white/65 bg-white/10 px-7 text-[15px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            지금 시작하기 <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-[1222px] px-5 py-[92px] sm:py-[112px]">
        <div className="text-center">
          <h2 className="text-[30px] font-bold tracking-[-0.025em] text-ink-900 sm:text-[36px]">혼자 준비하는 소송을 위해</h2>
          <p className="mt-3 text-[16px] text-ink-500">나홀로 소송에 꼭 필요한 법률 지원을 한곳에서 제공합니다.</p>
        </div>
        <div className="mt-[58px] grid items-center gap-10 lg:grid-cols-[731px_1fr] lg:gap-[51px]">
          <img src="/figma/landing/raw-04.jpeg" alt="법과 정의를 상징하는 정의의 여신상" className="h-[360px] w-full rounded-[16px] object-cover sm:h-[400px]" />
          <div className="text-[15px] leading-[1.9] text-ink-700">
            <p>나홀로 소송은 변호사 없이 직접 준비해야 하는 만큼, 절차를 이해하고 필요한 서류를 준비하는 과정이 쉽지 않습니다.</p>
            <p className="mt-5"><b className="font-semibold text-ink-900">나홀로법에</b>는 이러한 부담을 덜기 위해 만들어진 <b className="font-semibold text-brand-500">AI 기반 나홀로 소송 준비 서비스</b>입니다.</p>
            <p className="mt-5">문서 작성부터 판례·법령 확인, 절차 안내, 증빙자료와 일정 관리까지 필요한 과정을 하나의 사건 안에서 쉽고 명확하게 연결합니다.</p>
          </div>
        </div>
      </section>

      <section id="features" className="bg-ink-50 py-[92px] sm:py-[112px]">
        <div className="mx-auto max-w-[1440px] px-5 text-center">
          <h2 className="text-[30px] font-bold tracking-[-0.025em] text-ink-900 sm:text-[36px]">소송 준비, 이렇게 도와드려요</h2>
          <p className="mt-3 text-[16px] text-ink-500">나홀로 소송에 필요한 모든 기능을 하나의 플랫폼에서.</p>

          <div className="relative mx-auto mt-[62px] flex h-[650px] max-w-[1440px] items-center justify-center sm:h-[690px]">
            <div className="absolute left-[-235px] hidden h-[400px] w-[365px] overflow-hidden rounded-[18px] opacity-65 lg:block xl:left-[-120px]">
              <img src={previous.image} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="relative z-10 w-full max-w-[700px]">
              <div className="h-[460px] overflow-hidden rounded-[18px] bg-white shadow-[0_20px_60px_rgba(25,31,40,0.12)] sm:h-[484px]">
                <img src={current.image} alt="" className="h-full w-full object-cover" />
              </div>
              <h3 className="mt-9 text-[22px] font-bold text-ink-900 sm:text-[24px]">{current.title}</h3>
              <p className="mx-auto mt-3 max-w-[590px] text-[14px] leading-7 text-ink-600 sm:text-[15px]">{current.description}</p>
            </div>
            <div className="absolute right-[-235px] hidden h-[400px] w-[365px] overflow-hidden rounded-[18px] opacity-65 lg:block xl:right-[-120px]">
              <img src={next.image} alt="" className="h-full w-full object-cover" />
            </div>
            <button type="button" aria-label="이전 기능" onClick={() => move(-1)} className="absolute left-1 top-[235px] z-20 grid h-12 w-12 place-items-center rounded-full bg-white text-ink-700 shadow-lg transition hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 sm:left-[calc(50%-390px)]"><ArrowLeft /></button>
            <button type="button" aria-label="다음 기능" onClick={() => move(1)} className="absolute right-1 top-[235px] z-20 grid h-12 w-12 place-items-center rounded-full bg-white text-ink-700 shadow-lg transition hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 sm:right-[calc(50%-390px)]"><ArrowRight /></button>
          </div>
        </div>
      </section>

      <section id="process" className="mx-auto max-w-[1440px] px-5 py-[88px] sm:px-20 sm:py-[112px]">
        <div className="rounded-[30px] bg-brand-900 px-6 py-[76px] text-center text-white sm:py-[88px]">
          <h2 className="text-[30px] font-bold tracking-[-0.025em] sm:text-[36px]">지금 바로 시작하세요</h2>
          <p className="mt-4 text-[16px] text-white/80 sm:text-[17px]">복잡한 소송 준비, 나홀로법에와 함께라면 더 쉽고 명확해집니다.</p>
          <Link to="/signup" className="mt-8 inline-flex h-[52px] items-center gap-3 rounded-[15px] border border-white/65 bg-white/10 px-7 text-[15px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            무료로 시작하기 <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-[1040px] px-5 pb-[110px] pt-[26px] sm:pb-[140px]">
        <div className="text-center">
          <h2 className="text-[30px] font-bold tracking-[-0.025em] text-ink-900 sm:text-[36px]">자주 묻는 질문</h2>
          <p className="mt-3 text-[16px] text-ink-500">가이드로 보내지 않고, 가장 많이 묻는 내용을 이곳에서 바로 답해드려요.</p>
        </div>
        <div className="mt-[48px] border-t border-ink-200">
          {faqs.map((item, index) => (
            <FaqItem key={item.q} item={item} open={openFaq === index} onToggle={() => setOpenFaq(openFaq === index ? -1 : index)} />
          ))}
        </div>
      </section>
    </div>
  )
}
