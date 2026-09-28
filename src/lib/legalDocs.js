// 템플릿 보기 · 워드 양식의 원본 데이터.
//
// 한 벌의 데이터로 세 가지를 만든다.
//   - 화면: TemplateViewer 가 A4 종이 모양으로 그린다 (글자는 그대로 선택·복사된다)
//   - 워드: scripts/gen-legal-docs.mjs 가 `예시/서류/*.docx` 로 굽는다
//   - PDF : 같은 스크립트가 파서 시험용 `예시/서류/*.pdf` 로 굽는다
// 그래서 이 파일은 브라우저 전용 API(import.meta 등)를 쓰지 않는다 — Node 에서도 읽힌다.
//
// 당사자는 원고 홍길동 · 피고 김철수로 통일했다. 주민등록번호와 전화번호는
// 실제로 발급될 수 없는 값(생년월일 자리 123456 · 654321, 010-1234-5678 · 010-1111-1111)이고
// 주소는 ○○로 비워 두었다. 사건번호는 데모 사건(src/data/mock.js)과 맞췄다.
//
// 블록 종류
//   title   문서 제목 (가운데, 자간 넓게)
//   parties 당사자 표시 — rows: [{ label, lines }]
//   center  가운데 한 줄 (사건명 등)
//   kv      항목·값 표 — rows: [[항목, 값]], indent
//   h       절 제목 (청 구 취 지 등)
//   p       문단 — n: 번호, lv: 들여쓰기 단계(0·1·2)
//   list    번호 없는 2단 목록 (입증방법·첨부서류) — rows: [[왼쪽, 오른쪽]]
//   table   표 — cols: [{ label, w }] (w 는 비율), rows
//   note    ※ 작은 글씨
//   sign    날짜 + 서명 (오른쪽)
//   court   제출 법원 (마지막 줄)
//   gap     빈 줄

export const PLAINTIFF = {
  name: '홍길동',
  rrn: '123456-1234567',
  addr: '서울특별시 ○○구 ○○로 12, 3층',
  tel: '010-1234-5678',
  email: 'hong@example.com',
}

export const DEFENDANT = {
  name: '김철수',
  rrn: '654321-1234567',
  addr: '서울특별시 ○○구 ○○로 67, 202호',
  tel: '010-1111-1111',
}

const LEASE_ADDR = '서울특별시 ○○구 ○○로 45, 201호'
const ACCOUNT = '○○은행 000-000-000000 (예금주 홍길동)'

/** '홍길동' → '홍 길 동' */
export const spaced = (s) => [...s].join(' ')

const plaintiffRow = (label = '원고', { rrn = true, email = false } = {}) => ({
  label,
  lines: [
    `${spaced(PLAINTIFF.name)}${rrn ? ` (${PLAINTIFF.rrn})` : ''}`,
    PLAINTIFF.addr,
    `전화 ${PLAINTIFF.tel}${email ? `   전자우편 ${PLAINTIFF.email}` : ''}`,
  ],
})

const defendantRow = (label = '피고', { rrn = true } = {}) => ({
  label,
  lines: [
    `${spaced(DEFENDANT.name)}${rrn ? ` (${DEFENDANT.rrn})` : ''}`,
    DEFENDANT.addr,
    `전화 ${DEFENDANT.tel}`,
  ],
})

/** 이미 소송이 걸린 뒤 내는 서면의 머리 — 사건번호와 당사자 이름만 */
const caseHead = (caseNo, caseName) => ({
  t: 'parties',
  rows: [
    { label: '사건', lines: [`${caseNo}  ${caseName}`] },
    { label: '원고', lines: [spaced(PLAINTIFF.name)] },
    { label: '피고', lines: [spaced(DEFENDANT.name)] },
  ],
})

const sign = (date, role = '원고', name = PLAINTIFF.name) => ({
  t: 'sign',
  date,
  line: `위 ${role}   ${spaced(name)}   (서명 또는 날인)`,
})

const standardAttachments = (extra = []) => ({
  t: 'list',
  rows: [
    ['1. 위 입증방법', '각 1통'],
    ...extra,
    ['1. 소장 부본', '1통'],
    ['1. 송달료납부서', '1통'],
  ],
})

const GANG = (n) => `갑 제${n}호증`

export const LEGAL_DOCS = [
  // ───────────────────────────── 소장 ─────────────────────────────
  {
    key: 'complaint-deposit',
    group: '소장',
    name: '임대차보증금 반환',
    desc: '임대차가 끝나고 집을 비워 줬는데 보증금을 돌려받지 못한 경우',
    file: '01-소장_임대차보증금반환',
    blocks: [
      { t: 'title', text: '소장' },
      { t: 'parties', rows: [plaintiffRow('원고', { email: true }), defendantRow()] },
      { t: 'gap' },
      { t: 'center', text: '임대차보증금반환 청구의 소' },
      { t: 'kv', rows: [['소송목적의 값', '10,000,000원'], ['첩부할 인지액', '50,000원'], ['송달료', '156,000원']] },
      { t: 'h', text: '청구취지' },
      { t: 'p', n: '1.', text: '피고는 원고에게 10,000,000원 및 이에 대하여 2026. 1. 4.부터 이 사건 소장 부본 송달일까지는 연 5%, 그 다음 날부터 다 갚는 날까지는 연 12%의 각 비율로 계산한 돈을 지급하라.' },
      { t: 'p', n: '2.', text: '소송비용은 피고가 부담한다.' },
      { t: 'p', n: '3.', text: '제1항은 가집행할 수 있다.' },
      { t: 'p', text: '라는 판결을 구합니다.' },
      { t: 'h', text: '청구원인' },
      { t: 'p', n: '1.', text: '임대차계약의 체결' },
      { t: 'p', lv: 1, text: `원고는 2024. 1. 1. 피고로부터 ${LEASE_ADDR}(이하 ‘이 사건 주택’)을 임대차보증금 10,000,000원, 월 차임 500,000원, 임대차기간 2024. 1. 1.부터 2026. 1. 1.까지로 정하여 임차하였고(갑 제1호증), 같은 날 피고에게 보증금 10,000,000원을 모두 지급하였습니다(갑 제2호증).` },
      { t: 'p', n: '2.', text: '임대차의 종료와 주택의 인도' },
      { t: 'p', lv: 1, text: '원고는 임대차기간 만료 2개월 전인 2025. 10. 20. 피고에게 계약을 갱신하지 않겠다는 뜻을 문자메시지로 통지하였으므로 이 사건 임대차계약은 2026. 1. 1. 기간 만료로 종료되었습니다. 원고는 2026. 1. 3. 이 사건 주택을 피고에게 인도하고 현관 비밀번호를 알려 주었습니다(갑 제4호증).' },
      { t: 'p', n: '3.', text: '피고의 반환 거부' },
      { t: 'p', lv: 1, text: '그런데 피고는 도배·장판 교체비 1,200,000원을 공제하겠다는 말만 되풀이하며 현재까지 보증금을 한 푼도 돌려주지 않고 있습니다. 원고는 2026. 1. 20. 임차권등기를 마쳤고(갑 제3호증), 2026. 2. 2. 내용증명으로 반환을 최고하였으나 피고는 이를 받고도 답하지 않았습니다(갑 제5호증).' },
      { t: 'p', n: '4.', text: '결론' },
      { t: 'p', lv: 1, text: '따라서 피고는 원고에게 보증금 10,000,000원 및 주택을 인도받은 다음 날인 2026. 1. 4.부터 이 사건 소장 부본 송달일까지는 민법이 정한 연 5%, 그 다음 날부터 다 갚는 날까지는 소송촉진 등에 관한 특례법이 정한 연 12%의 각 비율로 계산한 지연손해금을 지급할 의무가 있으므로, 원고는 청구취지와 같은 판결을 구합니다.' },
      { t: 'h', text: '입증방법' },
      { t: 'list', rows: [[`1. ${GANG(1)}`, '임대차계약서'], [`1. ${GANG(2)}`, '보증금 입금확인증'], [`1. ${GANG(3)}`, '등기사항전부증명서(임차권등기)'], [`1. ${GANG(4)}`, '문자메시지 내역'], [`1. ${GANG(5)}`, '내용증명 및 배달증명서']] },
      { t: 'h', text: '첨부서류' },
      standardAttachments(),
      sign('2026. 2. 14.'),
      { t: 'court', text: '서울중앙지방법원 귀중' },
    ],
  },
  {
    key: 'complaint-loan',
    group: '소장',
    name: '대여금 (소액)',
    desc: '빌려준 돈 중 일부만 돌려받고 나머지를 청구하는 3,000만원 이하 사건',
    file: '02-소장_대여금(소액)',
    blocks: [
      { t: 'title', text: '소장' },
      { t: 'parties', rows: [plaintiffRow(), defendantRow()] },
      { t: 'gap' },
      { t: 'center', text: '대여금 청구의 소' },
      { t: 'kv', rows: [['소송목적의 값', '4,000,000원'], ['첩부할 인지액', '20,000원'], ['송달료', '104,000원']] },
      { t: 'h', text: '청구취지' },
      { t: 'p', n: '1.', text: '피고는 원고에게 4,000,000원 및 이에 대하여 2024. 2. 11.부터 이 사건 소장 부본 송달일까지는 연 5%, 그 다음 날부터 다 갚는 날까지는 연 12%의 각 비율로 계산한 돈을 지급하라.' },
      { t: 'p', n: '2.', text: '소송비용은 피고가 부담한다.' },
      { t: 'p', n: '3.', text: '제1항은 가집행할 수 있다.' },
      { t: 'p', text: '라는 판결을 구합니다.' },
      { t: 'h', text: '청구원인' },
      { t: 'p', n: '1.', text: '원고는 2023. 8. 10. 피고에게 5,000,000원을 변제기 2024. 2. 10., 이자는 정하지 않고 빌려주었으며, 같은 날 피고 명의 계좌로 이체하였습니다(갑 제1호증 차용증, 갑 제2호증 이체확인증).' },
      { t: 'p', n: '2.', text: '피고는 변제기가 지난 2024. 6. 20. 1,000,000원을 갚았을 뿐(갑 제3호증), 원고가 여러 차례 문자메시지로 독촉하였음에도 나머지 4,000,000원을 갚지 않고 있습니다.' },
      { t: 'p', n: '3.', text: '따라서 피고는 원고에게 남은 대여금 4,000,000원 및 이에 대하여 변제기 다음 날인 2024. 2. 11.부터 이 사건 소장 부본 송달일까지는 민법이 정한 연 5%, 그 다음 날부터 다 갚는 날까지는 소송촉진 등에 관한 특례법이 정한 연 12%의 각 비율로 계산한 지연손해금을 지급할 의무가 있습니다.' },
      { t: 'note', text: '※ 위 일부 변제금 1,000,000원은 원금에 먼저 충당하여 청구금액에서 뺐습니다. 소송목적의 값이 3,000만원 이하이므로 소액사건심판법이 적용됩니다.' },
      { t: 'h', text: '입증방법' },
      { t: 'list', rows: [[`1. ${GANG(1)}`, '차용증'], [`1. ${GANG(2)}`, '계좌이체 확인증'], [`1. ${GANG(3)}`, '일부 변제 입금내역']] },
      { t: 'h', text: '첨부서류' },
      standardAttachments(),
      sign('2026. 7. 14.'),
      { t: 'court', text: '서울동부지방법원 귀중' },
    ],
  },
  {
    key: 'complaint-tort',
    group: '소장',
    name: '손해배상(자)',
    desc: '교통사고로 다친 뒤 치료비·일실수입·위자료를 나눠 청구하는 경우',
    file: '03-소장_손해배상(자)',
    blocks: [
      { t: 'title', text: '소장' },
      { t: 'parties', rows: [plaintiffRow(), defendantRow()] },
      { t: 'gap' },
      { t: 'center', text: '손해배상(자) 청구의 소' },
      { t: 'kv', rows: [['소송목적의 값', '18,600,000원'], ['첩부할 인지액', '88,700원'], ['송달료', '156,000원']] },
      { t: 'h', text: '청구취지' },
      { t: 'p', n: '1.', text: '피고는 원고에게 18,600,000원 및 이에 대하여 2025. 9. 12.부터 이 사건 소장 부본 송달일까지는 연 5%, 그 다음 날부터 다 갚는 날까지는 연 12%의 각 비율로 계산한 돈을 지급하라.' },
      { t: 'p', n: '2.', text: '소송비용은 피고가 부담한다.' },
      { t: 'p', n: '3.', text: '제1항은 가집행할 수 있다.' },
      { t: 'p', text: '라는 판결을 구합니다.' },
      { t: 'h', text: '청구원인' },
      { t: 'p', n: '1.', text: '사고의 발생' },
      { t: 'p', lv: 1, text: '피고는 2025. 9. 12. 14:20경 서울특별시 ○○구 ○○교차로에서 자기 소유 승용차를 운전하던 중 중앙선을 넘어, 반대 방향에서 정상 진행하던 원고 운전 차량의 왼쪽 옆면을 들이받았습니다(갑 제1호증, 갑 제4호증).' },
      { t: 'p', n: '2.', text: '피고의 책임' },
      { t: 'p', lv: 1, text: '이 사고는 피고의 중앙선 침범이라는 일방적 과실로 일어났으므로, 피고는 민법 제750조 및 자동차손해배상 보장법 제3조에 따라 원고가 입은 손해를 배상할 책임이 있습니다.' },
      { t: 'p', n: '3.', text: '손해의 범위' },
      { t: 'kv', indent: 1, rows: [['가. 치료비(적극손해)', '4,120,000원'], ['나. 일실수입(소극손해)', '9,480,000원'], ['다. 위자료', '5,000,000원'], ['합계', '18,600,000원']] },
      { t: 'p', lv: 1, text: '원고는 이 사고로 목뼈 염좌 등으로 12주 치료를 받았고(갑 제2호증, 갑 제3호증), 그동안 일하지 못해 위 금액 상당의 수입을 잃었습니다(갑 제5호증).' },
      { t: 'p', n: '4.', text: '결론' },
      { t: 'p', lv: 1, text: '피고 측 보험회사는 7,200,000원을 제시하였으나 실제 손해에 크게 못 미쳐 협의가 결렬되었으므로, 원고는 청구취지와 같은 판결을 구합니다.' },
      { t: 'h', text: '입증방법' },
      { t: 'list', rows: [[`1. ${GANG(1)}`, '교통사고사실확인원'], [`1. ${GANG(2)}`, '진단서'], [`1. ${GANG(3)}`, '치료비 영수증'], [`1. ${GANG(4)}`, '블랙박스 영상 캡처'], [`1. ${GANG(5)}`, '급여명세서 및 휴업 확인서']] },
      { t: 'h', text: '첨부서류' },
      standardAttachments(),
      sign('2026. 6. 21.'),
      { t: 'court', text: '서울북부지방법원 귀중' },
    ],
  },
  {
    key: 'complaint-wage',
    group: '소장',
    name: '임금 (임금체불)',
    desc: '퇴사 뒤 마지막 두 달 월급과 연장근로수당을 받지 못한 경우',
    file: '04-소장_임금(임금체불)',
    blocks: [
      { t: 'title', text: '소장' },
      { t: 'parties', rows: [plaintiffRow(), { label: '피고', lines: [`${spaced(DEFENDANT.name)} (${DEFENDANT.rrn})`, '상호 ○○물류', DEFENDANT.addr, `전화 ${DEFENDANT.tel}`] }] },
      { t: 'gap' },
      { t: 'center', text: '임금 청구의 소' },
      { t: 'kv', rows: [['소송목적의 값', '7,400,000원'], ['첩부할 인지액', '37,000원'], ['송달료', '104,000원']] },
      { t: 'h', text: '청구취지' },
      { t: 'p', n: '1.', text: '피고는 원고에게 7,400,000원 및 이에 대하여 2026. 7. 15.부터 다 갚는 날까지 연 20%의 비율로 계산한 돈을 지급하라.' },
      { t: 'p', n: '2.', text: '소송비용은 피고가 부담한다.' },
      { t: 'p', n: '3.', text: '제1항은 가집행할 수 있다.' },
      { t: 'p', text: '라는 판결을 구합니다.' },
      { t: 'h', text: '청구원인' },
      { t: 'p', n: '1.', text: '근로관계' },
      { t: 'p', lv: 1, text: '원고는 2023. 3. 6.부터 2026. 6. 30.까지 피고가 운영하는 ○○물류에서 배차 담당 직원으로 근무하였고, 월 급여는 3,100,000원, 급여일은 매월 25일이었습니다(갑 제1호증).' },
      { t: 'p', n: '2.', text: '체불 임금' },
      { t: 'kv', indent: 1, rows: [['가. 2026년 5월분 급여', '3,100,000원'], ['나. 2026년 6월분 급여', '3,100,000원'], ['다. 2026년 4~6월 연장근로수당', '1,200,000원'], ['합계', '7,400,000원']] },
      { t: 'p', lv: 1, text: '피고는 2026. 5.분부터 급여를 주지 않았고(갑 제2호증), 원고는 피고의 지시에 따라 주 평균 4시간씩 연장근로를 하였으나 그 수당도 받지 못하였습니다(갑 제4호증). 관할 지방고용노동관서도 위 금액의 체불 사실을 확인하였습니다(갑 제3호증).' },
      { t: 'p', n: '3.', text: '지연이자' },
      { t: 'p', lv: 1, text: '근로기준법 제36조, 제37조 및 같은 법 시행령 제17조에 따라, 피고는 원고가 퇴직한 날부터 14일이 지난 다음 날인 2026. 7. 15.부터 다 갚는 날까지 연 20%의 비율로 계산한 지연이자를 지급할 의무가 있습니다.' },
      { t: 'p', n: '4.', text: '결론' },
      { t: 'p', lv: 1, text: '따라서 원고는 청구취지와 같은 판결을 구합니다.' },
      { t: 'h', text: '입증방법' },
      { t: 'list', rows: [[`1. ${GANG(1)}`, '근로계약서'], [`1. ${GANG(2)}`, '급여이체 내역'], [`1. ${GANG(3)}`, '체불임금등·사업주 확인서'], [`1. ${GANG(4)}`, '사내메신저 업무지시 내역']] },
      { t: 'h', text: '첨부서류' },
      standardAttachments(),
      sign('2026. 8. 3.'),
      { t: 'court', text: '서울남부지방법원 귀중' },
    ],
  },
  {
    key: 'complaint-evict',
    group: '소장',
    name: '건물명도',
    desc: '상가 임차인이 차임을 3기 이상 밀려 계약을 해지하고 건물을 돌려받는 경우',
    file: '05-소장_건물명도',
    blocks: [
      { t: 'title', text: '소장' },
      { t: 'parties', rows: [plaintiffRow(), defendantRow()] },
      { t: 'gap' },
      { t: 'center', text: '건물명도 등 청구의 소' },
      { t: 'kv', rows: [['소송목적의 값', '50,500,000원'], ['첩부할 인지액', '232,200원'], ['송달료', '156,000원']] },
      { t: 'h', text: '청구취지' },
      { t: 'p', n: '1.', text: '피고는 원고에게 별지 목록 기재 건물을 인도하라.' },
      { t: 'p', n: '2.', text: '피고는 원고에게 10,500,000원 및 2025. 11. 4.부터 위 건물의 인도 완료일까지 월 1,500,000원의 비율로 계산한 돈을 지급하라.' },
      { t: 'p', n: '3.', text: '소송비용은 피고가 부담한다.' },
      { t: 'p', n: '4.', text: '제1항, 제2항은 가집행할 수 있다.' },
      { t: 'p', text: '라는 판결을 구합니다.' },
      { t: 'h', text: '청구원인' },
      { t: 'p', n: '1.', text: '임대차계약의 체결' },
      { t: 'p', lv: 1, text: '원고는 별지 목록 기재 건물(이하 ‘이 사건 점포’)의 소유자로서(갑 제4호증), 2023. 4. 1. 피고에게 이 사건 점포를 보증금 20,000,000원, 월 차임 1,500,000원(매월 1일 지급), 기간 2023. 4. 1.부터 2025. 3. 31.까지로 정하여 임대하였고, 계약은 이후 묵시적으로 갱신되었습니다(갑 제1호증).' },
      { t: 'p', n: '2.', text: '차임 연체와 계약 해지' },
      { t: 'p', lv: 1, text: '피고는 2025. 4.분부터 2025. 10.분까지 7기분 차임 합계 10,500,000원을 내지 않았습니다(갑 제2호증). 이에 원고는 상가건물 임대차보호법 제10조의8에 따라 2025. 11. 1. 내용증명으로 계약 해지를 통고하였고, 이 통고는 2025. 11. 3. 피고에게 도달하였습니다(갑 제3호증).' },
      { t: 'p', n: '3.', text: '결론' },
      { t: 'p', lv: 1, text: '따라서 이 사건 임대차계약은 2025. 11. 3. 해지로 종료되었으므로, 피고는 원고에게 이 사건 점포를 인도하고, 연체 차임 10,500,000원 및 해지 다음 날인 2025. 11. 4.부터 점포 인도 완료일까지 차임 상당 부당이득으로 월 1,500,000원의 비율로 계산한 돈을 지급할 의무가 있습니다.' },
      { t: 'note', text: '※ 건물 인도 부분의 소송목적의 값은 목적물 시가표준액 80,000,000원의 1/2인 40,000,000원이고, 여기에 금전 청구 10,500,000원을 더하였습니다. 보증금에서 공제할 금액은 인도 시 정산합니다.' },
      { t: 'h', text: '입증방법' },
      { t: 'list', rows: [[`1. ${GANG(1)}`, '상가건물 임대차계약서'], [`1. ${GANG(2)}`, '차임 입금내역'], [`1. ${GANG(3)}`, '계약해지 내용증명 및 배달증명서'], [`1. ${GANG(4)}`, '등기사항전부증명서(건물)']] },
      { t: 'h', text: '첨부서류' },
      standardAttachments([['1. 건축물대장', '1통'], ['1. 시가표준액 확인서', '1통']]),
      sign('2025. 11. 20.'),
      { t: 'court', text: '수원지방법원 귀중' },
      { t: 'h', text: '별지 목록', page: true },
      { t: 'p', text: '경기도 수원시 ○○구 ○○로 89' },
      { t: 'p', text: '철근콘크리트구조 슬래브지붕 4층 근린생활시설' },
      { t: 'p', text: '1층 101호  근린생활시설  58.2㎡.  끝.' },
    ],
  },

  // ──────────────────────────── 준비서면 ────────────────────────────
  {
    key: 'brief',
    group: '준비서면',
    name: '준비서면',
    desc: '피고 답변서의 공제 주장을 항목별로 반박하는 원고 준비서면',
    file: '06-준비서면_원상회복범위',
    blocks: [
      { t: 'title', text: '준비서면' },
      caseHead('2024가단123456', '임대차보증금'),
      { t: 'p', text: '위 사건에 관하여 원고는 다음과 같이 변론을 준비합니다.' },
      { t: 'h', text: '다음' },
      { t: 'p', n: '1.', text: '피고 주장의 요지' },
      { t: 'p', lv: 1, text: '피고는 2026. 6. 30.자 답변서에서, 원고가 이 사건 주택을 원상으로 회복하지 않아 도배·장판 교체비 1,200,000원이 들었으므로 이를 보증금에서 빼야 한다고 주장합니다.' },
      { t: 'p', n: '2.', text: '통상의 손모는 원상회복 범위에 포함되지 않습니다' },
      { t: 'p', n: '가.', lv: 1, text: '임차인의 원상회복의무는 임차인이 고의나 과실로 목적물을 훼손한 경우에 생기는 것이고, 통상의 방법으로 사용하면서 자연스럽게 생긴 손모까지 회복할 의무는 없습니다.' },
      { t: 'p', n: '나.', lv: 1, text: '통상 손모의 보수비용은 차임에 이미 반영되어 있다고 보는 것이 거래 관념에 맞으므로, 이를 다시 임차인에게 물리는 것은 이중 부담입니다.' },
      { t: 'p', n: '다.', lv: 1, text: '원고는 2년간 이 사건 주택에 거주하였고, 도배와 장판의 상태는 2년의 통상 거주로 생기는 정도를 넘지 않습니다.' },
      { t: 'p', n: '3.', text: '이 사건 도배·장판의 실제 상태' },
      { t: 'p', lv: 1, text: '원고가 인도 당시 찍은 사진(갑 제6호증)을 보면 벽지에는 가구 자리의 색 차이만 있을 뿐 찢김이나 오염이 없고, 장판도 눌린 자국 외에 파손된 곳이 없습니다. 피고가 낸 견적서(을 제1호증)는 집 전체를 새로 시공하는 것을 전제로 한 것이어서 원고의 사용과의 인과관계가 특정되지 않습니다.' },
      { t: 'p', n: '4.', text: '원상회복 특약도 없습니다' },
      { t: 'p', lv: 1, text: '임대차계약서(갑 제1호증)에는 도배·장판 교체를 임차인이 부담한다는 특약이 없습니다.' },
      { t: 'p', n: '5.', text: '결론' },
      { t: 'p', lv: 1, text: '따라서 피고의 공제 주장은 이유 없으므로, 피고는 원고에게 보증금 10,000,000원 전액을 반환하여야 합니다.' },
      { t: 'h', text: '입증방법' },
      { t: 'list', rows: [[`1. ${GANG(6)}`, '인도 당시 주택 사진'], [`1. ${GANG(7)}`, '입주 당시와 인도 당시 비교 사진']] },
      sign('2026. 8. 20.'),
      { t: 'court', text: '서울중앙지방법원 제12민사단독 귀중' },
    ],
  },

  // ──────────────────────────── 증거목록 ────────────────────────────
  {
    key: 'evidence',
    group: '증거목록',
    name: '증거목록 (갑호증)',
    desc: '서증번호·서증명·입증취지·작성자·작성일을 표로 정리한 원고 증거목록',
    file: '07-증거목록_갑제1호증부터제6호증',
    blocks: [
      { t: 'title', text: '증거목록' },
      caseHead('2024가단123456', '임대차보증금'),
      { t: 'center', text: '(원고 제출 서증)' },
      {
        t: 'table',
        cols: [{ label: '번호', w: 14 }, { label: '서증명', w: 20 }, { label: '입증취지', w: 36 }, { label: '작성자', w: 14 }, { label: '작성일', w: 16 }],
        rows: [
          [GANG(1), '임대차계약서', '보증금 1,000만원, 기간 2년의 주택 임대차계약을 맺은 사실', '원고·피고', '2024. 1. 1.'],
          [GANG(2), '보증금 입금확인증', '원고가 계약 당일 보증금 1,000만원을 지급한 사실', '○○은행', '2024. 1. 1.'],
          [GANG(3), '등기사항전부증명서', '원고가 임차권등기를 마쳐 대항력과 우선변제권을 유지하는 사실', '○○지방법원 등기국', '2026. 1. 20.'],
          [GANG(4), '문자메시지 내역', '갱신거절 통지와 피고가 공제를 이유로 반환을 미룬 사실', '원고·피고', '2025. 10.~2026. 1.'],
          [GANG(5), '내용증명 및 배달증명서', '원고가 반환을 최고하고 피고가 이를 받은 사실', '원고', '2026. 2. 2.'],
          [GANG(6), '인도 당시 주택 사진(4매)', '인도 당시 통상 손모를 넘는 훼손이 없었던 사실', '원고', '2026. 1. 3.'],
        ],
      },
      { t: 'note', text: '※ 모든 서증은 사본으로 제출하며, 원본은 원고가 보관하고 있어 필요하면 법정에 가져가겠습니다. 갑 제4호증 중 제3자의 전화번호는 가림 처리하였습니다.' },
      sign('2026. 8. 31.'),
      { t: 'court', text: '서울중앙지방법원 제12민사단독 귀중' },
    ],
  },

  // ──────────────────────────── 답변서 ────────────────────────────
  {
    key: 'answer',
    group: '답변서',
    name: '답변서 (피고)',
    desc: '인정하는 사실·다투는 사실·항변을 나눠 적은 피고 답변서',
    file: '08-답변서',
    blocks: [
      { t: 'title', text: '답변서' },
      {
        t: 'parties',
        rows: [
          { label: '사건', lines: ['2024가단123456  임대차보증금'] },
          { label: '원고', lines: [spaced(PLAINTIFF.name)] },
          { label: '피고', lines: [spaced(DEFENDANT.name), DEFENDANT.addr, `전화 ${DEFENDANT.tel}`] },
        ],
      },
      { t: 'p', text: '위 사건에 관하여 피고는 다음과 같이 답변합니다.' },
      { t: 'h', text: '청구취지에 대한 답변' },
      { t: 'p', n: '1.', text: '원고의 청구 중 8,800,000원을 초과하는 부분을 기각한다.' },
      { t: 'p', n: '2.', text: '소송비용은 원고가 부담한다.' },
      { t: 'p', text: '라는 판결을 구합니다.' },
      { t: 'h', text: '청구원인에 대한 답변' },
      { t: 'p', n: '1.', text: '인정하는 사실' },
      { t: 'p', lv: 1, text: '피고가 2024. 1. 1. 원고와 이 사건 주택에 관하여 보증금 10,000,000원의 임대차계약을 맺고 보증금을 받은 사실, 계약이 2026. 1. 1. 기간 만료로 끝나 원고가 2026. 1. 3. 주택을 인도한 사실은 인정합니다.' },
      { t: 'p', n: '2.', text: '다투는 사실' },
      { t: 'p', lv: 1, text: '피고가 이유 없이 반환을 미루었다는 주장은 부인합니다. 원고가 퇴거한 뒤 확인해 보니 거실과 작은방 벽지가 찢어지고 장판에 담뱃불 자국이 있어 전면 교체가 불가피하였고, 피고는 이 사정을 문자로 알리고 정산 후 반환하겠다고 하였습니다.' },
      { t: 'p', n: '3.', text: '공제 항변' },
      { t: 'p', lv: 1, text: '피고는 도배·장판 교체비 1,200,000원(을 제1호증, 을 제2호증)을 원고의 원상회복의무 불이행으로 인한 손해로서 보증금에서 공제합니다. 따라서 피고가 반환할 보증금은 8,800,000원입니다.' },
      { t: 'p', n: '4.', text: '결론' },
      { t: 'p', lv: 1, text: '원고의 청구는 8,800,000원을 넘는 범위에서 이유 없으므로 그 부분은 기각되어야 합니다.' },
      { t: 'h', text: '입증방법' },
      { t: 'list', rows: [['1. 을 제1호증', '도배·장판 시공 견적서'], ['1. 을 제2호증', '퇴거 직후 주택 사진']] },
      { t: 'h', text: '첨부서류' },
      { t: 'list', rows: [['1. 위 입증방법', '각 1통'], ['1. 답변서 부본', '1통']] },
      sign('2026. 6. 30.', '피고', DEFENDANT.name),
      { t: 'court', text: '서울중앙지방법원 제12민사단독 귀중' },
    ],
  },

  // ──────────────────────────── 신청서 ────────────────────────────
  {
    key: 'petition',
    group: '신청서',
    name: '기일변경신청서',
    desc: '정해진 변론기일에 나갈 수 없을 때 신청취지와 이유를 적는 신청서',
    file: '09-기일변경신청서',
    blocks: [
      { t: 'title', text: '기일변경신청서' },
      caseHead('2024가단123456', '임대차보증금'),
      { t: 'h', text: '신청취지' },
      { t: 'p', text: '이 사건에 관하여 2026. 8. 17. 14:00로 지정된 변론기일을 변경하여 주시기 바랍니다.' },
      { t: 'h', text: '신청이유' },
      { t: 'p', n: '1.', text: '이 사건의 변론기일이 2026. 8. 17. 14:00 제327호 법정으로 지정되었습니다.' },
      { t: 'p', n: '2.', text: '그런데 원고는 같은 날 오전부터 미리 예약된 수술 일정이 있어 위 기일에 출석할 수 없습니다(입원·수술 예정 확인서 첨부).' },
      { t: 'p', n: '3.', text: '원고는 소송을 지연시킬 뜻이 없으며, 2026. 8. 24. 이후에는 어느 날이든 출석할 수 있습니다.' },
      { t: 'p', n: '4.', text: '이에 민사소송법 제165조에 따라 기일 변경을 신청합니다.' },
      { t: 'h', text: '첨부서류' },
      { t: 'list', rows: [['1. 입원·수술 예정 확인서', '1통'], ['1. 신청서 부본', '1통']] },
      sign('2026. 8. 10.', '신청인(원고)'),
      { t: 'court', text: '서울중앙지방법원 제12민사단독 귀중' },
    ],
  },
  {
    key: 'correction',
    group: '신청서',
    name: '보정서',
    desc: '법원 보정명령의 항목마다 무엇을 어떻게 고쳤는지 답하는 서면',
    file: '10-보정서',
    blocks: [
      { t: 'title', text: '보정서' },
      caseHead('2024가소445566', '대여금'),
      { t: 'p', text: '위 사건에 관하여 원고는 2026. 8. 12.자 보정명령에 따라 다음과 같이 보정합니다.' },
      { t: 'h', text: '보정사항' },
      { t: 'p', n: '1.', text: '피고의 주소 보정 (보정명령 제1항)' },
      { t: 'p', lv: 1, text: '피고의 주소를 아래와 같이 보정하고, 주소변동 이력이 나온 피고의 주민등록초본을 첨부합니다. 아래 주소는 2026. 4. 3. 전입신고된 최종 주소입니다.' },
      { t: 'kv', indent: 1, rows: [['변경 전', '서울특별시 ○○구 ○○로 67, 202호'], ['변경 후', '서울특별시 ○○구 ○○로 89, 302호']] },
      { t: 'p', n: '2.', text: '청구금액과 지연손해금의 특정 (보정명령 제2항)' },
      { t: 'p', lv: 1, text: '청구취지 제1항을 “피고는 원고에게 4,000,000원 및 이에 대하여 2024. 2. 11.부터 이 사건 소장 부본 송달일까지는 연 5%, 그 다음 날부터 다 갚는 날까지는 연 12%의 각 비율로 계산한 돈을 지급하라.”로 정정합니다. 대여금 5,000,000원 중 2024. 6. 20. 변제받은 1,000,000원을 뺀 금액입니다.' },
      { t: 'p', n: '3.', text: '갑 제3호증의 보완 (보정명령 제3항)' },
      { t: 'p', lv: 1, text: '갑 제3호증(일부 변제 입금내역)은 입금자명이 가려진 화면 캡처였으므로, 금융기관이 발급한 거래내역서를 갑 제3호증의2로 추가 제출합니다.' },
      { t: 'h', text: '첨부서류' },
      { t: 'list', rows: [['1. 피고 주민등록초본', '1통'], ['1. 갑 제3호증의2 거래내역서', '1통'], ['1. 보정서 부본', '1통']] },
      sign('2026. 8. 24.'),
      { t: 'court', text: '서울동부지방법원 제3민사단독 귀중' },
    ],
  },

  // ─────────────────────────── 소 제기 전 ───────────────────────────
  {
    key: 'demand',
    group: '소 제기 전',
    name: '내용증명 (보증금 반환)',
    desc: '소송 전에 기한을 정해 보증금 반환을 요구하는 내용증명',
    file: '11-내용증명_보증금반환최고',
    blocks: [
      { t: 'title', text: '내용증명' },
      {
        t: 'parties',
        rows: [
          { label: '제목', lines: ['임대차보증금 반환 최고'] },
          { label: '발신인', lines: [spaced(PLAINTIFF.name), PLAINTIFF.addr, `전화 ${PLAINTIFF.tel}`] },
          { label: '수신인', lines: [spaced(DEFENDANT.name), DEFENDANT.addr, `전화 ${DEFENDANT.tel}`] },
        ],
      },
      { t: 'gap' },
      { t: 'p', n: '1.', text: '귀하의 건승을 기원합니다.' },
      { t: 'p', n: '2.', text: `본인은 2024. 1. 1. 귀하와 ${LEASE_ADDR}에 관하여 보증금 10,000,000원, 기간 2024. 1. 1.부터 2026. 1. 1.까지로 하는 주택 임대차계약을 맺고, 같은 날 보증금 전액을 지급하였습니다.` },
      { t: 'p', n: '3.', text: '위 계약은 2026. 1. 1. 기간 만료로 종료되었고, 본인은 2026. 1. 3. 주택을 귀하에게 인도하여 임차인으로서의 의무를 모두 마쳤습니다.' },
      { t: 'p', n: '4.', text: '그런데도 귀하는 도배·장판 교체비 1,200,000원을 공제하겠다는 말만 되풀이할 뿐 지금까지 보증금을 돌려주지 않고 있습니다. 통상의 사용으로 생긴 손모는 임차인의 원상회복 범위에 들어가지 않으며, 계약서에도 이를 임차인이 부담한다는 특약이 없습니다.' },
      { t: 'p', n: '5.', text: `이에 이 내용증명을 받은 날부터 14일 안에 보증금 10,000,000원 전액을 아래 계좌로 반환하여 주실 것을 최고합니다.` },
      { t: 'p', lv: 1, text: ACCOUNT },
      { t: 'p', n: '6.', text: '위 기한까지 반환되지 않으면 본인은 부득이 보증금반환청구의 소를 제기할 것이며, 그에 따른 지연손해금과 소송비용은 귀하가 부담하게 됨을 알려 드립니다.' },
      { t: 'sign', date: '2026. 2. 2.', line: `발신인   ${spaced(PLAINTIFF.name)}   (서명 또는 날인)` },
      { t: 'note', text: '※ 같은 내용 3통을 우체국에 내어 1통은 수신인에게 보내고, 1통은 우체국이, 1통은 발신인이 보관합니다. 배달증명을 함께 신청해 두면 도달 사실을 증명할 수 있습니다.' },
    ],
  },
]

export const LEGAL_DOC_GROUPS = [...new Set(LEGAL_DOCS.map((d) => d.group))]

/** 화면의 ‘본문 복사’와 같은 글 — 실제 서면처럼 줄을 맞춘 평문 */
export function toPlainText(doc) {
  const out = []
  const pad = (label) => {
    const chars = [...label]
    if (chars.length === 1) return chars[0].padEnd(8, ' ')
    const gaps = chars.length - 1
    const each = Math.max(1, Math.floor((8 - chars.length) / gaps))
    return chars.join(' '.repeat(each)).padEnd(8, ' ')
  }
  const indent = (lv = 0) => '   '.repeat(lv)
  for (const b of doc.blocks) {
    switch (b.t) {
      case 'title': out.push(spaced(b.text), ''); break
      case 'parties':
        for (const row of b.rows) {
          row.lines.forEach((line, i) => out.push(`${i === 0 ? pad(row.label) : ' '.repeat(8)}   ${line}`))
          if (row.lines.length > 1) out.push('')
        }
        out.push('')
        break
      case 'center': out.push(b.text, ''); break
      case 'kv': for (const [k, v] of b.rows) out.push(`${indent(b.indent)}${k}   ${v}`); out.push(''); break
      case 'h': out.push('', spaced(b.text), ''); break
      case 'p': out.push(`${indent(b.lv)}${b.n ? `${b.n} ` : ''}${b.text}`); break
      case 'list': for (const [l, r] of b.rows) out.push(`${l}   ${r}`); break
      case 'table':
        out.push(b.cols.map((c) => c.label).join(' | '))
        for (const r of b.rows) out.push(r.join(' | '))
        out.push('')
        break
      case 'note': out.push('', b.text); break
      case 'sign': out.push('', b.date, b.line); break
      case 'court': out.push('', b.text); break
      case 'gap': out.push(''); break
      default: break
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

// ─────────────────────────── HTML 렌더러 ───────────────────────────
// 화면(TemplateViewer)과 PDF 굽기(scripts/gen-legal-docs.mjs)가 같이 쓴다.
// 크기는 모두 em 이라서 바깥에서 font-size 하나로 종이 전체를 키우고 줄인다.

export const LEGAL_DOC_CSS = `
.ld { font-family: "Batang", "바탕", "AppleMyungjo", "Nanum Myeongjo", "Noto Serif KR", serif; line-height: 1.75; color: #111; word-break: keep-all; overflow-wrap: anywhere; }
.ld-title { margin: 0 0 1.8em; padding-left: .7em; text-align: center; font-size: 1.8em; font-weight: 700; letter-spacing: .7em; }
.ld-parties { display: grid; grid-template-columns: 4.6em 1fr; column-gap: 1.6em; row-gap: .8em; margin: 0 0 1em; }
.ld-label { display: flex; justify-content: space-between; }
.ld-center { margin: .4em 0 .6em; text-align: center; font-weight: 700; }
.ld-kv { display: grid; grid-template-columns: max-content max-content; column-gap: 3em; margin: .3em 0 .5em; }
.ld-kv .v { text-align: right; }
.ld-kv .sum { font-weight: 700; border-top: 1px solid #555; }
.ld-h { margin: 1.7em 0 .8em; padding-left: .5em; text-align: center; font-weight: 700; letter-spacing: .5em; }
.ld-p { margin: .2em 0; text-align: justify; }
.ld-p .n { display: inline-block; width: 1.8em; text-indent: 0; }
.ld-list { display: grid; grid-template-columns: 13em 1fr; margin: .1em 0; }
.ld-table { width: 100%; margin: 1em 0; border-collapse: collapse; font-size: .86em; line-height: 1.55; word-break: normal; }
.ld-table th, .ld-table td { padding: .4em .5em; border: 1px solid #333; vertical-align: top; text-align: left; }
.ld-table th { background: #f1f1f1; text-align: center; font-weight: 700; }
.ld-note { margin: 1em 0 0; font-size: .88em; color: #333; }
.ld-sign { margin-top: 2.6em; text-align: right; }
.ld-sign p { margin: 0 0 .9em; }
.ld-court { margin-top: 2.4em; font-size: 1.15em; font-weight: 700; }
.ld-gap { height: .6em; }
.ld-break { break-before: page; page-break-before: always; }
`

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const labelHtml = (label) => `<span class="ld-label">${[...label].map((c) => `<span>${esc(c)}</span>`).join('')}</span>`

/** 문단 들여쓰기: 단계마다 1.8em, 번호가 있으면 번호만 왼쪽으로 내어 쓴다 */
const pStyle = (b) => {
  const base = (b.lv || 0) * 1.8
  return b.n ? `padding-left:${base + 1.8}em;text-indent:-1.8em` : `padding-left:${base}em`
}

export function toHtml(doc) {
  const html = doc.blocks.map((b) => {
    switch (b.t) {
      case 'title': return `<h1 class="ld-title">${esc(b.text)}</h1>`
      case 'parties':
        return `<div class="ld-parties">${b.rows.map((r) => `${labelHtml(r.label)}<div>${r.lines.map(esc).join('<br>')}</div>`).join('')}</div>`
      case 'center': return `<p class="ld-center">${esc(b.text)}</p>`
      case 'kv':
        return `<div class="ld-kv" style="margin-left:${(b.indent || 0) * 1.8}em">${b.rows.map(([k, v]) => {
          const sum = k === '합계' ? ' sum' : ''
          return `<span class="${sum.trim()}">${esc(k)}</span><span class="v${sum}">${esc(v)}</span>`
        }).join('')}</div>`
      case 'h': return `<h2 class="ld-h${b.page ? ' ld-break' : ''}">${esc(b.text)}</h2>`
      case 'p': return `<p class="ld-p" style="${pStyle(b)}">${b.n ? `<span class="n">${esc(b.n)}</span>` : ''}${esc(b.text)}</p>`
      case 'list': return b.rows.map(([l, r]) => `<div class="ld-list"><span>${esc(l)}</span><span>${esc(r)}</span></div>`).join('')
      case 'table': {
        const total = b.cols.reduce((s, c) => s + c.w, 0)
        const head = b.cols.map((c) => `<th style="width:${(c.w / total * 100).toFixed(1)}%">${esc(c.label)}</th>`).join('')
        const body = b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')
        return `<table class="ld-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
      }
      case 'note': return `<p class="ld-note">${esc(b.text)}</p>`
      case 'sign': return `<div class="ld-sign"><p>${esc(b.date)}</p><p>${esc(b.line)}</p></div>`
      case 'court': return `<p class="ld-court">${esc(b.text)}</p>`
      case 'gap': return '<div class="ld-gap"></div>'
      default: return ''
    }
  }).join('\n')
  return `<article class="ld">${html}</article>`
}
