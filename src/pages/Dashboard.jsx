import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { Card, Button, cx } from '../components/ui.jsx'
import Modal from '../components/Modal.jsx'
import {
  ArrowRight, Check, Clock, Video, Book, Scroll, HelpCircle, Sparkles, ChevronRight,
} from '../components/icons.jsx'

/* ── Figma 200:24198 픽셀 기준 + 전체 인터랙션 ──────────────── */

const stats = [
  { label: '진행 중인 사건', value: '2건', sub: '1건 기일 임박', to: '/app/procedure' },
  { label: '다음 변론기일', value: 'D-3', sub: '7월 1일', to: '/app/schedule' },
  { label: '생성한 문서', value: '7', sub: '2개 제출 완료', to: '/app/documents' },
  { label: '등록된 증거', value: '14', sub: '갑호증 9개', to: '/app/evidence' },
]

const aiTasks = [
  { label: '준비서면 작성 권장', tag: '긴급', tagTone: 'urgent', to: '/app/documents', msg: '문서 생성에서 준비서면을 작성하세요' },
  { label: '증거 보완 권장', to: '/app/evidence', msg: '증빙 자료에서 보완이 필요한 증거를 확인하세요' },
  { label: '답변 예정', tag: '권장하기', tagTone: 'soft', to: '/app/documents', msg: '답변서 작성을 시작합니다' },
]

const week = [
  { d: '월', n: 18 }, { d: '화', n: 19 }, { d: '수', n: 20 }, { d: '목', n: 21 },
  { d: '금', n: 22 }, { d: '토', n: 23 }, { d: '일', n: 24 },
]
const timeline = [
  { title: '소장 제출 기한', date: '2026-05-17', state: 'done' },
  { title: '증거 자료 정리', date: '2026-05-18', state: 'done' },
  { title: '준비 서면 작성', date: '2026-05-20', state: 'current' },
]

const recent = [
  { title: '소송비용 산출서 확인완료', dday: 'D-2', desc: '인지대 등 비용 산출 완료', to: '/app/procedure' },
  { title: '증거 목록서 작성 완료', dday: 'D-7', desc: '주요증거 정리완료', to: '/app/evidence' },
  { title: '준비서면 제출 기한 안내', dday: 'D-7', desc: '변론 전 필수 서류 안내', to: '/app/documents' },
]
const allActivity = [
  ...recent,
  { title: '제1회 변론기일 등록', dday: 'D-3', desc: '서울중앙지방법원 327호 14:00' },
  { title: '상대방 답변서 수령', dday: '완료', desc: 'AI가 쟁점을 분석했습니다' },
  { title: '소장 접수 완료', dday: '완료', desc: '사건번호 2024가단123456 부여' },
]

const helpItems = [
  { title: '준비서면 작성 방법 (동)', type: '동영상', icon: Video, tone: 'text-violet-500 bg-violet-50', body: '상대방 주장에 효과적으로 반박하는 준비서면 작성 방법을 영상으로 안내합니다. 쟁점 정리 → 반박 논리 구성 → 증거 인용 순서로 따라 해보세요.' },
  { title: '소송 진행 절차 (가이드)', type: '가이드', icon: Book, tone: 'text-brand-400 bg-brand-50', body: '소장 접수 → 답변서 확인 → 변론 준비 → 변론기일 → 판결 선고까지, 민사 소송의 전체 흐름과 각 단계 준비물을 정리했습니다.' },
  { title: '소장 (템플릿)', type: '템플릿', icon: Scroll, tone: 'text-emerald-500 bg-emerald-50', body: '바로 사용할 수 있는 소장 표준 양식입니다. 당사자 표시, 청구취지, 청구원인, 입증방법 항목이 포함되어 있습니다.' },
  { title: '기일변경신청서 (템플릿)', type: '템플릿', icon: Scroll, tone: 'text-emerald-500 bg-emerald-50', body: '부득이한 사정으로 변론기일 변경이 필요할 때 제출하는 신청서 양식입니다.' },
]
const typePill = { 동영상: 'bg-violet-50 text-violet-500', 가이드: 'bg-brand-50 text-brand-500', 템플릿: 'bg-emerald-50 text-emerald-600' }

const popular = [
  { q: '재판 준비서면 작성 방법은?', v: 512, a: '준비서면은 상대방의 주장에 대한 반박과 본인 주장의 근거를 정리하는 서면입니다. ① 상대방 주장 요지 정리 → ② 쟁점별 반박 → ③ 관련 판례·증거 인용 순으로 작성하세요. 문서 생성에서 AI 도움을 받을 수 있습니다.' },
  { q: '다음 방법을 추가로 제출하려면?', v: 324, a: '추가 증거나 서면은 변론종결 전까지 제출할 수 있습니다. 문서 생성에서 준비서면을 작성하고, 증빙 자료에서 새 증거를 등록한 뒤 절차 안내의 [서류 업로드]로 제출하세요.' },
  { q: '증거 제출은 왜 중요할까요?', v: 289, a: '민사소송은 주장하는 사람이 입증 책임을 집니다. 계약서·이체내역·문자 등 객관적 증거가 충분할수록 승소 가능성이 높아집니다. 갑 제1호증부터 번호를 매겨 체계적으로 제출하세요.' },
  { q: '준비서면 작성시 주의할 점은?', v: 156, a: '감정적 표현보다 사실과 법리 중심으로 간결하게 작성하세요. 새로운 주장은 근거(증거·판례)와 함께 제시하고, 제출 기한을 반드시 지켜야 합니다.' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [help, setHelp] = useState(null)
  const [faq, setFaq] = useState(null)
  const [activityOpen, setActivityOpen] = useState(false)

  const go = (to, msg) => { if (msg) toast(msg); navigate(to) }

  return (
    <div className="space-y-5">
      {/* greeting */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-[22px] font-bold text-ink-900">안녕하세요, {user?.name}님</h1>
          <p className="mt-1 text-sm text-ink-500">진행 중인 사건 2건 | 다음 기일까지 <b className="text-[#f04452]">D-3</b></p>
        </div>
        <div className="text-right text-xs text-ink-400">
          <p>2026년 5월 28일 목요일</p>
          <p className="mt-0.5">오전 9:12</p>
        </div>
      </div>

      {/* AI 제안 영역 (2단) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-[20px] bg-[#e8f3ff] p-6 lg:col-span-2">
          <button onClick={() => go('/app/documents', '준비서면 작성을 시작합니다')} className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-[10px] border border-[#cfe2ff] bg-white px-3.5 py-2 text-sm font-semibold text-[#1b64da] hover:bg-[#f5f9ff]">
            바로 작성하러 가기 <ArrowRight size={15} />
          </button>
          <h2 className="text-2xl font-bold leading-snug text-[#1b3a6b]">준비서면 제출 D-3</h2>
          <p className="mt-1 text-2xl font-bold leading-snug text-[#1b3a6b]">지금 바로 작성하세요!</p>
          <p className="mt-4 text-[13px] text-ink-500">서울중앙지방법원 2024가단12345 | 7월 1일(월) 오전 10시까지 제출</p>
        </div>

        <Card className="rounded-[20px] p-5">
          <div className="flex items-center gap-1.5">
            <Sparkles size={16} className="text-brand-400" />
            <h3 className="text-sm font-bold text-ink-900">AI가 제안 주요 작업</h3>
          </div>
          <div className="mt-3 space-y-2">
            {aiTasks.map((t) => (
              <button key={t.label} onClick={() => go(t.to, t.msg)} className="flex w-full items-center justify-between rounded-[10px] bg-[#f7f9ff] px-3 py-2.5 text-left transition-colors hover:bg-[#e8f3ff]">
                <span className="text-sm font-medium text-ink-700">{t.label}</span>
                <span className="flex items-center gap-1.5">
                  {t.tag && (
                    <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-bold', t.tagTone === 'urgent' ? 'bg-[#f04452] text-white' : 'bg-brand-50 text-brand-500')}>{t.tag}</span>
                  )}
                  <ChevronRight size={15} className="text-ink-300" />
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* 통계 카드 4 */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <button key={s.label} onClick={() => navigate(s.to)} className="rounded-[20px] border border-[#e8f3ff] bg-[#f7f9ff] p-5 text-left transition-all hover:border-brand-200 hover:shadow-sm">
            <p className="text-sm text-ink-600">{s.label}</p>
            <p className="mt-2 text-[30px] font-bold leading-none text-ink-900">{s.value}</p>
            <span className="mt-3 inline-block rounded-full bg-white px-2.5 py-1 text-xs text-ink-500">{s.sub}</span>
          </button>
        ))}
      </div>

      {/* 하단 그리드 */}
      <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
        {/* 다가오는 일정 */}
        <Card className="rounded-[20px] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-ink-400">May 20, 2026</p>
              <h3 className="mt-0.5 font-bold text-ink-900">다가오는 일정</h3>
            </div>
            <button onClick={() => navigate('/app/schedule')} className="text-xs font-medium text-brand-400">캘린더 →</button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center">
            {week.map((w) => (
              <button key={w.n} onClick={() => navigate('/app/schedule')} className="group">
                <div className="text-[11px] text-ink-400">{w.d}</div>
                <div className={cx('mx-auto mt-1 grid h-8 w-8 place-items-center rounded-full text-sm group-hover:bg-brand-50', w.n === 20 ? 'bg-brand-300 font-bold text-white group-hover:bg-brand-400' : 'text-ink-600')}>{w.n}</div>
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-2.5">
            {timeline.map((t) => (
              <button key={t.title} onClick={() => navigate('/app/schedule')} className={cx('flex w-full items-center gap-3 rounded-[12px] p-3 text-left transition-opacity hover:opacity-90', t.state === 'current' ? 'bg-brand-300 text-white' : 'bg-[#f7f9ff]')}>
                <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full', t.state === 'current' ? 'bg-white/25 text-white' : 'bg-emerald-50 text-emerald-500')}>
                  {t.state === 'done' ? <Check size={15} /> : <Clock size={15} />}
                </span>
                <div>
                  <p className={cx('text-sm font-semibold', t.state === 'current' ? 'text-white' : 'text-ink-800')}>{t.title}</p>
                  <p className={cx('text-xs', t.state === 'current' ? 'text-white/80' : 'text-ink-400')}>{t.date}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-5 border-t border-ink-100 pt-4">
            <p className="text-xs font-semibold text-ink-400">완료된 작업</p>
            <div className="mt-2 space-y-1.5">
              {['증거자료 수집', '사건 정리'].map((t) => (
                <p key={t} className="flex items-center gap-1.5 text-sm text-ink-400"><Check size={14} className="text-emerald-400" /> {t}</p>
              ))}
            </div>
          </div>
        </Card>

        {/* 우측 */}
        <div className="space-y-5">
          <Card className="rounded-[20px] p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink-900">최근 활동</h3>
              <button onClick={() => setActivityOpen(true)} className="text-xs font-medium text-brand-400">전체보기 →</button>
            </div>
            <div className="mt-4 space-y-1">
              {recent.map((a) => (
                <button key={a.title} onClick={() => go(a.to, '관련 화면으로 이동합니다')} className="flex w-full items-start gap-3 rounded-xl p-2 text-left hover:bg-ink-50">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-300" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink-800">{a.title} <span className="ml-1 text-xs font-medium text-brand-400">({a.dday})</span></p>
                    <p className="text-xs text-ink-500">{a.desc}</p>
                  </div>
                  <ChevronRight size={15} className="mt-1 text-ink-300" />
                </button>
              ))}
            </div>
          </Card>

          <div className="grid gap-5 sm:grid-cols-2">
            <Card className="rounded-[20px] p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-ink-900">도움 콘텐츠</h3>
                <button onClick={() => navigate('/app/guide')} className="text-xs font-medium text-brand-400">더보기 →</button>
              </div>
              <div className="mt-4 space-y-1">
                {helpItems.map((c) => (
                  <button key={c.title} onClick={() => setHelp(c)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-ink-50">
                    <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-lg', c.tone)}><c.icon size={16} /></span>
                    <span className="flex-1 truncate text-sm text-ink-700">{c.title}</span>
                    <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', typePill[c.type])}>{c.type}</span>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="rounded-[20px] p-5">
              <div className="flex items-center gap-1.5">
                <HelpCircle size={16} className="text-brand-400" />
                <h3 className="font-bold text-ink-900">질문이 많은 — 자주 묻는 질문</h3>
              </div>
              <div className="mt-4 space-y-2">
                {popular.map((f) => (
                  <button key={f.q} onClick={() => setFaq(f)} className="block w-full rounded-[10px] bg-[#f7f9ff] px-3 py-2.5 text-left hover:bg-[#e8f3ff]">
                    <p className="text-sm font-medium text-ink-700">{f.q}</p>
                    <p className="mt-0.5 text-[11px] text-ink-400">조회 {f.v}회</p>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* 도움 콘텐츠 모달 */}
      <Modal open={!!help} onClose={() => setHelp(null)} title={help?.title}
        footer={<><Button variant="neutral" onClick={() => setHelp(null)}>닫기</Button><Button onClick={() => { setHelp(null); navigate('/app/guide') }}>가이드에서 보기</Button></>}>
        {help && (
          <div className="space-y-3">
            <span className={cx('inline-block rounded-full px-2.5 py-1 text-xs font-semibold', typePill[help.type])}>{help.type}</span>
            <p className="text-[15px] leading-relaxed text-ink-700">{help.body}</p>
          </div>
        )}
      </Modal>

      {/* FAQ 모달 */}
      <Modal open={!!faq} onClose={() => setFaq(null)} title={faq?.q}
        footer={<Button onClick={() => setFaq(null)}>확인</Button>}>
        {faq && <p className="text-[15px] leading-relaxed text-ink-700">{faq.a}</p>}
      </Modal>

      {/* 전체 활동 모달 */}
      <Modal open={activityOpen} onClose={() => setActivityOpen(false)} title="최근 활동 전체보기" maxW="max-w-lg"
        footer={<Button onClick={() => setActivityOpen(false)}>닫기</Button>}>
        <div className="space-y-1">
          {allActivity.map((a, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-ink-50">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-300" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink-800">{a.title} <span className="ml-1 text-xs font-medium text-brand-400">({a.dday})</span></p>
                <p className="text-xs text-ink-500">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
