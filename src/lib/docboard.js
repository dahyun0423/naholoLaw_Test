// 서류 보드 — "리스트로 보기"가 읽는 한 벌의 줄
//
// 전에는 이 화면이 갑호증만 늘어놓았다. 그런데 사용자가 관리하는 것은 증거만이 아니다.
// 소장도, 준비서면도, 증거목록도 같은 성질의 일이다 — **언제까지 내야 하고, 냈는가.**
// 그래서 종류로 묶고(노션 데이터베이스의 그룹), 줄마다 어느 사건 것인지를 달아 둔다.
//
// 종류마다 봐야 할 값이 다르다. 소장은 법원·청구금액, 증거는 호증·입증취지,
// 준비서면은 몇 차인지. 그래서 열은 종류별로 다르게 그린다 (DocumentBoard.jsx).

import { caseEvidence, caseDocs, caseTitle, docMeta } from './casebook.js'

export const DOC_GROUPS = [
  { key: 'complaint', label: '소장', hint: '사건마다 소장은 하나 · 생성 파일은 버전별로 남아요' },
  { key: 'evidence', label: '증거자료', hint: '교체·보정한 파일도 이전 버전과 함께 관리해요' },
  { key: 'brief', label: '준비서면', hint: '상대 주장에 대한 반박·쟁점 정리' },
  { key: 'evidencelist', label: '증거목록', hint: '제출한 증거를 정리한 목록' },
  { key: 'petition', label: '신청서·답변서', hint: '기일변경·보정·답변 등' },
]

export const groupLabel = (key) => DOC_GROUPS.find((g) => g.key === key)?.label || '문서'

/** casebook의 문서 종류(kind) → 보드의 그룹 */
const GROUP_OF_KIND = {
  complaint: 'complaint',
  brief: 'brief',
  evidence: 'evidencelist',
  petition: 'petition',
  answer: 'petition',
}

const timeOf = (value) => {
  if (typeof value === 'number') return value
  const parsed = new Date(value || 0).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

/** 논리 문서 하나에 속한 실제 생성 파일들을 시간순으로 정리한다. */
export function versionInfo(row = {}) {
  const source = Array.isArray(row.versions) && row.versions.length
    ? row.versions
    : [{
      version: row.version || 1,
      createdAt: row.updatedAt || row.createdAt || '',
      submittedAt: row.submittedAt || '',
      note: row.group === 'evidence' ? '업로드한 파일' : '최초 생성본',
    }]
  const versions = source
    .map((item, index) => ({
      id: item.id || `${row.key || 'document'}-v${item.version || index + 1}`,
      version: Number(item.version) || index + 1,
      createdAt: item.createdAt || item.generatedAt || '',
      submittedAt: item.submittedAt || '',
      note: item.note || '',
    }))
    .sort((a, b) => timeOf(a.createdAt) - timeOf(b.createdAt))
  const latest = versions[versions.length - 1]
  const submitted = [...versions].reverse().find((item) => item.submittedAt)
  const hasUnsubmittedRevision = !!submitted && submitted.id !== latest?.id
  return {
    versions,
    latest,
    submitted,
    currentVersion: latest?.version || 1,
    hasUnsubmittedRevision,
  }
}

/**
 * 내 사건들을 보드의 줄로 편다.
 * 줄은 모두 사건에 매여 있다 — 어느 사건 서류인지 모르면 아무 의미가 없다.
 */
export function boardRows(rawCases = []) {
  const rows = []
  for (const c of rawCases) {
    const link = { caseKey: c.id, caseTitle: caseTitle(c), caseNo: c.caseNo || '', court: c.form?.court || '' }

    for (const d of caseDocs(c)) {
      const meta = docMeta(c, d.id)
      const row = {
        key: `${c.id}:${d.id}`,
        group: GROUP_OF_KIND[d.kind] || 'petition',
        kind: d.kind,
        docId: d.id,
        title: d.title,
        progress: d.progress ?? 0,
        amount: c.form?.amount || '',
        status: meta.status,
        due: meta.due,
        submittedAt: meta.submittedAt,
        createdAt: d.createdAt || c.createdAt,
        updatedAt: d.updatedAt,
        versions: d.versions,
        real: true,
        ...link,
      }
      rows.push({ ...row, ...versionInfo(row) })
    }

    for (const e of caseEvidence(c)) {
      const row = {
        key: `${c.id}:ev${e.no}`,
        group: 'evidence',
        evNo: e.no,
        code: e.code,
        title: e.file,
        purpose: e.purpose,
        size: e.size,
        thumb: e.thumb,
        blobPathname: e.blobPathname,
        url: e.url,
        status: e.status,
        due: e.due,
        submittedAt: e.submittedAt,
        createdAt: e.createdAt || c.createdAt,
        updatedAt: e.updatedAt,
        versions: e.versions,
        warn: e.warn,
        real: true,
        ...link,
      }
      rows.push({ ...row, ...versionInfo(row) })
    }
  }
  return rows
}

/** 그룹별로 나눈다. 빈 그룹도 자리를 지킨다 — 없다는 것도 정보다. */
export function groupRows(rows) {
  return DOC_GROUPS.map((g) => ({ ...g, rows: rows.filter((r) => r.group === g.key) }))
}

/** 증거목록에 넣을 수 있는 증거가 몇 개인지 등, 줄 옆에 붙는 숫자 */
export const countBy = (rows, fn) => rows.filter(fn).length

/* ─────────────────── 짚어 줄 것 ───────────────────
   화면 위에 상자로 붙여 두면 며칠 만에 배경이 된다. 그래서 두 곳에만 둔다 —
   들어올 때 한 번 알리고(모달), 그 다음부터는 **문제가 있는 줄 자체에** 표시한다.
   여기서는 실제 줄을 보고 만든다. 지어낸 문구가 아니라 지금 이 사건의 상태다. */

const todayStr = () => new Date().toISOString().slice(0, 10)
const daysTo = (d) => Math.round((new Date(d) - new Date(todayStr())) / 86400000)

export function boardNotices(rows = []) {
  const out = []
  const today = todayStr()

  const newer = rows.filter((row) => versionInfo(row).hasUnsubmittedRevision)
  if (newer.length) {
    out.push({
      id: 'newer-version', tone: 'amber',
      title: `제출 후 새로 만든 파일 ${newer.length}건`,
      desc: `${newer.map((row) => row.code || row.title).join(', ')} — 법원에 낸 버전과 현재 최신본이 달라요. 버전 기록을 확인해 주세요.`,
      rowKey: newer[0].key,
      caseKey: newer[0].caseKey,
    })
  }

  // 1) 파일 자체에 붙은 경고 (개인정보 노출 등) — 가장 급하다
  for (const r of rows.filter((x) => x.warn)) {
    out.push({
      id: `warn-${r.key}`, tone: 'red',
      title: `${r.caseTitle} · ${r.code || r.title} 확인 필요`,
      desc: r.warn, rowKey: r.key, caseKey: r.caseKey,
    })
  }

  // 2) 기한이 지났는데 아직 안 낸 것
  const late = rows.filter((r) => r.status !== '제출완료' && r.due && r.due < today)
  if (late.length) {
    out.push({
      id: 'late', tone: 'red',
      title: `기한이 지난 서류 ${late.length}건`,
      desc: late.map((r) => `${r.caseTitle} · ${r.code || r.title}`).join(' / '),
      caseKey: late[0].caseKey,
    })
  }

  // 3) 이번 주 안에 내야 하는 것
  const soon = rows.filter((r) => r.status !== '제출완료' && r.due && r.due >= today && daysTo(r.due) <= 7)
  if (soon.length) {
    out.push({
      id: 'soon', tone: 'amber',
      title: `이번 주 기한 ${soon.length}건`,
      desc: soon.map((r) => `${r.code || r.title} (D-${daysTo(r.due)})`).join(' / '),
      caseKey: soon[0].caseKey,
    })
  }

  // 4) 입증취지가 빈 증거 — 이대로면 증거목록에 넣을 수 없다
  const noPurpose = rows.filter((r) => r.group === 'evidence' && !r.purpose)
  if (noPurpose.length) {
    out.push({
      id: 'purpose', tone: 'amber',
      title: `입증취지가 빈 증거 ${noPurpose.length}건`,
      desc: `${noPurpose.map((r) => r.code).join(', ')} — "왜 이 증거가 필요한지"를 적어야 증거목록에 들어갑니다.`,
      caseKey: noPurpose[0].caseKey,
    })
  }

  // 5) 증거는 있는데 증거목록을 아직 안 만든 사건
  const caseKeys = [...new Set(rows.map((r) => r.caseKey))]
  for (const key of caseKeys) {
    const mine = rows.filter((r) => r.caseKey === key)
    const evCount = mine.filter((r) => r.group === 'evidence').length
    if (evCount >= 3 && !mine.some((r) => r.group === 'evidencelist')) {
      out.push({
        id: `list-${key}`, tone: 'blue',
        title: `${mine[0].caseTitle} — 증거목록이 없어요`,
        desc: `증거 ${evCount}건을 올렸는데 증거목록 문서가 없습니다. 재판부는 목록으로 증거를 대조해요.`,
        caseKey: key,
      })
    }
  }

  return out
}
