// 소장 3단계 — 검토·생성 다음의 "그래서 이걸 어디에 내나요?"
// 완성한 PDF를 들고 어디로 가야 하는지 몰라 멈추는 지점을 메운다.
// 전자소송포털은 청구취지·원인을 시스템 안에서 다시 입력받으므로 완전 자동 연동은 불가능하다.
// 그래서 "안내 + 붙여넣을 내용 제공 + 외부 링크"까지가 현실적인 범위.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../context/ToastContext.jsx'
import { Card, Button, Badge, cx } from './ui.jsx'
import { Note, StageBar, PrintSheet, printSheet, Rich, DocHeading } from './docform.jsx'
import {
  ArrowLeft, ExternalLink, Copy, Check, FileText, Shield, AlertTriangle, Building, ChevronDown,
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
    <div className="rounded-xl border border-ink-200 bg-white">
      <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-2.5">
        <p className="text-sm font-bold text-ink-900">{title}</p>
        {limit && (
          <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-semibold', over ? 'bg-red-50 text-red-500' : 'bg-ink-100 text-ink-500')}>
            {body.length.toLocaleString()} / {limit.toLocaleString()}자
          </span>
        )}
        <Button size="sm" variant="neutral" className="ml-auto" onClick={copy}>
          {done ? <><Check size={14} /> 복사됨</> : <><Copy size={14} /> 복사</>}
        </Button>
      </div>
      <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap px-4 py-3 font-serif text-[12px] leading-relaxed text-ink-700">{body}</pre>
      {over && (
        <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-[12px] leading-relaxed text-red-600">
          포털 입력창 한도를 넘습니다. 붙여넣으면 뒷부분이 잘려요.
          청구원인은 <b className="font-semibold">「내용파일 첨부」</b>, 청구취지는 <b className="font-semibold">「청구취지별지 첨부하기」</b>를 쓰세요.
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
    <div className="flex items-start gap-3 border-b border-ink-100 py-2 last:border-0">
      <span className="w-24 shrink-0 pt-0.5 text-[12px] font-medium text-ink-500">{label}</span>
      <span className={cx('min-w-0 flex-1 break-all text-[13px]', empty ? 'text-ink-300' : 'text-ink-800')}>
        {value || '입력하지 않음'}
        {hint && <span className="ml-1 text-[11px] text-ink-400">{hint}</span>}
      </span>
      <button
        type="button"
        onClick={copy}
        disabled={empty}
        className={cx(
          'shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors',
          empty ? 'text-ink-300' : 'text-ink-500 hover:bg-ink-100',
        )}
      >
        {done ? <span className="text-emerald-600">복사됨</span> : '복사'}
      </button>
    </div>
  )
}

/** 포털 화면 한 단계 — 접었다 펼 수 있고, 옮겨 적었는지 체크해 둔다 */
function PortalStep({ no, title, note, children }) {
  const [open, setOpen] = useState(no === 1)
  const [done, setDone] = useState(false)
  return (
    <div className={cx('rounded-xl border transition-colors', done ? 'border-emerald-200 bg-emerald-50/40' : 'border-ink-200 bg-white')}>
      <div className="flex items-center gap-2.5 px-4 py-3">
        <button
          type="button"
          onClick={() => setDone(!done)}
          className={cx(
            'grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors',
            done ? 'border-emerald-400 bg-emerald-400 text-white' : 'border-ink-300 hover:border-brand-300',
          )}
          aria-label={done ? '옮김 표시 해제' : '옮겼다고 표시'}
        >
          {done && <Check size={12} />}
        </button>
        <button type="button" onClick={() => setOpen(!open)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="text-[11px] font-bold text-ink-400">{no}</span>
          <span className={cx('font-semibold', done ? 'text-emerald-700 line-through' : 'text-ink-900')}>{title}</span>
          <ChevronDown size={16} className={cx('ml-auto shrink-0 text-ink-400 transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="border-t border-ink-100 px-4 pb-3 pt-1">
          {note && <p className="mb-2 pt-2 text-[12px] leading-relaxed text-ink-500">{note}</p>}
          {children}
        </div>
      )}
    </div>
  )
}

const STEPS = [
  {
    title: '전자소송 사용자등록',
    body: '최초 1회만 하면 됩니다. 공동인증서 또는 간편인증으로 본인확인을 하고 사용자등록을 마쳐야 소송 행위를 할 수 있어요.',
    tip: '회원가입과 별개로 “사용자 등록”을 따로 완료해야 합니다.',
  },
  {
    title: '전자소송 동의 후 소장 제출',
    body: '서류제출 → 민사서류 → 민사본안 → 소장. 사건기본정보 · 당사자 · 법정대리인 · 청구취지 · 청구원인 · 입증서류 · 첨부서류 순서로 채웁니다.',
    tip: '청구원인은 「직접입력」 대신 「내용파일 첨부」를 골라도 됩니다. 입력창은 2,000자 제한이에요.',
  },
  {
    title: '인지대 · 송달료 납부',
    body: '은행에 갈 필요 없이 포털에서 바로 결제합니다. 전자소송으로 내면 인지액의 10%를 깎아줍니다.',
    tip: '납부 후 접수번호가 나오면 제출이 끝난 거예요.',
  },
  {
    title: '접수 확인 · 송달 수신',
    body: '사건번호가 부여되면 진행 상황과 판결문까지 포털에서 확인합니다. 송달도 우편 대신 전자적으로 받아요.',
    tip: '전자송달은 확인하지 않아도 1주일이 지나면 송달된 것으로 봅니다. 알림을 꼭 켜두세요.',
  },
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

export default function SubmitGuide({ type, form, onBack, onEditDoc }) {
  const toast = useToast()
  const doc = buildPreview(type, form)
  // 인쇄 대상 — null이면 소장 전체, 'claims'/'reasons'면 그 항목만 뽑는다.
  // 포털 「내용파일 첨부」·「청구취지별지 첨부하기」에 그대로 올릴 파일을 만들기 위한 것.
  const { activeRaw } = useWorkspace()
  const registered = activeRaw ? caseEvidence(activeRaw) : []
  const [printPart, setPrintPart] = useState(null)
  const printOnly = (part) => {
    setPrintPart(part)
    // 시트가 그려진 다음에 인쇄 대화상자를 연다
    setTimeout(() => { printSheet(); setPrintPart(null) }, 80)
  }
  const { stamp, service, total } = costSummary(effectiveSueValue(form), partyCount(form))
  const eStamp = Math.floor((stamp * 0.9) / 100) * 100
  const eTotal = eStamp + service

  return (
    <div className="space-y-5">
      {/* 인쇄·PDF 저장 — 법원 기준(12pt · 줄간격 200% · A4)으로 조판된다 */}
      <PrintSheet>
        {printPart === 'claims'
          ? <PartPaper heading="청 구 취 지" lines={[...doc.claims, '라는 판결을 구합니다.']} caseName={doc.caseName} plaintiff={form.pName} defendant={form.dName} />
          : printPart === 'reasons'
            ? <PartPaper heading="청 구 원 인" lines={doc.reasons} caseName={doc.caseName} plaintiff={form.pName} defendant={form.dName} />
            : <ComplaintPaper doc={doc} signature={form.signature} />}
      </PrintSheet>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button onClick={onBack} className="mb-2 flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-700">
            <ArrowLeft size={16} /> 작성 화면으로 돌아가기
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-ink-900">소장 제출하기</h1>
            <Badge tone="blue">{type.title}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-500">완성한 소장을 어디에, 어떻게 내는지 안내해 드려요.</p>
        </div>
        <StageBar stage={2} />
      </div>

      {/* 완성하면 증거는 이미 증빙자료에 들어가 있다 — 다시 올릴 필요가 없다는 걸 알려준다 */}
      {registered.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Check size={16} className="text-emerald-500" />
            <p className="text-sm font-bold text-emerald-800">
              올리신 증거 {registered.length}건이 증빙자료에 자동으로 등록됐어요
            </p>
            <Button as={Link} to="/app/evidence" size="sm" variant="neutral" className="ml-auto">증빙자료 열기</Button>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {registered.map((e) => (
              <span key={e.no} className="rounded-md bg-white px-2 py-1 text-[12px] text-ink-700">
                <b className="font-semibold text-brand-500">{e.code}</b> {e.file}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-emerald-700">
            포털 6번 「입증서류」에 이 파일들을 올리고, 서증명을 위 이름과 똑같이 맞추면 됩니다.
          </p>
        </Card>
      )}

      {activeRaw && <CaseStatus caseId={activeRaw.id} status={activeRaw.status} caseNo={activeRaw.caseNo} />}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {/* 제출 방법 비교 */}
          <Card className="border-amber-200 bg-amber-50/50 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
              <Shield size={16} /> 나홀로법에는 소장을 접수하거나 돈을 받지 않습니다
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-amber-700">
              아래 금액은 <b className="font-semibold">참고용 계산</b>이에요. 실제 접수와 인지대·송달료 납부는 법원 또는
              전자소송포털에서 직접 하셔야 하고, 금액은 접수 시점의 기준에 따라 달라질 수 있습니다.
              송달료는 사건 종류별 예납 회차와 우편요금에 연동되므로 <b className="font-semibold">접수 전에 꼭 확인하세요.</b>
            </p>
          </Card>

          {/* 실제 포털 작성 화면을 확인해 정리한 내용 (2026-08-07) */}
          <Card className="border-brand-200 bg-brand-50/50 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-brand-600">
              <AlertTriangle size={16} /> 소장 전체를 파일 하나로 올릴 수는 없어요 — 항목별로는 됩니다
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-brand-600/90">
              포털은 <b className="font-semibold">당사자·관할·소가</b>를 화면 입력으로만 받습니다.
              완성된 소장 파일을 통째로 첨부하는 기능은 없어요.
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-brand-600/90">
              다만 <b className="font-semibold">청구원인은 「직접입력」과 「내용파일 첨부」 중 고를 수 있고</b>,
              청구취지에는 <b className="font-semibold">「청구취지별지 첨부하기」</b>가 있습니다.
              HWP·HWPX·DOC·DOCX·PDF·TXT·이미지 형식을 받습니다.
            </p>
            <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-[13px] leading-relaxed text-brand-600">
              <b className="font-semibold">입력창은 각각 한글 2,000자 이내</b>예요. 넘으면 잘리니, 길면 내용파일이나 별지로 붙이세요.
              표·그림도 입력창에는 안 들어가므로 파일로 붙여야 합니다.
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-brand-600/90">
              <b className="font-semibold">종이로 내실 때는</b> 이 소장을 그대로 출력해 서명·날인하고 간인하면 그것이 제출본이 됩니다.
            </p>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold text-ink-900">어떻게 내실 건가요?</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border-2 border-brand-300 bg-brand-50/40 p-4">
                <div className="flex items-center gap-2">
                  <Badge tone="blue">추천</Badge>
                  <p className="font-bold text-ink-900">전자소송</p>
                </div>
                <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-ink-600">
                  <li>· 24시간 접수, 주말·공휴일도 가능</li>
                  <li>· 인지액 <b className="text-ink-800">10% 할인</b> — {won(eStamp)}원</li>
                  <li>· 은행 방문 없이 포털에서 바로 납부</li>
                  <li>· 사건기록 열람·출력 <b className="text-ink-800">무료</b></li>
                  <li>· 서명은 공동인증서로 갈음, 간인 불필요</li>
                  <li>· 당사자·관할·소가는 <b className="text-ink-800">화면 입력만</b> 가능</li>
                  <li>· 청구원인·청구취지별지는 <b className="text-ink-800">파일 첨부 가능</b></li>
                </ul>
                <p className="mt-3 border-t border-brand-100 pt-3 text-sm">
                  접수 시 예상 <b className="font-bold text-brand-500">약 {won(eTotal)}원</b>
                </p>
              </div>

              <div className="rounded-2xl border border-ink-200 p-4">
                <p className="font-bold text-ink-900">종이 제출</p>
                <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-ink-600">
                  <li>· 법원 민원실 방문 또는 우편</li>
                  <li>· 인지대 {won(stamp)}원 (할인 없음)</li>
                  <li>· 인지·송달료는 은행 납부 후 영수증 첨부</li>
                  <li>· 원본 1부 + 피고 수만큼 부본</li>
                  <li>· 출력본에 <b className="text-ink-800">자필 서명·날인 + 간인</b></li>
                  <li>· <b className="text-ink-800">여기서 만든 소장이 그대로 제출본</b>이 됨</li>
                </ul>
                <p className="mt-3 border-t border-ink-100 pt-3 text-sm">
                  접수 시 예상 <b className="font-bold text-ink-800">약 {won(total)}원</b>
                </p>
              </div>
            </div>
          </Card>

          {/* 전자소송 단계 */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-ink-900">전자소송 제출 순서</h3>
              <Button size="sm" variant="soft" href={courtUrl} target="_blank" rel="noreferrer" className="ml-auto">
                전자소송포털 열기 <ExternalLink size={14} />
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {STEPS.map((s, i) => (
                <div key={s.title} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-300 text-sm font-bold text-white">{i + 1}</span>
                  <div className="min-w-0 flex-1 pb-1">
                    <p className="font-semibold text-ink-900">{s.title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-600">{s.body}</p>
                    <p className="mt-1 text-xs text-brand-500">{s.tip}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <Note tone="warn">
                포털은 청구취지·청구원인을 시스템 입력창에 직접 넣게 되어 있어요. 아래 <b className="font-semibold">전자소송 입력 도우미</b>가 포털 화면 순서대로 정리해 두었으니 위에서부터 복사해 옮기시면 됩니다.
              </Note>
            </div>
          </Card>

          {/* 전자소송 입력 도우미 — 포털 소장 작성 화면의 순서를 그대로 따라간다 */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-ink-900">전자소송 입력 도우미</h3>
              <Badge tone="blue">포털 입력 순서</Badge>
              <Button size="sm" variant="soft" href={courtUrl} target="_blank" rel="noreferrer" className="ml-auto">
                포털 열어두기 <ExternalLink size={14} />
              </Button>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
              포털을 옆 창에 띄워 두고 위에서부터 하나씩 복사해 옮기세요. 옮긴 단계는 왼쪽 네모를 눌러 체크해 두면 어디까지 했는지 안 헷갈려요.
            </p>

            <div className="mt-4 space-y-2.5">
              <PortalStep no={1} title="사건 기본정보" note="민사 → 소장 → 사건정보 화면입니다. 소가를 넣으면 인지액·송달료가 자동 계산돼요.">
                <PortalField label="관할법원" value={form.court} />
                <PortalField label="사건명" value={`${doc.caseName} 청구의 소`} />
                <PortalField label="소송목적의 값" value={form.amount ? `${won(form.amount)}` : ''} hint={form.amount ? '원' : ''} />
              </PortalStep>

              <PortalStep no={2} title="당사자 — 원고 (나)" note="「당사자 입력」에서 원고를 먼저 등록합니다. 전자소송은 본인 인증 정보로 일부가 자동으로 채워져요.">
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

              <PortalStep no={4} title="청구취지" note="입력창은 2,000자 제한이에요. 길거나 표가 들어가면 「청구취지별지 첨부하기」로 파일을 붙이세요.">
                <CopyBlock title="청구취지 전문" lines={[...doc.claims, '라는 판결을 구합니다.']} limit={PORTAL_LIMIT} />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="neutral" onClick={() => printOnly('claims')}>
                    <FileText size={14} /> 청구취지만 PDF로 저장
                  </Button>
                  <span className="text-[12px] text-ink-500">포털 「청구취지별지 첨부하기」에 그대로 올리세요</span>
                </div>
              </PortalStep>

              <PortalStep no={5} title="청구원인" note="「직접입력」과 「내용파일 첨부」 중 고를 수 있어요. 2,000자를 넘거나 표·그림이 있으면 파일로 붙이는 편이 안전합니다.">
                <CopyBlock title="청구원인 전문" lines={doc.reasons} limit={PORTAL_LIMIT} />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={() => printOnly('reasons')}>
                    <FileText size={14} /> 청구원인만 PDF로 저장
                  </Button>
                  <span className="text-[12px] text-ink-500">포털 「내용파일첨부하기」에 올리면 2,000자 제한이 사라집니다 (20MB까지)</span>
                </div>
              </PortalStep>

              <PortalStep no={6} title="입증서류 (증거)" note="여기부터는 복사가 아니라 파일 첨부예요. 서증명은 청구원인에 적은 이름과 똑같이 맞춰야 재판부가 대조할 수 있습니다. 파일 하나에 여러 증거가 들어 있으면 포털의 [입증서류분리]로 서증명별 부호를 부여하세요.">
                {doc.evidences?.length
                  ? doc.evidences.map((e, i) => <PortalField key={e + i} label={`갑 제${i + 1}호증`} value={e} />)
                  : <p className="py-2 text-[13px] text-ink-400">6단계에서 증거 파일을 올리면 여기에 호증 번호가 매겨집니다.</p>}
              </PortalStep>

              <PortalStep no={7} title="첨부서류" note="증거가 아닌 서류만 여기 넣습니다.">
                <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-700">
                  포털 안내 그대로 — <b className="font-semibold">첨부서류로 제출한 문서는 증거로 사용될 수 없으며, 판결(결정) 등에 효력이 없습니다.</b>
                  증거가 될 자료는 반드시 <b className="font-semibold">6번 입증서류</b>로 내세요. 여기 잘못 넣으면 증거로 안 쳐 줍니다.
                  <br />소송대리허가신청서·기타 신청서는 <b className="font-semibold">소장과 별도의 서류</b>로 내야 하므로 첨부서류에 넣지 마세요.
                </div>
                {(doc.attachments || []).map((a, i) => <PortalField key={i} label={`${i + 1}.`} value={a.replace(/[　]+/g, ' ')} />)}
              </PortalStep>

              <PortalStep no={8} title="전자서명 후 제출" note="작성완료 → 전자서명 → 인지대·송달료 결제 순으로 진행됩니다.">
                <p className="py-2 text-[13px] leading-relaxed text-ink-600">
                  공동인증서로 전자서명하면 서명·날인이 끝납니다. 여기서 만든 서명 이미지는 필요 없어요.
                  결제까지 마치고 접수번호가 나오면 제출이 완료된 것입니다.
                </p>
              </PortalStep>
            </div>
          </Card>
        </div>

        {/* 오른쪽 체크 패널 */}
        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="flex items-center gap-2 font-bold text-ink-900"><Shield size={17} className="text-brand-400" /> 제출 전 확인</h3>
            <div className="mt-3 space-y-3">
              {[
                {
                  ok: !!form.signature,
                  title: '서명',
                  yes: '서명 이미지가 등록돼 있어 PDF에 그대로 인쇄됩니다.',
                  no: '6단계에서 서명 이미지를 올리거나, 출력본에 자필로 서명하세요.',
                },
                {
                  ok: !!(form.pName && form.pAddr && form.dName && form.dAddr),
                  title: '당사자 표시',
                  yes: `원고 ${form.pName} / 피고 ${form.dName} 확인됨`,
                  no: '2단계에서 당사자 이름과 주소를 채워 주세요.',
                },
                {
                  ok: !!form.court,
                  title: '관할 법원',
                  yes: `${form.court}에 제출`,
                  no: '1단계에서 법원을 선택해 주세요.',
                },
                {
                  ok: (form.evidenceItems || []).length > 0,
                  title: '증거 첨부',
                  yes: `갑 제1~${(form.evidenceItems || []).length}호증 준비됨`,
                  no: '6단계에서 낼 증거를 골라 주세요.',
                },
              ].map((c) => (
                <div key={c.title} className="flex gap-2.5">
                  <span className={cx('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md text-white', c.ok ? 'bg-brand-300' : 'bg-amber-400')}>
                    {c.ok ? <Check size={13} /> : <span className="text-[11px] font-bold">!</span>}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink-900">{c.title}</p>
                    <p className={cx('text-xs leading-relaxed', c.ok ? 'text-ink-500' : 'text-amber-600')}>{c.ok ? c.yes : c.no}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="neutral" size="sm" className="mt-4 w-full" onClick={onEditDoc}>소장 내용 수정하기</Button>
          </Card>

          <Card className="p-5">
            <h3 className="flex items-center gap-2 font-bold text-ink-900"><Building size={17} className="text-brand-400" /> 준비물</h3>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink-600">
              <li>· 공동인증서 또는 간편인증 수단</li>
              <li>· 증거 파일 (PDF·JPG, 건당 10MB 이내 권장)</li>
              <li>· 인지대·송달료 결제 수단</li>
              <li>· 피고 주소를 아는 자료 (모르면 접수 후 보정)</li>
            </ul>
          </Card>

          <Card className="p-5">
            <h3 className="flex items-center gap-2 font-bold text-ink-900"><AlertTriangle size={17} className="text-amber-500" /> 자주 막히는 곳</h3>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink-600">
              <li>· <b className="text-ink-800">사용자등록 누락</b> — 회원가입만 하고 사용자등록을 안 하면 제출 버튼이 안 눌려요.</li>
              <li>· <b className="text-ink-800">관할 오류</b> — 관할이 아닌 법원에 내면 이송되어 몇 주가 그냥 흘러갑니다.</li>
              <li>· <b className="text-ink-800">전자송달 미확인</b> — 열람하지 않아도 1주일 뒤 송달로 간주돼 기한을 놓치기 쉬워요.</li>
            </ul>
          </Card>

          <Button className="w-full" onClick={printSheet}>
            <FileText size={16} /> 소장 PDF 저장 · 인쇄
          </Button>
          <p className="text-center text-[11px] leading-relaxed text-ink-400">
            글자 12pt · 줄간격 200% · A4로 조판되어 나옵니다<br />
            종이 제출용 완성본이에요. 전자소송에는 청구원인만 따로 붙여넣거나 파일로 첨부하시면 됩니다.
          </p>
        </div>
      </div>
    </div>
  )
}
