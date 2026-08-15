// 사건(분쟁) 저장소 — 화면들을 잇는 한 줄기
//
// 지금까지 문서 생성만 실제로 돌아가고, 절차 안내·증빙 자료·일정은 각자 mock을 보고 있었다.
// 그래서 소장에서 대여금 사건을 만들어도 절차 안내는 임대차 사건을 보여줬다.
//
// 핵심 관점: **사건은 사건번호가 붙기 전에 이미 존재한다.**
//   자가진단을 시작하는 순간 사건이 생기고, 법원 사건번호는 접수 후 붙는 속성일 뿐이다.
//
//   사건(분쟁)  ← 앱 내부 id
//    ├ 상태: 작성 중 → 제출 준비 → 접수함 → 진행 중 → 종결
//    ├ 법원 사건번호 (접수 후)
//    └ 소장 form (당사자·금액·증거파일이 여기 다 있다)
//
// 저장은 localStorage. 실서비스라면 서버로 교체한다.

import { findType, buildPreview, completeness, allSteps, fmtDate } from './complaint.js'
import { addrOf } from './docschema.js'

const KEY = 'naholo_cases'

const read = () => {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

const write = (list) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
    return true
  } catch {
    return false                       // 용량 초과 등 — 호출부가 경고를 띄운다
  }
}

/** 최근 수정순 */
export function listCases() {
  return read().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

/**
 * 데모 사건을 저장소에 한 번 심는다 (배포 데모 포함).
 *
 * 데모 사건을 메모리 배열로만 들고 있으면, 일정 하나만 추가해도 저장소를 다시 읽어
 * 화면을 맞추는 과정에서 데모가 통째로 사라진다. 심어 두면 그때부터는 보통 사건과
 * 똑같이 고치고 지울 수 있다. 이미 저장된 것이 있으면 건드리지 않는다.
 */
export function seedCases(list, { force = false } = {}) {
  if (force) return write(list)

  // 저장된 것이 하나라도 있으면 통째로 건너뛰던 때가 있었다. 그러면 데모 사건을
  // 새로 추가해도 이미 뭔가 저장해 둔 브라우저에는 **영영 들어가지 않는다.**
  // 그래서 통째로 보는 대신 id 단위로 본다 — 없는 것만 채우고, 이미 있는 것은
  // 사용자가 고쳤을 수 있으니 그대로 둔다.
  const stored = read()
  const has = new Set(stored.map((c) => c.id))
  const missing = list.filter((c) => !has.has(c.id))
  if (!missing.length) return false
  return write([...stored, ...missing])
}

/** 배포 브라우저에 남은 오래된 데모만 정리한다. 사용자가 만든 사건은 건드리지 않는다. */
export function migrateLegacyDemoCases() {
  const current = read()
  let changed = false
  const next = current
    .filter((c) => {
      if (c.id !== 'demo-gym-case') return true
      changed = true
      return false
    })
    .map((c) => {
      if (c.id !== 'demo-labor-case' || c.title !== '근로계약 위반 손해배상') return c
      changed = true
      return { ...c, title: '임금체불 청구' }
    })
  return changed ? write(next) : false
}

export const getCase = (id) => read().find((c) => c.id === id) || null

export function removeCase(id) {
  return write(read().filter((c) => c.id !== id))
}

/** 사건번호가 없을 때 쓰는 내부 id */
const newId = () => `case_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/**
 * 사건을 직접 등록한다 — **소장보다 먼저**.
 *
 * 소장을 쓴다고 사건이 시작되는 게 아니다. 계약이 틀어지고, 내용증명을 보내고,
 * 소송을 할지 말지 고민하는 동안에도 분쟁은 이미 존재한다. 그 시기에도 상대방·금액·
 * 자료를 모아 둘 곳이 필요하다. 그래서 사건은 소장과 독립적으로 만들어진다.
 *
 * 소장은 나중에 이 사건에 붙는 문서 하나일 뿐이다.
 */
export function createCase({ title, typeKey = '', court = '', amount = '', pName = '', dName = '', caseNo = '', entryPoint = 'dispute' }) {
  const name = String(title || '').trim()
  if (!name) return null
  const now = Date.now()
  const c = {
    id: newId(),
    kind: 'case',
    title: name,
    typeKey,
    form: { court, amount, pName, dName },
    caseNo: String(caseNo || '').trim(),
    filedAt: '',
    filedVia: '',
    // 어디서부터 시작하는 사건인가 — 진행 표시의 출발점 (ENTRY_POINTS)
    entryPoint,
    flowDone: {},
    status: caseNo ? '접수함' : '작성 중',
    statusAt: {},
    todos: [], events: [], precedentNos: [], docs: [],
    createdAt: now,
    updatedAt: now,
  }
  c.statusAt[c.status] = now
  logInto(c, { kind: 'status', title: '사건 등록', desc: [court, amount && `${Number(amount).toLocaleString('ko-KR')}원`].filter(Boolean).join(' · '), fresh: true })
  if (caseNo) logInto(c, { kind: 'status', title: `법원 접수 — 사건번호 ${c.caseNo}`, fresh: true })
  return write([...read(), c]) ? c : null
}

/**
 * 사건을 부르는 이름.
 * 사용자가 붙인 이름이 우선이고, 없으면 소장 유형에서 뽑는다.
 */
export const caseTitle = (c) => {
  if (c?.title) return c.title
  const t = findType(c?.typeKey)
  return t ? `${t.title} 청구` : '이름 없는 사건'
}

/**
 * 소장 작성 내용을 사건으로 저장한다.
 * 같은 id가 있으면 갱신, 없으면 생성. 저장된 사건을 돌려준다.
 */
/**
 * 사건 저장용으로 form을 가볍게 만든다.
 * 증거 썸네일(base64)은 한 장에 10KB 안팎이라 그대로 두면 사건 몇 건만으로
 * localStorage 한도(보통 5MB)에 부딪히고, 입력할 때마다 그 전체를 파싱·직렬화하게 된다.
 * 썸네일은 작성 화면의 초안(naholo_complaint_draft)에만 남기고 여기서는 뺀다.
 */
const slim = (form) => {
  if (!form?.evidenceFiles?.length) return form
  return { ...form, evidenceFiles: form.evidenceFiles.map(({ thumb, ...rest }) => rest) }
}

export function saveComplaintAsCase(typeKey, form, id) {
  const list = read()
  const now = Date.now()
  const prev = id ? list.find((c) => c.id === id) : null

  const next = {
    ...prev,
    id: prev?.id || id || newId(),
    kind: 'complaint',
    typeKey,
    // 사건 등록에서 붙인 이름이 있으면 그대로 둔다
    title: prev?.title || '',
    form: slim(form),
    // 사건번호는 소장에서 오지 않는다. 접수해야 법원이 부여하고, 우리는 조회할 수 없다.
    // 그래서 오직 setFiling()으로만 들어온다. 여기서는 있던 값을 지키기만 한다.
    caseNo: prev?.caseNo || '',
    filedAt: prev?.filedAt || '',
    filedVia: prev?.filedVia || '',
    status: prev?.status || '작성 중',
    todos: prev?.todos || [],
    events: prev?.events || [],
    precedentNos: prev?.precedentNos || [],
    createdAt: prev?.createdAt || now,
    updatedAt: now,
  }

  // 타임라인은 "무슨 일이 있었는가"의 기록이다. 저장할 때마다 한 줄씩 쌓으면
  // 금세 노이즈가 되므로, 같은 종류의 기록은 6시간 안에서는 하나로 묶는다.
  logInto(next, { kind: 'doc', title: prev ? '소장 내용 수정' : '소장 초안 생성' })

  const before = prev?.form?.evidenceFiles?.length || 0
  const after = form?.evidenceFiles?.length || 0
  if (after > before) {
    logInto(next, { kind: 'evidence', title: `증빙자료 ${after - before}건 연결`, fresh: true })
  }

  const rest = list.filter((c) => c.id !== next.id)
  return write([...rest, next]) ? next : null
}

const FLOW_KEYS = ['deal', 'notice', 'draft', 'file', 'trial', 'judge']

// 상단의 사건 상태는 업무 상태, 아래 바는 실제 소송 절차라 칸 수가 다르다.
// 직접 상태를 바꿀 때는 가장 자연스러운 절차 위치로 함께 옮겨 두 화면이 어긋나지 않게 한다.
const STATUS_FLOW_CURRENT = {
  '작성 중': 'draft',
  '제출 준비': 'file',
  '접수함': 'trial',
  '진행 중': 'trial',
  '종결': 'judge',
}

const flowDoneBefore = (currentKey) => {
  const current = FLOW_KEYS.indexOf(currentKey)
  return Object.fromEntries(FLOW_KEYS.map((key, index) => [key, index < current]))
}

/** 사건의 상태를 바꾼다 (작성 중 → 제출 준비 → 접수함 → 진행 중 → 종결) */
export function setCaseStatus(id, status, { reason = '' } = {}) {
  return patch(id, (c) => {
    if (c.status === status) return
    c.status = status
    const currentFlow = STATUS_FLOW_CURRENT[status]
    if (currentFlow) c.flowDone = flowDoneBefore(currentFlow)
    // 단계마다 '처음 닿은 때'를 남긴다. 되돌렸다가 다시 와도 처음 시각을 지킨다 —
    // 트래커에 찍히는 날짜는 "언제 여기까지 왔나"이지 "마지막으로 눌렀나"가 아니다.
    c.statusAt = c.statusAt || {}
    if (!c.statusAt[status]) c.statusAt[status] = Date.now()
    logInto(c, {
      kind: 'status',
      title: `진행 표시를 「${status}」로 바꿈`,
      desc: String(reason || '').trim(),
      source: reason ? 'user' : 'app',
      fresh: true,
    })
  })
}

/**
 * 접수 정보 — 사건번호·접수일·접수 방법.
 *
 * 셋 다 **접수한 뒤에야 알 수 있는 값**이다.
 * 사건번호는 법원이 부여하고, 우리는 법원 시스템을 조회할 수 없다.
 * 전자소송이면 「나의전자소송」에서, 종이 제출이면 접수증에서 보고 옮겨 적는 것이다.
 *
 * 접수일이 필요한 이유: 이후 안내(답변서 기한·변론기일)가 전부 이 날짜에서 출발한다.
 * 접수 방법이 필요한 이유: 이후 화면이 복사용인지 인쇄용인지가 여기서 갈린다.
 *
 * 오타는 반드시 난다. 그래서 언제든 다시 부를 수 있게 만든다.
 */
export function setFiling(id, { caseNo, filedAt, filedVia }) {
  return patch(id, (c) => {
    const first = !c.caseNo && caseNo
    if (caseNo !== undefined) c.caseNo = caseNo.trim()
    if (filedAt !== undefined) c.filedAt = filedAt
    if (filedVia !== undefined) c.filedVia = filedVia
    if (first) {
      if (c.status === '작성 중' || c.status === '제출 준비') {
        c.status = '접수함'
        c.flowDone = flowDoneBefore('trial')
        c.statusAt = c.statusAt || {}
        c.statusAt['접수함'] = c.filedAt ? new Date(`${c.filedAt}T12:00:00`).getTime() : Date.now()
      }
      logInto(c, {
        kind: 'status',
        title: `법원 접수 — 사건번호 ${c.caseNo}`,
        desc: [c.filedVia, c.filedAt && `${fmtDate(c.filedAt)} 접수`].filter(Boolean).join(' · '),
        at: c.filedAt ? new Date(`${c.filedAt}T12:00:00`).getTime() : Date.now(),
        fresh: true,
      })
    }
  })
}

/** 사건번호 형태 확인 — 2026가단123456 / 2026가소11223 / 2026차전1234 */
export const looksLikeCaseNo = (v) => /^\d{4}\s*[가-힣]{1,3}\s*\d{1,7}$/.test(String(v || '').trim())

/* ─────────────────── 사건 안의 기록 (공통 도구) ─────────────────── */

const uid = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** 사건 하나를 찾아 고치고 저장한다. 고쳐진 사건을 돌려준다. */
function patch(id, fn) {
  const list = read()
  const c = list.find((x) => x.id === id)
  if (!c) return null
  fn(c)
  c.updatedAt = Date.now()
  return write(list) ? c : null
}

const SIX_HOURS = 6 * 60 * 60 * 1000

/**
 * 타임라인에 한 줄 남긴다.
 * `fresh`가 아니면 최근 같은 제목의 기록을 시각만 갱신해 중복을 막는다.
 */
function logInto(c, { kind, title, desc = '', at = Date.now(), source = 'app', fresh = false }) {
  c.events = c.events || []
  if (!fresh) {
    const same = c.events.find((e) => e.source === 'app' && e.title === title && at - e.at < SIX_HOURS)
    if (same) { same.at = at; return same }
  }
  const e = { id: uid('ev'), kind, title, desc, at, source }
  c.events.push(e)
  return e
}

/* ─────────────────── 준비사항 (할 일) ─────────────────── */
//
// 일반 Todo가 아니라 "이 사건을 위해 준비할 것"이다.
// 그래서 기한이 있고, 완료하면 타임라인에 흔적이 남는다.

export const caseTodoList = (c) =>
  [...(c?.todos || [])].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1          // 남은 일이 먼저
    if (a.due !== b.due) return (a.due || '9999').localeCompare(b.due || '9999')
    return a.createdAt - b.createdAt
  })

export function addTodo(id, text, due = '', meta = {}) {
  const t = String(text || '').trim()
  if (!t) return null
  return patch(id, (c) => {
    c.todos = c.todos || []
    const duplicate = c.todos.some((item) => !item.done && item.text === t && item.due === due)
    if (duplicate) return
    c.todos.push({
      id: uid('td'), text: t, due, done: false, createdAt: Date.now(),
      ...Object.fromEntries(Object.entries(meta || {}).filter(([, value]) => value !== undefined)),
    })
    if (meta?.source === 'court-notice') {
      logInto(c, {
        kind: 'schedule', title: `법원 통지서 일정 등록 — ${t}`,
        desc: [due, meta.time, meta.noticeName].filter(Boolean).join(' · '),
        source: 'user', fresh: true,
      })
    }
  })
}

export function toggleTodo(id, todoId) {
  return patch(id, (c) => {
    const t = (c.todos || []).find((x) => x.id === todoId)
    if (!t) return
    t.done = !t.done
    t.doneAt = t.done ? Date.now() : undefined
    if (t.done) logInto(c, { kind: 'todo', title: `준비사항 완료 — ${t.text}`, fresh: true })
  })
}

export function updateTodo(id, todoId, patchFields) {
  return patch(id, (c) => {
    const t = (c.todos || []).find((x) => x.id === todoId)
    if (t) Object.assign(t, patchFields)
  })
}

export function removeTodo(id, todoId) {
  return patch(id, (c) => { c.todos = (c.todos || []).filter((x) => x.id !== todoId) })
}

/** 기한이 지났는데 아직 안 끝난 준비사항 */
export const overdueTodos = (c, today = new Date().toISOString().slice(0, 10)) =>
  caseTodoList(c).filter((t) => !t.done && t.due && t.due < today)

/* ─────────────────── 타임라인 ─────────────────── */
//
// 나홀로법에서 한 일(source: 'app')과 사용자가 직접 적은 실제 진행(source: 'user')을
// 한 줄기로 본다. 법원·전자소송포털과 연결된 것이 아니라, 사용자가 적어두는 기록이다.

export const caseLog = (c) => [...(c?.events || [])].sort((a, b) => b.at - a.at)

export function addUserEvent(id, { title, desc = '', at }) {
  const t = String(title || '').trim()
  if (!t) return null
  const when = at ? new Date(`${at}T12:00:00`).getTime() : Date.now()
  return patch(id, (c) => { logInto(c, { kind: 'user', title: t, desc, at: when, source: 'user', fresh: true }) })
}

export function removeEvent(id, eventId) {
  return patch(id, (c) => { c.events = (c.events || []).filter((e) => e.id !== eventId) })
}

/* ─────────────────── 관련 판례 ─────────────────── */
//
// 판례 기능을 여기서 다시 만들지 않는다. 판례 검색에서 담은 것을
// "이 사건에 연결" 해두고, 더 찾을 때는 판례 검색으로 보낸다.

export const casePrecedentNos = (c) => c?.precedentNos || []

export function linkPrecedent(id, no, title = '') {
  return patch(id, (c) => {
    c.precedentNos = c.precedentNos || []
    if (c.precedentNos.includes(no)) return
    c.precedentNos.push(no)
    logInto(c, { kind: 'precedent', title: `관련 판례 연결 — ${title || no}`, fresh: true })
  })
}

export function unlinkPrecedent(id, no) {
  return patch(id, (c) => { c.precedentNos = (c.precedentNos || []).filter((x) => x !== no) })
}

/* ─────────────────── 사건에서 화면용 정보 뽑기 ─────────────────── */

/** 목록·배너에 쓰는 요약 */
export function caseSummary(c) {
  if (!c) return null
  const type = findType(c.typeKey)
  const form = c.form || {}
  const doc = type ? buildPreview(type, form) : null
  return {
    id: c.id,
    caseNo: c.caseNo || '',
    // 사건번호가 없으면 사건명으로 부른다 — 번호가 없다고 사건이 없는 게 아니다
    label: c.caseNo || caseTitle(c),
    title: caseTitle(c),
    court: form.court || '',
    type: '민사',
    status: c.status,
    filedAt: c.filedAt || '',
    filedVia: c.filedVia || '',
    amount: form.amount || '',
    plaintiff: form.pName || '',
    defendant: form.dName || '',
    progress: type ? completeness(type, form) : 0,
    updatedAt: c.updatedAt,
    isMine: true,
  }
}

/** 소장 6단계에서 올린 파일 → 갑호증 목록 */
export function caseEvidence(c) {
  const files = c?.form?.evidenceFiles || []
  return files.map((f, i) => ({
    no: i + 1,
    code: `갑 제${i + 1}호증`,
    file: f.name || `증거 ${i + 1}`,
    size: f.size ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : '',
    thumb: f.thumb || '',
    blobPathname: f.blobPathname || '',
    url: f.url || '',
    // 입증취지는 증거목록 문서에서 채운다. 비어 있으면 그 자체가 할 일이다.
    purpose: f.purpose || '',
    // 제출 상태는 사용자가 직접 옮긴다 (법원 시스템을 조회할 수 없다)
    status: f.status || '미제출',
    tone: EVIDENCE_TONE[f.status || '미제출'],
    due: f.due || '',
    submittedAt: f.submittedAt || '',
    createdAt: f.createdAt || f.lastModified || c?.createdAt || '',
    updatedAt: f.updatedAt || f.createdAt || f.lastModified || c?.updatedAt || '',
    versions: f.versions || [],
    ready: !!f.purpose,          // 증거목록에 넣을 수 있는가
  }))
}

/** 증거 중 아직 입증취지가 없는 것 — 화면에서 "할 일"로 보여준다 */
export const evidenceTodo = (c) => caseEvidence(c).filter((e) => !e.purpose)

/* ─────────────────── 증빙자료 서류 종류 ───────────────────
   자료는 사건별로 묶고, 그 안에서 서류 종류로 나눈다 — 종이 서류철과 같은 순서다.
   사용자가 종류를 일일이 고르게 하면 대부분 '기타'에 쌓이므로, 파일명으로 먼저 짐작하고
   틀렸으면 옮길 수 있게 한다. 순서가 곧 우선순위다 — 위에서부터 먼저 맞는 것을 쓴다. */

export const EVIDENCE_KINDS = [
  { key: 'complaint', name: '소장·서면', hint: '소장·준비서면·답변서·신청서', match: /소장|준비서면|답변서|신청서|증거목록|의견서|보정/ },
  { key: 'contract', name: '계약서', hint: '계약서·약정서·차용증', match: /계약|약정|차용|각서|합의/ },
  { key: 'receipt', name: '영수증·입금증', hint: '영수증·입금증·거래내역', match: /영수증|입금|송금|이체|납부|거래내역|명세|견적|계산서|정산/ },
  { key: 'chat', name: '대화기록', hint: '카톡·문자·통화·이메일', match: /카톡|카카오|문자|메시지|메신저|통화|녹취|녹음|메일/ },
  { key: 'photo', name: '사진', hint: '현장·하자 사진', match: /사진|이미지|캡처|\.(jpe?g|png|gif|webp|heic)$/i },
  { key: 'etc', name: '기타 자료', hint: '어디에도 들지 않는 자료', match: null },
]

export const evidenceKindName = (key) => EVIDENCE_KINDS.find((k) => k.key === key)?.name || '기타 자료'

/** 파일명으로 서류 종류를 짐작한다. 못 맞히면 '기타 자료'다 — 빈 폴더보다 낫다. */
export function evidenceKindOf(fileName = '') {
  const name = String(fileName)
  const hit = EVIDENCE_KINDS.find((k) => k.match && k.match.test(name))
  return hit ? hit.key : 'etc'
}

/** 사건 하나의 증거를 서류 종류 폴더로 묶는다. 비어 있는 종류는 만들지 않는다. */
export function caseEvidenceFolders(c) {
  const items = caseEvidence(c)
  return EVIDENCE_KINDS
    .map((kind) => ({
      key: kind.key,
      name: kind.name,
      tags: [],
      files: items
        .filter((e) => evidenceKindOf(e.file) === kind.key)
        .map((e) => ({
          name: e.file,
          desc: e.purpose || `${e.code} · 입증취지 없음`,
          size: e.size || '—',
          date: e.submittedAt || e.due || '',
          status: e.status,
          thumb: e.thumb,
          blobPathname: e.blobPathname,
          url: e.url,
        })),
    }))
    .filter((f) => f.files.length > 0)
}

/* ─────────────────── 증빙자료 상태 ───────────────────
   증거는 올려 두면 끝이 아니다. 실제로는 이렇게 움직인다.
     미제출 → 제출예정(기한을 정함) → 제출완료
                    ↘ 보완필요 (개인정보 노출·사본 불명확 등으로 되돌아옴)
   그래서 상태는 파일 자체의 속성으로 사건에 저장한다. 화면 안에서만 바꾸면
   새로고침에 사라지고, 증거목록·절차 안내가 그 값을 못 읽는다. */

export const EVIDENCE_STATUS = ['미제출', '제출예정', '제출완료', '보완필요']

export const EVIDENCE_TONE = {
  미제출: 'gray',
  제출예정: 'blue',
  제출완료: 'blue',
  보완필요: 'red',
}

/** 증거 하나의 상태를 바꾼다. 제출완료로 가면 제출일이 자동으로 찍힌다. */
export function setEvidenceStatus(id, no, status) {
  if (!EVIDENCE_STATUS.includes(status)) return null
  return patch(id, (c) => {
    const f = (c.form?.evidenceFiles || [])[no - 1]
    if (!f) return
    if (f.status === status) return
    f.status = status
    f.submittedAt = status === '제출완료' ? new Date().toISOString().slice(0, 10) : ''
    logInto(c, { kind: 'evidence', title: `갑 제${no}호증 — ${status}`, fresh: true })
  })
}

/** 입증취지·제출기한처럼 증거에 붙는 값을 고친다 */
export function updateEvidence(id, no, patchFields) {
  return patch(id, (c) => {
    const f = (c.form?.evidenceFiles || [])[no - 1]
    if (f) Object.assign(f, patchFields)
  })
}

/**
 * 증거 파일을 사건에서 지운다.
 * 갑호증 번호는 순서로 매기므로 뒤 번호가 하나씩 당겨진다 — 지우기 전에 사용자에게 알린다.
 */
export function removeEvidence(id, no) {
  return patch(id, (c) => {
    const files = c.form?.evidenceFiles || []
    const f = files[no - 1]
    if (!f) return
    files.splice(no - 1, 1)
    logInto(c, { kind: 'evidence', title: `증거 삭제 — ${f.name || `갑 제${no}호증`}`, fresh: true })
  })
}

/**
 * 사건 진행 단계.
 * 접수 전에는 "무엇을 더 채워야 접수할 수 있는가"가 곧 단계다.
 */
export function caseSteps(c) {
  if (!c) return []
  const type = findType(c.typeKey)
  const form = c.form || {}
  const pct = type ? completeness(type, form) : 0
  // 상태 문자열은 CASE_FLOW와 같아야 한다 ('접수됨'이 아니라 '접수함')
  const filed = c.status === '접수함' || c.status === '진행 중' || c.status === '종결'
  const hasEvidence = (form.evidenceFiles || []).length > 0

  return [
    {
      name: '사건 진단',
      status: 'done',
      desc: '어떤 유형의 소송인지 확인했습니다.',
      items: [type?.title || '소장 유형 선택'],
    },
    {
      name: '소장 작성',
      status: pct >= 100 ? 'done' : 'current',
      desc: pct >= 100 ? '필수 항목을 모두 채웠습니다.' : `필수 항목 ${pct}% 작성했습니다.`,
      items: ['당사자·관할 입력', '청구취지·청구원인', '증거 첨부'],
      to: '/app/documents',
    },
    {
      name: '증거 정리',
      status: hasEvidence ? (evidenceTodo(c).length ? 'current' : 'done') : 'todo',
      desc: hasEvidence
        ? (evidenceTodo(c).length ? `입증취지가 비어 있는 증거가 ${evidenceTodo(c).length}건 있습니다.` : '증거와 입증취지를 정리했습니다.')
        : '아직 올린 증거가 없습니다.',
      items: ['증거 파일 업로드', '입증취지 작성', '증거목록 만들기'],
      to: '/app/evidence',
    },
    {
      name: '법원 접수',
      status: filed ? 'done' : (pct >= 100 ? 'current' : 'todo'),
      desc: filed
        ? [c.caseNo && `사건번호 ${c.caseNo}`, c.filedAt && `${c.filedAt} 접수`].filter(Boolean).join(' · ') || '접수했습니다.'
        : '전자소송 또는 종이로 접수합니다.',
      items: ['인지대·송달료 납부', '전자소송 입력 또는 종이 제출'],
    },
    {
      name: '변론 준비',
      status: filed ? 'current' : 'todo',
      desc: '상대방 답변서를 받으면 준비서면으로 반박합니다.',
      items: ['답변서 검토', '준비서면 작성', '증거 보강'],
      to: '/app/documents',
    },
  ]
}

/** 진행률 — 접수 전이면 작성 완성도, 접수 후면 단계 기준 */
export function caseProgress(c) {
  const steps = caseSteps(c)
  if (!steps.length) return 0
  const done = steps.filter((s) => s.status === 'done').length
  return Math.round((done / steps.length) * 100)
}

/** 접수 전 사건에 필요한 '할 일'. 일정 화면에서 쓴다. */
export function caseTodos(c) {
  if (!c) return []
  const type = findType(c.typeKey)
  const form = c.form || {}
  const out = []

  // 아직 못 채운 필수 항목을 단계 이름으로 묶어 보여준다
  if (type) {
    for (const [i, step] of allSteps(type).entries()) {
      const missing = step.fields.filter(
        (f) => f.required && f.key && (f.when ? f.when(form) : true) && !hasValue(form, f),
      )
      if (missing.length) {
        out.push({
          title: `${i + 1}단계 「${step.title}」 미완성`,
          desc: missing.slice(0, 3).map((f) => f.label).filter(Boolean).join(', ') + (missing.length > 3 ? ` 외 ${missing.length - 3}건` : ''),
          to: '/app/documents',
        })
      }
    }
  }
  for (const e of evidenceTodo(c)) {
    out.push({ title: `${e.code} 입증취지 없음`, desc: e.file, to: '/app/evidence' })
  }
  return out
}

const hasValue = (form, f) => {
  const v = f.kind === 'address' ? addrOf(form, f.key) : form[f.key]
  return Array.isArray(v) ? v.length > 0 : !!v
}

/* ─────────────────── 문서 ─────────────────── */
//
// 문서 자체는 문서 생성 화면이 만든다. 사건관리는 "이 사건에서 뭘 만들었나"만 보여주고
// 실제 작업은 문서 생성으로 넘긴다.

const DOC_LABEL = {
  complaint: '소장',
  brief: '준비서면',
  evidence: '증거목록',
  petition: '신청서',
  answer: '답변서',
}

/* ─────────────────── 문서의 제출 상태 ───────────────────
   증거와 마찬가지로 문서도 "만들었다"가 끝이 아니다. 쓰고 → 낼 날을 정하고 → 낸다.
   소장은 접수 여부가 곧 제출 상태라 사건에서 끌어오고, 나머지는 여기에 적어 둔다. */

export const DOC_STATUS = ['작성 중', '제출예정', '제출완료', '보완필요']

export function docMeta(c, docId) {
  const m = (c?.docMeta || {})[docId] || {}
  const fallback = docId === 'complaint' && (c?.filedAt || c?.caseNo) ? '제출완료' : '작성 중'
  return {
    status: m.status || fallback,
    due: m.due || '',
    submittedAt: m.submittedAt || (docId === 'complaint' ? c?.filedAt || '' : ''),
  }
}

/** 제출 상태·기한처럼 문서에 붙는 값을 고친다 */
export function setDocMeta(id, docId, fields) {
  return patch(id, (c) => {
    c.docMeta = c.docMeta || {}
    const prev = c.docMeta[docId] || {}
    const next = { ...prev, ...fields }
    if (fields.status) {
      next.submittedAt = fields.status === '제출완료' ? new Date().toISOString().slice(0, 10) : ''
      logInto(c, { kind: 'doc', title: `${(c.docs || []).find((d) => d.id === docId)?.title || DOC_LABEL[docId] || '문서'} — ${fields.status}`, fresh: true })
    }
    c.docMeta[docId] = next
    const d = (c.docs || []).find((x) => x.id === docId)
    if (d && fields.title) d.title = fields.title
    if (d && (fields.status === '제출완료' || fields.submittedAt)) {
      d.versions = Array.isArray(d.versions) && d.versions.length
        ? d.versions
        : [{ version: 1, createdAt: d.createdAt || d.updatedAt, note: '최초 생성본' }]
      const latest = d.versions[d.versions.length - 1]
      latest.submittedAt = fields.submittedAt || next.submittedAt || new Date().toISOString().slice(0, 10)
    }
  })
}

/** 문서를 사건에서 지운다. 소장은 사건 그 자체라 지울 수 없다. */
export function removeDoc(id, docId) {
  if (docId === 'complaint') return null
  return patch(id, (c) => {
    c.docs = (c.docs || []).filter((d) => d.id !== docId)
    if (c.docMeta) delete c.docMeta[docId]
  })
}

export function caseDocs(c) {
  if (!c) return []
  const type = findType(c.typeKey)
  const form = c.form || {}
  const out = []

  // 소장은 사건 그 자체에서 나온다
  out.push({
    id: 'complaint',
    kind: 'complaint',
    label: DOC_LABEL.complaint,
    title: type ? `${type.title} 소장` : '소장',
    progress: type ? completeness(type, form) : 0,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    versions: c.docVersions?.complaint || [],
    to: '/app/documents',
  })

  // 나머지는 만들어졌을 때만 (문서 생성 화면이 사건에 붙여준다)
  for (const d of c.docs || []) {
    out.push({
      id: d.id,
      kind: d.kind,
      label: DOC_LABEL[d.kind] || '문서',
      title: d.title || DOC_LABEL[d.kind] || '문서',
      progress: d.progress ?? 0,
      createdAt: d.createdAt || d.updatedAt,
      updatedAt: d.updatedAt,
      versions: d.versions || [],
      to: '/app/documents',
    })
  }
  return out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

/** 문서 생성 화면이 만든 결과를 사건에 붙인다 */
export function attachDoc(id, { kind, title, progress = 0, docId }) {
  return patch(id, (c) => {
    c.docs = c.docs || []
    const key = docId || kind
    const prev = c.docs.find((d) => d.id === key)
    const now = Date.now()
    if (prev) {
      const versions = Array.isArray(prev.versions) && prev.versions.length
        ? [...prev.versions]
        : [{ version: 1, createdAt: prev.createdAt || prev.updatedAt, note: '최초 생성본' }]
      versions.push({ version: versions.length + 1, createdAt: now, note: '새로 생성한 파일' })
      Object.assign(prev, { title, progress, updatedAt: now, versions })
    } else {
      c.docs.push({
        id: key, kind, title, progress, createdAt: now, updatedAt: now,
        versions: [{ version: 1, createdAt: now, note: '최초 생성본' }],
      })
    }
    logInto(c, { kind: 'doc', title: `${DOC_LABEL[kind] || '문서'} 작성` })
  })
}

/* ═════════════════ 대시보드 ═════════════════
   사건관리는 읽는 화면이 아니라 **보는 화면**이다.
   그래서 화면에 나가는 값은 전부 여기서 "숫자 하나 + 상태 하나"로 줄여 놓는다.
   문장을 만드는 일은 화면이 아니라 여기서 끝낸다. */

/* ── 작업 단위 ──────────────────────────────────────────────
   소장의 6단계는 사용자에게 "몇 단계"로 기억되지 않는다.
   「원고 정보」「청구 금액」처럼 **무엇을 채우는 일인가**로 묶어야 손이 간다.  */

const UNITS = [
  { key: 'court', label: '관할 법원', fields: ['court'] },
  { key: 'amount', label: '청구 금액', fields: ['amount'] },
  { key: 'plaintiff', label: '원고 정보', fields: ['pName', 'pAddr', 'pRrn', 'pTel'] },
  { key: 'defendant', label: '피고 정보', fields: ['dName', 'dAddr'] },
]

const has = (form, key) => {
  const v = key.endsWith('Addr') ? addrOf(form, key) : form[key]
  return Array.isArray(v) ? v.length > 0 : !!String(v ?? '').trim()
}

/** 사건에서 아직 못 채운 것을 '작업 단위'로 묶어 돌려준다 */
export function caseTasks(c) {
  if (!c) return []
  const type = findType(c.typeKey)
  const form = c.form || {}
  const out = UNITS.map((u) => {
    const missing = u.fields.filter((f) => !has(form, f))
    return { key: u.key, label: u.label, total: u.fields.length, missing: missing.length, done: missing.length === 0, to: '/app/documents' }
  })

  // 사실관계 — 유형마다 다르므로 스키마에서 필수 항목만 추린다 (당사자·법원 단계는 위에서 이미 셌다)
  if (type) {
    const steps = allSteps(type).slice(2)
    const req = []
    for (const s of steps) {
      for (const f of s.fields) {
        if (!f.required || !f.key || f.kind === 'files') continue
        if (f.when && !f.when(form)) continue
        req.push(f)
      }
    }
    const missing = req.filter((f) => !has(form, f.key))
    out.push({
      key: 'facts', label: '사실관계', total: req.length, missing: missing.length,
      done: req.length > 0 && missing.length === 0, to: '/app/documents',
    })
  }

  const ev = (form.evidenceFiles || []).length
  out.push({ key: 'evidence', label: '입증자료', total: 1, missing: ev ? 0 : 1, done: ev > 0, to: '/app/evidence' })
  return out
}

/* ── 가로 진행 스텝퍼 ────────────────────────────────────────
   진행 표시(사용자가 누르는 상태)와 달리, 이건 **사건 자체가 어디까지 왔나**다.
   값이 전부 우리가 아는 것에서만 나온다 — 법원을 조회하지 않는다. */

/**
 * 어디서부터 시작하는 사건인가.
 *
 * 모두가 분쟁이 막 생긴 시점에 우리를 찾지 않는다. 소장을 쓰려고 오는 사람도 있고,
 * 이미 접수하고 기일을 기다리는 사람도 있다. 그런 사람에게 「분쟁 발생」이 안 끝난
 * 칸으로 남아 있으면, 진행 표시가 실제보다 한참 뒤처져 보인다.
 *
 * `before`에 적힌 칸은 시작 지점보다 앞이라 지나간 것으로 본다.
 */
export const ENTRY_POINTS = [
  { key: 'dispute', label: '분쟁이 막 생겼어요', desc: '아직 아무것도 보내지 않았습니다', before: [] },
  { key: 'notified', label: '내용증명까지 보냈어요', desc: '상대방에게 요구했지만 해결되지 않았습니다', before: ['deal', 'notice'] },
  { key: 'draft', label: '소장부터 준비하려고요', desc: '분쟁 경위는 정리됐고 소장을 쓸 차례입니다', before: ['deal', 'notice'] },
  { key: 'filed', label: '이미 소장을 냈어요', desc: '법원에 접수했고 그 뒤를 관리합니다', before: ['deal', 'notice', 'draft', 'file'] },
]

export const entryPoint = (c) => ENTRY_POINTS.find((e) => e.key === c?.entryPoint) || ENTRY_POINTS[0]

/**
 * 가로 진행 스텝퍼의 칸들.
 *
 * 칸이 끝났는지는 세 가지가 정한다 — 셋 중 하나라도 맞으면 끝난 것으로 본다.
 *   1. 우리가 아는 사실   (사건번호가 있으면 접수한 것이다)
 *   2. 시작 지점보다 앞   (소장부터 시작한 사람에게 「분쟁 발생」은 이미 지난 일)
 *   3. 사용자가 직접 표시 (법원에서 벌어지는 일은 우리가 알 수 없다)
 *
 * 3번이 필요한 이유는 분명하다. 변론이 끝났는지, 판결이 났는지는 법원 시스템에만 있고
 * 우리는 조회할 수 없다. 사용자가 직접 눌러 옮기지 못하면 그 두 칸은 영원히 비어 있다.
 */
export function caseFlow(c) {
  const form = c?.form || {}
  const type = findType(c?.typeKey)
  const pct = type ? completeness(type, form) : 0
  const filed = !!c?.caseNo
  const said = (c?.events || []).some((e) => /내용증명|최고|독촉/.test(e.title)) ||
    (c?.todos || []).some((t) => t.done && /내용증명|최고|독촉/.test(t.text))
  // 계약일 키는 유형마다 다르다
  const dealt = ['loanDate', 'contractDate', 'hireDate', 'incidentDate'].some((k) => has(form, k))

  const passed = new Set(entryPoint(c).before)
  const marked = c?.flowDone || {}
  /** 자동 판단 || 시작 지점 이전 || 사용자가 직접 표시 */
  const settle = (key, auto) => marked[key] ?? (auto || passed.has(key))

  return [
    { key: 'deal', label: '분쟁 발생', done: settle('deal', dealt), at: form.loanDate || form.contractDate || form.hireDate || form.incidentDate || '' },
    { key: 'notice', label: '내용증명', done: settle('notice', said), optional: true },
    { key: 'draft', label: '소장 작성', done: settle('draft', pct >= 100), pct },
    { key: 'file', label: '법원 접수', done: settle('file', filed), at: c?.filedAt || '' },
    // '진행 중'은 변론을 **하고 있는** 것이지 끝낸 게 아니다.
    // done으로 치면 현재 칸이 「판결」로 밀려 이미 끝난 사건처럼 보인다.
    { key: 'trial', label: '변론', done: settle('trial', c?.status === '종결') },
    { key: 'judge', label: '판결', done: settle('judge', c?.status === '종결') },
  ]
}

/**
 * 사용자가 고른 칸을 '현재 단계'로 만든다.
 *
 * 진행 단계는 체크박스 묶음이 아니라 한 줄짜리 위치다. 중간 칸 하나만 끄면 뒤 칸은
 * 완료인데 앞 칸은 미완료인 상태가 생기고, 화면의 파란 선도 뒤로 움직이지 않는다.
 * 고른 칸 앞은 완료, 고른 칸부터 뒤는 미완료로 맞춰 항상 연속된 한 상태만 저장한다.
 */
export function setFlowStep(id, key, { note = '', skipped = '', clearSkipped = '' } = {}) {
  return patch(id, (c) => {
    const picked = FLOW_KEYS.indexOf(key)
    if (picked < 0) return
    c.flowDone = flowDoneBefore(key)
    c.flowSkipped = { ...(c.flowSkipped || {}) }
    if (skipped) c.flowSkipped[skipped] = true
    if (clearSkipped) delete c.flowSkipped[clearSkipped]
    const label = { deal: '분쟁 발생', notice: '내용증명', draft: '소장 작성', file: '법원 접수', trial: '변론', judge: '판결' }[key]
    const nextStatus = {
      deal: '작성 중', notice: '작성 중', draft: '작성 중',
      file: '접수함', trial: '진행 중', judge: '진행 중',
    }[key]
    if (nextStatus && c.status !== nextStatus) {
      c.status = nextStatus
      c.statusAt = { ...(c.statusAt || {}), [nextStatus]: Date.now() }
    }
    logInto(c, { kind: 'status', title: `현재 진행 단계 — ${label}`, desc: note, source: 'user', fresh: true })
  })
}

/** 자동 판단으로 되돌린다 */
export function clearFlowStep(id, key) {
  return patch(id, (c) => {
    const next = { ...(c.flowDone || {}) }
    delete next[key]
    c.flowDone = next
  })
}

export function setEntryPoint(id, key) {
  return patch(id, (c) => { c.entryPoint = key })
}

/**
 * 지금 서 있는 칸.
 *
 * "안 끝난 첫 칸"으로 잡으면 안 된다 — 계약일을 안 적었다고 이미 접수한 사건이
 * 「분쟁 발생」에 서 있는 것처럼 보인다. 소송은 앞 칸이 비어도 앞으로 나간다.
 * 그래서 **끝난 칸 중 가장 뒤**의 다음 칸을 현재로 본다.
 */
export const flowIndex = (c) => {
  const f = caseFlow(c)
  let last = -1
  f.forEach((s, i) => { if (s.done) last = i })
  return Math.min(f.length - 1, last + 1)
}

/* ── 다가오는 일정 ────────────────────────────────────────── */

export function caseUpcoming(c, today = new Date().toISOString().slice(0, 10)) {
  return caseTodoList(c)
    .filter((t) => !t.done && t.due)
    .map((t) => ({ ...t, dday: Math.round((new Date(t.due) - new Date(today)) / 86400000) }))
    .sort((a, b) => a.dday - b.dday)
}

/* ── AI 검토 ──────────────────────────────────────────────
   길게 설명하지 않는다. **지금 손대야 할 것 한 줄**만 남긴다. */

export function caseInsights(c) {
  if (!c) return []
  const form = c.form || {}
  const out = []

  for (const t of caseTasks(c)) {
    if (t.done) continue
    if (t.key === 'evidence') out.push({ text: '입증자료가 아직 없습니다.', to: '/app/evidence' })
    else out.push({ text: `${t.label}에 빈칸이 ${t.missing}개 있습니다.`, to: t.to })
  }

  const noPurpose = caseEvidence(c).filter((e) => !e.purpose).length
  if (noPurpose) out.push({ text: `입증취지가 비어 있는 자료가 ${noPurpose}건입니다.`, to: '/app/evidence' })

  if (!form.amount) out.push({ text: '소가가 정해지지 않아 인지대를 계산할 수 없습니다.', to: '/app/documents' })

  const late = overdueTodos(c).length
  if (late) out.push({ text: `기한이 지난 준비사항이 ${late}건입니다.`, to: '', urgent: true })

  if (!c.caseNo && c.status === '접수함') out.push({ text: '접수했는데 사건번호가 비어 있습니다.', to: '' })

  return out.slice(0, 4)
}

/* ─────────────────── 목록에서 쓰는 표현 ─────────────────── */
//
// 사건마다 책 한 권. 색은 사건 유형에서 고정적으로 뽑아 같은 사건이 늘 같은 색이 되게 한다.
// 메인 색은 모두 300 스케일 — 계열만 달라진다.

// 팔레트는 grey · blue · red 셋뿐이다(Figma `color` 변수).
// 그래서 사건 유형은 다른 색이 아니라 **같은 파랑의 다른 단계**로 가른다.
// 한 계열 안에서 진해지는 부채꼴이라 색이 튀지 않으면서도 서로 구분된다.
const SPINES = {
  blue200: { cover: '#90c2ff' },
  blue300: { cover: '#64a8ff' },   // 메인
  blue400: { cover: '#4593fc' },
  blue500: { cover: '#3182f6' },
  blue600: { cover: '#2272eb' },
  grey400: { cover: '#b0b8c1' },
}

// 사건 유형마다 단계를 고정한다. 해시로 돌리면 유형이 다른데 색이 겹친다.
const SPINE_BY_TYPE = {
  loan: 'blue300',      // 가장 흔한 유형에 메인 스케일
  deposit: 'blue500',
  wage: 'blue200',
  tort: 'blue600',
  evict: 'blue400',
}

export const spineOf = (c) => SPINES[SPINE_BY_TYPE[c?.typeKey] || 'grey400']

// 도형 안에 들어갈 짧은 이름. 유형 제목은 「건물명도 (미납월세 · 무단점거)」처럼 길다.
const SHORT_BY_TYPE = {
  loan: '대여금',
  deposit: '임대차',
  wage: '임금',
  tort: '손해배상',
  evict: '건물명도',
}

export const shortLabelOf = (c) => SHORT_BY_TYPE[c?.typeKey] || '사건'

/** 지금 어느 단계인가 — 책 표지와 개요에 같이 쓴다 */
export function currentStage(c) {
  const steps = caseSteps(c)
  const cur = steps.find((s) => s.status === 'current')
  return cur || steps[steps.length - 1] || null
}
