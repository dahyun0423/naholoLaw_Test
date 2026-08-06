// 인용 판례를 "어디에" 넣을지 정하는 규칙.
//
// 실무에서 판례를 인용하는 자리는 문서마다 다르다. 아무 데나 넣으면 오히려 문서가 나빠진다.
//   준비서면 — 판례의 주무대. 상대방 항변을 깨는 게 목적이라 법리 싸움이 본체다.
//   소장     — 원칙적으로 넣지 않는다. 소장은 사실 주장이 본체이고 법리 다툼은 아직 없다.
//              다만 쟁점이 뻔히 예상될 때(소멸시효·동시이행 등)만 청구원인 말미에 1~2개.
//   증거목록 — 넣지 않는다. 서증 목록이지 법리 문서가 아니다.
//   신청서   — 대부분 불필요. 가압류(보전의 필요성)·소송구조·임차권등기 정도만.

import { precedents } from '../data/mock.js'

// 소장은 판례를 인용하지 않는 문서라 정책 자체를 두지 않는다 (실무상 소장은 사실 서술, 법리는 준비서면)
export const citationPolicy = {
  brief: {
    level: 'core',
    where: '반박 포인트별 · 관련 법리',
    max: 6,
    headline: '준비서면이 판례의 주무대예요',
    body: '상대방 항변을 깨는 게 준비서면의 목적이라, 반박마다 근거 판례를 붙이면 설득력이 크게 올라갑니다. 쟁점 하나에 판례 하나가 적당해요.',
  },
  petition: {
    level: 'partial',
    where: '신청 이유',
    max: 2,
    headline: '신청서에는 대체로 넣지 않아요',
    body: '신청서는 요건 충족을 소명하는 문서라 사실 자료가 우선입니다. 다만 보전의 필요성이나 자금능력처럼 판단 재량이 큰 항목은 판례를 곁들이면 좋습니다.',
  },
  evidence: {
    level: 'none',
    headline: '증거목록에는 판례를 넣지 않아요',
    body: '증거목록은 제출할 서증을 번호 순으로 정리한 목록이에요. 판례는 증거가 아니라 법리라서 준비서면에 들어갑니다.',
  },
}

/** 판례를 쓰는 신청서 — 나머지는 넣지 않는 편이 낫다 */
export const petitionNeedsCitation = {
  provisional: '보전의 필요성은 법원의 재량 판단이라, 소명 정도를 밝힌 판례가 도움이 됩니다.',
  aid: '자금능력 부족의 판단 기준을 다룬 판례를 곁들일 수 있어요.',
  leasereg: '대항력·우선변제권 유지에 관한 법리를 짚어두면 좋습니다.',
}

/** 소장 사건유형 → 관련 쟁점 태그 */
const typeIssues = {
  loan: ['대여금', '소멸시효 항변', '변제 항변'],
  deposit: ['임대차보증금', '동시이행 항변', '공제 주장 (원상회복비 등)'],
  wage: ['임금체불', '지연손해금'],
  tort: ['손해배상', '과실상계 주장'],
  evict: ['건물명도', '차임 연체'],
}

const petitionIssues = {
  provisional: ['보전의 필요성', '가압류'],
  aid: [],
  leasereg: ['임대차보증금', '동시이행 항변'],
}

export const byNo = (no) => precedents.find((p) => p.no === no)

// 항변 키는 '변제 항변 (이미 갚았다)'처럼 괄호 설명이 붙는다.
// 판례 태그는 '변제 항변'만 달아두므로, 괄호를 떼고 맞춘다.
const norm = (s) => String(s).replace(/\s*\(.*?\)\s*/g, '').trim()
const hit = (tag, issues) => issues.some((i) => norm(i) === norm(tag))
const matches = (p, issues) => (p.issues || []).some((tag) => hit(tag, issues))

/** 맥락에 맞는 판례 추천 — 관련도 높은 순 */
export function suggestPrecedents({ docKind, caseTypeKey, defenses = [], petitionKey }) {
  let issues = []
  if (docKind === 'complaint') issues = typeIssues[caseTypeKey] || []
  if (docKind === 'brief') issues = defenses
  if (docKind === 'petition') issues = petitionIssues[petitionKey] || []
  if (issues.length === 0) return []
  return precedents
    .filter((p) => matches(p, issues))
    .sort((a, b) => b.relevance - a.relevance)
}

/** 어떤 쟁점 때문에 추천됐는지 — 사용자에게 이유를 보여주기 위한 것 */
export function matchedIssue(p, { docKind, caseTypeKey, defenses = [], petitionKey }) {
  let issues = []
  if (docKind === 'complaint') issues = typeIssues[caseTypeKey] || []
  if (docKind === 'brief') issues = defenses
  if (docKind === 'petition') issues = petitionIssues[petitionKey] || []
  return (p.issues || []).find((tag) => hit(tag, issues)) || ''
}

/** 문서 본문에 들어갈 인용 문구 — “대법원 2020. 4. 29. 선고 2020다112233 판결” 꼴 */
export function citationText(no) {
  const p = byNo(no)
  if (!p) return ''
  const [y, m, d] = String(p.date).split('.')
  return `${p.court} ${y}. ${Number(m)}. ${Number(d)}. 선고 ${p.no} 판결`
}

/** 인용 목록 → 본문 줄 (판시사항 요약까지 붙인다) */
export function citationLines(nos = []) {
  return nos.map((no) => {
    const p = byNo(no)
    if (!p) return ''
    return `${citationText(no)}\n　　　“${p.point}”`
  }).filter(Boolean)
}
