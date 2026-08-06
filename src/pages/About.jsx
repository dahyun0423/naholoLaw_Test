import { Card, Badge, Button, SectionHeading } from '../components/ui.jsx'
import { ArrowRight, Scale, Shield, FileText, Book, AlertTriangle, Check } from '../components/icons.jsx'

function Block({ id, kicker, title, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      {kicker && <div className="text-sm font-bold text-brand-400">{kicker}</div>}
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{title}</h2>
      <div className="mt-5 space-y-4 text-[15px] leading-[1.85] text-ink-700">{children}</div>
    </section>
  )
}

function Bullet({ title, children }) {
  return (
    <div className="flex gap-3">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" />
      <p><b className="font-semibold text-ink-900">{title}</b> {children}</p>
    </div>
  )
}

export default function About() {
  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-4xl px-5 py-16 sm:py-20 text-center">
          <Badge tone="blue">프로젝트 소개</Badge>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-ink-900 sm:text-[42px] sm:leading-tight">
            AI 기반 나홀로 소송 지원 플랫폼<br />‘나홀로법에’
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-600">
            변호사 없이 소송을 진행하는 국민이 절차를 이해하고 정당한 권리를 효과적으로 행사할 수 있도록 돕는
            공공적 성격의 AI 법률 지원 솔루션입니다.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-16 px-5 py-16">
        {/* 제안 배경 */}
        <Block id="bg" kicker="1. 제안 배경" title="왜 나홀로 소송 지원이 필요한가">
          <p>
            최근 민사소송의 상당수가 변호사를 선임하지 않고 개인이 직접 진행하는 <b className="font-semibold text-ink-900">‘나홀로 소송’</b> 형태로 이루어지고 있습니다.
            그러나 일반 국민에게 소송 절차와 법률 문서는 매우 복잡하며, 소장 작성·증거 정리·판례 조사 등에서 큰 어려움을 겪는 경우가 많습니다.
          </p>
          <p>
            기존 법률 정보 서비스는 대부분 단순한 정보 검색이나 판례 조회 기능에 머물러 있어, 실제 소송 진행 과정에서 필요한
            <b className="font-semibold text-ink-900"> 문서 작성 지원과 절차 안내 기능이 부족</b>한 상황입니다.
            이에 따라 법률 절차를 보다 쉽게 이해하고 수행할 수 있도록 돕는 AI 기반 나홀로 소송 지원 시스템의 필요성이 커지고 있습니다.
          </p>
        </Block>

        {/* 핵심 통계 카드 */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { v: '70% 이상', l: '민사 본안 사건 중 변호사 없이 진행 (대법원 사법연감)' },
            { v: '80% 이상', l: '3천만원 이하 소액사건의 변호사 미선임 비율' },
            { v: '3% / 12%', l: '美 연방법원 자기대리 원고 / 피고 승소율' },
          ].map((s) => (
            <Card key={s.l} className="p-6">
              <div className="text-2xl font-bold text-brand-500">{s.v}</div>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-500">{s.l}</p>
            </Card>
          ))}
        </div>

        {/* 주요 내용 */}
        <Block id="what" kicker="2. 주요 내용" title="Multi-Agent AI 기반 법률 지원">
          <p>
            본 프로젝트는 <b className="font-semibold text-ink-900">Multi-Agent 기반 AI</b>를 활용하여 나홀로 소송을 지원하는 법률 플랫폼을 개발합니다.
            사용자가 자신의 상황과 소송 유형을 입력하면, AI가 소송 절차를 단계적으로 안내하고, 소장·준비서면 등 필요한 법률 문서를 자동으로 생성하며,
            관련 판례와 법률 정보를 분석하여 제공합니다.
          </p>
          <p>또한 대화형 인터페이스를 통해 사용자가 이해하기 쉬운 방식으로 법률 절차와 준비 사항을 안내하는 AI Agent 기반 서비스를 구현합니다.</p>
          <div className="grid gap-4 pt-2 sm:grid-cols-3">
            {[
              { icon: FileText, t: '문서 에이전트', d: '소장·준비서면 등 문서 초안 자동 작성' },
              { icon: Scale, t: '판례 에이전트', d: '유사 판례·법령 분석 및 참고 정보 제공' },
              { icon: Book, t: '절차 에이전트', d: '단계별 절차·기한·서류 안내' },
            ].map((a) => (
              <Card key={a.t} className="p-5">
                <a.icon className="text-brand-400" size={22} />
                <div className="mt-3 font-bold text-ink-900">{a.t}</div>
                <div className="mt-1 text-sm text-ink-600">{a.d}</div>
              </Card>
            ))}
          </div>
        </Block>

        {/* 목표 */}
        <Block id="goal" kicker="3. 목표" title="국민의 실질적 소송권 보장">
          <p>
            일반 국민이 변호사 없이도 소송 절차를 보다 쉽게 이해하고 진행할 수 있도록 지원하는 AI 기반 법률 지원 솔루션을 구축하는 것을 목표로 합니다.
            이를 통해 문서 작성과 절차 이해의 어려움을 줄이고 법률 정보 접근성을 높이며, 국민이 정당한 권리를 더욱 효과적으로 행사할 수 있도록 돕는
            공공 법률 지원 서비스를 구현하고자 합니다.
          </p>
        </Block>

        {/* 기술적 당위성 */}
        <Block id="tech" kicker="기술적 지원의 당위성" title="사법 분야의 AI 활용은 이미 현실">
          <p>
            인공지능 기술의 발전은 법률 서비스 분야에서 정보 수집·처리·전달 방식에 질적인 변화를 가져오고 있습니다.
            실제로 대법원은 <b className="font-semibold text-ink-900">‘재판지원 AI 시스템’</b>을 시범 오픈하여 법률 리서치와 참고자료 검토 시간을 단축하고,
            재판 업무의 효율성과 편의성을 높이고 있습니다(2026). 이 시스템은 사법부 내부 인프라에 직접 구축되어 보안성과 독립성을 확보했습니다.
          </p>
          <Bullet title="사법 절차의 지연 방지 :">
            법률 지식 부족으로 인한 잘못된 문서 제출이나 증거 미비는 보정 명령을 유발하고 소송 기간을 장기화합니다. AI는 이를 사전에 줄여줍니다.
          </Bullet>
          <Bullet title="국민의 실질적 소송권 보장 :">
            최소한의 법적 요건(청구취지·원인 등)을 갖추도록 돕는 AI 기술은 국민의 재판받을 권리를 실질적으로 보장하는 수단이 됩니다.
          </Bullet>
        </Block>

        {/* 일반 국민의 어려움 */}
        <Block id="barrier" kicker="일반 국민의 법률 절차 이해 어려움" title="높은 진입 장벽">
          <Bullet title="법률 용어 및 실무 절차의 생소함 :">
            소장 제출 → 답변서 확인 → 변론 준비 → 변론기일 출석 → 판결·집행으로 이어지는 절차에서, ‘주소보정명령’ 같은 행정 절차조차 일반인에게는 생소합니다.
          </Bullet>
          <Bullet title="전문 법률 문서 작성의 한계 :">
            소장·준비서면은 엄격한 형식과 논리적 법리 구성을 요구하여, 표준 양식이 있어도 핵심 쟁점에 맞춰 채우는 것 자체가 상당한 지식을 전제로 합니다.
          </Bullet>
          <Bullet title="판례·법령 탐색 및 해석 역량 부족 :">
            방대한 데이터에서 본인 상황에 맞는 판례를 선별·해석하는 일은 비전문가에게 매우 어렵고, 자의적 해석은 예기치 못한 불이익으로 이어질 수 있습니다.
          </Bullet>
        </Block>

        {/* 기존 서비스 한계 */}
        <Block id="limit" kicker="기존 법률 정보 서비스의 한계" title="단순 정보 제공을 넘어">
          <p>
            현재 대부분의 법률 정보 서비스는 단순 정보 제공 또는 판례 검색에 집중되어, 문서 작성 과정이나 소송 절차를 실질적으로 지원하는 기능은 제한적입니다.
            전문 용어 중심으로 제공되어 일반 국민이 이해·활용하기 어려운 경우도 많습니다.
          </p>
          <p>
            챗봇형 서비스(예: 범용 AI)는 전문성을 체감하기 어렵거나 결국 ‘변호사 선임·상담’으로 귀결되도록 설계되어,
            비용 절감과 자기 주도적 분쟁 해결이라는 나홀로 소송의 본질적 취지에 부합하지 않습니다.
            소장·준비서면 작성, 증거 정리 등 <b className="font-semibold text-ink-900">단계별 실무 중심의 지원</b>이 여전히 부족합니다.
          </p>
        </Block>

        {/* 법적 제약 및 대응 */}
        <Block id="legal" kicker="법적 제약 사항 및 대응 방안" title="변호사법을 준수하는 설계">
          <Card className="border-amber-200 bg-amber-50/60 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={20} />
              <p className="text-sm leading-relaxed text-amber-800">
                변호사법 제109조 등은 금품을 받고 타인의 법률사무를 취급하는 행위를 금지하며, 소송대리는 원칙적으로 변호사만 가능합니다.
                본 프로젝트는 이러한 제약을 충분히 인지하고 있습니다.
              </p>
            </div>
          </Card>
          <p>
            우리의 목표는 <b className="font-semibold text-ink-900">변호사의 역할을 대체하는 것이 아니라</b>,
            법률 전문가의 도움을 받기 어려운 나홀로 소송인이 최소한의 법적 요건을 갖추고 권리를 효과적으로 주장하도록
            <b className="font-semibold text-ink-900"> 정보와 도구를 제공</b>하는 데 있습니다.
          </p>
          <div className="space-y-3 pt-1">
            <Bullet title="법률 정보 접근성 강화 :">
              직접적인 자문은 제한되지만 객관적 ‘정보’ 제공 자체는 문제되지 않습니다. 판례·법령·결정례 등 문헌을 기반으로 스스로 판단하도록 돕습니다.
            </Bullet>
            <Bullet title="문서 작성 ‘보조’ 도구 :">
              자문이 아니라 사용자가 직접 작성하는 것을 보조합니다. 상황을 입력하면 요건에 맞는 초안을 생성해 형식적 오류·필수 기재 누락을 방지합니다.
              (서울고법 2025누6423 — AI가 정해진 질문에 따라 문서를 생성하는 것은 변호사법 위반으로 보기 어렵다고 판단)
            </Bullet>
            <Bullet title="절차 안내 및 가이드라인 :">
              각 단계별 필요 서류·제출 방법·기한을 체계적으로 안내합니다. 이는 자문이 아닌 객관적 정보 전달의 영역입니다.
            </Bullet>
            <Bullet title="면책 조항 명시 :">
              제공되는 모든 정보와 생성 문서는 법률 자문이 아니며, 최종 판단과 책임은 이용자의 검토에 따른다는 점을 플랫폼 내에 명확히 합니다.
            </Bullet>
          </div>
        </Block>

        {/* CTA */}
        <Card className="flex flex-col items-center gap-5 bg-brand-700 p-10 text-center text-white">
          <Shield size={36} />
          <h2 className="text-2xl font-bold">권리는 누구에게나 평등해야 합니다</h2>
          <p className="max-w-xl text-white/85">나홀로법에와 함께 복잡한 소송 절차를 한 걸음씩 준비해보세요.</p>
          <Button to="/signup" size="lg" variant="glass">지금 시작하기 <ArrowRight size={18} /></Button>
        </Card>
      </div>
    </>
  )
}
