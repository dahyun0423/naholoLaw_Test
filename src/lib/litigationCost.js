// 소송비용 계산 — 실제로 낼 돈과, 이겼을 때 상대방에게 청구할 수 있는 돈.
//
// ── 두 가지를 구분한다 ─────────────────────────────────────────
//
//   1) **지금 내는 돈**  — 인지액 + 송달료. 소장을 내려면 먼저 납부해야 한다.
//   2) **나중에 받을 수 있는 돈** — 소송에서 이기면 패소자가 부담하는 소송비용
//      (민사소송법 제98조). 여기에 변호사보수도 일정 한도까지 들어간다
//      (같은 법 제109조 제1항). 이건 "지금 내는 돈"이 아니다.
//
// 두 개를 한 줄에 합쳐 보여주면 사용자가 지금 얼마를 준비해야 하는지 헷갈린다.
//
// ── 근거 ──────────────────────────────────────────────────────
//
//   인지액        민사소송 등 인지법 제2조 (구간별 요율)
//                 같은 법 제2조 제2항 (1천원 미만이면 1천원, 그 이상은 100원 미만 버림)
//                 같은 법 제3조 (항소장 1.5배, 상고장 2배)
//                 같은 법 제16조 (전자소송으로 내면 10분의 9)
//                 같은 법 제14조 (취하·조정 등이면 1/2 환급)
//   변호사보수    변호사보수의 소송비용 산입에 관한 규칙 [별표] (2020.12.28. 개정)
//                 같은 규칙 제3조 제2항 (보전처분은 1/2)
//                 같은 규칙 제5조 (무변론·자백간주·이행권고결정은 1/2)
//                 같은 규칙 제3조 제1항 (실제 지급한 보수액을 넘지 못한다)
//   사건 구분     소액사건심판규칙 제1조의2 (소가 3,000만원 이하)
//                 민사 및 가사소송의 사물관할에 관한 규칙 제2조 (5억원 초과는 합의부)
//   송달료        송달료규칙의 시행에 따른 업무처리요령(재일 87-4) [별표 1]
//                 ⚠️ 별표가 첨부파일이라 대조하지 못했다 — 아래 표는 추정값이다.

export const 만 = 10_000
export const 억 = 100_000_000

/* ─────────────────── 인지액 ─────────────────── */

/** 민사소송 등 인지법 제2조 제1항 — 소가 구간별 */
export function stampBase(sueValue) {
  const v = Math.max(0, Number(sueValue) || 0)
  if (v <= 0) return 0
  if (v < 10_000_000) return v * 0.005
  if (v < 100_000_000) return v * 0.0045 + 5_000
  if (v < 1_000_000_000) return v * 0.004 + 55_000
  return v * 0.0035 + 555_000
}

/** 같은 조 제2항 — 1천원 미만이면 1천원, 1천원 이상이면 100원 미만은 버린다 */
export const roundStamp = (value) => {
  const v = Math.floor(Number(value) || 0)
  if (v <= 0) return 0
  return v < 1_000 ? 1_000 : Math.floor(v / 100) * 100
}

/** 심급 배수 — 인지법 제3조 */
export const STAGES = [
  { key: 'first', label: '1심 (소장)', multiplier: 1 },
  { key: 'appeal', label: '항소심 (항소장)', multiplier: 1.5 },
  { key: 'final', label: '상고심 (상고장)', multiplier: 2 },
]

export const stageOf = (key) => STAGES.find((s) => s.key === key) || STAGES[0]

/**
 * 실제로 붙일 인지액.
 * 심급 배수를 곱하고, 전자소송이면 10분의 9로 줄인 뒤 끝수를 정리한다.
 */
export function stampFeeOf({ sueValue, stage = 'first', electronic = true }) {
  const base = stampBase(sueValue) * stageOf(stage).multiplier
  const paper = roundStamp(base)
  const value = roundStamp(electronic ? base * 0.9 : base)
  return { value, paper, saved: Math.max(0, paper - value) }
}

/** 인지법 제14조 — 취하·조정 성립 등이면 절반을 돌려받는다 */
export function refundable(stamp) {
  const v = Number(stamp) || 0
  if (v <= 0) return 0
  const half = Math.floor(v / 2)
  return half < 100_000 ? Math.max(0, v - 100_000) : half
}

/* ─────────────────── 송달료 ─────────────────── */

/**
 * 사건 종류별 당사자 1인당 송달 회분.
 *
 * ⚠️ [별표 1]이 법령 본문이 아니라 첨부 HWP라 대조하지 못했다. 아래는 실무에서 통용되는
 * 값이고, 1회 단가도 우편요금에 연동돼 개정마다 바뀐다. 화면에서 **추정**으로 표시하고
 * 사용자가 직접 고칠 수 있게 둔다. 확정되면 이 표만 고치면 된다.
 */
export const CASE_KINDS = [
  { key: 'small', label: '소액사건', hint: '소가 3,000만원 이하', rounds: 10 },
  { key: 'single', label: '단독사건', hint: '소가 3,000만원 초과 5억원 이하', rounds: 15 },
  { key: 'panel', label: '합의사건', hint: '소가 5억원 초과', rounds: 15 },
  { key: 'order', label: '지급명령 (독촉)', hint: '다투지 않을 것 같을 때', rounds: 6 },
  { key: 'mediation', label: '민사조정', hint: '조정으로 먼저 풀고 싶을 때', rounds: 5 },
]

export const caseKindOf = (key) => CASE_KINDS.find((k) => k.key === key) || CASE_KINDS[1]

/** 1회 송달 단가 — 우편요금 연동이라 자주 바뀐다 */
export const ROUND_FEE = 5_200
export const SERVICE_FEE_IS_ESTIMATE = true

/** 소가만으로 짐작한 사건 종류 — 사용자가 바꿀 수 있는 초깃값 */
export function suggestCaseKind(sueValue) {
  const v = Number(sueValue) || 0
  if (v > 0 && v <= 30_000_000) return 'small'
  if (v > 500_000_000) return 'panel'
  return 'single'
}

/** 송달료 = 당사자 수 × 1인당 회분 × 1회 단가 */
export function serviceFeeOf({ caseKind = 'single', plaintiffs = 1, defendants = 1, roundFee = ROUND_FEE }) {
  const parties = Math.max(1, Number(plaintiffs) || 0) + Math.max(1, Number(defendants) || 0)
  const rounds = caseKindOf(caseKind).rounds
  return { value: parties * rounds * roundFee, parties, rounds, roundFee }
}

/* ─────────────────── 변호사보수 인정액 ─────────────────── */

/** 변호사보수의 소송비용 산입에 관한 규칙 [별표] */
const ATTORNEY_TABLE = [
  { upTo: 3_000_000, base: 0, rate: 0, flat: 300_000 },
  { upTo: 20_000_000, base: 3_000_000, flat: 300_000, rate: 0.10 },
  { upTo: 50_000_000, base: 20_000_000, flat: 2_000_000, rate: 0.08 },
  { upTo: 100_000_000, base: 50_000_000, flat: 4_400_000, rate: 0.06 },
  { upTo: 150_000_000, base: 100_000_000, flat: 7_400_000, rate: 0.04 },
  { upTo: 200_000_000, base: 150_000_000, flat: 9_400_000, rate: 0.02 },
  { upTo: 500_000_000, base: 200_000_000, flat: 10_400_000, rate: 0.01 },
  { upTo: Infinity, base: 500_000_000, flat: 13_400_000, rate: 0.005 },
]

/** 감액 사유 — 규칙 제3조 제2항, 제5조 */
export const ATTORNEY_HALVED = [
  { key: 'none', label: '해당 없음', half: false },
  { key: 'noTrial', label: '무변론 판결·자백간주·이행권고결정', half: true, basis: '같은 규칙 제5조' },
  { key: 'provisional', label: '가압류·가처분 신청 사건', half: true, basis: '같은 규칙 제3조 제2항' },
]

/**
 * 소송비용에 산입되는 변호사보수.
 *
 * 이긴 쪽이 진 쪽에게 청구할 수 있는 **한도**이지, 변호사에게 낼 돈이 아니다.
 * 실제로 지급한 보수액을 넘지 못한다(규칙 제3조 제1항).
 */
export function attorneyFeeOf({ sueValue, paid = 0, reduce = 'none' }) {
  const v = Math.max(0, Number(sueValue) || 0)
  if (v <= 0) return { value: 0, table: 0, halved: false, cappedByPaid: false }
  const row = ATTORNEY_TABLE.find((r) => v <= r.upTo)
  const table = Math.floor(row.flat + Math.max(0, v - row.base) * row.rate)
  const rule = ATTORNEY_HALVED.find((r) => r.key === reduce) || ATTORNEY_HALVED[0]
  const afterRule = rule.half ? Math.floor(table / 2) : table
  const paidAmount = Number(paid) || 0
  const value = paidAmount > 0 ? Math.min(afterRule, paidAmount) : afterRule
  return {
    value,
    table,
    halved: rule.half,
    halvedBasis: rule.basis || '',
    cappedByPaid: paidAmount > 0 && paidAmount < afterRule,
  }
}

/* ─────────────────── 한 번에 ─────────────────── */

export const isSmallClaim = (sueValue) => Number(sueValue) > 0 && Number(sueValue) <= 30_000_000
export const needsPanel = (sueValue) => Number(sueValue) > 500_000_000

/**
 * 화면이 그대로 쓰는 계산 결과.
 * `payNow`가 지금 준비할 돈이고, `attorney`는 이겼을 때 청구할 수 있는 한도다.
 */
export function litigationCost(input) {
  const {
    sueValue = 0, stage = 'first', electronic = true,
    caseKind = 'single', plaintiffs = 1, defendants = 1, roundFee = ROUND_FEE,
    withAttorney = false, attorneyPaid = 0, attorneyReduce = 'none',
  } = input || {}

  const stamp = stampFeeOf({ sueValue, stage, electronic })
  const service = serviceFeeOf({ caseKind, plaintiffs, defendants, roundFee })
  const attorney = withAttorney ? attorneyFeeOf({ sueValue, paid: attorneyPaid, reduce: attorneyReduce }) : null

  return {
    stamp,
    service,
    attorney,
    payNow: stamp.value + service.value,
    refund: refundable(stamp.value),
    small: isSmallClaim(sueValue),
    panel: needsPanel(sueValue),
    estimate: SERVICE_FEE_IS_ESTIMATE,
  }
}
