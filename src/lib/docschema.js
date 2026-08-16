// 문서 스키마 공용 헬퍼 — 준비서면 · 신청서가 함께 쓴다.
import { won, fmtDate, organizeComplaintAnswer } from './complaint.js'

export const text = (key, label, o = {}) => ({ kind: 'text', key, label, ...o })
export const money = (key, label, o = {}) => ({ kind: 'money', key, label, ...o })
export const date = (key, label, o = {}) => ({ kind: 'date', key, label, ...o })
export const num = (key, label, o = {}) => ({ kind: 'num', key, label, ...o })
export const area = (key, label, o = {}) => ({ kind: 'area', key, label, ...o })
export const select = (key, label, options, o = {}) => ({ kind: 'select', key, label, options, ...o })
export const radio = (key, label, options, o = {}) => ({ kind: 'radio', key, label, options, ...o })
export const checks = (key, label, options, o = {}) => ({ kind: 'checks', key, label, options, ...o })
export const note = (tone, body, o = {}) => ({ kind: 'note', tone, body, ...o })
export const files = (key, label, o = {}) => ({ kind: 'files', key, label, ...o })
export const repeat = (key, label, columns, o = {}) => ({ kind: 'repeat', key, label, columns, ...o })

/** 당사자 한 쌍 입력 (원고·피고 / 채권자·채무자 / 임차인·임대인 …) */
export const partyPair = (a, b) => [
  { kind: 'partyTag', tone: 'brand', tag: a.tag, desc: a.desc },
  text(a.name, '이름 / 상호', { required: true, half: true, placeholder: '홍길동' }),
  text(a.rrn, '주민등록번호', { required: true, half: true, placeholder: '750101-1234567' }),
  { kind: 'address', key: a.addr, label: '주소', required: true },
  text(a.tel, '연락처', { required: true, half: true, placeholder: '010-1234-5678' }),
  text(a.email, '이메일', { half: true, placeholder: 'hong@example.com' }),
  note('lock', '주민등록번호는 법원 제출본에만 들어가고, 상대방에게 보내는 부본에서는 뒷자리가 자동으로 가려집니다.'),
  { kind: 'partyTag', tone: 'ink', tag: b.tag, desc: b.desc },
  text(b.name, '이름 / 상호', { required: true, half: true, placeholder: '김철수' }),
  text(b.rrn, '주민등록번호 (선택)', { half: true, placeholder: '모르면 비워두세요' }),
  { kind: 'address', key: b.addr, label: '주소', required: true },
  text(b.tel, '연락처', { half: true, placeholder: '010-9876-5432' }),
]

/* ── 미리보기 마킹 ── */
export const F = (v) => `⟨${v}⟩`
export const P = (t) => `⟦${t}⟧`
export const filled = (v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '')
export const or = (v, hint, fmt = (x) => x) => (filled(v) ? F(fmt(v)) : P(hint))
export const money$ = (v, hint) => or(v, hint, (x) => `${won(x)}원`)
export const date$ = (v, hint) => or(v, hint, fmtDate)
export const today = () => fmtDate(new Date().toISOString().slice(0, 10))

/** 사용자가 평소 말로 적은 사실을 문서 본문에 들어갈 기본 서면체로 다듬는다. */
/**
 * 준비서면·신청서의 자유서술을 문서 문장으로 바꾼다.
 *
 * 화자·호칭 치환(제가→원고는, 상대방→피고, 카톡→카카오톡 메시지)은 소장이 쓰는
 * 정리기에 이미 다 있다. 여기서 따로 만들면 같은 규칙이 두 벌이 되고, 실제로도
 * 준비서면에만 「제가 상대방한테」가 그대로 나가고 있었다. 그 위에 이 문서 특유의
 * 표현만 얹는다.
 */
export const legalNarrative = (value, { inline = false } = {}) => {
  let text = organizeComplaintAnswer(String(value || '').trim(), 'general').replace(/\s+/g, ' ')
  if (!text) return ''
  text = text
    .replace(/두\s*달/g, '2개월')
    .replace(/안\s*갚(?:았어요|네요|고 있어요|고 있습니다|음)?/g, '변제하지 않았습니다')
    .replace(/갚지\s*않(?:았어요|네요|고 있어요|고 있습니다|습니다|음)?/g, '변제하지 않았습니다')
    .replace(/못\s*받(?:았어요|고 있어요|고 있습니다|음)?/g, '지급받지 못하였습니다')
    .replace(/했는데/g, '하였으나')
    .replace(/했어요/g, '하였습니다')
    .replace(/줬어요/g, '지급하였습니다')
    .replace(/받았어요/g, '수령하였습니다')
    .replace(/없어요/g, '없습니다')
    .replace(/(?:이에요|예요)/g, '입니다')
    .replace(/해요/g, '합니다')
    .replace(/네요/g, '습니다')
    .replace(/않았어요/g, '아니하였습니다')
    .replace(/않아요/g, '아니합니다')
    .replace(/있어요/g, '있습니다')
    .replace(/같아요/g, '같습니다')
  // 문장 중간에 끼워 넣는 자리(「~는 점은 다툼이 없습니다」)에서는 마침표를 붙이지 않는다.
  // 붙이면 「맞다고 합니다.는 점은」처럼 문장이 끊긴다.
  if (inline) return text.replace(/[.。]$/, '')
  return /[.!?。]$/.test(text) ? text : `${text}.`
}

export const isVisible = (f, form) => (f.when ? !!f.when(form) : true)

/** 화면에 보이는 필수 입력칸 중 채워진 비율 */
export function completenessOf(steps, form) {
  let total = 0
  let done = 0
  for (const s of steps) {
    for (const f of s.fields) {
      if (!f.required || !f.key || !isVisible(f, form)) continue
      total += 1
      if (filled(form[f.key])) done += 1
    }
  }
  return total === 0 ? 0 : Math.round((done / total) * 100)
}

/** 접힌 단계 헤더에 보여줄 한 줄 요약 */
export function summaryOf(step, form) {
  const first = step?.fields.find((f) => f.required && f.key && filled(form[f.key]) && isVisible(f, form))
  if (!first) return ''
  const v = form[first.key]
  const shown = first.kind === 'money' ? `${won(v)}원`
    : first.kind === 'date' ? fmtDate(v)
      : Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : x.claim || '')).filter(Boolean).join(', ')
        : String(v)
  return `${first.label} · ${shown.length > 40 ? `${shown.slice(0, 40)}…` : shown}`
}

/** 우편번호·기본주소·상세주소를 한 줄로 합친다 */
export const addrOf = (form, key) => {
  const base = form[key]
  if (!base) return ''
  const zip = form[`${key}Zip`]
  const detail = form[`${key}Detail`]
  // 법원 양식은 상세주소를 쉼표로 잇는다 — `남부순환로 1820, 503호`
  const street = detail ? `${base}, ${detail}` : base
  return [zip ? `(${zip})` : '', street].filter(Boolean).join(' ')
}

/** 당사자 표시 줄 (문서 머리) */
/**
 * 당사자 표시 줄.
 * 소송구조처럼 한쪽만 적는 서면도 있으므로 넘긴 만큼만 그린다.
 */
export function partyLines(form, keys, labels) {
  return keys.flatMap((side, i) => [
    `${labels[i]}　${or(form[side.name], '이름')}${form[side.rrn] ? ` (${String(form[side.rrn]).slice(0, 8)}*****)` : ''}`,
    `　　　　${or(addrOf(form, side.addr), '주소')}`,
    ...(form[side.tel] ? [`　　　　전화 ${F(form[side.tel])}`] : []),
  ])
}

/** 한쪽만 받는 서면의 당사자 입력칸 */
export const partyOne = (a) => [
  { kind: 'partyTag', tone: 'brand', tag: a.tag, desc: a.desc },
  text(a.name, '이름 / 상호', { required: true, half: true, placeholder: '홍길동' }),
  text(a.rrn, '주민등록번호', { half: true, placeholder: '750101-1234567' }),
  { kind: 'address', key: a.addr, label: '주소', required: true },
  text(a.tel, '연락처', { half: true, placeholder: '010-1234-5678' }),
]


/* ─────────────────────────── 문서별 초안 저장 ─────────────────────────── */
// 소장은 '사건'으로 따로 저장되지만, 준비서면·신청서·증거목록은 아직 사건에 묶이지 않는다.
// 최소한 작성 중인 내용이 새로고침으로 날아가지는 않게 문서 종류별로 보관한다.

const draftKey = (kind) => `naholo_draft_${kind}`

export function saveFormDraft(kind, form, meta = {}) {
  try {
    localStorage.setItem(draftKey(kind), JSON.stringify({ form, meta, savedAt: Date.now() }))
    return true
  } catch {
    return false                        // 용량 초과 — 호출부가 경고를 띄운다
  }
}

export function loadFormDraft(kind) {
  try {
    const raw = localStorage.getItem(draftKey(kind))
    if (!raw) return null
    const d = JSON.parse(raw)
    return d?.form ? d : null
  } catch {
    return null
  }
}

export function clearFormDraft(kind) {
  try { localStorage.removeItem(draftKey(kind)) } catch { /* 저장소 접근 불가 시 무시 */ }
}
