// 소장 3단계 — 검토·생성 다음의 "그래서 이걸 어디에 내나요?"
// 완성한 PDF를 들고 어디로 가야 하는지 몰라 멈추는 지점을 메운다.
// 전자소송포털은 청구취지·원인을 시스템 안에서 다시 입력받으므로 완전 자동 연동은 불가능하다.
// 그래서 "안내 + 붙여넣을 내용 제공 + 외부 링크"까지가 현실적인 범위.
//
// ── 이 화면의 색 규칙 ───────────────────────────────────────
// 이 화면은 '옮겨 적는 작업대'다. 안내 카드마다 색을 칠하면 정작 옮겨 적을
// 값이 안 보인다. 그래서 면은 흰색·ink-50 둘로 끝내고,
//   파랑 = 지금 할 일(추천안·체크 완료·복사 버튼)
//   빨강 = 되돌릴 수 없는 사고(2,000자 초과로 글이 잘림) 하나뿐
// 나머지 주의사항은 굵은 글씨로만 세운다.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Button, Badge, cx } from './ui.jsx'
import { PrintSheet, printSheet, Rich, DocHeading } from './docform.jsx'
import {
  ArrowLeft, ExternalLink, Copy, Check, FileText, ChevronDown,
} from './icons.jsx'
import { won, costSummary, effectiveSueValue, partyCount, buildPreview } from '../lib/complaint.js'
import { addrOf } from '../lib/docschema.js'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { caseEvidence } from '../lib/casebook.js'
import CaseStatus from './CaseStatus.jsx'
import { ComplaintPaper } from './ComplaintWizard.jsx'
import { courtUrl } from '../data/mock.js'

/** ⟨⟩·⟦⟧ 마킹을 걷어낸 순수 텍스트 — 전자소송 입력창에 붙여넣기 위한 것 */
const plain = (s) => String(s).replace(/⟨([^⟩]*)⟩/g, '$1').replace(/⟦[^⟧]*⟧/g, '(미입력)')

const PORTAL_LIMIT = 2000        // 포털 청구취지·청구원인 입력창 한도 (한글 2,000자)

/* ─────────────────────────── 조각 ─────────────────────────── */

/** 카드 제목 — 이 화면 안에서는 전부 같은 크기·같은 무게로 쓴다 */
function Title({ children, right }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="text-[15px] font-bold text-ink-900">{children}</h3>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  )
}

function CopyBlock({ title, lines, limit }) {
  const [done, setDone] = useState(false)
  const body = lines.map(plain).join('\n')
  const over = limit && body.length > limit
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body)
      setDone(true)
      setTimeout(() => setDone(false), 1800)
    } catch {
      setDone(false)
    }
  }
  return (
    <div className="overflow-hidden rounded-xl border border-ink-200">
      <div className="flex items-center gap-2 bg-ink-50 px-3 py-2">
        <p className="text-[13px] font-semibold text-ink-700">{title}</p>
        {limit && (
          // 글자수는 평소엔 조용히 있다가, 잘리는 순간에만 붉어진다
          <span className={cx('text-[11px] font-semibold tabular-nums', over ? 'text-red-500' : 'text-ink-400')}>
            {body.length.toLocaleString()} / {limit.toLocaleString()}자
          </span>
        )}
        <button
          type="button"
          onClick={copy}
          className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-brand-500 transition-colors hover:bg-brand-50"
        >
          {done ? <><Check size={13} /> 복사됨</> : <><Copy size={13} /> 복사</>}
        </button>
      </div>
      <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap bg-white px-3.5 py-3 font-serif text-[12px] leading-relaxed text-ink-700">{body}</pre>
      {over && (
        <p className="border-t border-ink-200 bg-white px-3.5 py-2 text-[12px] leading-relaxed text-ink-600">
          이대로 붙여넣으면 <b className="font-semibold text-red-500">뒷부분이 잘립니다.</b> 아래 「파일로 저장」을 눌러 파일로 붙이세요.
        </p>
      )}
    </div>
  )
}

/** 한 줄짜리 입력값 — 포털 입력칸 하나에 대응한다 */
function PortalField({ label, value, hint }) {
  const [done, setDone] = useState(false)
  const empty = !value
  const copy = async () => {
    if (empty) return
    try {
      await navigator.clipboard.writeText(String(value))
      setDone(true)
      setTimeout(() => setDone(false), 1500)
    } catch { setDone(false) }
  }
  return (
    <div className="group flex items-start gap-3 border-b border-ink-100 py-2.5 last:border-0">
      <span className="w-[76px] shrink-0 pt-px text-[12px] text-ink-500">{label}</span>
      <span className={cx('min-w-0 flex-1 break-all text-[13px]', empty ? 'text-ink-300' : 'text-ink-800')}>
        {value || '입력하지 않음'}
        {hint && <span className="ml-1 text-[11px] text-ink-400">{hint}</span>}
      </span>
      <button
        type="button"
        onClick={copy}
        disabled={empty}
        className={cx(
          'shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors',
          empty ? 'text-ink-200' : done ? 'text-brand-500' : 'text-ink-400 hover:bg-ink-100 hover:text-ink-700',
        )}
      >
        {done ? '복사됨' : '복사'}
      </button>
    </div>
  )
}

/** 포털 화면 한 단계 — 접었다 펼 수 있고, 옮겨 적었는지 체크해 둔다 */
function PortalStep({ no, title, note, children }) {
  const [open, setOpen] = useState(no === 1)
  const [done, setDone] = useState(false)
  return (
    <div className="border-b border-ink-100 last:border-0">
      <div className="flex items-center gap-3 py-3">
        <button
          type="button"
          onClick={() => setDone(!done)}
          className={cx(
            'grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors',
            done ? 'bg-brand-300 text-white' : 'bg-ink-100 text-ink-500 hover:bg-ink-200',
          )}
          aria-label={done ? '옮김 표시 해제' : '옮겼다고 표시'}
        >
          {done ? <Check size={12} /> : no}
        </button>
        <button type="button" onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className={cx('text-[14px] font-semibold', done ? 'text-ink-400' : 'text-ink-900')}>{title}</span>
          <ChevronDown size={15} className={cx('ml-auto shrink-0 text-ink-300 transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="pb-4 pl-[34px]">
          {note && <p className="mb-2.5 text-[12px] leading-relaxed text-ink-500">{note}</p>}
          {children}
        </div>
      )}
    </div>
  )
}

/** 처음 한 번만 궁금한 것 — 기본은 접어 둔다 */
function Foldout({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className="px-5">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 py-4 text-left">
        <h3 className="text-[15px] font-bold text-ink-900">{title}</h3>
        <ChevronDown size={16} className={cx('ml-auto shrink-0 text-ink-300 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="border-t border-ink-100 py-4">{children}</div>}
    </Card>
  )
}

const STEPS = [
  ['전자소송 사용자등록', '최초 1회. 회원가입과 별개로 「사용자 등록」까지 마쳐야 제출 버튼이 눌립니다.'],
  ['소장 제출', '서류제출 → 민사서류 → 민사본안 → 소장. 아래 입력 도우미가 이 화면 순서 그대로예요.'],
  ['인지대 · 송달료 납부', '포털에서 바로 결제합니다. 접수번호가 나오면 제출이 끝난 거예요.'],
  ['접수 확인 · 송달 수신', '사건번호가 부여되면 진행 상황과 판결문까지 포털에서 봅니다.'],
]

/** 포털 「내용파일 첨부」에 그대로 올릴 수 있게, 그 항목만 담은 A4 문서 */
function PartPaper({ heading, lines, caseName, plaintiff, defendant }) {
  return (
    <div className="font-serif text-[13px] leading-loose text-ink-800">
      {/* 어느 사건의 어느 항목인지 — 파일만 떼어 보면 알 수 없으므로 머리에 남긴다 */}
      <p className="text-center text-[15px]">{caseName} 청구의 소</p>
      <p className="mt-1 text-center text-ink-600">원고 {plaintiff || '(미입력)'} / 피고 {defendant || '(미입력)'}</p>
      <DocHeading>{heading}</DocHeading>
      {lines.map((l, i) => <p key={i} className="whitespace-pre-wrap"><Rich text={l} /></p>)}
    </div>
  )
}

/**
 * @param embedded  사건 관리 안에 끼워 넣을 때 — 페이지 제목·단계바·되돌아가기를 감춘다.
 *                  소장을 막 끝낸 사람에게는 이 화면이 '다음 단계'지만,
 *                  사건 관리에서 여는 사람에게는 사건 카드 하나이기 때문이다.
 * @param caseItem  기준 사건. 안 주면 지금 보고 있는 사건을 쓴다.
 */
export default function SubmitGuide({ type, form, onBack, onEditDoc, embedded = false, caseItem = null }) {
  const doc = buildPreview(type, form)
  // 인쇄 대상 — null이면 소장 전체, 'claims'/'reasons'면 그 항목만 뽑는다.
  // 포털 「내용파일 첨부」·「청구취지별지 첨부하기」에 그대로 올릴 파일을 만들기 위한 것.
  const { activeRaw } = useWorkspace()
  const target = caseItem || activeRaw
  const registered = target ? caseEvidence(target) : []
  const [printPart, setPrintPart] = useState(null)
  const printOnly = (part) => {
    setPrintPart(part)
    // 시트가 그려진 다음에 인쇄 대화상자를 연다
    setTimeout(() => { printSheet(); setPrintPart(null) }, 80)
  }
  const { stamp, service, total } = costSummary(effectiveSueValue(form), partyCount(form))
  const eStamp = Math.floor((stamp * 0.9) / 100) * 100
  const eTotal = eStamp + service

  const checks = [
    {
      ok: !!(form.pName && form.pAddr && form.dName && form.dAddr),
      title: '당사자 표시',
      yes: `원고 ${form.pName} · 피고 ${form.dName}`,
      no: '2단계에서 당사자 이름과 주소를 채워 주세요.',
    },
    {
      ok: !!form.court,
      title: '관할 법원',
      yes: form.court,
      no: '1단계에서 법원을 선택해 주세요.',
    },
    {
      ok: (form.evidenceItems || []).length > 0,
      title: '증거 첨부',
      yes: `갑 제1~${(form.evidenceItems || []).length}호증`,
      no: '6단계에서 낼 증거를 골라 주세요.',
    },
    {
      // 서명은 우리가 확인할 수 없는 항목이다 — 종이는 출력본에, 전자소송은 제출 때 한다.
      ok: null,
      title: '기명날인',
      no: '종이로 낼 때만 — 출력본 「(인)」 자리에 서명·날인하고 간인하세요. 전자소송은 공동인증서 전자서명으로 갈음합니다.',
    },
  ]

  return (
    <div className="space-y-4">
      {/* 인쇄·PDF 저장 — 법원 기준(12pt · 줄간격 200% · A4)으로 조판된다 */}
      <PrintSheet>
        {printPart === 'claims'
          ? <PartPaper heading="청 구 취 지" lines={[...doc.claims, '라는 판결을 구합니다.']} caseName={doc.caseName} plaintiff={form.pName} defendant={form.dName} />
          : printPart === 'reasons'
            ? <PartPaper heading="청 구 원 인" lines={doc.reasons} caseName={doc.caseName} plaintiff={form.pName} defendant={form.dName} />
            : <ComplaintPaper doc={doc} />}
      </PrintSheet>

      {/* 단계바(유형·자가진단 → 정보 입력 → 검토·생성)는 뗐다.
          여기는 그 세 단계를 이미 끝낸 다음 화면이라, 다 지나온 길을 다시 그려 봐야
          지금 할 일(포털에 옮겨 적기)에서 눈을 뺏을 뿐이다. */}
      {!embedded && (
        <div className="pb-1">
          <button onClick={onBack} className="mb-2 flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-700">
            <ArrowLeft size={16} /> 작성 화면으로 돌아가기
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-ink-900">소장 제출하기</h1>
            <Badge tone="gray">{type.title}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-500">완성한 소장을 어디에, 어떻게 내는지 안내해 드려요.</p>
        </div>
      )}

      {/* 접수하고 돌아왔을 때 사건번호를 바로 적을 수 있게 — 제출 안내가 그 자리다. */}
      {target && <Card id="filing" className="p-5"><CaseStatus c={target} /></Card>}

      <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <div className="space-y-4">
          {/* ── 1. 얼마 드나요 — 이 화면에서 가장 먼저 궁금한 것 ── */}
          <Card className="p-5">
            <Title>얼마가 드나요?</Title>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-bold text-ink-900">전자소송</p>
                  <Badge tone="blue">추천</Badge>
                </div>
                <p className="mt-2.5 text-[26px] font-bold leading-none tabular-nums text-ink-900">
                  {won(eTotal)}<span className="ml-0.5 text-[15px] font-semibold text-ink-500">원</span>
                </p>
                <p className="mt-1.5 text-[12px] text-ink-500">인지대 {won(eStamp)} + 송달료 {won(service)}</p>
                <ul className="mt-3 space-y-1 border-t border-brand-100 pt-3 text-[12.5px] leading-relaxed text-ink-600">
                  <li>인지액 10% 할인</li>
                  <li>24시간 접수 · 포털에서 바로 결제</li>
                  <li>공동인증서 서명 — 날인·간인 불필요</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-ink-200 p-4">
                <p className="text-[14px] font-bold text-ink-900">종이 제출</p>
                <p className="mt-2.5 text-[26px] font-bold leading-none tabular-nums text-ink-500">
                  {won(total)}<span className="ml-0.5 text-[15px] font-semibold text-ink-400">원</span>
                </p>
                <p className="mt-1.5 text-[12px] text-ink-400">인지대 {won(stamp)} + 송달료 {won(service)}</p>
                <ul className="mt-3 space-y-1 border-t border-ink-100 pt-3 text-[12.5px] leading-relaxed text-ink-600">
                  <li>법원 민원실 방문 또는 우편</li>
                  <li>인지·송달료는 은행 납부 후 영수증 첨부</li>
                  <li>원본 1부 + 피고 수만큼 부본, 서명·날인·간인</li>
                </ul>
              </div>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-400">
              접수 시점 기준에 따라 달라질 수 있는 참고 계산이에요. 실제 납부는 법원·포털에서 확인하세요.
            </p>
          </Card>

          {/* ── 2. 무엇을 어떤 순서로 옮겨 적나요 — 이 화면의 본체 ── */}
          <Card className="p-5">
            <Title
              right={
                <Button size="sm" variant="soft" href={courtUrl} target="_blank" rel="noreferrer">
                  포털 열기 <ExternalLink size={14} />
                </Button>
              }
            >
              전자소송 입력 도우미
            </Title>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
              포털 소장 작성 화면의 순서 그대로입니다. 옆 창에 포털을 띄워 두고 위에서부터 복사해 옮기세요.
              당사자·관할·소가는 <b className="font-semibold text-ink-700">화면 입력만</b> 되고,
              청구취지·청구원인은 2,000자를 넘으면 <b className="font-semibold text-ink-700">파일로</b> 붙입니다.
            </p>

            <div className="mt-3">
              <PortalStep no={1} title="사건 기본정보" note="소가를 넣으면 인지액·송달료가 자동 계산돼요.">
                <PortalField label="관할법원" value={form.court} />
                <PortalField label="사건명" value={`${doc.caseName} 청구의 소`} />
                <PortalField label="소가" value={form.amount ? `${won(form.amount)}` : ''} hint={form.amount ? '원' : ''} />
              </PortalStep>

              <PortalStep no={2} title="당사자 — 원고 (나)" note="본인 인증 정보로 일부는 자동으로 채워집니다.">
                <PortalField label="이름 / 상호" value={form.pName} />
                <PortalField label="주민등록번호" value={form.pRrn} />
                <PortalField label="주소" value={addrOf(form, 'pAddr')} />
                <PortalField
                  label="송달장소"
                  value={form.pService === '다른 주소로 받겠습니다' ? addrOf(form, 'pServiceAddr') : '위 주소와 같음'}
                />
                <PortalField label="연락처" value={form.pTel} />
                <PortalField label="팩스" value={form.pFax} />
                <PortalField label="이메일" value={form.pEmail} />
              </PortalStep>

              <PortalStep no={3} title="당사자 — 피고 (상대방)" note="주소를 모르면 아는 범위까지만 넣고 접수하세요. 이후 보정명령으로 확인할 수 있어요.">
                <PortalField label="이름 / 상호" value={form.dName} />
                <PortalField label="주민등록번호" value={form.dRrn} hint={form.dRrn ? '' : '몰라도 됩니다'} />
                <PortalField label="주소" value={addrOf(form, 'dAddr')} />
                <PortalField label="연락처" value={form.dTel} />
              </PortalStep>

              <PortalStep no={4} title="청구취지" note="2,000자를 넘거나 표가 들어가면 「청구취지별지 첨부하기」로 파일을 붙이세요.">
                <CopyBlock title="청구취지 전문" lines={[...doc.claims, '라는 판결을 구합니다.']} limit={PORTAL_LIMIT} />
                <button
                  type="button"
                  onClick={() => printOnly('claims')}
                  className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-500 hover:text-ink-800"
                >
                  <FileText size={13} /> 청구취지만 파일로 저장
                </button>
              </PortalStep>

              <PortalStep no={5} title="청구원인" note="「직접입력」과 「내용파일 첨부」 중 고를 수 있어요. 파일로 붙이면 2,000자 제한이 사라집니다 (20MB까지).">
                <CopyBlock title="청구원인 전문" lines={doc.reasons} limit={PORTAL_LIMIT} />
                <button
                  type="button"
                  onClick={() => printOnly('reasons')}
                  className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-500 hover:text-ink-800"
                >
                  <FileText size={13} /> 청구원인만 파일로 저장
                </button>
              </PortalStep>

              <PortalStep no={6} title="입증서류 (증거)" note="복사가 아니라 파일 첨부입니다. 서증명은 청구원인에 적은 이름과 똑같이 맞춰야 재판부가 대조할 수 있어요.">
                {doc.evidences?.length
                  ? doc.evidences.map((e, i) => <PortalField key={e + i} label={`갑 제${i + 1}호증`} value={e} />)
                  : <p className="py-2 text-[13px] text-ink-400">6단계에서 증거 파일을 올리면 여기에 호증 번호가 매겨집니다.</p>}
                {registered.length > 0 && (
                  <p className="mt-2.5 rounded-lg bg-ink-50 px-3 py-2 text-[12px] leading-relaxed text-ink-600">
                    올리신 {registered.length}건은 증빙자료에 등록돼 있어요.{' '}
                    <Link to="/app/evidence" className="font-semibold text-brand-500 hover:underline">증빙자료 열기</Link>
                  </p>
                )}
              </PortalStep>

              <PortalStep no={7} title="첨부서류" note="증거가 아닌 서류만 넣습니다.">
                <p className="mb-2 rounded-lg bg-ink-50 px-3 py-2 text-[12px] leading-relaxed text-ink-600">
                  첨부서류로 낸 문서는 <b className="font-semibold text-ink-900">증거로 쓰이지 않습니다.</b> 증거가 될 자료는 반드시 6번 입증서류로 내세요.
                </p>
                {(doc.attachments || []).map((a, i) => <PortalField key={i} label={`${i + 1}.`} value={a.replace(/[　]+/g, ' ')} />)}
              </PortalStep>

              <PortalStep no={8} title="전자서명 후 제출" note="작성완료 → 전자서명 → 인지대·송달료 결제 순으로 진행됩니다.">
                <p className="text-[13px] leading-relaxed text-ink-600">
                  공동인증서로 전자서명하면 서명·날인이 끝납니다. 결제까지 마치고 접수번호가 나오면 제출이 완료된 거예요.
                </p>
              </PortalStep>
            </div>
          </Card>

          {/* 처음 한 번만 궁금한 것들 — 접어 둔다 */}
          <Foldout title="전자소송, 처음이신가요?">
            <ol className="space-y-3">
              {STEPS.map(([t, b], i) => (
                <li key={t} className="flex gap-3">
                  <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-ink-100 text-[11px] font-bold text-ink-500">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-ink-900">{t}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">{b}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Foldout>

          <Foldout title="자주 막히는 곳">
            <ul className="space-y-2.5 text-[13px] leading-relaxed text-ink-600">
              <li><b className="font-semibold text-ink-900">사용자등록 누락</b> — 회원가입만 하고 사용자등록을 안 하면 제출 버튼이 안 눌려요.</li>
              <li><b className="font-semibold text-ink-900">관할 오류</b> — 관할이 아닌 법원에 내면 이송되어 몇 주가 그냥 흘러갑니다.</li>
              <li><b className="font-semibold text-ink-900">전자송달 미확인</b> — 열람하지 않아도 1주일 뒤 송달로 간주돼 기한을 놓치기 쉬워요.</li>
            </ul>
          </Foldout>
        </div>

        {/* ── 오른쪽: 빠뜨린 게 없는지, 무엇을 챙겨야 하는지 ── */}
        <div className="space-y-4">
          <Card className="p-5">
            <Title>제출 전 확인</Title>
            <div className="mt-3.5 space-y-3">
              {checks.map((c) => (
                <div key={c.title} className="flex gap-2.5">
                  {/* ok === null 은 '우리가 확인할 수 없는 것' — 빠뜨린 게 아니라 기억할 것이다 */}
                  <span className={cx('mt-px grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full',
                    c.ok ? 'bg-brand-300 text-white' : 'border border-ink-300 text-ink-400')}>
                    {c.ok ? <Check size={11} /> : <span className="text-[10px] font-bold">{c.ok == null ? 'i' : '!'}</span>}
                  </span>
                  <div className="min-w-0">
                    <p className={cx('text-[13px] font-semibold', c.ok ? 'text-ink-500' : 'text-ink-900')}>{c.title}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-ink-500">{c.ok ? c.yes : c.no}</p>
                  </div>
                </div>
              ))}
            </div>
            {onEditDoc && <Button variant="neutral" size="sm" className="mt-4 w-full" onClick={onEditDoc}>소장 내용 수정하기</Button>}
          </Card>

          <Card className="p-5">
            <Title>준비물</Title>
            <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-ink-600">
              <li>공동인증서 또는 간편인증 수단</li>
              <li>증거 파일 (PDF·JPG, 건당 10MB 이내)</li>
              <li>인지대·송달료 결제 수단</li>
              <li>피고 주소 자료 (모르면 접수 후 보정)</li>
            </ul>
          </Card>

          <Card className="p-5">
            <Button className="w-full" onClick={printSheet}>
              <FileText size={16} /> 소장 PDF 저장 · 인쇄
            </Button>
            <p className="mt-2.5 text-center text-[11px] leading-relaxed text-ink-400">
              12pt · 줄간격 200% · A4로 조판된 종이 제출용 완성본이에요
            </p>
          </Card>

          <p className="px-1 text-[11px] leading-relaxed text-ink-400">
            나홀로법에는 소장을 접수하거나 비용을 받지 않습니다. 접수와 납부는 법원 또는 전자소송포털에서 직접 하셔야 해요.
          </p>
        </div>
      </div>
    </div>
  )
}
