// 법원 통지서에서 일정을 뽑아낸다.
//
// ── 실제로 통지서는 이렇게 온다 ────────────────────────────────
//
// 1) 전자송달 — 전자소송에 동의한 당사자 (민소전자문서법 제11조)
//    법원사무관등이 전자문서를 전자소송에 **등재**하고, 등재 사실을 이메일·문자로
//    **통지**한다(§11③). 송달된 때는 통지를 받은 때가 아니라 **등재문서를 확인한 때**다.
//    다만 통지일부터 1주 안에 확인하지 않으면 **통지일부터 1주가 지난 날** 송달된 것으로
//    본다(§11④ 단서). 사용자가 손에 쥐는 파일은 전자소송에서 내려받은 PDF다.
//
// 2) 서면송달 — 전자소송 미동의자 등 (같은 법 제12조)
//    전자문서를 출력해 민사소송법에 따라 우편으로 보낸다. 사용자가 가진 것은 종이이고,
//    찍어서 올리면 텍스트가 없는 스캔 PDF라 글자를 뽑을 수 없다.
//
// ── 그래서 이 파일이 하는 일 ──────────────────────────────────
//
// 통지서에 적힌 날짜는 두 종류이고, 다루는 방법이 다르다.
//
//   · **기일**  — 문서에 "2026. 8. 17. 14:00 제327호 법정"처럼 날짜가 그대로 있다.
//                그대로 읽으면 된다.
//   · **기한**  — 문서에 날짜가 없다. "소장 부본을 송달받은 날부터 30일"처럼
//                기산일이 송달일이다(민소법 제256조①). 발송일·등재일이 아니다.
//                그래서 **송달받은 날을 사용자에게 물어야** 계산할 수 있다.
//
// 예전 구현은 이 둘을 구분하지 않고 문서에 보이는 날짜를 전부 긁어 기한처럼 붙였다.
// 발송일을 기산일로 삼으면 실제보다 이른 날짜가 나와 사용자가 기한을 놓친다.

const pad = (v) => String(v).padStart(2, '0')
const iso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const atNoon = (value) => new Date(`${value}T12:00:00`)

/* ─────────────────── 기간 계산 ───────────────────
   민사소송법 제170조가 민법으로 넘긴다.
     · 민법 제157조 — 초일불산입. 송달받은 날의 **다음 날**부터 센다.
     · 민법 제161조 — 말일이 토요일이나 공휴일이면 그 다음 날 만료.
*/

/**
 * 관공서 공휴일.
 *
 * 한국천문연구원 특일 정보에서 받아 적어 둔 값이다. 브라우저에서만 도는 화면이라
 * 매번 조회하지 않는다. **해가 바뀌면 여기에 추가해야 한다.**
 *
 * 근로자의 날(5/1)과 제헌절(7/17)은 뺐다 — 「관공서의 공휴일에 관한 규정」상
 * 공휴일이 아니어서 법원이 정상 운영하고, 따라서 기간 만료도 밀리지 않는다.
 */
export const COURT_HOLIDAYS = new Set([
  // 2026
  '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18', '2026-03-01', '2026-03-02',
  '2026-05-05', '2026-05-24', '2026-05-25', '2026-06-03', '2026-06-06', '2026-08-15',
  '2026-08-17', '2026-09-24', '2026-09-25', '2026-09-26', '2026-10-03', '2026-10-05',
  '2026-10-09', '2026-12-25',
  // 2027
  '2027-01-01', '2027-02-06', '2027-02-07', '2027-02-08', '2027-02-09', '2027-03-01',
  '2027-05-05', '2027-05-13', '2027-06-06', '2027-08-15', '2027-08-16', '2027-09-14',
  '2027-09-15', '2027-09-16', '2027-10-03', '2027-10-04', '2027-10-09', '2027-10-11',
  '2027-12-25', '2027-12-27',
  // 2028
  '2028-01-01', '2028-01-26', '2028-01-27', '2028-01-28', '2028-03-01', '2028-04-12',
  '2028-05-02', '2028-05-05', '2028-06-06', '2028-08-15', '2028-10-02', '2028-10-03',
  '2028-10-04', '2028-10-05', '2028-10-09', '2028-12-25',
])

/** 토요일·일요일·공휴일이면 법원이 쉰다 */
export const isCourtClosed = (value) => {
  const day = atNoon(value).getDay()
  return day === 0 || day === 6 || COURT_HOLIDAYS.has(value)
}

/** 말일이 쉬는 날이면 다음 여는 날로 민다 (민법 제161조) */
export function rollToOpenDay(value) {
  let cursor = value
  let guard = 0
  while (isCourtClosed(cursor) && guard < 30) {
    const next = atNoon(cursor)
    next.setDate(next.getDate() + 1)
    cursor = iso(next)
    guard += 1
  }
  return cursor
}

/**
 * 송달받은 날부터 기간이 끝나는 날.
 *
 * 초일을 빼고(민법 제157조) 세되, 마지막 날이 토·공휴일이면 민다(제161조).
 * `days`와 `weeks` 중 하나만 준다.
 */
export function periodEnd(servedOn, { days = 0, weeks = 0 } = {}) {
  if (!servedOn) return { date: '', rolled: false, plain: '' }
  const base = atNoon(servedOn)
  base.setDate(base.getDate() + days + weeks * 7)
  const plain = iso(base)
  const date = rollToOpenDay(plain)
  return { date, plain, rolled: date !== plain }
}

/**
 * 전자송달에서 확인하지 않았을 때의 송달간주일.
 * 등재사실 통지일부터 1주가 지난 날 (민소전자문서법 제11조④ 단서).
 */
export function deemedServedOn(noticedOn) {
  if (!noticedOn) return ''
  const base = atNoon(noticedOn)
  base.setDate(base.getDate() + 7)
  return iso(base)
}

/* ─────────────────── 일정 유형 ───────────────────
   통지서에서 뽑은 일정과 손으로 넣는 일정이 같은 유형 표를 쓴다. */

export const SCHEDULE_TYPES = [
  { key: 'hearing', label: '기일 출석', hint: '변론·조정·선고 등 법정에 나가는 날', tone: 'red', remind: 3 },
  { key: 'filing', label: '서류 제출기한', hint: '답변서·준비서면·보정서 등을 내는 기한', tone: 'red', remind: 3 },
  { key: 'objection', label: '이의·불복 기간', hint: '이의신청·항소처럼 놓치면 되돌릴 수 없는 기간', tone: 'red', remind: 7 },
  { key: 'prepare', label: '준비할 일', hint: '증거 모으기·상담처럼 내가 정한 준비', tone: 'brand', remind: 1 },
  { key: 'etc', label: '기타', hint: '그 밖의 일정', tone: 'gray', remind: 1 },
]

export const scheduleType = (key) => SCHEDULE_TYPES.find((t) => t.key === key) || SCHEDULE_TYPES[4]

/**
 * 알림 시점 — 며칠 전에 알릴지. 네 가지만 둔다.
 *
 * 아무 숫자나 받으면 "2일 전"과 "3일 전"을 고르는 데 시간을 쓰게 되고, 정작 중요한
 * 기한 자체를 덜 보게 된다. 소송 준비에서 의미 있는 간격만 남긴다.
 */
export const REMIND_DAYS = [1, 3, 7, 14]

export const remindLabel = (remind) => (Number(remind) > 0 ? `${remind}일 전` : '알림 없음')

/* ─────────────────── 통지서 종류 ───────────────────

   `dated`   — 문서에 기일 날짜가 적혀 있다. 그 날짜를 읽는다.
   `counted` — 송달일부터 세는 기간이다. 송달일을 받아야 계산된다.
*/

export const NOTICE_KINDS = [
  {
    key: 'hearing', name: '변론기일통지서', mode: 'dated', type: 'hearing',
    match: /변론기일\s*통지|변론기일이?\s*(?:지정|다음과)/, keyword: /변론기일/,
    title: '제{n}회 변론기일 출석',
  },
  {
    key: 'prep-hearing', name: '변론준비기일통지서', mode: 'dated', type: 'hearing',
    match: /변론준비기일/, keyword: /변론준비기일/, title: '변론준비기일 출석',
  },
  {
    key: 'mediation', name: '조정기일통지서', mode: 'dated', type: 'hearing',
    match: /조정기일/, keyword: /조정기일/, title: '조정기일 출석',
  },
  {
    key: 'sentence', name: '판결선고기일통지서', mode: 'dated', type: 'hearing',
    match: /선고기일/, keyword: /선고기일/, title: '판결 선고기일',
  },
  {
    key: 'interrogation', name: '심문기일통지서', mode: 'dated', type: 'hearing',
    match: /심문기일/, keyword: /심문기일/, title: '심문기일 출석',
  },
  {
    key: 'complaint-copy', name: '소장부본 및 답변서요구서', mode: 'counted', type: 'filing',
    match: /소장\s*부본|답변서\s*요구/, title: '답변서 제출',
    period: { days: 30 },
    basis: '민사소송법 제256조 제1항 — 소장 부본을 송달받은 날부터 30일',
    basisUrl: 'https://www.law.go.kr/법령/민사소송법/제256조',
    warn: '기간 안에 답변서를 내지 않으면 변론 없이 판결할 수 있습니다(같은 법 제257조).',
  },
  {
    key: 'correction', name: '보정명령', mode: 'counted', type: 'filing',
    match: /보정명령|보정을?\s*명/, title: '보정서 제출',
    period: { days: 7 }, periodFromText: /보정기(?:한|간)[^0-9]{0,10}(\d{1,3})\s*일/,
    basis: '보정명령에 적힌 기간 — 통상 송달받은 날부터 7일 또는 14일',
    warn: '기간 안에 보정하지 않으면 소장이 각하될 수 있습니다.',
  },
  {
    key: 'clarify', name: '석명준비명령', mode: 'counted', type: 'filing',
    match: /석명준비명령|석명을?\s*구/, title: '석명사항 준비서면 제출',
    period: { days: 14 }, periodFromText: /(\d{1,3})\s*일\s*(?:이내|안에)/,
    basis: '명령에 적힌 기간 — 통상 송달받은 날부터 14일',
  },
  {
    key: 'brief-order', name: '준비서면 제출명령', mode: 'counted', type: 'filing',
    match: /준비서면\s*(?:제출)?\s*명령/, title: '준비서면 제출',
    period: { days: 14 }, periodFromText: /(\d{1,3})\s*일\s*(?:이내|안에)/,
    basis: '민사소송법 제280조 제1항 — 재판장이 정한 기간',
    basisUrl: 'https://www.law.go.kr/법령/민사소송법/제280조',
  },
  {
    key: 'payment-order', name: '지급명령', mode: 'counted', type: 'objection',
    match: /지급명령/, title: '지급명령 이의신청',
    period: { weeks: 2 },
    basis: '민사소송법 제470조 제1항 — 송달받은 날부터 2주 (불변기간)',
    basisUrl: 'https://www.law.go.kr/법령/민사소송법/제470조',
    warn: '2주가 지나면 확정판결과 같은 효력이 생깁니다(같은 법 제474조).',
  },
  {
    key: 'performance-order', name: '이행권고결정', mode: 'counted', type: 'objection',
    match: /이행권고결정/, title: '이행권고결정 이의신청',
    period: { weeks: 2 },
    basis: '소액사건심판법 제5조의4 제1항 — 등본을 송달받은 날부터 2주 (불변기간)',
    basisUrl: 'https://www.law.go.kr/법령/소액사건심판법/제5조의4',
  },
  {
    key: 'judgment', name: '판결정본', mode: 'counted', type: 'objection',
    match: /판결\s*정본|판결서\s*정본/, title: '항소장 제출',
    period: { weeks: 2 },
    basis: '민사소송법 제396조 제1항 — 판결서가 송달된 날부터 2주 (불변기간)',
    basisUrl: 'https://www.law.go.kr/법령/민사소송법/제396조',
  },
]

export const noticeKind = (key) => NOTICE_KINDS.find((k) => k.key === key)

/* ─────────────────── 읽어내기 ─────────────────── */

/**
 * 「서 울 중 앙 지 방 법 원」을 「서울중앙지방법원」으로 되돌린다.
 *
 * 법원 문서는 제목과 항목 이름의 자간을 벌려 찍는다 — 「보 정 명 령」,
 * 「사       건」, 「원       고」. 그대로 두면 어떤 낱말도 매칭되지 않는다.
 *
 * 한 글자짜리 토막이 둘 이상 연달아 붙어 있을 때만 붙인다. 「위 사건에 관하여」처럼
 * 보통 문장은 토막 길이가 제각각이라 건드리지 않는다.
 */
export function undoLetterSpacing(text) {
  return String(text || '').split('\n').map((line) => {
    const parts = line.split(/([ \t]+)/)
    const out = []
    let run = []
    const flush = () => {
      if (run.length >= 2) out.push(run.join(''))
      else if (run.length === 1) out.push(run[0])
      run = []
    }
    parts.forEach((part) => {
      if (/^[ \t]+$/.test(part)) return
      if (/^[가-힣0-9]$/.test(part)) { run.push(part); return }
      flush()
      out.push(part)
    })
    flush()
    // 붙인 토막과 그대로 둔 낱말 사이는 공백 하나로 다시 잇는다
    return out.join(' ')
  }).join('\n')
}

const dateValue = (y, m, d) => {
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(m) - 1 || date.getDate() !== Number(d)) return ''
  return `${y}-${pad(m)}-${pad(d)}`
}

const parseTime = (segment) => {
  const match = segment.match(/(오전|오후)?\s*(\d{1,2})\s*(?:시|:|：)\s*(\d{1,2})?\s*분?/)
  if (!match) return ''
  let hour = Number(match[2])
  if (match[1] === '오후' && hour < 12) hour += 12
  if (match[1] === '오전' && hour === 12) hour = 0
  if (hour > 23) return ''
  return `${pad(hour)}:${pad(Number(match[3] || 0))}`
}

/** "제327호 법정", "별관 3층 조정실" 같은 장소 */
const parsePlace = (segment) => segment
  .match(/(?:제\s*\d{1,4}\s*호\s*)?[가-힣]{0,6}(?:법정|조정실|심문실|준비절차실)(?:\s*\([^)]{0,20}\))?/)?.[0]
  ?.replace(/\s+/g, ' ')
  .trim() || ''

const DATE_PATTERN = /(20\d{2})\s*[.년/-]\s*(\d{1,2})\s*[.월/-]\s*(\d{1,2})\s*일?/g

/** 문서 안에서 "발송일 / 등재일 / 통지일"로 적힌 날짜 */
function findIssuedAt(compact) {
  const labelled = compact.match(/(?:발송일|등재일|통지일|고지일)\s*[:：]?\s*(20\d{2})\s*[.년/-]\s*(\d{1,2})\s*[.월/-]\s*(\d{1,2})/)
  if (labelled) return dateValue(labelled[1], labelled[2], labelled[3])
  return ''
}

/**
 * 서명란의 작성일.
 *
 * 통지서 끝에는 날짜와 「법원사무관 ○○○」·「판사 ○○○」가 붙는다. 이 날짜는
 * 문서를 만든 날이지 송달일이 아니다. 기일로 오인하지 않도록 따로 집어낸다.
 */
function findSignatureDate(compact) {
  const signed = compact.match(/(20\d{2})\s*[.년]\s*(\d{1,2})\s*[.월]\s*(\d{1,2})\s*\.?\s*(?:법원사무관|판사|재판장|사법보좌관)/)
  if (signed) return dateValue(signed[1], signed[2], signed[3])
  return ''
}

/** 전자송달인지 우편인지 문서가 스스로 밝히는 경우가 많다 */
function findServiceMode(compact) {
  if (/전자소송|전자문서|전자적\s*송달|등재사실/.test(compact)) return 'electronic'
  if (/우편송달|등기우편|특별송달/.test(compact)) return 'paper'
  return ''
}

/**
 * 통지서 한 장을 읽는다.
 *
 * 돌려주는 것:
 *   court, caseNo, caseName, department, parties  — 머리글에서 읽은 사건 정보
 *   kind        — NOTICE_KINDS 중 맞은 것 (없으면 null)
 *   serviceMode — 'electronic' | 'paper' | ''
 *   issuedAt    — 발송일·등재일 (송달일이 아니다)
 *   events      — 문서에 날짜가 적힌 기일들. 바로 등록할 수 있다.
 *   counted     — 송달일을 받아야 계산되는 기한. 아직 날짜가 없다.
 */
export function extractCourtNotice(text) {
  const clean = String(text || '').replace(/\u0000/g, ' ').replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n')
  const dense = undoLetterSpacing(clean)
  const compact = dense.replace(/\s+/g, ' ')

  const caseNo = compact.match(/\b(20\d{2})\s*([가-힣]{1,4})\s*(\d{1,8})\b/)?.slice(1).join('') || ''
  const court = compact.match(/[가-힣]{2,20}(?:지방법원|고등법원|가정법원|행정법원|회생법원|법원)(?:\s[가-힣]{2,6}지원)?/)?.[0] || ''
  const department = compact.match(/제\s*\d{1,3}\s*(?:민사|가사|행정|형사)?\s*(?:단독|부|재판부)/)?.[0]?.replace(/\s+/g, '') || ''
  const caseName = compact.match(/사건\s*[:：]?\s*20\d{2}[가-힣]{1,4}\d{1,8}\s+([가-힣()·]{2,20})/)?.[1]?.trim() || ''
  const plaintiff = compact.match(/(?:원고|채권자|신청인)\s*[:：]?\s*((?:주식회사\s*)?[가-힣A-Za-z]{2,20})/)?.[1]?.trim() || ''
  const defendant = compact.match(/(?:피고|채무자|피신청인)\s*[:：]?\s*((?:주식회사\s*)?[가-힣A-Za-z]{2,20})/)?.[1]?.trim() || ''

  // 한 장에 기일과 기한이 같이 오는 문서가 흔하다 — 맞는 종류를 모두 모은다.
  const kinds = NOTICE_KINDS.filter((item) => item.match.test(compact))
  const serviceMode = findServiceMode(compact)
  const issuedAt = findIssuedAt(compact) || findSignatureDate(compact)

  // ── 기일: 문서에 적힌 날짜를 그대로 ──
  //
  // 시각이 없는 날짜는 기일이 아니다. 법원이 정하는 기일에는 반드시 시각이 붙고,
  // 시각 없이 홀로 있는 날짜는 발송일·작성일이다. 이 조건이 없으면 서명란의
  // 발송일까지 기일로 잡혀 엉뚱한 날이 등록된다.
  const events = []
  const datedKinds = NOTICE_KINDS.filter((item) => item.mode === 'dated')
  for (const match of compact.matchAll(DATE_PATTERN)) {
    const date = dateValue(match[1], match[2], match[3])
    if (!date || date === issuedAt) continue
    const after = match.index + match[0].length
    const time = parseTime(compact.slice(after, after + 24))
    if (!time) continue
    const context = compact.slice(Math.max(0, match.index - 80), Math.min(compact.length, after + 90))
    const near = datedKinds.find((item) => item.keyword.test(context)) || datedKinds.find((item) => kinds.includes(item))
    if (!near) continue
    if (events.some((item) => item.date === date && item.time === time)) continue
    const round = context.match(/제\s*(\d{1,2})\s*회/)?.[1] || ''
    events.push({
      id: `notice_${events.length}`,
      title: near.title.replace('{n}', round || '1'),
      date,
      time,
      place: parsePlace(context),
      typeKey: near.type,
      checked: true,
      context: context.slice(0, 180),
    })
  }

  // ── 기한: 송달일이 있어야 계산된다 ──
  const counted = kinds.filter((item) => item.mode === 'counted').map((item, index) => {
    const fromText = item.periodFromText && compact.match(item.periodFromText)
    return {
      id: `counted_${index}`,
      title: item.title,
      typeKey: item.type,
      period: fromText ? { days: Number(fromText[1]) } : item.period,
      periodFromDocument: Boolean(fromText),
      basis: item.basis,
      basisUrl: item.basisUrl || '',
      warn: item.warn || '',
      checked: true,
    }
  })

  return {
    court, caseNo, caseName, department,
    parties: { plaintiff, defendant },
    kind: kinds[0] || null,
    kinds,
    noticeName: kinds.map((item) => item.name).join(' · ') || '법원 통지서',
    serviceMode, issuedAt,
    events, counted,
    text: clean,
  }
}

/** 기한 하나를 송달일 기준으로 실제 날짜가 있는 일정으로 바꾼다 */
export function resolveCounted(counted, servedOn) {
  if (!counted || !servedOn) return null
  const { date, plain, rolled } = periodEnd(servedOn, counted.period)
  const span = counted.period.weeks ? `${counted.period.weeks}주` : `${counted.period.days}일`
  return {
    ...counted,
    date,
    time: '',
    place: '',
    span,
    rolled,
    plain,
    note: `송달일 ${servedOn} + ${span}${rolled ? ` (말일 ${plain}이 토·공휴일이라 ${date}로 순연)` : ''}`,
  }
}

export async function readCourtNoticeFile(file) {
  if (!file) throw new Error('파일을 선택해 주세요.')
  if (file.type === 'text/plain' || /\.txt$/i.test(file.name)) return file.text()
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const worker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
    const pages = []
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
      const page = await pdf.getPage(pageNo)
      const content = await page.getTextContent()
      pages.push(content.items.map((item) => item.str).join(' '))
    }
    return pages.join('\n')
  }
  throw new Error('텍스트 PDF 또는 TXT 파일만 분석할 수 있습니다. 종이로 받은 통지서는 스캔해도 글자가 없어 읽지 못하니, 내용을 붙여 넣어 주세요.')
}
