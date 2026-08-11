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
export function createCase({ title, typeKey = '', court = '', amount = '', pName = '', dName = '', caseNo = '' }) {
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

/** 사건의 상태를 바꾼다 (작성 중 → 제출 준비 → 접수함 → 진행 중 → 종결) */
export function setCaseStatus(id, status) {
  return patch(id, (c) => {
    if (c.status === status) return
    c.status = status
    // 단계마다 '처음 닿은 때'를 남긴다. 되돌렸다가 다시 와도 처음 시각을 지킨다 —
    // 트래커에 찍히는 날짜는 "언제 여기까지 왔나"이지 "마지막으로 눌렀나"가 아니다.
    c.statusAt = c.statusAt || {}
    if (!c.statusAt[status]) c.statusAt[status] = Date.now()
    logInto(c, { kind: 'status', title: `진행 표시를 「${status}」로 바꿈`, fresh: true })
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

export function addTodo(id, text, due = '') {
  const t = String(text || '').trim()
  if (!t) return null
  return patch(id, (c) => {
    c.todos = c.todos || []
    c.todos.push({ id: uid('td'), text: t, due, done: false, createdAt: Date.now() })
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
    // 입증취지는 증거목록 문서에서 채운다. 비어 있으면 그 자체가 할 일이다.
    purpose: f.purpose || '',
    // 제출 상태는 사용자가 직접 옮긴다 (법원 시스템을 조회할 수 없다)
    status: f.status || '미제출',
    tone: EVIDENCE_TONE[f.status || '미제출'],
    due: f.due || '',
    submittedAt: f.submittedAt || '',
    ready: !!f.purpose,          // 증거목록에 넣을 수 있는가
  }))
}

/** 증거 중 아직 입증취지가 없는 것 — 화면에서 "할 일"로 보여준다 */
export const evidenceTodo = (c) => caseEvidence(c).filter((e) => !e.purpose)

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
    updatedAt: c.updatedAt,
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
      updatedAt: d.updatedAt,
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
    if (prev) Object.assign(prev, { title, progress, updatedAt: Date.now() })
    else c.docs.push({ id: key, kind, title, progress, updatedAt: Date.now() })
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

export function caseFlow(c) {
  const form = c?.form || {}
  const type = findType(c?.typeKey)
  const pct = type ? completeness(type, form) : 0
  const filed = !!c?.caseNo
  const said = (c?.events || []).some((e) => /내용증명|최고|독촉/.test(e.title)) ||
    (c?.todos || []).some((t) => t.done && /내용증명|최고|독촉/.test(t.text))
  // 계약일 키는 유형마다 다르다
  const dealt = ['loanDate', 'contractDate', 'hireDate', 'incidentDate'].some((k) => has(form, k))

  return [
    { key: 'deal', label: '분쟁 발생', done: dealt, at: form.loanDate || form.contractDate || form.hireDate || form.incidentDate || '' },
    { key: 'notice', label: '내용증명', done: said, optional: true },
    { key: 'draft', label: '소장 작성', done: pct >= 100, pct },
    { key: 'file', label: '법원 접수', done: filed, at: c?.filedAt || '' },
    // '진행 중'은 변론을 **하고 있는** 것이지 끝낸 게 아니다.
    // done으로 치면 현재 칸이 「판결」로 밀려 이미 끝난 사건처럼 보인다.
    { key: 'trial', label: '변론', done: c?.status === '종결' },
    { key: 'judge', label: '판결', done: c?.status === '종결' },
  ]
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
