// 사건(분쟁) 저장소 — 화면들을 잇는 한 줄기
//
// 지금까지 문서 생성만 실제로 돌아가고, 절차 안내·증빙 자료·일정은 각자 mock을 보고 있었다.
// 그래서 소장에서 대여금 사건을 만들어도 절차 안내는 임대차 사건을 보여줬다.
//
// 핵심 관점: **사건은 사건번호가 붙기 전에 이미 존재한다.**
//   자가진단을 시작하는 순간 사건이 생기고, 법원 사건번호는 접수 후 붙는 속성일 뿐이다.
//
//   사건(분쟁)  ← 앱 내부 id
//    ├ 상태: 작성 중 → 제출 준비 → 접수됨 → 진행 중
//    ├ 법원 사건번호 (접수 후)
//    └ 소장 form (당사자·금액·증거파일이 여기 다 있다)
//
// 저장은 localStorage. 실서비스라면 서버로 교체한다.

import { findType, buildPreview, completeness, allSteps } from './complaint.js'
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
    form: slim(form),
    caseNo: form.caseNo || prev?.caseNo || '',      // 접수 후 사용자가 입력
    status: prev?.status || '작성 중',
    createdAt: prev?.createdAt || now,
    updatedAt: now,
  }

  const rest = list.filter((c) => c.id !== next.id)
  return write([...rest, next]) ? next : null
}

/** 사건의 상태를 바꾼다 (작성 중 → 제출 준비 → 접수됨) */
export function setCaseStatus(id, status, caseNo) {
  const list = read()
  const c = list.find((x) => x.id === id)
  if (!c) return null
  c.status = status
  if (caseNo !== undefined) c.caseNo = caseNo
  c.updatedAt = Date.now()
  return write(list) ? c : null
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
    label: c.caseNo || (doc ? `${doc.caseName} 청구의 소` : '작성 중인 사건'),
    title: doc ? `${doc.caseName} 청구` : '작성 중인 사건',
    court: form.court || '',
    type: '민사',
    status: c.status,
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
    status: f.purpose ? '정리완료' : '입증취지 필요',
    tone: f.purpose ? 'green' : 'amber',
  }))
}

/** 증거 중 아직 입증취지가 없는 것 — 화면에서 "할 일"로 보여준다 */
export const evidenceTodo = (c) => caseEvidence(c).filter((e) => !e.purpose)

/**
 * 사건 진행 단계.
 * 접수 전에는 "무엇을 더 채워야 접수할 수 있는가"가 곧 단계다.
 */
export function caseSteps(c) {
  if (!c) return []
  const type = findType(c.typeKey)
  const form = c.form || {}
  const pct = type ? completeness(type, form) : 0
  const filed = c.status === '접수됨' || c.status === '진행 중'
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
      desc: filed ? `사건번호 ${c.caseNo}를 부여받았습니다.` : '전자소송 또는 종이로 접수합니다.',
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
