// 문서 스키마 공용 헬퍼 — 준비서면 · 신청서가 함께 쓴다.
import { won, fmtDate } from './complaint.js'

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
export const signature = (key = 'signature') => ({ kind: 'signature', key })
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
  return [zip ? `(${zip})` : '', base, detail].filter(Boolean).join(' ')
}

/** 당사자 표시 줄 (문서 머리) */
export function partyLines(form, keys, labels) {
  const [a, b] = keys
  const [la, lb] = labels
  return [
    `${la}　${or(form[a.name], '이름')}${form[a.rrn] ? ` (${String(form[a.rrn]).slice(0, 8)}*****)` : ''}`,
    `　　　　${or(addrOf(form, a.addr), '주소')}`,
    ...(form[a.tel] ? [`　　　　전화 ${F(form[a.tel])}`] : []),
    `${lb}　${or(form[b.name], '이름')}${form[b.rrn] ? ` (${String(form[b.rrn]).slice(0, 8)}*****)` : ''}`,
    `　　　　${or(addrOf(form, b.addr), '주소')}`,
    ...(form[b.tel] ? [`　　　　전화 ${F(form[b.tel])}`] : []),
  ]
}


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
