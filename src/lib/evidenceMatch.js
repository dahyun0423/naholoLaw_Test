// 체크한 준비물과 실제 올린 파일이 같은 서류인지 가려낸다.
//
// 예전에는 글자가 그대로 들어있어야만 같은 것으로 봤다. 그래서 체크리스트의
// 「문자·카톡 대화」에 대고 「카카오톡 내역」이나 「대화내역」을 올리면 못 알아보고,
// "아직 파일로 올라오지 않았어요"라고 잘못 짚었다.
//
// 사람은 같은 서류를 여러 이름으로 부른다. 그래서
//   ① 항목을 뜻 단위로 쪼개고 (「문자·카톡 대화」 → 문자 / 카톡 / 대화)
//   ② 같은 뜻으로 쓰는 말을 한 묶음으로 보고 (카톡 = 카카오톡 = 카톡방 = 톡)
//   ③ 그중 하나라도 파일 이름에 있으면 같은 서류로 본다.
//
// 다만 아무 말이나 걸리면 안 된다 — 「내역」·「자료」처럼 어느 서류에나 붙는 말은
// 그것만으로는 근거가 되지 못하게 막는다.

/** 비교용으로 다듬는다 — 공백·구분기호·확장자를 떼고 소문자로 */
const normalize = (v) => String(v || '')
  .normalize('NFC')
  .replace(/\.[a-z0-9]{2,5}$/i, '')
  .toLowerCase()
  .replace(/[^0-9a-z가-힣]/g, '')

/** 어느 서류에나 붙는 말 — 이것만 맞아서는 같은 서류라고 볼 수 없다 */
const GENERIC = new Set([
  '자료', '서류', '사본', '원본', '파일', '내역', '관련', '기타', '목록',
  '증명', '확인', '첨부', '제출', '기록', '통보', '기준', '필수',
])

/**
 * 같은 뜻으로 쓰는 말 묶음.
 *
 * 앞의 것이 체크리스트에 쓰는 말이고, 뒤는 사용자가 파일 이름에 쓸 법한 말이다.
 * 한 줄 안의 말끼리는 서로 같은 것으로 본다.
 */
const SYNONYMS = [
  ['카톡', '카카오톡', '카카오', '카톡방', '톡방', 'kakaotalk', 'kakao'],
  ['문자', '메시지', '메세지', '문자메시지', 'sms', 'mms'],
  ['대화', '대화내용', '채팅', '톡내용', '메신저', '대화캡처'],
  ['녹취록', '녹취', '녹음', '녹취서', '통화녹음'],
  ['차용증', '금전소비대차', '금전소비대차계약서', '차용', '대여계약서', '빌린증서'],
  ['계좌이체', '이체', '입금', '송금', '거래내역', '통장거래내역', '통장', '입출금', '이체확인증', '거래명세', '급여이체'],
  ['내용증명', '내용증명우편', '내용증명서'],
  ['지급명령', '지급명령결정문', '이행권고', '이행권고결정'],
  ['등기부등본', '등기사항증명서', '등기사항전부증명서', '등기부', '등기사항', '부동산등기'],
  ['임차권등기', '임차권등기명령'],
  ['전입세대열람', '전입세대', '전입세대열람원', '전입세대확인서'],
  ['확정일자', '확정일자부여현황'],
  ['주민등록초본', '초본'],
  ['주민등록등본', '등본'],
  ['법인등기부등본', '법인등기', '법인등기사항증명서'],
  ['가족관계증명서', '가족관계'],
  ['임대차계약서', '전월세계약서', '임대차계약', '월세계약서', '전세계약서'],
  ['근로계약서', '고용계약서', '근로계약'],
  ['급여명세서', '급여명세', '월급명세서', '임금대장', '급여대장', '월급내역'],
  ['출퇴근기록', '출퇴근', '근태', '근태기록', '출근부', '타임카드'],
  ['체불금품확인원', '체불확인원', '체불금품'],
  ['진단서', '소견서', '의사소견서', '상해진단서'],
  ['영수증', '견적서', '치료비', '수리비', '지출증빙', '계산서'],
  ['사고사실확인원', '교통사고사실확인원', '사고사실'],
  ['사진', '이미지', '캡처', '스크린샷', '캡쳐', '현장사진', '영상', '동영상', '블랙박스'],
  ['소득금액증명', '소득증명', '소득자료'],
  ['세금계산서', '거래명세서', '세금계산'],
  ['소가계산서', '소가산정', '소가'],
  ['위임장', '대리인위임장'],
  ['건축물대장', '건축물'],
  ['판결정본', '판결문', '집행력있는판결정본'],
  ['송달증명원', '송달증명'],
  ['확정증명원', '확정증명'],
  ['집행문', '집행력'],
  ['공탁보증보험증권', '공탁보증', '보증보험증권', '지급보증위탁계약'],
  ['진술서', '가압류신청진술서'],
  ['보증금', '전세금', '임차보증금'],
  ['차임', '월세', '임대료', '월차임'],
  ['이사확인서', '이사', '검침', '검침내역'],
  ['건강보험료', '건강보험'],
  ['기초생활수급', '수급자'],
  ['한부모가족', '한부모'],
  ['지방세', '과세증명', '재산세'],
]

/** 말 → 그 말이 속한 묶음 번호 */
const GROUP_OF = new Map()
SYNONYMS.forEach((group, index) => group.forEach((word) => GROUP_OF.set(normalize(word), index)))

/** 항목 이름을 뜻 단위로 쪼갠다 — 「문자·카톡 대화」 → ['문자','카톡','대화'] */
function tokensOf(label) {
  return String(label || '')
    .normalize('NFC')
    .split(/[·・/,()[\]{}]|\s+|및|또는/)
    .map(normalize)
    .filter((t) => t.length >= 2)
}

/**
 * 그 말과 같은 뜻으로 쓰는 말들 (자기 자신 포함).
 *
 * 정확히 같은 말이 없으면, 그 말 안에 들어 있는 말로도 찾는다 —
 * 「전입세대열람내역」은 한 덩어리로 붙어 있어서 「전입세대열람」 묶음을 그냥은 못 찾는다.
 */
const wordsLike = (token) => {
  let group = GROUP_OF.get(token)
  if (group === undefined) {
    for (const [word, index] of GROUP_OF) {
      if (word.length >= 3 && token.includes(word)) { group = index; break }
    }
  }
  return group === undefined ? [token] : [token, ...SYNONYMS[group].map(normalize)]
}

/**
 * 체크한 항목과 파일 이름이 같은 서류를 가리키는가.
 *
 * @param {string} item  체크리스트 항목 (예: '문자·카톡 대화')
 * @param {string} name  파일에 붙인 이름 (예: '카카오톡 대화내역')
 */
export function sameDocument(item, name) {
  const a = normalize(item)
  const b = normalize(name)
  if (!a || !b) return false
  // 한쪽이 다른 쪽을 통째로 품고 있으면 볼 것도 없다
  if (a.includes(b) || b.includes(a)) return true

  const tokens = tokensOf(item)
  if (!tokens.length) return false
  // 「내역」·「자료」처럼 어느 서류에나 붙는 말만 맞는 것은 근거로 치지 않는다.
  // 그런 말뿐인 항목이라면 어쩔 수 없이 그것으로 본다.
  const meaningful = tokens.filter((t) => !GENERIC.has(t))
  const useful = meaningful.length ? meaningful : tokens
  return useful.some((token) => wordsLike(token).some((word) => b.includes(word)))
}

/** 체크했지만 아직 파일이 안 올라온 항목들 */
export function missingItems(checked = [], files = []) {
  const names = files.map((f) => (typeof f === 'string' ? f : f?.name)).filter(Boolean)
  return checked.filter((item) => !names.some((name) => sameDocument(item, name)))
}

/** 체크 목록에 없어서 파일로만 올라온 이름들 */
export function extraFileNames(checked = [], files = []) {
  const names = files.map((f) => (typeof f === 'string' ? f : f?.name)).filter(Boolean)
  return names.filter((name) => !checked.some((item) => sameDocument(item, name)))
}
