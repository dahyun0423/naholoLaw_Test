import { useState } from 'react'
import { Button, Card, SectionHeading, Badge, cx } from '../components/ui.jsx'
import { features, faqs } from '../data/mock.js'
import { ArrowRight, ChevronDown, Scroll, Book, Scale, Folder, Calendar, Sparkles, Check } from '../components/icons.jsx'

const iconMap = { Scroll, Book, Scale, Folder, Calendar, Sparkles }

const steps = [
  { n: '01', title: '상황 입력', desc: '소송 유형과 내 상황을 일상 언어로 입력하면 AI가 사건을 분석합니다.' },
  { n: '02', title: '절차 안내', desc: '소장 접수부터 판결까지 단계별로 필요한 서류와 기한을 안내받습니다.' },
  { n: '03', title: '문서 생성', desc: 'AI가 소장·준비서면·증거목록 등 법률 문서 초안을 자동으로 작성합니다.' },
  { n: '04', title: '제출·관리', desc: '판례로 주장을 보강하고, 증거와 일정을 관리하며 소송을 진행합니다.' },
]

const stats = [
  { value: '70%+', label: '변호사 없이 진행되는 민사 본안 사건' },
  { value: '80%+', label: '3천만원 이하 소액사건의 나홀로 소송 비율' },
  { value: '24시간', label: '언제든 이용 가능한 AI 법률 지원' },
]

function FaqItem({ item, open, onToggle }) {
  return (
    <div className="border-b border-ink-200">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-4 py-5 text-left">
        <span className="text-[17px] font-semibold text-ink-800">{item.q}</span>
        <ChevronDown size={20} className={cx('shrink-0 text-ink-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <p className="pb-5 -mt-1 text-[15px] leading-relaxed text-ink-600">{item.a}</p>}
    </div>
  )
}

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(0)

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-700 to-brand-500 text-white">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative mx-auto max-w-6xl px-5 py-24 sm:py-32 text-center">
          <Badge tone="blue" className="bg-white/15 text-white">⚖️ AI 기반 나홀로 소송 지원 플랫폼</Badge>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-[56px] sm:leading-[1.15]">
            혼자 준비하는 소송의 시작<br />가장 든든한 법률 파트너와 함께
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/85">
            복잡한 소송 절차부터 문서 작성까지, AI가 단계별로 함께 도와드립니다.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button to="/signup" size="lg" variant="glass" className="font-semibold">
              지금 시작하기 <ArrowRight size={18} />
            </Button>
            <Button to="/about" size="lg" variant="ghost" className="text-white hover:bg-white/10">
              서비스 소개 보기
            </Button>
          </div>

          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/10 p-5 backdrop-blur">
                <div className="text-3xl font-bold">{s.value}</div>
                <div className="mt-1 text-sm text-white/75">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading title="혼자 준비하는 소송을 위해" sub="나홀로 소송에 꼭 필요한 법률 지원을 한곳에서 제공합니다." />
            <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-ink-700">
              <p>나홀로 소송은 변호사 없이 직접 준비해야 하는 만큼, 절차를 이해하고 필요한 서류를 준비하는 과정이 쉽지 않습니다.</p>
              <p><b className="font-semibold text-ink-900">나홀로법에</b>는 이러한 부담을 덜기 위해 만들어진 <b className="font-semibold text-brand-500">AI 기반 나홀로 소송 지원 서비스</b>입니다.</p>
              <p>문서 작성부터 판례·법령 분석, 절차 안내, 증빙자료 관리까지 — 소송 준비에 필요한 모든 과정을 한곳에서 쉽고 명확하게 도와드립니다.</p>
            </div>
            <Button to="/about" variant="soft" className="mt-7">제안 배경 자세히 보기 <ArrowRight size={16} /></Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Scroll, t: '문서 자동 생성', d: '소장·준비서면' },
              { icon: Scale, t: '판례 분석', d: '유사 판례·참고 정보' },
              { icon: Book, t: '절차 안내', d: '단계별 가이드' },
              { icon: Folder, t: '증거 관리', d: '호증 번호 체계' },
            ].map((c) => (
              <Card key={c.t} className="p-6">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-400"><c.icon size={24} /></div>
                <div className="mt-4 font-bold text-ink-900">{c.t}</div>
                <div className="mt-1 text-sm text-ink-500">{c.d}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-ink-50 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHeading center title="소송 준비, 이렇게 도와드려요" sub="나홀로 소송에 필요한 모든 기능을 하나의 플랫폼에서." />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = iconMap[f.icon] || Sparkles
              return (
                <Card key={f.title} className="p-7 transition-shadow hover:shadow-md">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-300 text-white"><Icon size={24} /></div>
                  <h3 className="mt-5 text-lg font-bold text-ink-900">{f.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{f.desc}</p>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Process */}
      <section id="process" className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
        <SectionHeading center title="이용 절차" sub="4단계로 끝나는 AI 소송 준비." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              <Card className="h-full p-6">
                <div className="text-3xl font-extrabold text-brand-200">{s.n}</div>
                <h3 className="mt-3 text-lg font-bold text-ink-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{s.desc}</p>
              </Card>
              {i < steps.length - 1 && (
                <ArrowRight className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-ink-300 lg:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Legal notice band */}
      <section className="mx-auto max-w-6xl px-5 pb-4">
        <Card className="flex flex-col items-start gap-4 border-brand-100 bg-brand-50/50 p-7 sm:flex-row sm:items-center">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-brand-400"><Check size={26} /></div>
          <div className="flex-1">
            <h3 className="font-bold text-ink-900">변호사법을 준수하는 ‘도구’로서의 서비스</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-600">
              나홀로법에는 변호사의 역할을 대체하지 않습니다. 객관적인 법률 ‘정보’와 문서 작성을 ‘보조’하는 도구로서,
              나홀로 소송인이 최소한의 법적 요건을 갖추도록 돕습니다.
            </p>
          </div>
          <Button to="/about" variant="outline" className="shrink-0">법적 검토 보기</Button>
        </Card>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="rounded-3xl bg-brand-700 px-6 py-16 text-center text-white">
          <h2 className="text-3xl font-bold sm:text-4xl">지금 바로 시작하세요</h2>
          <p className="mt-3 text-lg text-white/85">복잡한 소송 준비, 나홀로법에와 함께라면 쉽고 간편합니다.</p>
          <Button to="/signup" size="lg" variant="glass" className="mt-8">무료로 시작하기 <ArrowRight size={18} /></Button>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
        <SectionHeading center title="자주 묻는 질문" sub="나홀로법에 서비스에 대해 궁금하신 점을 확인해보세요." />
        <div className="mt-10">
          {faqs.map((f, i) => (
            <FaqItem key={i} item={f} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
          ))}
        </div>
      </section>
    </>
  )
}
