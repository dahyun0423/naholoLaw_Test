// 소장 작성 로직 — Figma "문서 작성 부분"(1568:3245) 기준
//
// 구조
//  · complaintTypes  : 소장 유형 5종 (유형 선택 목록 + 자가진단 + 3~6단계 입력 스키마)
//  · commonSteps     : 1단계(법원·청구금액) / 2단계(당사자) — 전 유형 공통
//  · buildPreview()  : 입력값 → 실시간 소장 미리보기 데이터
//  · 비용 계산       : 인지대 · 송달료 · 소액사건 판정


/* ─────────────────────────── 포맷 · 계산 ─────────────────────────── */

export const won = (n) => (Number(n) || 0).toLocaleString('ko-KR')

/** 'YYYY-MM-DD' → '2023. 5. 10.' */
export function fmtDate(v) {
  if (!v) return ''
  const [y, m, d] = String(v).split('-')
  if (!y || !m) return v
  // "미납이 시작된 달"처럼 연-월만 들어오는 값도 있다
  if (!d) return `${y}. ${Number(m)}.`
  return `${y}. ${Number(m)}. ${Number(d)}.`
}

/**
 * 실제 인지대 산정의 기초가 되는 소가.
 * 민사소송 등 인지규칙 제18조의2 — 재산권상의 소로서 소가를 산출할 수 없는 것과
 * 비재산권을 목적으로 하는 소송의 소가는 5천만 원으로 한다.
 * (같은 조 단서의 1억 원 특례는 무체재산권 등 우리 5개 유형에 없는 사건이라 다루지 않는다)
 */
export const UNVALUABLE_SUE_VALUE = 50_000_000

/** 소가가 법으로 정해지는 경우 — 「토지 등의 평가액」은 사용자가 계산해 넣으므로 제외 */
export const isDeemedValue = (form) =>
  form?.sueValueKind === '소가를 산출할 수 없는 경우' || form?.claimKind === '비재산권상 청구'

export function effectiveSueValue(form) {
  if (isDeemedValue(form)) return UNVALUABLE_SUE_VALUE
  return Number(form?.amount) || 0
}

/** 청구취지·본문에 쓸 금액 — 소가가 간주되는 경우 따로 안 적었으면 그 값을 쓴다 */
export const claimAmountOf = (form) =>
  form?.amount || (isDeemedValue(form) ? String(UNVALUABLE_SUE_VALUE) : '')

/** 민사소송등인지법 제2조 (100원 미만 버림) */
export function stampFee(sueValue) {
  const v = Number(sueValue) || 0
  if (v <= 0) return 0
  let fee
  if (v < 10_000_000) fee = v * 0.005
  else if (v < 100_000_000) fee = v * 0.0045 + 5_000
  else if (v < 1_000_000_000) fee = v * 0.004 + 55_000
  else fee = v * 0.0035 + 555_000
  return Math.floor(fee / 100) * 100
}

// 송달료 — 「송달료규칙의 시행에 따른 업무처리요령」(재일 87-4, 2026.3.1. 시행)
//
//   제7조(예납기준) 납부인은 적용대상사건의 송달료를 [별표 1] 중
//                   **사건별 당사자 1인당 송달료납부기준**에 따라 예납하여야 한다.
//   제4조(납부당사자) 원고 등 적극적당사자가 예납한다.
//   제5조(공동사용)  납부인이 2인 이상이어도 사건번호가 1개면 송달료를 공동으로 사용한다.
//   제6조 제4항      답변서·준비서면 등 중간적·부수적 신청에는 송달료를 따로 예납하지 않는다.
//
//   즉  송달료 = 당사자 수 × (1인당 회분) × (1회 단가)
//
// ⚠️ 아직 미확정 — [별표 1]이 법령 본문이 아니라 첨부 HWP 파일이라 회분을 대조하지 못했다.
//    · 1회 단가는 우편요금에 연동되어 개정 때마다 바뀐다.
//    · 회분은 사건 종류별로 다르다 (소액·단독·합의·독촉이 각각 다름).
//    아래 26,000원은 Figma 시안(당사자 2명 = 52,000원)에 맞춘 값이고,
//    실무상 알려진 소액사건 기준(1인당 10회분 안팎)보다 **적을 가능성이 크다.**
//
// 확정하려면 [별표 1]을 대조하거나 대법원 전자민원센터(help.scourt.go.kr)에서 현재 기준을 확인한다.
// 확정되면 이 상수만 고치면 화면 전체에 반영된다.
const SERVICE_FEE_PER_PARTY = 26_000

/** 송달료가 법령 대조를 거친 값인지 — UI에서 '추정' 표시를 띄우는 근거 */
export const SERVICE_FEE_IS_ESTIMATE = true

export const serviceFee = (parties = 2) => parties * SERVICE_FEE_PER_PARTY

/** 소액사건심판법 — 소가 3,000만원 이하 */
export const isSmallClaim = (sueValue) => Number(sueValue) > 0 && Number(sueValue) <= 30_000_000

export function costSummary(sueValue, parties = 2) {
  const stamp = stampFee(sueValue)
  const service = serviceFee(parties)
  return {
    stamp,
    service,
    total: stamp + service,
    small: isSmallClaim(sueValue),
    estimate: SERVICE_FEE_IS_ESTIMATE,   // 합계에 미확정 값이 섞여 있음
  }
}

export const courts = [
  '서울중앙지방법원', '서울동부지방법원', '서울서부지방법원', '서울남부지방법원', '서울북부지방법원',
  '의정부지방법원', '인천지방법원', '수원지방법원', '춘천지방법원', '대전지방법원', '청주지방법원',
  '대구지방법원', '부산지방법원', '울산지방법원', '창원지방법원', '광주지방법원', '전주지방법원', '제주지방법원',
]

/* ─────────────────────────── 필드 헬퍼 ─────────────────────────── */

const text = (key, label, o = {}) => ({ kind: 'text', key, label, ...o })
const money = (key, label, o = {}) => ({ kind: 'money', key, label, ...o })
const date = (key, label, o = {}) => ({ kind: 'date', key, label, ...o })
const num = (key, label, o = {}) => ({ kind: 'num', key, label, ...o })
const area = (key, label, o = {}) => ({ kind: 'area', key, label, ...o })
const select = (key, label, options, o = {}) => ({ kind: 'select', key, label, options, ...o })
const radio = (key, label, options, o = {}) => ({ kind: 'radio', key, label, options, ...o })
const checks = (key, label, options, o = {}) => ({ kind: 'checks', key, label, options, ...o })
const note = (tone, body, o = {}) => ({ kind: 'note', tone, body, ...o })
const files = (key, label, o = {}) => ({ kind: 'files', key, label, ...o })
const repeat = (key, label, columns, o = {}) => ({ kind: 'repeat', key, label, columns, ...o })

/** 5단계(최고·청구 이력)는 유형별로 문구만 다르고 구조가 같다 */
const demandStep = (title, verb, evidenceHint) => ({
  title,
  fields: [
    radio('demandWay', `${verb}를 어떤 방법으로 하셨나요?`, [
      '내용증명을 보냈어요', '문자·카톡으로 요구했어요', '전화·구두로만 요구했어요', '요구한 적 없어요',
    ], { required: true }),
    date('demandDate', '요구한 날(최고일)', { when: (f) => f.demandWay && f.demandWay !== '요구한 적 없어요' }),
    note('info', `최고일 다음 날부터 지연손해금이 붙어요. ${evidenceHint}`, {
      when: (f) => f.demandWay && f.demandWay !== '요구한 적 없어요',
    }),
    note('warn', '요구한 적이 없어도 소장 부본이 송달되면 그날 최고한 것으로 봐요. 다만 지연손해금 기산일이 늦어집니다.', {
      when: (f) => f.demandWay === '요구한 적 없어요',
    }),
    area('demandResult', '상대방의 반응', { rows: 2, placeholder: '예) 두 달만 기다려달라고 한 뒤 연락이 끊겼습니다.' }),
  ],
})

/** 6단계(증거·첨부)는 유형별 기본 목록만 다르다 */
const evidenceStep = (options) => ({
  title: '증거자료 · 서명',
  fields: [
    // 체크리스트는 '무엇을 준비해야 하는지' 알려주는 용도.
    // 실제 갑호증이 되는 것은 아래에서 올린 파일이다.
    checks('evidenceItems', '어떤 자료를 가지고 계신가요?', options, {
      required: true,
      info: '여기서 체크한 것은 준비물 목록이에요. 실제 갑호증이 되는 건 아래에 올린 파일입니다. 목록에 없는 자료도 그냥 올리시면 돼요.',
    }),
    files('evidenceFiles', '증거 파일 올리기'),
    { kind: 'evidenceGap' },
    checks('attachExtra', '증거 말고 함께 낼 서류가 있나요?', [
      '소가계산서', '위임장', '법인등기부등본', '가족관계증명서', '부동산 등기사항증명서', '주민등록초본',
    ], {
      hint: '소장 말미 「첨부서류」란에 들어갑니다. 증거(갑호증)와는 다릅니다.',
      info: '증거는 「입증방법」, 나머지 제출 서류는 「첨부서류」로 나뉘어 들어갑니다. 포털도 둘을 구분해서 받아요 — 첨부서류로 낸 문서는 증거로 쓸 수 없고 판결에 효력이 없습니다. 소가계산서는 소가 산정이 복잡한 사건(명도·확인의 소 등)에서 요구될 수 있어요.',
    }),
    { kind: 'signature', key: 'signature' },
  ],
})

/* ─────────────────────────── 공통 1·2단계 ─────────────────────────── */

export const commonSteps = [
  {
    id: 'court',
    title: '어느 법원에 얼마를 청구하나요?',
    fields: [
      { kind: 'court', key: 'court', label: '소장을 낼 법원', required: true },
      { kind: 'venue' },
      // 전자소송포털 「사건기본정보」와 같은 항목. 소가 산정 방식이 인지대를 바꾼다.
      radio('claimKind', '청구구분', ['재산권상 청구', '비재산권상 청구'], {
        required: true,
        hint: '돈·물건처럼 재산적 가치를 다투면 재산권상 청구예요. 두 가지가 섞여 있으면 비재산권상 청구를 고르세요.',
      }),
      radio('sueValueKind', '소가구분', ['금액', '토지 등의 평가액', '소가를 산출할 수 없는 경우'], {
        required: true,
        when: (f) => f.claimKind !== '비재산권상 청구',
        hint: '건물명도처럼 부동산이 목적물이면 「토지 등의 평가액」을 씁니다. 개별공시지가·시가표준액을 기준으로 산정해요.',
      }),
      note('info', '토지 등의 평가액으로 정할 때는 소가 계산이 복잡합니다. 포털의 「소가산정안내」와 「부동산가액 및 소가계산기」를 함께 쓰세요.',
        { when: (f) => f.sueValueKind === '토지 등의 평가액' }),
      note('info', '비재산권상 청구이거나 소가를 산출할 수 없으면, 인지대 계산용 소가를 5천만원으로 봅니다(민사소송 등 인지규칙 제18조의2).',
        { when: (f) => f.claimKind === '비재산권상 청구' || f.sueValueKind === '소가를 산출할 수 없는 경우' }),
      money('amount', '청구 금액', {
        required: true,
        when: (f) => !isDeemedValue(f),
      }),
      // 비재산권상 청구·소가 산출 불가면 소가가 5천만원으로 정해진다(인지규칙 제18조의2).
      // 이때는 청구금액을 따로 받지 않고 그 값을 그대로 쓴다 — 두 숫자가 어긋나면 인지대가 틀어진다.
      money('amount', '청구 금액', {
        when: (f) => isDeemedValue(f),
        placeholder: '비워두면 50,000,000원으로 봅니다',
        hint: '소가가 5천만원으로 정해지는 경우예요. 실제로 더 구하실 금액이 있으면 적어주세요.',
      }),
      { kind: 'cost' },
    ],
  },
  {
    id: 'party',
    title: '누가 누구에게 청구하나요?',
    fields: [
      /* ── 원고 ── */
      { kind: 'partyTag', tone: 'brand', tag: '원고', desc: '돈을 받을 사람 · 나', tab: '원고' },
      text('pName', '이름 / 상호', { required: true, half: true, placeholder: '홍길동', tab: '원고' }),
      text('pRrn', '주민등록번호', {
        required: true, half: true, placeholder: '750101-1234567',
        showKey: 'pRrnShow', showDefault: false, tab: '원고',
        info: '「제출문서에 보임」을 끄면 그 항목은 소장 본문에서 빠지고 법원에만 별도로 알립니다. 주민등록번호는 법이 요구하는 기재사항이 아니어서 기본값이 표시 안 함이에요. 다만 개인 상대 소송이라면 나중에 강제집행을 위해 주민등록상 주소·주민번호 확인이 필요해집니다.',
      }),
      {
        kind: 'address', key: 'pAddr', label: '주소', required: true, tab: '원고',
        hint: '서류를 실제로 받을 수 있는 곳이어야 해요. 주민등록상 주소와 달라도 됩니다.',
        detailNote: '단독주택처럼 동·호수가 없으면 비워두셔도 됩니다. 다만 공동주택이라면 꼭 적어주세요 — 내가 받을 서류가 이 주소로 옵니다.',
      },
      text('pTel', '연락처', { required: true, half: true, placeholder: '010-1234-5678', showKey: 'pTelShow', tab: '원고' }),
      text('pEmail', '이메일', { half: true, placeholder: 'hong@example.com', showKey: 'pEmailShow', tab: '원고' }),

      // 자주 안 쓰는 항목은 접어 둔다
      select('pService', '송달장소', ['위 주소와 같음', '다른 주소로 받겠습니다'], { half: true, tab: '원고', fold: '송달받을 주소가 따로 있거나, 팩스를 쓰시나요?' }),
      { kind: 'address', key: 'pServiceAddr', label: '송달받을 주소', when: (f) => f.pService === '다른 주소로 받겠습니다', tab: '원고', fold: '송달받을 주소가 따로 있거나, 팩스를 쓰시나요?' },
      text('pFax', '팩스번호', { half: true, placeholder: '없으면 비워두세요', showKey: 'pFaxShow', tab: '원고', fold: '송달받을 주소가 따로 있거나, 팩스를 쓰시나요?' }),

      radio('pEntity', '원고는 개인인가요, 법인인가요?', ['개인 (자연인)', '법인·단체'], { tab: '원고', fold: '법인이거나 미성년자인가요?' }),
      text('pRep', '대표자', {
        required: true, half: true, when: (f) => f.pEntity === '법인·단체',
        placeholder: '대표이사 김모아', tab: '원고', fold: '법인이거나 미성년자인가요?',
        hint: '법인등기사항증명서에 적힌 대표자를 그대로 적으세요.',
      }),
      text('pCorpNo', '법인등록번호', {
        half: true, when: (f) => f.pEntity === '법인·단체', placeholder: '110111-0000000',
        showKey: 'pCorpNoShow', showDefault: false, tab: '원고', fold: '법인이거나 미성년자인가요?',
      }),
      radio('pLegalRep', '원고가 미성년자이거나 후견이 필요한가요?', ['해당 없음', '법정대리인이 있어요'], {
        when: (f) => f.pEntity !== '법인·단체', tab: '원고', fold: '법인이거나 미성년자인가요?',
      }),
      text('pLegalRepName', '법정대리인', {
        required: true, when: (f) => f.pLegalRep === '법정대리인이 있어요',
        placeholder: '친권자 부 홍순길, 모 김미향', tab: '원고', fold: '법인이거나 미성년자인가요?',
        hint: '「친권자 부 ○○○」처럼 자격과 이름을 함께 적습니다. 소장 당사자란에 그대로 들어가요.',
      }),
      text('pForeignName', '외국어 이름', { half: true, placeholder: '외국인·법인이면 영문·한자 병기', tab: '원고', fold: '법인이거나 미성년자인가요?' }),

      /* ── 피고 ── */
      { kind: 'partyTag', tone: 'ink', tag: '피고', desc: '돈을 갚아야 할 사람 · 상대방', tab: '피고' },
      text('dName', '이름 / 상호', { required: true, half: true, placeholder: '김철수', tab: '피고' }),
      {
        kind: 'address', key: 'dAddr', label: '주소', required: true, allowUnknown: true, tab: '피고',
        hint: '주민등록상 주소가 아니어도 됩니다. 실제로 서류를 받을 수 있는 곳이면 되고, 직장 주소도 괜찮아요.',
        detailNoteTone: 'warn',
        detailNote: '동·호수를 모르면 비워두고 접수하세요. 추측해서 적으면 엉뚱한 사람에게 송달돼 더 큰 문제가 됩니다. 송달이 안 되면 법원이 주소보정명령을 내리고, 그 명령서를 주민센터에 가져가면 피고의 주민등록초본을 발급받아 정확한 주소를 확인할 수 있어요.',
      },
      text('dTel', '연락처', {
        half: true, placeholder: '010-9876-5432', showKey: 'dTelShow', tab: '피고',
        info: '피고 주소나 연락처를 모르면 아는 범위까지만 적고 접수하세요. 소장 접수 후 사실조회·주소보정명령으로 확인할 수 있습니다.',
      }),

      text('dRrn', '주민등록번호', {
        half: true, placeholder: '대부분 모릅니다', showKey: 'dRrnShow', showDefault: false,
        tab: '피고', fold: '피고의 주민등록번호를 아시나요?',
        info: '몰라도 됩니다. 법이 요구하는 것도 이름·주소·연락처예요. 나중에 강제집행 단계에서 필요해지면 그때 법원 절차로 확인할 수 있습니다.',
      }),

      radio('dCount', '피고가 몇 명인가요?', ['한 명', '여러 명'], { tab: '피고', fold: '피고가 여러 명인가요?' }),
      repeat('dMore', '나머지 피고', [
        { key: 'name', label: '이름 / 상호', placeholder: '김보증' },
        { key: 'addr', label: '주소', placeholder: '서울 ○○구 ○○로 12, 101동 1001호' },
        { key: 'tel', label: '연락처', placeholder: '010-0000-0000' },
        { key: 'amount', label: '이 피고에게 청구할 금액', placeholder: '연대책임이면 비워두세요' },
      ], {
        when: (f) => f.dCount === '여러 명', required: true, tab: '피고', fold: '피고가 여러 명인가요?',
        itemLabel: '피고', addLabel: '피고 추가', empty: '위에 적은 피고 외에 더 있는 분을 추가해 주세요.',
      }),
      money('dOwnAmount', '첫 번째 피고에게 청구할 금액', {
        half: true, when: (f) => f.dCount === '여러 명' && f.dLiability === '피고별로 금액이 달라요',
        tab: '피고', fold: '피고가 여러 명인가요?',
        hint: '나머지 피고의 금액은 위 목록에서 각각 적으세요. 합계가 청구 금액과 맞아야 합니다.',
      }),
      radio('dLiability', '피고들에게 어떻게 청구하나요?', ['연대하여 (전액을 누구에게나)', '피고별로 금액이 달라요'], {
        required: true, when: (f) => f.dCount === '여러 명', tab: '피고', fold: '피고가 여러 명인가요?',
      }),
      note('info', '보증인·공동차주는 보통 「연대하여」입니다. 전액을 아무 피고에게나 청구할 수 있어요. 사고 가해자가 여럿이라 각자 책임 범위가 다르면 「피고별로 금액이 달라요」를 고르세요.', { when: (f) => f.dCount === '여러 명', tab: '피고', fold: '피고가 여러 명인가요?' }),
      note('warn', '피고가 늘면 송달료도 늘어납니다. 당사자 수에 비례해 예납하므로 1단계 비용 계산에 자동 반영했어요.', { when: (f) => f.dCount === '여러 명', tab: '피고', fold: '피고가 여러 명인가요?' }),

      radio('dEntity', '피고는 개인인가요, 법인인가요?', ['개인 (자연인)', '법인·단체'], { tab: '피고', fold: '피고가 법인이거나 미성년자인가요?' }),
      text('dRep', '대표자', {
        required: true, half: true, when: (f) => f.dEntity === '법인·단체',
        placeholder: '대표이사 김감영', tab: '피고', fold: '피고가 법인이거나 미성년자인가요?',
        hint: '모르면 법인등기사항증명서를 떼어 확인하세요. 인터넷등기소에서 상호로 찾을 수 있어요.',
      }),
      text('dCorpNo', '법인등록번호', {
        half: true, when: (f) => f.dEntity === '법인·단체', placeholder: '모르면 비워두세요',
        showKey: 'dCorpNoShow', showDefault: false, tab: '피고', fold: '피고가 법인이거나 미성년자인가요?',
      }),
      radio('dLegalRep', '피고가 미성년자인가요?', ['해당 없음', '법정대리인이 있어요'], {
        when: (f) => f.dEntity !== '법인·단체', tab: '피고', fold: '피고가 법인이거나 미성년자인가요?',
      }),
      text('dLegalRepName', '피고의 법정대리인', {
        required: true, when: (f) => f.dLegalRep === '법정대리인이 있어요',
        placeholder: '친권자 부 김○○, 모 이○○', tab: '피고', fold: '피고가 법인이거나 미성년자인가요?',
      }),
    ]
  },
]

/* ─────────────────────────── 소장 유형 5종 ─────────────────────────── */

export const complaintTypes = [
  /* ── 1. 대여금 반환 ── */
  {
    key: 'loan',
    title: '대여금 반환',
    short: '대여금반환',
    desc: '빌려준 돈을 갚지 않았을 때',
    caseName: '대여금',
    amountLabel: '청구 금액',
    amountHint: '빌려준 원금만 적어주세요. 이자·지연손해금은 3단계에서 자동으로 더해집니다.',
    diagnosis: {
      options: [
        { label: '아직 아무 조치도 안했어요', advice: '지금은 소장보다 내용증명을 먼저 보내는 게 비용과 시간 면에서 유리할 수 있어요. 내용증명으로 반환을 요청한 뒤에도 응답이 없으면 소장으로 넘어가면 돼요.' },
        { label: '내용증명을 보냈는데 응답이 없어요', advice: '내용증명 이후에도 응답이 없다면 소장을 준비할 시점이에요. 발송했던 내용증명은 증거자료로 함께 제출할 수 있어요.' },
        { label: '지급명령에 이의신청이 들어왔어요', advice: '지급명령에 이의신청이 들어오면 자동으로 정식 소송 절차로 전환돼요. 이 경우 소장 형식의 서류를 준비하시면 됩니다.' },
        { label: '소멸시효가 다가오고 있어요', advice: '소멸시효가 임박했다면 서류 준비 시간을 고려해 서둘러 진행하는 게 좋아요. 시효 완성 전에 소를 제기하면 시효가 중단돼요.' },
      ],
      tips: [
        '차용증이 없어도 계좌이체 내역이나 문자 대화로 대여 사실을 증명할 수 있어요.',
        '청구금액이 3,000만원 이하면 소액사건으로 절차를 간단히 진행할 수 있어요.',
      ],
      prepare: ['지연손해금', '대여금내역', '증거자료'],
    },
    steps: [
      {
        title: '언제, 얼마를 빌려줬나요?',
        fields: [
          area('partyRelation', '피고와 어떤 관계인가요? (선택)', {
            rows: 2,
            placeholder: '예) 대학 동창으로 10년간 알고 지낸 사이입니다.',
            hint: '필수는 아니지만, 청구원인 첫머리에 들어가면 재판부가 사실관계를 이해하기 쉬워집니다.',
          }),
          date('loanDate', '계약을 맺은 날', { required: true, half: true, hint: '빌려주기로 약속한 날이에요.' }),
          money('loanAmount', '대여금액', { required: true, half: true }),
          // 요건사실은 ①계약 체결과 ②금전 지급이 별개다. 약속한 날과 실제로 건넨 날이 다를 수 있다.
          radio('payDateSame', '돈은 언제 건네줬나요?', ['계약한 날 바로', '며칠 뒤에'], { required: true }),
          date('payDate', '실제로 돈이 건너간 날', {
            required: true, half: true,
            when: (f) => f.payDateSame === '며칠 뒤에',
            hint: '계좌이체라면 이체일, 현금이면 실제로 건넨 날이에요. 이체내역과 날짜가 맞아야 합니다.',
          }),
          radio('loanMethod', '어떤 방법으로 건네줬나요?', ['계좌이체', '현금 교부', '수표 교부', '기타'], { required: true }),
          text('loanMethodEtc', '어떤 방법인가요?', {
            required: true,
            when: (f) => f.loanMethod === '기타',
            placeholder: '예: 제3자 계좌로 이체',
          }),
          radio('loanTimes', '몇 번에 걸쳐 빌려줬나요?', ['1회', '2회 이상']),
          area('loanSchedule', '각 회차의 날짜와 금액', { rows: 2, when: (f) => f.loanTimes === '2회 이상', placeholder: '예) 2023. 5. 10. 2,000만원 / 2023. 8. 1. 1,000만원' }),
          radio('interestSet', '이자를 약정했나요?', ['약정함', '약정 없음'], { required: true }),
          num('interestRate', '이자율', { half: true, unit: '%', when: (f) => f.interestSet === '약정함' }),
          select('interestCycle', '지급 주기', ['매월 말일', '매월 초', '만기 일시지급', '기타'], { half: true, when: (f) => f.interestSet === '약정함' }),
          text('interestCycleEtc', '어떤 주기인가요?', {
            required: true,
            when: (f) => f.interestSet === '약정함' && f.interestCycle === '기타',
            placeholder: '예: 매 분기 말일 / 매월 15일 / 3개월마다',
            hint: '청구원인에 그대로 들어가니 "매월 15일"처럼 문장에 넣어 읽히는 표현으로 적어주세요.',
          }),
          note('warn', '이자제한법상 최고이율은 연 20%예요. 넘으면 초과분은 무효로 처리됩니다.', { when: (f) => f.interestSet === '약정함' }),
          radio('dueSet', '갚기로 한 날(변제기)을 정했나요?', ['날짜로 정함', '정하지 않음'], { required: true }),
          date('dueDate', '변제기', { when: (f) => f.dueSet === '날짜로 정함' }),
          note('info', '변제기 다음 날부터 지연손해금이 붙어요. 오른쪽 청구취지에 자동 반영했습니다.', { when: (f) => f.dueSet === '날짜로 정함' }),
          note('warn', '변제기를 정하지 않았다면 상대방에게 갚으라고 요구(최고)한 다음 날부터 지연손해금이 붙습니다.', { when: (f) => f.dueSet === '정하지 않음' }),
        ],
      },
      {
        title: '지금까지 갚은 돈이 있나요?',
        fields: [
          radio('repaid', '일부라도 돌려받으셨나요?', ['한 푼도 못 받았어요', '일부 받았어요'], { required: true }),
          money('repaidAmount', '받은 금액', { half: true, when: (f) => f.repaid === '일부 받았어요' }),
          date('repaidDate', '마지막으로 받은 날', { half: true, when: (f) => f.repaid === '일부 받았어요' }),
          radio('repaidKind', '받은 돈은 무엇으로 처리할까요?', ['이자에 먼저 충당', '원금에서 차감'], { when: (f) => f.repaid === '일부 받았어요' }),
          { kind: 'remain' },
          note('info', '일부라도 갚은 사실이 있으면 그날 소멸시효가 새로 시작돼요(채무 승인). 시효가 걱정될 때 유리한 사정입니다.', { when: (f) => f.repaid === '일부 받았어요' }),
        ],
      },
      demandStep('갚으라고 요구한 적 있나요?', '반환 요구', '보낸 내용증명은 갑호증으로 첨부하면 좋습니다.'),
      evidenceStep(['차용증·금전소비대차계약서', '계좌이체 내역', '문자·카톡 대화', '내용증명 우편물', '녹취록', '지급명령 결정문']),
    ],
  },

  /* ── 2. 임대차보증금 반환 ── */
  {
    key: 'deposit',
    title: '임대차보증금 반환',
    short: '임대차보증금반환',
    desc: '전세금이나 보증금을 돌려받지 못했을 때',
    caseName: '임대차보증금반환',
    amountLabel: '청구 금액 (보증금)',
    amountHint: '돌려받아야 할 보증금 전액을 적어주세요. 공제 주장 금액은 4단계에서 따로 정리합니다.',
    diagnosis: {
      options: [
        { label: '아직 만기가 안 지났어요', advice: '아직 계약기간이 남았다면 소장보다는 갱신거절 통지를 미리 해두는 게 이후 절차에 도움이 돼요.' },
        { label: '만기가 지났는데 반환을 안 해줘요', advice: '반환을 안 해준다면 내용증명으로 요청하면서 동시에 임차권등기명령을 신청해두는 게 안전해요. 등기 없이 이사하면 대항력·우선변제권을 잃을 수 있어요.' },
        { label: '내용증명을 보냈는데 응답이 없어요', advice: '소장을 준비할 시점이에요. 임차권등기명령이 아직이라면 함께 진행하는 걸 권장해요.' },
        { label: '임차권등기명령을 완료했어요', advice: '대항력이 유지된 상태로 이사할 수 있어요. 소장에 등기 완료 사실도 함께 기재하면 좋아요.' },
      ],
      tips: [
        '임차권등기명령을 완료하면 이사 후에도 대항력·우선변제권을 유지할 수 있어요.',
        '전입신고·확정일자는 경매 시 우선변제 순위에 영향을 줘요.',
      ],
      prepare: ['임대차계약서', '전입세대열람내역', '반환거부내역'],
    },
    steps: [
      {
        title: '보증금을 언제, 얼마 맡겼나요?',
        fields: [
          radio('leaseKind', '어떤 임대차인가요?', ['주택', '상가'], { required: true }),
          { kind: 'address', key: 'propertyAddr', label: '임차목적물 주소', required: true },
          date('contractDate', '계약체결일', { required: true, half: true }),
          money('depositAmount', '보증금액', { required: true, half: true }),
          date('leaseStart', '임대차 시작일', { half: true }),
          // 법원 요건사실: "임대차계약을 체결하고 보증금을 지급한 사실" — 지급이 별개 사실이다
          date('depositPaidDate', '보증금을 낸 날', {
            half: true,
            hint: '계약일과 달라도 됩니다. 계약금·잔금으로 나눠 냈다면 잔금 낸 날을 적으세요.',
          }),
          date('leaseEnd', '임대차 종료일', { half: true }),
          radio('endWay', '계약이 어떻게 끝났나요?', ['기간 만료', '묵시적 갱신 후 해지통고', '합의 해지'], { required: true }),
          radio('handover', '집을 비워주셨나요? (목적물 인도)', ['비워줬어요', '아직 살고 있어요'], { required: true }),
          date('handoverDate', '인도(이사 완료)일', { when: (f) => f.handover === '비워줬어요' }),
          note('warn', '보증금 반환은 집을 비워주는 것과 동시이행 관계예요. 인도를 마친 사실이 승패를 가르니 이사확인서·검침내역을 꼭 올려주세요.'),
          radio('leaseReg', '임차권등기명령을 신청했나요?', ['신청·완료', '안 함']),
          money('deductClaim', '임대인이 공제하겠다는 금액 (미납 차임·관리비 등)', { placeholder: '없으면 비워두세요' }),
        ],
      },
      {
        title: '임대인이 반환을 거부하는 이유는?',
        fields: [
          checks('refuseReasons', '들어보신 이유를 모두 골라주세요', [
            '원상회복 비용을 공제하겠다', '미납 차임·관리비를 공제하겠다', '새 임차인이 구해지면 주겠다', '연락이 닿지 않는다', '이유 없이 미루기만 한다',
          ], { required: true }),
          area('refuseDetail', '상대방 주장 요약', { rows: 3, placeholder: '예) 도배·장판 교체비 200만원을 공제하겠다고 문자로 통보했습니다.' }),
          note('info', '“새 임차인이 구해지면 준다”는 것은 법적으로 반환을 거부할 사유가 아니에요. 그대로 적어두시면 반박 근거가 됩니다.', { when: (f) => (f.refuseReasons || []).includes('새 임차인이 구해지면 주겠다') }),
          note('warn', '원상회복 비용을 공제하려면 임대인이 그 금액을 증명해야 해요. 구체적 견적 없이 하는 공제 주장은 받아들여지지 않는 경우가 많습니다.', { when: (f) => (f.refuseReasons || []).includes('원상회복 비용을 공제하겠다') }),
        ],
      },
      demandStep('반환을 요구한 적 있나요?', '반환 요구', '내용증명은 갑호증으로 첨부하고, 임차권등기 신청서도 함께 내면 좋습니다.'),
      evidenceStep(['임대차계약서', '보증금 입금내역', '전입세대열람내역·확정일자', '내용증명 우편물', '이사확인서·검침내역', '임차권등기 등기부등본', '문자·카톡 대화']),
    ],
  },

  /* ── 3. 임금체불 청구 ── */
  {
    key: 'wage',
    title: '임금체불청구',
    short: '임금체불청구',
    desc: '월급이나 퇴직금 등을 받지 못했을 때',
    caseName: '임금',
    amountLabel: '청구 금액 (체불액)',
    amountHint: '못 받은 임금·퇴직금·수당의 합계를 적어주세요.',
    diagnosis: {
      options: [
        { label: '아직 재직 중이에요', advice: '사업주에게 체불 내역을 문자·이메일 등 서면으로 요청해두면 이후 중요한 증거가 돼요.' },
        { label: '퇴사했는데 정산을 안 해줘요', advice: '퇴사 후 14일 내 지급이 원칙이에요. 지나도록 미지급이면 고용노동청 진정 또는 소장을 바로 준비할 수 있어요.' },
        { label: '고용노동청에 진정을 넣었어요', advice: '근로감독관 조사로 시정지시·형사처벌로 이어질 수 있고, 별도로 민사(임금청구)도 함께 진행할 수 있어요.' },
        { label: '진정했는데 해결이 안 됐어요', advice: '노동청에서 받은 체불임금 확인서 등을 소장의 근거자료로 활용할 수 있어요.' },
      ],
      tips: [
        '3년 이내 체불임금까지 청구 가능해요.',
        '상습 체불은 형사처벌 대상이 될 수 있어요.',
      ],
      prepare: ['근로계약서', '급여명세서', '출퇴근기록'],
    },
    steps: [
      {
        title: '얼마를, 왜 못 받으셨나요?',
        fields: [
          date('hireDate', '입사일', { required: true, half: true }),
          date('leaveDate', '퇴사일', { required: true, half: true }),
          text('jobTitle', '담당 업무', { placeholder: '물류센터 배송 기사' }),
          radio('payKind', '급여는 어떻게 받으셨나요?', ['월급', '시급'], { required: true }),
          money('payAmount', '급여액', { half: true }),
          select('payDay', '지급일', ['매월 25일', '매월 10일', '매월 말일', '기타'], { half: true }),
          text('payDayEtc', '어떤 날에 받으셨나요?', {
            required: true,
            when: (f) => f.payDay === '기타',
            placeholder: '예: 매월 5일 / 격주 금요일',
            hint: '청구원인에 그대로 들어갑니다.',
          }),
          radio('workerCount', '상시 근로자가 몇 명인 사업장인가요?', ['5인 미만', '5인 이상'], { required: true }),
          note('warn', '5인 미만 사업장은 연장·야간·휴일 가산수당을 청구할 수 없어요. 선택에 따라 체불항목이 자동으로 조정됩니다.', { when: (f) => f.workerCount === '5인 미만' }),
          checks('unpaidItems', '못 받은 항목을 모두 골라주세요', ['임금', '퇴직금', '연장근로수당', '주휴수당', '기타'], { required: true }),
          text('unpaidEtcName', '기타 항목은 무엇인가요?', {
            required: true,
            when: (f) => (f.unpaidItems || []).includes('기타'),
            placeholder: '예: 연차수당 / 상여금 / 식대',
            hint: '"기타"라고만 적으면 무엇을 청구하는지 알 수 없어요.',
          }),
          money('unpaidTotal', '체불액 총액', { required: true }),
          note('info', '퇴직 후 14일이 지난 체불임금에는 연 20%의 지연이자가 붙어요(근로기준법 제37조). 오른쪽 청구취지에 반영했습니다.'),
          radio('laborReport', '고용노동청에 진정하셨나요?', ['진정 접수함', '안 함'], { required: true }),
          text('reportNo', '진정 접수번호', { half: true, when: (f) => f.laborReport === '진정 접수함', placeholder: '2026-서울남부-01234' }),
          select('reportDoc', '체불금품확인원', ['발급 완료', '신청 중', '미발급'], { half: true, when: (f) => f.laborReport === '진정 접수함' }),
        ],
      },
      {
        title: '체불액은 어떻게 계산했나요?',
        fields: [
          money('calcWage', '임금 미지급분', { half: true, when: (f) => (f.unpaidItems || []).includes('임금') }),
          money('calcSeverance', '퇴직금', { half: true, when: (f) => (f.unpaidItems || []).includes('퇴직금') }),
          money('calcOvertime', '연장근로수당', { half: true, when: (f) => (f.unpaidItems || []).includes('연장근로수당') }),
          money('calcHoliday', '주휴수당', { half: true, when: (f) => (f.unpaidItems || []).includes('주휴수당') }),
          money('calcEtc', '기타', { half: true, when: (f) => (f.unpaidItems || []).includes('기타') }),
          { kind: 'sum', keys: ['calcWage', 'calcSeverance', 'calcOvertime', 'calcHoliday', 'calcEtc'], label: '합계', compare: 'unpaidTotal' },
          area('calcBasis', '산정 근거', { rows: 3, required: true, placeholder: '예) 2026년 3월·4월 급여 각 310만원 미지급, 퇴직금은 평균임금 기준 3년치로 산정했습니다.' }),
          note('info', '퇴직금은 계속근로 1년 이상일 때 청구할 수 있고, 평균임금 30일분 × 재직연수로 계산해요.'),
        ],
      },
      demandStep('지급을 요구한 적 있나요?', '지급 요구', '노동청 진정서·체불금품확인원도 함께 제출하면 좋습니다.'),
      evidenceStep(['근로계약서', '급여명세서', '출퇴근기록', '통장 입금내역', '체불금품확인원', '문자·카톡 대화']),
    ],
  },

  /* ── 4. 손해배상 ── */
  {
    key: 'tort',
    title: '손해 배상',
    short: '손해배상',
    desc: '사고나 피해로 손해를 입었을 때',
    caseName: '손해배상',
    amountLabel: '청구 금액',
    amountHint: '적극손해·일실수입·위자료를 합한 금액을 적어주세요. 내역은 3단계에서 나눕니다.',
    diagnosis: {
      options: [
        { label: '사고·피해가 방금 발생했어요', advice: '사진, 진단서, 영수증 등 손해 입증자료부터 확보해두는 게 중요해요. 시간이 지나면 확보가 어려워질 수 있어요.' },
        { label: '합의를 시도했는데 안 됐어요', advice: '소장을 준비할 시점이에요. 합의 과정의 대화 내역도 증거로 쓸 수 있어요.' },
        { label: '보험사와 협의 중이에요', advice: '보험사 제시액과 실제 손해액 차이를 먼저 비교해보는 게 좋아요.' },
        { label: '손해액 산정이 어려워요', advice: '진단서·수리비 견적서 등 객관적 자료 기준으로 산정하는 게 일반적이에요. 위자료는 별도로 청구할 수 있어요.' },
      ],
      tips: [
        '재산상 손해와 정신적 손해(위자료)는 각각 따로 청구할 수 있어요.',
        '손해와 가해자를 안 날로부터 3년 이내 청구해야 해요.',
      ],
      prepare: ['사고 관련 자료', '진단서·영수증', '손해액 산정근거'],
    },
    steps: [
      {
        title: '어떤 손해를 입으셨나요?',
        fields: [
          radio('hasContract', '상대방과 계약 관계가 있었나요?', ['없음 (사고·불법행위)', '있음 (계약 위반)'], { required: true }),
          note('warn', '불법행위는 손해와 가해자를 안 날부터 3년, 계약 위반은 10년까지 청구할 수 있어요. 지연손해금 시작일도 달라져 자동으로 맞춰 드립니다.'),
          radio('tortKind', '어떤 사건인가요? (사건명이 결정돼요)', ['일반 (기)', '교통사고 (자)', '산업재해 (산)', '의료 (의)'], { required: true }),
          date('incidentDate', '손해 발생일', { required: true, half: true }),
          money('claimAmount', '청구 금액', { required: true, half: true }),
          area('incidentStory', '어떤 일이 있었나요?', { rows: 4, required: true, placeholder: '예) 2026. 1. 18. 21:40경 강남대로 교차로에서 피고가 신호를 위반해 원고 차량 좌측을 충격했습니다.' }),
          checks('damageKinds', '어떤 손해가 발생했나요?', ['치료비·수리비 (적극손해)', '일하지 못한 손해 (일실수입)', '위자료'], { required: true }),
          money('dmgDirect', '치료비·차량수리비', { half: true, when: (f) => (f.damageKinds || []).includes('치료비·수리비 (적극손해)') }),
          money('dmgIncome', '일실수입', { half: true, when: (f) => (f.damageKinds || []).includes('일하지 못한 손해 (일실수입)') }),
          money('dmgSolace', '위자료', { half: true, when: (f) => (f.damageKinds || []).includes('위자료') }),
          { kind: 'sum', keys: ['dmgDirect', 'dmgIncome', 'dmgSolace'], label: '합계', compare: 'claimAmount' },
          radio('ownFault', '원고에게도 과실이 있나요?', ['없음', '일부 있음'], { required: true }),
          num('ownFaultRate', '원고 과실비율', { half: true, unit: '%', when: (f) => f.ownFault === '일부 있음' }),
          note('warn', '과실상계가 되면 인정 손해액에서 그 비율만큼 깎여요. 미리 반영해 청구하면 소송비용 부담을 줄일 수 있습니다.', { when: (f) => f.ownFault === '일부 있음' }),
        ],
      },
      {
        title: '손해액은 어떻게 산정했나요?',
        fields: [
          area('calcBasis', '산정 근거', { rows: 3, required: true, placeholder: '예) 치료비는 영수증 합계, 일실수입은 사고 전 3개월 평균임금 × 휴업 4주로 산정했습니다.' }),
          checks('calcDocs', '산정 근거 자료', ['진단서·소견서', '치료비 영수증', '수리비 견적서', '급여명세서·소득금액증명', '사고사실확인원', '보험사 지급내역'], { required: true }),
          note('info', '위자료는 정해진 계산식이 없고 법원이 사정을 종합해 정해요. 근거로 진단 기간·후유증·가해 정도를 함께 적어주세요.', { when: (f) => (f.damageKinds || []).includes('위자료') }),
        ],
      },
      demandStep('배상을 요구한 적 있나요?', '배상 요구', '합의 시도 대화나 보험사 협의 내역도 증거가 됩니다.'),
      evidenceStep(['사고 관련 자료(사진·영상)', '진단서·소견서', '치료비·수리비 영수증', '급여명세서·소득자료', '사고사실확인원', '내용증명 우편물']),
    ],
  },

  /* ── 5. 건물명도 ── */
  {
    key: 'evict',
    title: '건물명도 (미납월세 · 무단점거)',
    short: '건물명도',
    desc: '월세 미납 및 무단점거로 비워달라고 할 때',
    caseName: '건물명도',
    amountLabel: '소송목적의 값 (소가)',
    amountHint: '명도청구의 소가는 목적물 가액을 기준으로 정해집니다. 모르면 임대차 목적물 시가의 1/2로 어림잡아 적어주세요.',
    diagnosis: {
      options: [
        { label: '월세가 밀리기 시작했어요', advice: '먼저 계약 해지를 통보(내용증명 권장)하는 게 필요해요. 통상 2기 이상 연체 시 해지 사유가 돼요.' },
        { label: '해지 통보했는데 안 나가요', advice: '명도소송을 준비할 시점이에요. 해지 통보 내용증명이 중요한 증거자료예요.' },
        { label: '계약기간이 끝났는데 안 나가요', advice: '갱신거절 통지 여부를 먼저 확인하고 명도소송을 준비하면 돼요.' },
        { label: '강제집행을 고려하고 있어요', advice: '판결 이후 상대방이 안 나가면 별도로 강제집행(인도집행)을 신청하는 절차예요.' },
      ],
      tips: [
        '2기분 이상 연체하면 계약 해지 사유가 돼요.',
        '판결 후에도 안 나가면 별도로 강제집행 신청이 필요해요.',
      ],
      prepare: ['임대차계약서', '미납내역', '해지통보내역'],
    },
    steps: [
      {
        title: '어떤 건물을, 왜 비워달라고 하나요?',
        fields: [
          radio('leaseKind', '어떤 임대차인가요?', ['주택', '상가'], { required: true }),
          area('propertyDesc', '부동산의 표시 (등기부 기재대로)', { rows: 3, required: true, placeholder: '서울특별시 마포구 월드컵북로 21 [도로명주소]\n철근콘크리트조 5층 다세대주택 제3층 제302호 59.8㎡' }),
          note('info', '판결 주문에 그대로 들어가는 부분이에요. 등기부등본을 올리면 표시를 자동으로 채워 드립니다.'),
          // 법원이 공시한 건물인도 요건사실 ① — 이게 없으면 인도를 구할 권원이 서지 않는다
          radio('ownership', '이 부동산은 원고 소유인가요?', ['원고 소유', '원고가 소유자로부터 임대 권한을 받음'], { required: true }),
          date('ownDate', '소유권을 취득한 날', { half: true, when: (f) => f.ownership === '원고 소유', hint: '등기부등본의 소유권이전등기 접수일을 적으세요.' }),
          text('ownRight', '어떤 권한으로 임대했나요?', {
            required: true,
            when: (f) => f.ownership === '원고가 소유자로부터 임대 권한을 받음',
            placeholder: '예: 소유자 홍길동으로부터 임대·관리를 위임받음',
          }),
          note('info', '건물인도 청구는 "원고에게 인도를 구할 권원이 있다"는 것이 첫 번째 요건사실이에요. 등기사항증명서를 증거로 함께 내세요.'),
          date('contractDate', '계약체결일', { required: true, half: true }),
          date('leaseEnd', '임대차 종료일', { half: true }),
          money('rent', '월세(차임)', { required: true, half: true }),
          num('unpaidMonths', '미납 개월수', { required: true, half: true, unit: '개월' }),
          { kind: 'evictCalc' },
          radio('terminated', '계약해지를 통고하셨나요?', ['통고했어요', '아직이에요'], { required: true }),
          date('terminateDate', '해지통고 도달일', { when: (f) => f.terminated === '통고했어요' }),
          note('warn', '해지 통고가 상대방에게 도달해야 계약이 끝나요. 아직이라면 내용증명을 먼저 보내는 걸 권합니다.', { when: (f) => f.terminated === '아직이에요' }),
          radio('occupancy', '지금 건물 상태는 어떤가요?', ['계속 거주 중', '영업 중', '비어 있음'], { required: true }),
          note('warn', '판결 전에 점유가 제3자에게 넘어가면 집행이 어려워요. 점유이전금지가처분을 함께 신청하시길 권합니다.'),
        ],
      },
      {
        title: '미납 내역을 월별로 알려주세요',
        fields: [
          date('unpaidFrom', '미납이 시작된 달', { required: true, half: true }),
          money('unpaidUtil', '미납 관리비·공과금', { half: true, placeholder: '없으면 비워두세요' }),
          area('unpaidDetail', '월별 미납 내역', { rows: 4, required: true, placeholder: '예)\n2026. 4. 월세 150만원 미납\n2026. 5. 월세 150만원 미납' }),
          note('info', '명도와 함께 밀린 차임 및 인도 완료일까지의 차임 상당 부당이득도 청구할 수 있어요. 청구취지에 자동으로 넣었습니다.'),
        ],
      },
      demandStep('퇴거를 요구한 적 있나요?', '퇴거 요구', '해지통고 내용증명은 가장 중요한 증거예요.'),
      evidenceStep(['임대차계약서', '부동산 등기부등본', '미납 차임 내역·통장거래내역', '해지통고 내용증명', '문자·카톡 대화', '현장 사진']),
    ],
  },
]

export const findType = (key) => complaintTypes.find((t) => t.key === key)

/* ─────────────────────────── 스키마 순회 ─────────────────────────── */

export const isVisible = (field, form) => (field.when ? !!field.when(form) : true)

/** 유형별 전체 6단계 (공통 2 + 유형별 4) */
export function allSteps(type) {
  return [...commonSteps, ...(type?.steps || [])]
}

const filled = (v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '')

/** 완성도 % — 화면에 보이는 필수 입력칸 중 채워진 비율 */
export function completeness(type, form) {
  let total = 0
  let done = 0
  for (const step of allSteps(type)) {
    for (const f of step.fields) {
      const required = f.required || (f.kind === 'court' && f.required)
      if (!required || !f.key) continue
      if (!isVisible(f, form)) continue
      total += 1
      if (filled(form[f.key])) done += 1
    }
  }
  return total === 0 ? 0 : Math.round((done / total) * 100)
}

/** 단계별 요약 — 접힌 아코디언 헤더에 보여줄 한 줄 */
export function stepSummary(idx, type, form) {
  if (idx === 0) {
    if (!form.court && !form.amount) return ''
    const { stamp, small } = costSummary(effectiveSueValue(form))
    return [form.court, form.amount && `${won(form.amount)}원`, small && '소액사건', stamp && `인지대 ${won(stamp)}원`]
      .filter(Boolean).join(' · ')
  }
  if (idx === 1) {
    if (!form.pName && !form.dName) return ''
    return `원고 ${form.pName || '(미입력)'} → 피고 ${form.dName || '(미입력)'}`
  }
  const step = allSteps(type)[idx]
  const first = step?.fields.find((f) => f.required && f.key && filled(form[f.key]))
  if (!first) return ''
  const v = form[first.key]
  const shown = first.kind === 'money' ? `${won(v)}원` : first.kind === 'date' ? fmtDate(v) : Array.isArray(v) ? v.join(', ') : String(v)
  return `${first.label} · ${shown.length > 40 ? `${shown.slice(0, 40)}…` : shown}`
}

/* ─────────────────────────── 미리보기 생성 ─────────────────────────── */

// ⟨값⟩ = 사용자 입력(강조), ⟦안내⟧ = 아직 안 채운 칸
const F = (v) => `⟨${v}⟩`
const P = (t) => `⟦${t}⟧`
const or = (v, hint, fmt = (x) => x) => (filled(v) ? F(fmt(v)) : P(hint))
const money$ = (v, hint) => or(v, hint, (x) => `${won(x)}원`)
const date$ = (v, hint) => or(v, hint, fmtDate)

/** 우편번호·기본주소·상세주소를 한 줄로 합친다 */
const addrOf = (form, key) => {
  if (form[`${key}Unknown`]) return '주소를 알지 못하므로 추후 보정하겠습니다'
  const base = form[key]
  if (!base) return ''
  const zip = form[`${key}Zip`]
  const detail = form[`${key}Detail`]
  return [zip ? `(${zip})` : '', base, detail].filter(Boolean).join(' ')
}


/**
 * 청구취지 제1항의 앞부분 — 법원 「작성예시」의 상세구분을 따른다.
 *   피고 1명            : "피고는 원고에게 50,000,000원"
 *   연대채무            : "피고들은 연대하여 원고에게 50,000,000원"
 *   피고별 금액이 다름  : "원고에게 피고 김철수는 30,000,000원, 피고 김보증은 20,000,000원"
 */
function claimHead(form, amountText) {
  const more = defendantsOf(form)
  if (!more.length) return `피고는 원고에게 ${amountText}`

  if (form.dLiability === '피고별로 금액이 달라요') {
    const all = [
      { name: form.dName, amount: form.dOwnAmount || form.amount },
      ...more.map((x) => ({ name: x.name, amount: x.amount })),
    ]
    const parts = all.map((x) => `피고 ${or(x.name, '이름')}${x.name ? topicParticle(x.name) : '은(는)'} ${money$(x.amount, '금액')}`)
    return `원고에게 ${parts.join(', ')}`
  }
  return `피고들은 연대하여 원고에게 ${amountText}`
}

/** 피고가 여럿이면 소송비용·가집행 문구도 복수형이 된다 */
const costLine = (form) =>
  defendantsOf(form).length ? '소송비용은 피고들의 부담으로 한다.' : '소송비용은 피고의 부담으로 한다.'

/** 첫 피고 외에 추가된 피고들 — 이름이 비어 있는 줄은 버린다 */
function defendantsOf(form) {
  if (form.dCount !== '여러 명') return []
  return (form.dMore || []).filter((x) => x && (x.name || x.addr))
}

/** 원고 1 + 피고 전원 — 송달료는 당사자 수에 비례한다 */
export function partyCount(form) {
  return 1 + 1 + defendantsOf(form).length
}

function partyLines(form) {
  // 「소장 표시」가 꺼진 항목은 본문에서 빼고, 법원에만 알린다는 각주를 남긴다
  const show = (key, dflt = true) => form[key] ?? dflt
  const hidden = []

  const p = [
    `원　고　${or(form.pName, '2단계에서 이름을 입력해 주세요')}${
      form.pForeignName ? ` (${F(form.pForeignName)})` : ''
    }${
      form.pRrn && show('pRrnShow', false) ? ` (${String(form.pRrn).slice(0, 8)}*****)` : ''
    }`,
    `　　　　${or(addrOf(form, 'pAddr'), '2단계에서 주소를 입력해 주세요')}`,
  ]
  // 법인은 대표자를, 미성년자 등은 법정대리인을 당사자란에 함께 적는다
  if (form.pEntity === '법인·단체') {
    if (form.pCorpNo && show('pCorpNoShow', false)) p.push(`　　　　법인등록번호 ${F(form.pCorpNo)}`)
    else if (form.pCorpNo) hidden.push('원고 법인등록번호')
    p.push(`　　　　${or(form.pRep, '대표자')}`)
  }
  else if (form.pLegalRep === '법정대리인이 있어요') {
    p.push(`　　　　위 원고는 소송능력이 없으므로 법정대리인 ${or(form.pLegalRepName, '법정대리인')}`)
  }
  if (form.pRrn && !show('pRrnShow', false)) hidden.push('원고 주민등록번호')

  const contact = []
  if (form.pTel && show('pTelShow')) contact.push(`전화 ${F(form.pTel)}`)
  if (form.pFax && show('pFaxShow')) contact.push(`팩스 ${F(form.pFax)}`)
  if (contact.length) p.push(`　　　　${contact.join('　')}`)
  if (form.pTel && !show('pTelShow')) hidden.push('원고 전화번호')
  if (form.pFax && !show('pFaxShow')) hidden.push('원고 팩스번호')

  if (form.pEmail && show('pEmailShow')) p.push(`　　　　이메일 ${F(form.pEmail)}`)
  else if (form.pEmail) hidden.push('원고 이메일')

  p.push(`　　　　송달장소 : ${
    form.pService === '다른 주소로 받겠습니다'
      ? or(addrOf(form, 'pServiceAddr'), '송달받을 주소')
      : '위 주소와 같음'
  }`)

  const d = [
    `피　고　${or(form.dName, '2단계에서 이름을 입력해 주세요')}${
      form.dRrn && show('dRrnShow', false) ? ` (${String(form.dRrn).slice(0, 8)}*****)` : ''
    }`,
    `　　　　${or(addrOf(form, 'dAddr'), '2단계에서 주소를 입력해 주세요')}`,
  ]
  if (form.dEntity === '법인·단체') {
    if (form.dCorpNo && show('dCorpNoShow', false)) d.push(`　　　　법인등록번호 ${F(form.dCorpNo)}`)
    else if (form.dCorpNo) hidden.push('피고 법인등록번호')
    d.push(`　　　　${or(form.dRep, '대표자')}`)
  }
  else if (form.dLegalRep === '법정대리인이 있어요') {
    d.push(`　　　　위 피고는 소송능력이 없으므로 법정대리인 ${or(form.dLegalRepName, '법정대리인')}`)
  }
  if (form.dRrn && !show('dRrnShow', false)) hidden.push('피고 주민등록번호')
  if (form.dTel && show('dTelShow')) d.push(`　　　　전화 ${F(form.dTel)}`)
  else if (form.dTel) hidden.push('피고 전화번호')

  // 피고가 여럿이면 순번을 붙여 이어 적는다 (피고 1 / 피고 2 …)
  const more = defendantsOf(form)
  if (more.length) {
    // 번호를 붙이면 이어지는 줄도 그만큼 들여써야 열이 맞는다
    d[0] = d[0].replace('피　고　', '피　고　1. ')
    for (let i = 1; i < d.length; i++) d[i] = d[i].replace(/^　　　　/, '　　　　　　')
    more.forEach((x, i) => {
      d.push(`　　　　${i + 2}. ${or(x.name, `피고 ${i + 2} 이름`)}`)
      d.push(`　　　　　　${or(x.addr, `피고 ${i + 2} 주소`)}`)
      if (x.tel) d.push(`　　　　　　전화 ${F(x.tel)}`)
    })
  }

  const lines = [...p, ...d]
  if (hidden.length) {
    lines.push('')
    lines.push(`　　　　※ ${F(hidden.join(', '))}는 법원에만 제출하고 이 서면에는 표시하지 않습니다.`)
  }
  return lines
}

const RATE = '연 12%'

/* ── 요건사실에 대응하는 갑호증 자동 인용 ──
 * 청구원인의 각 사실 뒤에 그 사실을 뒷받침하는 증거를 「(갑 제1호증 계좌이체내역)」처럼 붙인다.
 * 올린 파일 이름으로 매칭하므로, 못 찾으면 조용히 생략한다. */
const EVIDENCE_PATTERN = {
  contract: /차용증|계약서|소비대차|약정/,
  payment: /계좌이체|이체|입금|통장|송금|영수증/,
  demand: /내용증명|문자|카톡|카카오|메시지/,
  lease: /임대차|전세/,
  resident: /전입|확정일자|주민등록/,
  work: /근로계약|급여명세|임금대장|출퇴근/,
  labor: /체불금품|노동청|진정/,
  medical: /진단서|소견서|치료비/,
  register: /등기부|등기사항/,
}
function citeFor(form, kind) {
  const files = form.evidenceFiles || []
  const re = EVIDENCE_PATTERN[kind]
  if (!re) return ''
  const i = files.findIndex((x) => re.test(x.name || ''))
  return i === -1 ? '' : ` ${F(`(갑 제${i + 1}호증 ${files[i].name})`)}`
}

// '기타'를 고르면 사용자가 직접 적은 값으로 바꿔 넣는다.
// 문서에 "기타"가 그대로 나가면 법원이 무엇을 청구하는지 알 수 없다.
const etc = (picked, written) => (picked === '기타' ? (written || '') : picked)
const cycleOf = (form) => etc(form.interestCycle, form.interestCycleEtc)
const payDayOf = (form) => etc(form.payDay, form.payDayEtc)
const unpaidItemsOf = (form) =>
  (form.unpaidItems || []).map((x) => etc(x, form.unpaidEtcName)).filter(Boolean)

/**
 * 청구원인 항목 번호를 자동으로 매긴다.
 * 전각 공백으로 시작하는 줄은 앞 항목의 부속 설명이라 번호를 건너뛴다.
 * (번호를 손으로 박으면 문단을 하나 끼울 때마다 전부 어긋난다 — 실제로 그런 버그가 있었다)
 */
function numbered(items) {
  let n = 0
  return items.map((t) => (!t || t.startsWith('\u3000') ? t : `${++n}. ${t}`))
}

/* ── 한국어 조사 처리 ──
 * 문자열을 이어 붙여 문서를 만들다 보면 "보증금 반환를", "카톡으으로" 같은 오류가 난다.
 * 받침을 보고 조사를 고르는 함수로 통일한다. */

const hasFinalConsonant = (word) => {
  const code = String(word).trim().slice(-1).charCodeAt(0)
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return null   // 한글이 아니면 판정 불가
  return (code - 0xac00) % 28 !== 0
}
/** 을 / 를 */
const objectParticle = (w) => {
  const f = hasFinalConsonant(w)
  return f === null ? '을(를)' : f ? '을' : '를'
}
/** 으로 / 로 — ㄹ받침은 '로' */
/** 주격 조사 은/는 — 받침 있으면 '은' */
const topicParticle = (w) => {
  const f = hasFinalConsonant(w)
  return f === null ? '은(는)' : f ? '은' : '는'
}

const byParticle = (w) => {
  const code = String(w).trim().slice(-1).charCodeAt(0)
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return '(으)로'
  const jong = (code - 0xac00) % 28
  return jong === 0 || jong === 8 ? '로' : '으로'
}

/** 최고 방법 선택지 → 문서에 쓸 표현 (문자열을 잘라 쓰면 어미가 남는다) */
const DEMAND_WAY = {
  '내용증명을 보냈어요': '내용증명',
  '문자·카톡으로 요구했어요': '문자메시지',
  '전화·구두로만 요구했어요': '구두',
}

/**
 * 5단계(최고 이력) — 전 유형 공통.
 * 최고일은 지연손해금 기산일의 근거이므로 반드시 문서에 남아야 한다.
 */
function demandLines(form, verb) {
  if (form.demandWay === '요구한 적 없어요') {
    return ['원고는 이 사건 소장 부본의 송달로써 최고에 갈음합니다.']
  }
  if (!form.demandWay) return []
  const way = DEMAND_WAY[form.demandWay] || form.demandWay
  const out = [`원고는 ${date$(form.demandDate, '최고일')} 피고에게 ${F(way)}${byParticle(way)} ${verb}${objectParticle(verb)} 최고하였습니다.`]
  // 상대방의 반응은 채무 승인(시효 중단)·이행 거절의 근거가 되므로 그대로 옮긴다
  out.push(form.demandResult
    ? `\u3000\u3000이에 대한 피고의 반응은 다음과 같습니다. ${F(form.demandResult)}`
    : '\u3000\u3000그러나 피고는 아무런 응답이 없습니다.')
  return out
}

/** 금전을 실제로 건넨 시점 — 계약일과 같으면 "같은 날", 다르면 그 날짜를 적는다 */
function payWhen(form) {
  if (form.payDateSame === '며칠 뒤에') return date$(form.payDate, '지급일')
  return '같은 날'
}

function loanBody(form) {
  const rate = form.interestSet === '약정함' && form.interestRate ? `연 ${form.interestRate}%` : RATE
  const start = form.dueSet === '날짜로 정함' ? date$(form.dueDate, '변제기') : date$(form.demandDate, '최고일')
  const claims = [
    `${claimHead(form, money$(claimAmountOf(form), '1단계에서 청구금액을 입력해 주세요'))} 및 이에 대하여 ${start}부터 이 사건 소장 부본 송달일까지는 ${F(rate)}, 그 다음 날부터 다 갚는 날까지는 ${F('연 12%')}의 각 비율에 의한 돈을 지급하라.`,
    costLine(form),
    '제1항은 가집행할 수 있다.',
  ]

  const reasons = []

  // ① 당사자의 관계 — 필수는 아니지만 사실관계를 이해시키는 데 도움이 된다
  if (form.partyRelation) reasons.push(`당사자의 관계 — ${F(form.partyRelation)}`)

  // ② 금전소비대차계약 체결 사실
  reasons.push(
    `원고는 ${date$(form.loanDate, '3단계에서 대여일자를 입력해 주세요')} 피고에게 ${money$(form.loanAmount, '대여금액')}을 대여하기로 하는 금전소비대차계약을 체결하였습니다.${citeFor(form, 'contract')}`,
  )
  if (form.interestSet === '약정함') {
    reasons.push(`　　이자는 ${or(form.interestRate, '이자율', (x) => `연 ${x}%`)}로 하고, ${cycleOf(form) ? F(cycleOf(form)) : P('지급 주기')}에 지급받기로 약정하였습니다.`)
  }

  // ③ 계약 내용에 따른 금전 지급(인도) 사실
  const method = form.loanMethod === '기타' ? form.loanMethodEtc : form.loanMethod
  reasons.push(
    `원고는 ${payWhen(form)} 피고에게 ${money$(form.loanAmount, '대여금액')}을 ${method ? F(`${method}하는 방법으로`) : ''} 지급하였습니다.${citeFor(form, 'payment')}`.replace('  ', ' '),
  )
  if (form.loanTimes === '2회 이상' && form.loanSchedule) {
    reasons.push(`　　각 회차의 대여 내역은 다음과 같습니다. ${F(form.loanSchedule)}`)
  }

  // ④ 변제기 도래
  reasons.push(
    form.dueSet === '날짜로 정함'
      ? `변제기는 ${date$(form.dueDate, '변제기')}로 정하였고, 그 기한이 이미 지났습니다.`
      : '변제기를 따로 정하지 아니하였으므로, 원고의 최고로써 변제기가 도래하였습니다.',
  )

  // ⑤ 피고의 미변제 사실
  if (form.repaid === '일부 받았어요') {
    const appropriation = form.repaidKind === '원금에서 차감'
      ? ' 위 금원은 원금에 충당하였습니다.'
      : form.repaidKind === '이자에 먼저 충당'
        ? ' 위 금원은 민법 제479조에 따라 이자에 먼저 충당하였습니다.'
        : ''
    reasons.push(`그런데 피고는 ${date$(form.repaidDate, '수령일')} ${money$(form.repaidAmount, '받은 금액')}을 지급하였을 뿐, 나머지를 변제하지 아니하고 있습니다.${appropriation ? F(appropriation) : ''}`)
  } else if (form.repaid) {
    reasons.push('그런데 피고는 변제기가 지난 현재까지 위 대여금을 한 푼도 변제하지 아니하고 있습니다.')
  } else {
    reasons.push(`그런데 피고는 변제기가 지난 현재까지 위 대여금을 변제하지 아니하고 있습니다. ${P('갚은 돈이 있다면 4단계에서 입력해 주세요')}`)
  }

  // ⑥ 최고
  reasons.push(...demandLines(form, '변제'))

  reasons.push('따라서 원고는 청구취지와 같은 판결을 구하기 위하여 이 사건 소를 제기합니다.')
  return { claims: numbered(claims), reasons: numbered(reasons) }
}

function depositBody(form) {
  const start = form.handover === '비워줬어요' ? date$(form.handoverDate, '인도일') : date$(form.leaseEnd, '임대차 종료일')
  const claims = [
    `${claimHead(form, money$(claimAmountOf(form), '1단계에서 보증금액을 입력해 주세요'))} 및 이에 대하여 ${start}부터 이 사건 소장 부본 송달일까지는 ${F('연 5%')}, 그 다음 날부터 다 갚는 날까지는 ${F('연 12%')}의 각 비율에 의한 돈을 지급하라.`,
    costLine(form),
    '제1항은 가집행할 수 있다.',
  ]
  const reasons = [
    `원고는 ${date$(form.contractDate, '3단계에서 계약체결일을 입력해 주세요')} 피고와 사이에 ${or(addrOf(form, 'propertyAddr'), '임차목적물 주소')}에 관하여 보증금 ${money$(form.depositAmount, '보증금액')}으로 하는 ${form.leaseKind ? F(`${form.leaseKind} 임대차`) : '임대차'}계약을 체결하였습니다.${citeFor(form, 'lease')}`,
    `원고는 ${form.depositPaidDate ? date$(form.depositPaidDate, '보증금 지급일') : '같은 날'} 피고에게 위 보증금 ${money$(form.depositAmount, '보증금액')}을 지급하였습니다.${citeFor(form, 'payment')}`,
    `위 임대차계약은 ${date$(form.leaseEnd, '임대차 종료일')} ${form.endWay ? F(form.endWay) : P('종료 사유')}로 종료되었습니다.`,
  ]
  // 임대차 기간 — 계약의 존속기간이 특정되어야 종료 주장이 성립한다
  if (form.leaseStart) {
    reasons.splice(1, 0, `　　임대차 기간은 ${date$(form.leaseStart, '임대차 시작일')}부터 ${date$(form.leaseEnd, '임대차 종료일')}까지입니다.`)
  }
  if (form.handover === '비워줬어요') {
    reasons.push(`원고는 ${date$(form.handoverDate, '인도일')} 위 목적물을 피고에게 인도하여 원고의 의무 이행을 모두 마쳤습니다.${citeFor(form, 'resident')}`)
  } else {
    reasons.push(`${P('목적물 인도 여부를 3단계에서 선택해 주세요')}`)
  }
  if ((form.refuseReasons || []).length) {
    reasons.push(`그럼에도 피고는 ${F(form.refuseReasons.join(', '))}는 이유로 보증금 반환을 거부하고 있으나, 이는 정당한 반환 거부 사유가 되지 못합니다.`)
  } else {
    reasons.push(`${P('4단계에서 임대인의 반환 거부 이유를 골라 주세요')}`)
  }
  if (form.refuseDetail) {
    reasons.push(`　　피고의 구체적인 주장은 다음과 같습니다. ${F(form.refuseDetail)}`)
  }
  // 공제 주장액 — 다투는 금액을 소장에서 미리 특정해 두면 쟁점이 좁혀진다
  if (form.deductClaim) {
    reasons.push(`　　피고는 미납 차임·관리비 등 명목으로 ${money$(form.deductClaim, '공제 주장액')}의 공제를 주장하고 있으나, 원고는 이를 다툽니다.`)
  }
  if (form.leaseReg === '신청·완료') {
    reasons.push('원고는 임차권등기명령을 신청하여 등기를 마쳤으므로, 목적물을 인도한 이후에도 대항력과 우선변제권을 유지하고 있습니다.')
  }
  reasons.push(...demandLines(form, '보증금 반환'))
  reasons.push(`따라서 원고는 청구취지와 같은 판결을 구하기 위하여 이 사건 소를 제기합니다.`)
  return { claims: numbered(claims), reasons: numbered(reasons) }
}

function wageBody(form) {
  const claims = [
    `${claimHead(form, money$(claimAmountOf(form), '1단계에서 체불액을 입력해 주세요'))} 및 이에 대하여 ${date$(form.leaveDate, '퇴사일')}부터 14일이 지난 날의 다음 날부터 다 갚는 날까지 ${F('연 20%')}의 비율에 의한 돈을 지급하라.`,
    costLine(form),
    '제1항은 가집행할 수 있다.',
  ]
  const reasons = [
    `원고는 ${date$(form.hireDate, '3단계에서 입사일을 입력해 주세요')}부터 ${date$(form.leaveDate, '퇴사일')}까지 피고가 운영하는 사업장에서 ${or(form.jobTitle, '담당 업무')}로 근무하였습니다.${citeFor(form, 'work')}`,
    `원고의 급여는 ${form.payKind ? F(form.payKind) : P('급여 형태')} ${money$(form.payAmount, '급여액')}이고, 지급일은 ${or(payDayOf(form), '지급일')}이었습니다.`,
    `그런데 피고는 ${unpaidItemsOf(form).length ? F(unpaidItemsOf(form).join('·')) : P('못 받은 항목')}에 해당하는 합계 ${money$(form.unpaidTotal || form.amount, '체불액')}을 현재까지 지급하지 아니하고 있습니다.`,
  ]
  // 항목별 내역 — 체불임금 소송에서 무엇을 얼마나 청구하는지 특정하는 부분이다
  const wageParts = [
    ['임금', form.calcWage], ['퇴직금', form.calcSeverance],
    ['연장근로수당', form.calcOvertime], ['주휴수당', form.calcHoliday],
    [form.unpaidEtcName || '기타', form.calcEtc],
  ].filter(([, v]) => v).map(([n, v]) => `${n} ${won(v)}원`)
  if (wageParts.length) reasons.push(`　　항목별 내역은 ${F(wageParts.join(', '))}입니다.`)
  if (form.calcBasis) reasons.push(`위 금액의 산정 근거는 다음과 같습니다. ${F(form.calcBasis)}`)
  if (form.workerCount === '5인 미만') {
    reasons.push('　　다만 피고 사업장은 상시 근로자 5인 미만이므로, 연장·야간·휴일근로 가산수당은 청구하지 아니합니다.')
  }
  if (form.laborReport === '진정 접수함') {
    const doc = form.reportDoc === '발급 완료' ? ' 체불금품확인원을 발급받아 이 사건 증거로 제출합니다.' : ''
    reasons.push(`원고는 고용노동청에 진정(접수번호 ${or(form.reportNo, '접수번호')})을 제기하였으나 현재까지 지급이 이루어지지 아니하였습니다.${doc ? F(doc) : ''}${citeFor(form, 'labor')}`)
  }
  reasons.push(...demandLines(form, '임금 지급'))
  reasons.push(`따라서 원고는 청구취지와 같은 판결을 구하기 위하여 이 사건 소를 제기합니다.`)
  return { claims: numbered(claims), reasons: numbered(reasons) }
}

function tortBody(form) {
  const claims = [
    `${claimHead(form, money$(form.claimAmount || claimAmountOf(form), '1단계에서 청구금액을 입력해 주세요'))} 및 이에 대하여 ${date$(form.incidentDate, '손해 발생일')}부터 이 사건 소장 부본 송달일까지는 ${F('연 5%')}, 그 다음 날부터 다 갚는 날까지는 ${F('연 12%')}의 각 비율에 의한 돈을 지급하라.`,
    costLine(form),
    '제1항은 가집행할 수 있다.',
  ]
  const reasons = [
    `${or(form.incidentStory, '3단계에서 사건 경위를 입력해 주세요')}${citeFor(form, 'medical')}`,
    `이는 피고의 ${form.hasContract === '있음 (계약 위반)' ? F('채무불이행') : F('불법행위')}에 해당하므로, 피고는 원고가 입은 손해를 배상할 책임이 있습니다.`,
  ]
  // 체크를 해제한 손해 항목은 금액이 남아 있어도 문서에서 빼야 한다 (화면에서만 숨기면 소장에 유령 항목이 남는다)
  const kinds = form.damageKinds || []
  const parts = []
  if (kinds.includes('치료비·수리비 (적극손해)') && form.dmgDirect) parts.push(`적극손해 ${won(form.dmgDirect)}원`)
  if (kinds.includes('일하지 못한 손해 (일실수입)') && form.dmgIncome) parts.push(`일실수입 ${won(form.dmgIncome)}원`)
  if (kinds.includes('위자료') && form.dmgSolace) parts.push(`위자료 ${won(form.dmgSolace)}원`)
  const total = form.claimAmount || form.amount
  reasons.push(`원고가 입은 손해는 ${parts.length ? F(parts.join(', ')) : P('손해 항목별 금액을 3단계에서 입력해 주세요')}${parts.length ? `으로 합계 ${money$(total, '청구금액')}입니다.` : ''}`)
  if (form.calcBasis) reasons.push(`위 손해액의 산정 근거는 다음과 같습니다. ${F(form.calcBasis)}`)
  if ((form.calcDocs || []).length) {
    reasons.push(`　　위 산정은 ${F(form.calcDocs.join(', '))}에 근거한 것입니다.`)
  }
  if (form.ownFault === '일부 있음') reasons.push(`원고의 과실 ${or(form.ownFaultRate, '과실비율', (x) => `${x}%`)}를 이미 반영하여 청구합니다.`)
  reasons.push(...demandLines(form, '손해배상'))
  reasons.push(`따라서 원고는 청구취지와 같은 판결을 구하기 위하여 이 사건 소를 제기합니다.`)
  return { claims: numbered(claims), reasons: numbered(reasons) }
}

function evictBody(form) {
  const unpaid = (Number(form.rent) || 0) * (Number(form.unpaidMonths) || 0)
  const claims = [
    // 명도는 목적물 인도라 '연대'가 성립하지 않는다. 공동점유면 피고들이 함께 인도할 뿐이다.
    `${defendantsOf(form).length ? '피고들은' : '피고는'} 원고에게 별지 목록 기재 부동산을 인도하라.`,
    `${claimHead(form, unpaid ? F(`${won(unpaid)}원`) : P('미납 차임 합계'))} 및 이 사건 소장 부본 송달일 다음 날부터 위 부동산 인도 완료일까지 월 ${money$(form.rent, '월세')}의 비율에 의한 돈을 지급하라.`,
    costLine(form),
    '제1, 2항은 가집행할 수 있다.',
  ]
  // ① 원고에게 인도를 구할 권원이 있다는 사실 — 법원이 공시한 건물인도 요건사실의 첫 항목
  const title = form.ownership === '원고가 소유자로부터 임대 권한을 받음'
    ? `원고는 별지 목록 기재 부동산의 소유자로부터 ${or(form.ownRight, '임대 권한의 내용')}에 따라 이를 임대할 권한을 가지고 있습니다.${citeFor(form, 'register')}`
    : `별지 목록 기재 부동산은 ${form.ownDate ? `${date$(form.ownDate, '소유권 취득일')} 이래 ` : ''}원고의 소유입니다.${citeFor(form, 'register')}`
  const reasons = [
    title,
    `원고는 ${date$(form.contractDate, '3단계에서 계약체결일을 입력해 주세요')} 피고와 사이에 별지 목록 기재 부동산에 관하여 차임 월 ${money$(form.rent, '월세')}으로 하는 ${form.leaseKind ? F(`${form.leaseKind} 임대차`) : '임대차'}계약을 체결하였습니다.${citeFor(form, 'lease')}`,
    ...(form.leaseEnd ? [`　　임대차 기간은 ${date$(form.leaseEnd, '임대차 종료일')}까지로 정하였습니다.`] : []),
    `피고는 ${date$(form.unpaidFrom, '미납 시작월')}부터 ${or(form.unpaidMonths, '미납 개월수', (x) => `${x}개월분`)}의 차임 합계 ${unpaid ? F(`${won(unpaid)}원`) : P('미납액')}을 연체하고 있습니다.`,
    ...(form.unpaidDetail ? [`　　월별 미납 내역은 다음과 같습니다.\n${F(form.unpaidDetail)}`] : []),
    ...(form.unpaidUtil ? [`　　이와 별도로 미납 관리비·공과금 ${money$(form.unpaidUtil, '금액')}이 있습니다.`] : []),
    `이는 ${form.leaseKind === '상가' ? F('상가건물 임대차보호법상 3기') : F('민법 제640조의 2기')} 이상의 차임 연체에 해당하여 계약 해지 사유가 됩니다.`,
  ]
  if (form.terminated === '통고했어요') {
    reasons.push(`원고는 ${date$(form.terminateDate, '해지통고 도달일')} 피고에게 계약 해지의 의사표시를 하였고, 그 통고가 도달함으로써 위 임대차계약은 적법하게 해지되었습니다.`)
  } else {
    reasons.push(`${P('해지 통고 사실을 3단계에서 입력해 주세요')}`)
  }
  if (form.occupancy) {
    const state = {
      '계속 거주 중': '피고는 현재까지 위 부동산에 거주하며 점유하고 있습니다.',
      '영업 중': '피고는 현재까지 위 부동산에서 영업하며 점유하고 있습니다.',
      '비어 있음': '위 부동산은 현재 비어 있으나 피고가 점유를 해제하지 아니하였습니다.',
    }[form.occupancy]
    if (state) reasons.push(`${F(state)}`)
  }
  reasons.push(...demandLines(form, '목적물 인도'))
  reasons.push(`따라서 원고는 청구취지와 같은 판결을 구하기 위하여 이 사건 소를 제기합니다.`)
  return { claims: numbered(claims), reasons: numbered(reasons), appendix: { title: '부동산의 표시', body: form.propertyDesc || '' } }
}

const bodyBuilders = { loan: loanBody, deposit: depositBody, wage: wageBody, tort: tortBody, evict: evictBody }

const TORT_SUFFIX = { '일반 (기)': '(기)', '교통사고 (자)': '(자)', '산업재해 (산)': '(산)', '의료 (의)': '(의)' }

/** 실시간 미리보기 · 전체보기가 함께 쓰는 소장 데이터 */
/** 첨부서류 목록의 "통" 열을 맞춘다 — 전각 공백으로 서식지처럼 정렬 */
function padAttach(rows) {
  // 한글·전각은 2칸, 나머지는 1칸으로 세어 폭을 구한다
  const w = (t) => [...t].reduce((n, c) => n + (c.charCodeAt(0) > 0x2e80 ? 2 : 1), 0)
  const max = Math.max(...rows.map(([label]) => w(label)))
  return rows.map(([label, count]) => {
    const pad = max - w(label) + 4                       // 여유 2칸(전각) 확보
    const gap = '　'.repeat(Math.floor(pad / 2)) + (pad % 2 ? ' ' : '')
    return `${label}${gap}${count}`
  })
}

export function buildPreview(type, form) {
  // 소장은 "무슨 일이 있었는지"를 밝히는 문서다. 법리 다툼은 상대방 답변서를 받은 뒤
  // 준비서면에서 벌어지므로, 실무상 소장에는 판례를 인용하지 않는다. → 인용 기능을 두지 않는다.
  const { claims, reasons, appendix } = (bodyBuilders[type.key] || loanBody)(form)
  const caseName = type.key === 'tort' ? `손해배상${TORT_SUFFIX[form.tortKind] || '(기)'}` : type.caseName
  // 실제로 첨부하는 파일만 갑호증이 된다.
  // 체크박스는 '무엇을 준비할지' 알려주는 체크리스트일 뿐, 그 자체로 증거가 되지 않는다.
  const evidences = (form.evidenceFiles || []).map((x) => x.name).filter(Boolean)
  return {
    caseName,
    title: type.key === 'evict' ? `${caseName} 청구의 소` : `${caseName} 청구의 소`,
    sueValue: effectiveSueValue(form),
    // 청구금액과 소가가 다른 경우(산출불능·비재산권)를 문서에서 구분해 보여준다
    sueValueDeemed: effectiveSueValue(form) !== (Number(form.amount) || 0),
    parties: partyLines(form),
    claims,
    reasons,
    evidences: evidences.length ? evidences : null,
    court: form.court,
    plaintiff: form.pName,
    // 첨부서류 — 증거(갑호증)와 별개로 제출하는 서류
    attachments: padAttach([
      ['위 입증방법', '각 1통'],
      ['소장 부본', '1통'],
      ['송달료 납부서', '1통'],
      ...(form.attachExtra || []).map((x) => [x, '1통']),
    ]),
    // 별지 목록 — 판결 주문에 그대로 들어가므로 문서에 반드시 붙어야 한다
    appendix: appendix || null,
  }
}

/* ─────────────────────────── 필수 기재사항 체크 ─────────────────────────── */

export function requiredChecklist(type, form) {
  const has = (...keys) => keys.every((k) => filled(form[k]))
  const evidenceCount = (form.evidenceFiles || []).length
  const preview = buildPreview(type, form)
  const reasonDone = !preview.reasons.some((r) => r.includes('⟦'))
  return [
    { no: '①', label: '당사자 인적사항·주소·주민번호', ok: has('pName', 'pAddr', 'pRrn', 'dName', 'dAddr'), detail: has('pName', 'dName') ? `원고 ${form.pName} / 피고 ${form.dName}` : '2단계에서 입력해 주세요' },
    { no: '②', label: '대리인', ok: null, detail: '본인 소송 — 해당 없음' },
    { no: '③', label: '연락처 (전화·팩스·이메일)', ok: has('pTel'), detail: has('pTel') ? `원고 ${[form.pTel, form.pFax, form.pEmail].filter(Boolean).length}개 / 피고 ${form.dTel ? 1 : 0}개` : '원고 연락처가 필요해요' },
    { no: '④', label: '청구취지', ok: filled(form.amount), detail: filled(form.amount) ? `${preview.claims.length}개 항 + 가집행 신청` : '1단계에서 청구금액을 입력해 주세요' },
    { no: '⑤', label: '청구원인', ok: reasonDone, detail: reasonDone ? '사실관계 → 이행기 도과 → 최고' : '3~5단계에 빈칸이 남아 있어요' },
    { no: '⑥', label: '입증방법·첨부서류', ok: evidenceCount > 0, detail: evidenceCount > 0 ? `갑 제1~${evidenceCount}호증 · 첨부 3종` : '6단계에서 증거를 골라 주세요' },
    { no: '⑦', label: '작성 연월일', ok: true, detail: fmtDate(new Date().toISOString().slice(0, 10)) },
    { no: '⑧', label: '법원의 표시', ok: filled(form.court), detail: form.court || '1단계에서 법원을 선택해 주세요' },
    { no: '⑨', label: '기명날인 및 간인', ok: false, warn: true, detail: '출력 후 직접 서명하세요' },
  ]
}

/* ─────────────────────────── 초안 저장 ─────────────────────────── */
// 작성 중인 소장은 브라우저에 보관한다. (실서비스라면 서버 저장으로 교체)

const DRAFT_KEY = 'naholo_complaint_draft'

export function saveDraft(typeKey, form) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ typeKey, form, savedAt: Date.now() }))
    return true
  } catch {
    return false
  }
}

export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    return d?.typeKey && d?.form ? d : null
  } catch {
    return null
  }
}

export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch { /* 저장소 접근 불가 시 무시 */ }
}

export function savedAgo(ts) {
  if (!ts) return ''
  const min = Math.floor((Date.now() - ts) / 60000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  // 사건은 몇 달을 가는 일이라 "700시간 전"으로는 감이 오지 않는다
  if (day < 14) return `${day}일 전`
  return fmtDate(new Date(ts).toISOString().slice(0, 10))
}

export const emptyComplaint = {
  court: '', amount: '',
  pName: '', pRrn: '', pAddr: '', pTel: '', pService: '위 주소와 같음', pServiceAddr: '', pFax: '', pEmail: '',
  dName: '', dRrn: '', dAddr: '', dTel: '',
}
