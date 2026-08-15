// 데모용 mock 데이터 (실서비스라면 API 응답으로 대체)
//
// 단계별 확인용 사건은 절차 안내와 같은 표(procedureGuide)를 보고 만든다.
//
// 날짜는 고정값이 아니라 "오늘 기준 상대일"로 만든다.
// 고정해 두면 시연할 때마다 D-day가 어긋나고, 지난 날짜에 "D-3"이 붙는 꼴이 난다.

import { stageGuide } from '../lib/procedureGuide.js'

/** 오늘로부터 n일 뒤의 날짜 (YYYY-MM-DD) */
export function dayOffset(n) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 날짜 → D-day 문자열. 지난 날짜는 D+n으로 표시해 "지났다"가 드러나게 한다 */
export function ddayOf(date) {
  const t = new Date(); t.setHours(0, 0, 0, 0)
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  const diff = Math.round((d - t) / 86400000)
  return diff === 0 ? 'D-day' : diff > 0 ? `D-${diff}` : `D+${-diff}`
}

/** 2026. 7. 1.(수) 처럼 — 요일을 직접 적으면 틀린다 */
export function dateLabel(date) {
  const d = new Date(date)
  const w = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${w})`
}

const HEARING = dayOffset(3)      // 제1회 변론기일
const BRIEF_DUE = dayOffset(6)    // 준비서면 제출 기한
const EVID_DUE = dayOffset(17)    // 증거목록 제출 기한

export const CASE_NO = '2024가단123456'

export const activeCase = {
  id: CASE_NO,
  title: '임대차 보증금 반환 청구',
  court: '서울중앙지방법원',
  type: '민사',
  nextHearing: HEARING,
  progress: 60,
}

export const stats = [
  { key: 'cases', label: '진행 중인 사건', value: '2건', sub: '1건 기일 임박', tone: 'blue' },
  { key: 'hearing', label: '다음 변론기일', value: ddayOf(HEARING), sub: dateLabel(HEARING), tone: 'amber' },
  { key: 'docs', label: '생성한 문서', value: '7', sub: '2개 제출 완료', tone: 'green' },
  { key: 'evidence', label: '등록된 증거', value: '14', sub: '갑호증 9개', tone: 'purple' },
]

export const aiSuggestion = {
  badge: '긴급',
  title: `준비서면 제출 ${ddayOf(BRIEF_DUE)}`,
  desc: '지금 바로 작성하세요!',
  meta: `서울중앙지방법원 ${CASE_NO} · ${dateLabel(BRIEF_DUE)} 오전 10시까지 제출`,
  chips: ['준비서면 작성 권장', '증거 보완 권장', '답변서 제출 권장'],
}

export const upcoming = [
  { date: HEARING, dday: ddayOf(HEARING), title: '제1회 변론기일', case: '임대차 보증금 반환 청구', tone: 'red' },
  { date: BRIEF_DUE, dday: ddayOf(BRIEF_DUE), title: '준비서면 제출 기한', case: '임대차 보증금 반환 청구', tone: 'amber' },
  { date: EVID_DUE, dday: ddayOf(EVID_DUE), title: '증거목록 제출 기한', case: '임금체불 청구', tone: 'blue' },
]

export const dashboardSchedule = [
  { date: dayOffset(-11), title: '소장 제출 기한', done: true },
  { date: dayOffset(-10), title: '증거 자료 정리', done: true },
  { date: dayOffset(0), title: '준비 서면 작성', done: false, highlight: true },
]

// 최근 활동은 '지난 일'이므로 D+n으로 표시한다
export const recentActivity = [
  { title: '소송비용 산출서 확인 완료', dday: ddayOf(dayOffset(-2)), desc: '인지대 등 비용 산출 완료' },
  { title: '증거 목록서 작성 완료', dday: ddayOf(dayOffset(-7)), desc: '주요 증거 정리 완료' },
  { title: '준비서면 제출 기한 안내', dday: ddayOf(dayOffset(-7)), desc: '변론 전 필수 서류 안내' },
]

export const helpContents = [
  { title: '준비서면 작성 방법', type: '동영상' },
  { title: '소송 진행 절차', type: '가이드' },
  { title: '소장', type: '템플릿' },
  { title: '기일변경신청서', type: '템플릿' },
]

export const popularFaq = [
  {
    q: '재판 준비서면 작성 방법은?', views: 512,
    a: '사건번호와 당사자를 적고, 상대방 주장 요지 → 쟁점별 내 주장과 이유 → 이를 뒷받침하는 증거 순서로 정리하세요. 준비서면에서 인용한 증거자료는 함께 제출해야 합니다.',
    note: '새로운 주장을 담았다면 상대방에게 송달될 시간을 고려해 변론기일 7일 전까지 제출하는 것이 원칙입니다.',
    to: '/app/documents', cta: '준비서면 작성하기',
    source: 'https://www.scourt.go.kr/nm/min_1/min_1_2/min_1_2_5/min_1251/index.html',
  },
  {
    q: '답변서를 추가로 제출하려면?', views: 324,
    a: '이미 답변서를 냈더라도 주장이나 증거를 보완할 내용이 있으면 준비서면으로 추가 제출할 수 있습니다. 기존 답변을 반복하기보다 새 쟁점, 반박 내용, 증거와의 관계를 분명히 적으세요.',
    note: '법원이 정한 제출기한이 있다면 그 기한을 우선 확인하고, 전자소송 사건은 전자소송포털의 서류제출 메뉴에서 제출합니다.',
    to: '/app/documents', cta: '추가 서면 준비하기',
    source: 'https://ecfs.scourt.go.kr/',
  },
  {
    q: '증거 제출은 왜 중요할까요?', views: 289,
    a: '민사소송에서는 당사자가 자신의 주장이나 상대방에 대한 항변을 증명할 자료를 내야 합니다. 계약서·송금내역·대화기록처럼 각 자료가 어떤 사실을 증명하는지 입증취지를 함께 적어야 재판부가 쟁점과 연결해 볼 수 있습니다.',
    note: '증거는 가능하면 변론준비기일이 끝나기 전에 정리해 제출하고, 원본 보관 여부도 확인하세요.',
    to: '/app/evidence', cta: '증빙자료 정리하기',
    source: 'https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=5&cciNo=3&cnpClsNo=3&csmSeq=568&menuType=cnpcls&popMenu=ov',
  },
  {
    q: '준비서면 작성 시 주의할 점은?', views: 156,
    a: '감정적인 표현과 같은 내용의 반복을 줄이고, 쟁점마다 결론·이유·증거를 묶어 짧게 쓰세요. 소장이나 앞서 낸 준비서면과 중복되는 내용은 불필요하게 반복하지 않는 것이 원칙입니다.',
    note: '구체적인 사실과 날짜, 금액, 증거번호가 서로 일치하는지 제출 전에 다시 확인하세요.',
    to: '/app/documents', cta: '작성 중 문서 점검하기',
    source: 'https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=5&cciNo=3&cnpClsNo=2&csmSeq=568',
  },
]

export const notifications = [
  { title: `준비서면 제출 ${ddayOf(BRIEF_DUE)}`, meta: `${CASE_NO} · 방금`, unread: true },
  { title: '상대방이 답변서를 제출했습니다', meta: '오늘 오전 8:42 · AI 분석', unread: true },
  { title: '유사 판례 결과가 새로 발견되었습니다', meta: '어제 · 업데이트된 판례집 보기', unread: true },
  { title: '변론기일 D-17 리마인더', meta: '어제 오전 9:00', unread: false },
]

// 선택 가능한 진행 사건 목록 (판례 검색 기준 사건)
export const cases = [
  { id: CASE_NO, title: '임대차 보증금 반환 청구', court: '서울중앙지방법원', type: '민사', badge: '진행 중' },
  { id: '2024가단998877', title: '임금체불 청구', court: '서울남부지방법원', type: '민사', badge: '준비 중' },
  { id: '2024가소445566', title: '대여금 반환 청구 (소액)', court: '서울동부지방법원', type: '민사', badge: '진행 중' },
]

export const precedents = [
  {
    title: '임대차보증금',
    result: '대법원 판결', tone: 'blue', officialId: '621911',
    court: '대법원', no: '2025다220329', issues: ['상속재산 관리', '임대차보증금'], date: '2026.05.08', relevance: 95,
    point: '상속인이 기존 조건을 유지한 채 임대차기간만 연장한 행위가 상속재산의 처분이 아니라 관리행위에 해당하는지가 문제 된 사건.',
    apply: '상속과 임대차보증금 반환이 함께 문제 되는 경우 판시사항과 구체적인 계약 경위를 원문에서 확인하세요.',
  },
  {
    title: '임대차보증금',
    result: '대법원 판결', tone: 'blue', officialId: '615697',
    court: '대법원', no: '2024다268508', issues: ['대항력', '임대차보증금'], date: '2025.08.14', relevance: 92,
    point: '채권 회수를 주된 목적으로 한 임대차의 대항력과 주민등록이 공시방법으로 기능하기 위한 요건을 판단한 사건.',
    apply: '대항력 판단은 실제 사용·수익 목적과 점유관계 등 사실관계에 따라 달라질 수 있으므로 원문 요건을 확인하세요.',
  },
  {
    title: '임대차보증금·부당이득금',
    result: '대법원 판결', tone: 'blue', officialId: '615699',
    court: '대법원', no: '2024다227606, 227620', issues: ['부당이득', '임대차보증금'], date: '2025.08.14', relevance: 89,
    point: '월차임 없는 임대차에서 기간 만료 뒤 보증금이 반환되지 않은 채 임차인이 목적물을 계속 사용한 경우 사용이익의 부당이득 성립 여부를 판단한 사건.',
    apply: '계약 종료 뒤 점유와 보증금 미반환이 함께 문제 되는 경우 공식 원문의 전제 사실을 현재 사건과 비교하세요.',
  },
  {
    title: '임대차보증금',
    result: '대법원 판결', tone: 'blue', officialId: '241573',
    court: '대법원', no: '2024다256116', issues: ['차임 지급', '임대차'], date: '2024.09.13', relevance: 84,
    point: '임차인의 차임 지급의무 발생 시점과 임대인의 목적물 사용·수익 의무 불이행 시 차임 지급 거절 범위를 판단한 사건.',
    apply: '목적물 인도나 사용 장애가 쟁점이라면 장애의 범위와 기간을 입증할 자료를 함께 검토하세요.',
  },
  {
    title: '임대차보증금',
    result: '대법원 판결', tone: 'blue', officialId: '240969',
    court: '대법원', no: '2023다307024', issues: ['묵시적 갱신', '임대차보증금'], date: '2024.06.27', relevance: 81,
    point: '상가 임차인이 기간 만료 전 갱신거절을 통지한 경우 묵시적 갱신이 성립하는지를 판단한 사건.',
    apply: '갱신 여부가 쟁점이면 계약 종료일과 갱신거절 통지의 발송·도달 시점을 먼저 정리하세요.',
  },
  {
    title: '대여금',
    result: '대법원 판결', tone: 'blue', officialId: '618181',
    court: '대법원', no: '2025다213495', issues: ['변제기', '대여금', '상계'], date: '2025.10.30', relevance: 90,
    point: '불확정한 사실을 대여금 변제기로 정한 경우, 그 사실이 발생하지 않을 때 이행기한 도래를 판단하는 기준을 제시한 사건.',
    apply: '상환 조건이나 상계 약정이 있다면 계약 문구와 그 조건이 실현될 가능성을 원문 기준에 맞춰 확인하세요.',
  },
  {
    title: '대여금',
    result: '서울고법 판결', tone: 'blue', officialId: '620369',
    court: '서울고등법원', no: '2023나2056133', issues: ['국제적 중복제소', '대여금'], date: '2025.11.13', relevance: 83,
    point: '외국법원과 국내 법원에 같은 대여금 소송이 계속된 경우 국내 후소의 처리 기준을 판단한 사건.',
    apply: '해외 소송이 함께 진행 중이라면 외국재판 승인 가능성과 국내 절차 중지 요건을 공식 원문에서 확인하세요.',
  },
  {
    title: '부당해고구제재심판정취소',
    result: '대법원 판결', tone: 'blue', officialId: '616245',
    court: '대법원', no: '2023두54914', issues: ['근로자성', '부당해고'], date: '2026.01.29', relevance: 87,
    point: '협동조합 조합원의 근로자성 판단과 영업양도 시 근로관계 승계 여부를 다룬 사건.',
    apply: '계약 명칭만으로 근로자성을 단정하지 말고 지휘·감독, 근무시간, 보수 등 실질 요소를 비교하세요.',
  },
  {
    title: '부당해고구제재심판정취소',
    result: '대법원 판결', tone: 'blue', officialId: '612851',
    court: '대법원', no: '2025두33276', issues: ['구제이익', '부당해고'], date: '2025.10.16', relevance: 79,
    point: '구제신청 당시 이미 정년·계약 만료·폐업 등으로 근로관계가 끝난 경우 구제명령과 소의 이익이 있는지를 판단한 사건.',
    apply: '부당해고 구제 절차에서는 신청 시점의 근로관계와 별도의 구제이익이 남아 있는지 확인하세요.',
  },
  {
    title: '손해배상(기)',
    result: '대법원 판결', tone: 'blue', officialId: '621987',
    court: '대법원', no: '2023다228244', issues: ['과실상계', '손해배상', '보험'], date: '2026.05.14', relevance: 82,
    point: '과실이 경합한 교통사고에서 자기차량손해보험자의 대위 범위와 피보험자의 자기부담금 청구 범위를 판단한 사건.',
    apply: '보험금 지급과 손해배상청구권 대위가 함께 문제 되는 경우 책임비율과 실제 지급액을 구분해 확인하세요.',
  },
  {
    title: '가압류이의',
    result: '대법원 결정', tone: 'blue', officialId: '220877',
    court: '대법원', no: '2021마7088', issues: ['가압류', '항고의 이익'], date: '2022.04.28', relevance: 76,
    point: '가압류등기가 이미 말소된 뒤에도 가압류취소결정을 다투는 항고의 이익이 남는지를 판단한 사건.',
    apply: '가압류 집행과 이의·항고 절차는 구분되므로 현재 절차와 판례의 전제 사실을 먼저 대조하세요.',
  },
]

export const winrate = {
  overall: 73, trend: '+5%', similar: 68,
  issues: [
    { name: '임대차보증금 반환 기한', rate: 72, tone: 'brand' },
    { name: '필요비 상환 청구권', rate: 45, tone: 'amber' },
    { name: '지연손해금 청구', rate: 81, tone: 'green' },
  ],
  laws: [
    { name: '민법 제618조 (임대차의 의의)', tag: '참고', tone: 'gray', href: 'https://www.law.go.kr/법령/민법/제618조' },
    { name: '주택임대차보호법 제3조의2 (보증금의 회수)', tag: '참고', tone: 'gray', href: 'https://www.law.go.kr/법령/주택임대차보호법/제3조의2' },
    { name: '민사소송법 제251조 (장래 이행의 소)', tag: '참고', tone: 'gray', href: 'https://www.law.go.kr/법령/민사소송법/제251조' },
  ],
  tips: [
    '관련도가 높은 판례일수록 준비서면 작성 시 참고 자료로 활용되는 경우가 많습니다.',
    '대법원 판례는 하급심 판례보다 참고 가치가 높게 평가되는 편입니다.',
    '청구 취지에 판례 번호를 함께 표기해 두면 자료를 정리하기 편합니다.',
  ],
}

export const procedureSteps = [
  { name: '소장 접수', date: dayOffset(-90), status: 'done', desc: '법원에 소장을 제출하고 사건번호를 부여받았습니다.', items: ['소장 작성·제출', '인지대·송달료 납부'] },
  { name: '답변서 확인', date: dayOffset(-45), status: 'done', desc: '피고의 답변서를 수령하고 쟁점을 확인했습니다.', items: ['상대방 답변서 검토', '쟁점 정리'] },
  { name: '변론 준비', date: dayOffset(0), status: 'current', desc: '변론기일에 대비해 준비서면과 증거를 정리하는 단계입니다.', items: ['준비서면 작성', '증거목록 정리', '주장 보강'] },
  { name: '변론 진행', date: HEARING, status: 'todo', desc: '법원에서 쟁점에 대한 변론이 진행됩니다.', items: ['증거 제출 및 증인 신문', '필요 시 추가 변론기일 지정', '준비서면 제출'] },
  { name: '판결 선고', date: '미정', status: 'todo', desc: '재판부의 판결이 선고됩니다.', items: ['판결문 수령', '항소 여부 검토'] },
]

export const procedureSchedule = [
  { title: '제1회 변론기일', date: HEARING, place: '서울중앙지방법원 327호 14:00' },
  { title: '준비서면 제출 마감', date: BRIEF_DUE, place: '' },
  { title: '제2회 변론기일', date: dayOffset(38), place: '서울중앙지방법원 327호 10:00' },
]

export const submitDocs = [
  { name: '소장', done: true },
  { name: '당사자 표시', done: true },
  { name: '증거자료', done: true },
  { name: '준비서면', done: false },
  { name: '증거목록', done: false },
]

export const docTypes = [
  { key: 'complaint', icon: 'Scroll', title: '소장', desc: '소송을 제기하기 위한 기본 문서' },
  { key: 'brief', icon: 'FileText', title: '준비서면', desc: '상대방 주장에 대한 반박·쟁점 정리' },
  { key: 'evidence', icon: 'Folder', title: '증거목록', desc: '제출할 증거의 목록' },
  { key: 'petition', icon: 'Gavel', title: '신청서', desc: '법원에 제출하는 각종 신청서' },
]

export const recentDocs = [
  { type: '소장', name: '임대차_보증금_반환_소장.pdf', date: dayOffset(-88) },
  { type: '준비서면', name: '준비서면_1차.pdf', date: dayOffset(-40) },
  { type: '증거목록', name: '증거목록.pdf', date: dayOffset(-35) },
]

export const writingTips = [
  '정확한 당사자 정보를 입력하세요.',
  '사실관계를 시간순으로 작성하면 좋습니다.',
  '증거자료를 함께 준비하세요.',
  '법적 용어는 정확하게 사용하세요.',
]

const sampleSeed = (value = '') => [...String(value)].reduce((sum, char) => sum + char.charCodeAt(0), 0)
const sampleMime = (name = '') => {
  if (/\.pdf$/i.test(name)) return 'application/pdf'
  if (/\.png$/i.test(name)) return 'image/png'
  return 'image/jpeg'
}

export const evidenceList = [
  { no: 1, code: '갑 제1호증', status: '제출완료', tone: 'green', file: '임대차계약서.pdf', size: '2.3 MB', date: dayOffset(-45), dateLabel: '제출일', purpose: '임대차 계약 관계 및 보증금 1,000만원 지급 사실 입증' },
  { no: 2, code: '갑 제2호증', status: '제출완료', tone: 'green', file: '보증금_입금증.jpg', size: '1.1 MB', date: dayOffset(-45), dateLabel: '제출일', purpose: '보증금 1,000만원을 피고에게 실제 지급한 사실 입증' },
  { no: 3, code: '갑 제3호증', status: '제출예정', tone: 'blue', file: '문자_납부내역.pdf', size: '856 KB', date: EVID_DUE, dateLabel: '기한', purpose: '월세를 성실히 납부한 사실 입증' },
  { no: 4, code: '갑 제4호증', status: '보완필요', tone: 'amber', file: '카카오톡_대화내용.pdf', size: '3.2 MB', date: BRIEF_DUE, dateLabel: '기한', purpose: '피고가 보증금 반환을 회피한 사실 입증 (대화 내용 일부 가려야 함)', warn: '카톡 캡처에 제3자 개인정보가 보입니다. 가린 뒤 다시 제출하세요.' },
  { no: 5, code: '갑 제5호증', status: '미제출', tone: 'gray', file: '하자보수_사진1.jpg', size: '2.8 MB', date: EVID_DUE, dateLabel: '기한', purpose: '임차인이 원상복구 의무를 다한 사실 입증' },
  { no: 6, code: '갑 제6호증', status: '미제출', tone: 'gray', file: '하자보수_사진2.jpg', size: '2.5 MB', date: EVID_DUE, dateLabel: '기한', purpose: '임차인이 원상복구 의무를 다한 사실 입증' },
].map((item, index) => {
  const image = /\.(jpg|jpeg|png|webp)$/i.test(item.file)
  const createdAt = `${dayOffset(-58 + index * 3)}T${String(9 + index).padStart(2, '0')}:20:00`
  const updatedAt = `${dayOffset(-45 + index * 2)}T${String(14 + (index % 4)).padStart(2, '0')}:35:00`
  return {
    ...item,
    pages: image ? 1 : 3 + (index % 5),
    resolution: image ? `${3024 + (index % 2) * 1008} × ${2268 + (index % 3) * 756}` : 'A4 · 210 × 297 mm',
    mimeType: sampleMime(item.file),
    source: image ? '휴대전화 원본 업로드' : '사용자 직접 업로드',
    uploadedBy: '김지민',
    privacyReview: item.warn ? '가림 처리 필요' : '개인정보 확인 완료',
    checksum: `NH-EV-${String(sampleSeed(item.file)).padStart(6, '0').slice(-6)}`,
    createdAt,
    updatedAt,
    due: item.dateLabel === '기한' ? item.date : item.date,
    submittedAt: item.dateLabel === '제출일' ? item.date : '',
    versions: [{
      version: 1,
      createdAt,
      submittedAt: item.dateLabel === '제출일' ? item.date : '',
      note: image ? '휴대전화에서 업로드한 원본 사진' : '원본 파일 업로드',
    }],
  }
})

export const evidenceAi = [
  '입증 취지 작성 완료: 갑 제1~6호증이 각각 어떤 사실을 증명하는지 모두 연결했습니다.',
  '원본 자료 보강 필요: 납부 내역이 PDF 1개뿐이에요. 3개월 이상 은행 내역서를 추가하면 신뢰도가 높아집니다.',
  '갑 제4호증 보안 사항: 카톡 캡처에 제3자 정보가 포함되어 있어요. 가리고 제출해야 합니다.',
]

/* ─────────────────── 서류 보드 예시 ───────────────────
   내 사건이 없을 때 화면이 어떻게 도는지 보여주는 자료다.
   종류(소장·증거자료·준비서면·증거목록·신청서)마다 줄이 있고, 줄마다 사건이 달려 있다. */

/**
 * 데모 사건 여덟 건 — 소송의 **모든 단계를 하나씩** 맡는다.
 *
 * 한 단계에 여러 건이 몰리면 그 단계의 화면만 반복해서 보게 되고, 비어 있는 단계는
 * 만들어 보기 전까지 확인할 수 없다. 그래서 분쟁 발생부터 종결까지 아홉 자리를
 * 한 건씩 채운다. 어느 사건이 어느 자리인지는 figmaWorkspaceCases의 주석에 적었다.
 *
 * caseKey는 서류판(demoBoardRows)이 사건을 묶는 열쇠다. 사건번호가 없는 사건은
 * 빈 문자열이 겹치므로 내부 id를 그대로 쓴다.
 */
const DEMO_CASES = {
  repair: { caseKey: 'demo-repair-case', caseTitle: '인테리어 하자 손해배상', caseNo: '', court: '인천지방법원' },
  car: { caseKey: 'demo-car-case', caseTitle: '중고차 허위광고 손해배상', caseNo: '', court: '대전지방법원' },
  labor: { caseKey: '2024가단998877', caseTitle: '임금체불 청구', caseNo: '2024가단998877', court: '서울남부지방법원' },
  wedding: { caseKey: 'demo-wedding-case', caseTitle: '웨딩업체 계약해지 위약금', caseNo: '', court: '서울서부지방법원' },
  evict: { caseKey: '2025가단776655', caseTitle: '상가 건물명도 청구', caseNo: '2025가단776655', court: '수원지방법원' },
  lease: { caseKey: CASE_NO, caseTitle: '임대차 보증금 반환 청구', caseNo: CASE_NO, court: '서울중앙지방법원' },
  crash: { caseKey: '2025가단334455', caseTitle: '교통사고 손해배상', caseNo: '2025가단334455', court: '서울북부지방법원' },
  loan: { caseKey: '2024가소445566', caseTitle: '대여금 반환 청구 (6) 판결·종결', caseNo: '2024가소445566', court: '서울동부지방법원' },
}

export const demoCaseList = Object.values(DEMO_CASES)

const demoMoment = (days, time = '10:00') => `${dayOffset(days)}T${time}:00`
const demoDoc = (c, o) => {
  const seed = sampleSeed(o.key || o.title)
  const image = /\.(jpg|jpeg|png|webp)$/i.test(o.title)
  const file = o.file || (/\.[a-z0-9]{2,5}$/i.test(o.title)
    ? o.title
    : `${o.title.replace(/[()—·~]/g, ' ').replace(/\s+/g, '_')}.pdf`)
  const groupMeta = {
    complaint: { purpose: '청구취지와 청구원인, 당사자 및 청구금액을 정리한 법원 제출 문서', source: '나홀로법에 문서 생성' },
    evidence: { purpose: '사건의 주요 사실관계와 청구 내용을 뒷받침하는 증거자료', source: image ? '휴대전화 원본 업로드' : '사용자 직접 업로드' },
    brief: { purpose: '상대방 주장에 대한 반박과 쟁점별 사실관계를 정리한 준비서면', source: '나홀로법에 문서 생성' },
    evidencelist: { purpose: '제출할 서증의 번호·명칭·입증취지를 정리한 증거목록', source: '나홀로법에 문서 생성' },
    petition: { purpose: '현재 소송 절차에 필요한 신청 또는 답변 내용을 정리한 문서', source: '나홀로법에 문서 생성' },
  }[o.group] || { purpose: '사건 진행에 필요한 제출 자료', source: '사용자 직접 업로드' }
  const generatedAt = o.updatedAt || (o.submittedAt
    ? `${o.submittedAt}T09:20:00`
    : demoMoment(-((seed % 8) + 1), `${String(9 + (seed % 8)).padStart(2, '0')}:25`))
  const pages = o.pages || (image ? 1 : 2 + (seed % 8))
  const size = o.size || (image ? `${(1.2 + (seed % 28) / 10).toFixed(1)} MB` : `${320 + (seed % 720)} KB`)
  const versions = (o.versions || [{
    version: o.version || 1,
    createdAt: generatedAt,
    submittedAt: o.submittedAt || '',
    note: o.group === 'evidence' ? '업로드한 원본 파일' : '최초 생성본',
  }]).map((version) => ({
    size,
    pages,
    createdBy: '김지민',
    ...version,
  }))
  return {
    ...DEMO_CASES[c], real: false,
    ...o,
    file,
    purpose: o.purpose || groupMeta.purpose,
    size,
    pages,
    resolution: image ? `${3024 + (seed % 2) * 1008} × ${2268 + (seed % 3) * 756}` : 'A4 · 210 × 297 mm',
    mimeType: sampleMime(file),
    source: o.source || groupMeta.source,
    uploadedBy: o.uploadedBy || '김지민',
    privacyReview: o.warn ? '가림 처리 필요' : '개인정보 확인 완료',
    checksum: o.checksum || `NH-${o.group?.toUpperCase() || 'DOC'}-${String(seed).padStart(6, '0').slice(-6)}`,
    due: o.due || o.submittedAt || dayOffset(14),
    submittedAt: o.submittedAt || '',
    submissionLabel: o.submittedAt ? `${o.submittedAt} 제출 완료` : '아직 제출하지 않음',
    createdAt: versions[0]?.createdAt || generatedAt,
    updatedAt: versions[versions.length - 1]?.createdAt || generatedAt,
    versions,
  }
}

export const demoBoardRows = [
  /* ── 소장 ── */
  demoDoc('lease', {
    key: 'd-c1', group: 'complaint', kind: 'complaint', docId: 'complaint', title: '임대차 보증금 반환 소장', progress: 100, amount: '10,000,000', status: '제출완료', submittedAt: dayOffset(-88),
    versions: [
      { version: 1, createdAt: demoMoment(-96, '11:10'), note: '청구원인 초안' },
      { version: 2, createdAt: demoMoment(-90, '16:25'), submittedAt: dayOffset(-88), note: '법원에 접수한 소장' },
      { version: 3, createdAt: demoMoment(-3, '14:40'), note: '보증금 정산 내역을 반영한 수정본' },
    ],
  }),
  demoDoc('labor', {
    key: 'd-c2', group: 'complaint', kind: 'complaint', docId: 'complaint', title: '임금체불 청구 소장', progress: 65, amount: '7,400,000', status: '작성 중', due: dayOffset(12),
    versions: [
      { version: 1, createdAt: demoMoment(-7, '09:30'), note: '기본 정보로 만든 초안' },
      { version: 2, createdAt: demoMoment(-1, '18:05'), note: '연장근로 내역을 추가한 최신본' },
    ],
  }),
  demoDoc('loan', { key: 'd-c3', group: 'complaint', kind: 'complaint', docId: 'complaint', title: '대여금 반환 소장 (소액)', progress: 100, amount: '5,000,000', status: '제출완료', submittedAt: dayOffset(-31) }),

  /* ── 증거자료 ── */
  ...evidenceList.map((e, i) => demoDoc('lease', {
    ...e,
    key: `d-e${i + 1}`, group: 'evidence', evNo: e.no, code: e.code, title: e.file,
    purpose: e.purpose, size: e.size, status: e.status, warn: e.warn,
    due: e.dateLabel === '기한' ? e.date : '', submittedAt: e.dateLabel === '제출일' ? e.date : '',
    ...(i === 0 ? {
      versions: [
        { version: 1, createdAt: demoMoment(-91, '13:20'), submittedAt: dayOffset(-88), note: '법원에 제출한 스캔본' },
        { version: 2, createdAt: demoMoment(-4, '10:15'), note: '누락된 특약 페이지를 포함해 다시 스캔한 파일' },
      ],
    } : {}),
  })),
  demoDoc('labor', { key: 'd-e7', group: 'evidence', evNo: 1, code: '갑 제1호증', title: '근로계약서.pdf', purpose: '근로조건과 계약 기간을 정한 사실 입증', size: '1.4 MB', status: '미제출', due: dayOffset(12) }),
  demoDoc('labor', { key: 'd-e8', group: 'evidence', evNo: 2, code: '갑 제2호증', title: '급여이체내역.pdf', purpose: '2025년 1월부터 6월까지 급여가 일부만 지급된 사실 입증', size: '0.8 MB', status: '미제출', due: dayOffset(12) }),
  demoDoc('labor', { key: 'd-e9', group: 'evidence', evNo: 3, code: '갑 제3호증', title: '사내메신저_지시내용.pdf', purpose: '연장근로를 지시받은 사실 입증', size: '2.1 MB', status: '미제출', due: dayOffset(12) }),
  demoDoc('loan', { key: 'd-e10', group: 'evidence', evNo: 1, code: '갑 제1호증', title: '차용증.jpg', purpose: '2023. 8. 500만원을 빌려준 사실 입증', size: '1.0 MB', status: '제출완료', submittedAt: dayOffset(-31) }),
  demoDoc('loan', { key: 'd-e11', group: 'evidence', evNo: 2, code: '갑 제2호증', title: '계좌이체_확인증.pdf', purpose: '500만원을 실제 송금한 사실 입증', size: '0.5 MB', status: '제출완료', submittedAt: dayOffset(-31) }),
  demoDoc('loan', { key: 'd-e12', group: 'evidence', evNo: 3, code: '갑 제3호증', title: '일부변제_입금내역.jpg', purpose: '피고가 100만원을 일부 변제하여 대여금 채무를 인정한 사실 입증', size: '0.4 MB', status: '보완필요', due: dayOffset(5), warn: '입금자명이 가려져 있어요. 원본 내역서로 다시 받아 주세요.' }),

  /* ── 준비서면 ── */
  demoDoc('lease', { key: 'd-b1', group: 'brief', kind: 'brief', docId: 'brief1', title: '준비서면(1) — 공제 주장 반박', round: 1, progress: 100, status: '제출완료', submittedAt: dayOffset(-40) }),
  demoDoc('lease', { key: 'd-b2', group: 'brief', kind: 'brief', docId: 'brief2', title: '준비서면(2) — 원상복구 범위', round: 2, progress: 45, status: '작성 중', due: BRIEF_DUE }),
  demoDoc('loan', { key: 'd-b3', group: 'brief', kind: 'brief', docId: 'brief1', title: '준비서면(1) — 변제 항변에 대한 반박', round: 1, progress: 80, status: '제출예정', due: dayOffset(9) }),

  /* ── 증거목록 ── */
  demoDoc('lease', { key: 'd-l1', group: 'evidencelist', kind: 'evidence', docId: 'evidence', title: '증거목록 (갑 제1~6호증)', count: 6, progress: 70, status: '제출예정', due: EVID_DUE }),
  demoDoc('loan', { key: 'd-l2', group: 'evidencelist', kind: 'evidence', docId: 'evidence', title: '증거목록 (갑 제1~3호증)', count: 3, progress: 100, status: '제출완료', submittedAt: dayOffset(-31) }),

  /* ── 신청서·답변서 ── */
  demoDoc('lease', { key: 'd-p1', group: 'petition', kind: 'petition', docId: 'petition1', title: '기일변경신청서', progress: 100, status: '제출완료', submittedAt: dayOffset(-12) }),
  demoDoc('labor', { key: 'd-p2', group: 'petition', kind: 'answer', docId: 'answer1', title: '답변서 (피고 주장에 대한 답변)', progress: 20, status: '작성 중', due: dayOffset(15) }),
  demoDoc('loan', { key: 'd-p3', group: 'petition', kind: 'petition', docId: 'petition2', title: '보정명령 이행서', progress: 0, status: '보완필요', due: dayOffset(2) }),

  /* ── 교통사고 손해배상 ── */
  demoDoc('crash', {
    key: 'd-c4', group: 'complaint', kind: 'complaint', docId: 'complaint', title: '교통사고 손해배상 소장', progress: 100, amount: '18,600,000', status: '제출완료', submittedAt: dayOffset(-54),
    versions: [
      { version: 1, createdAt: demoMoment(-63, '10:05'), note: '치료비·일실수입 초안' },
      { version: 2, createdAt: demoMoment(-56, '17:40'), submittedAt: dayOffset(-54), note: '법원에 접수한 소장' },
    ],
  }),
  demoDoc('crash', { key: 'd-e13', group: 'evidence', evNo: 1, code: '갑 제1호증', title: '교통사고사실확인원.pdf', purpose: '2025. 9. 12. 사고 발생 사실과 가해 차량을 특정', size: '0.6 MB', status: '제출완료', submittedAt: dayOffset(-54) }),
  demoDoc('crash', { key: 'd-e14', group: 'evidence', evNo: 2, code: '갑 제2호증', title: '진단서_12주.pdf', purpose: '경추 염좌 등으로 12주 치료를 요한 사실 입증', size: '0.4 MB', status: '제출완료', submittedAt: dayOffset(-54) }),
  demoDoc('crash', { key: 'd-e15', group: 'evidence', evNo: 3, code: '갑 제3호증', title: '치료비_영수증_모음.pdf', purpose: '실제 지출한 치료비 합계 4,120,000원 입증', size: '1.7 MB', status: '제출완료', submittedAt: dayOffset(-54) }),
  demoDoc('crash', { key: 'd-e16', group: 'evidence', evNo: 4, code: '갑 제4호증', title: '블랙박스_캡처.jpg', purpose: '피고 차량이 중앙선을 침범한 사실 입증', size: '2.9 MB', status: '검토중', due: dayOffset(8) }),
  demoDoc('crash', { key: 'd-e17', group: 'evidence', evNo: 5, code: '갑 제5호증', title: '휴업손해_급여명세서.pdf', purpose: '치료 기간 중 근로하지 못해 발생한 일실수입 입증', size: '0.5 MB', status: '보완필요', due: dayOffset(4), warn: '동료 직원의 급여액이 함께 보입니다. 본인 부분만 남기고 가려 주세요.' }),
  demoDoc('crash', { key: 'd-b4', group: 'brief', kind: 'brief', docId: 'brief1', title: '준비서면(1) — 과실비율에 대한 반박', round: 1, progress: 55, status: '작성 중', due: dayOffset(11) }),
  demoDoc('crash', { key: 'd-l3', group: 'evidencelist', kind: 'evidence', docId: 'evidence', title: '증거목록 (갑 제1~5호증)', count: 5, progress: 100, status: '제출완료', submittedAt: dayOffset(-54) }),

  /* ── 상가 건물명도 ── */
  demoDoc('evict', { key: 'd-c5', group: 'complaint', kind: 'complaint', docId: 'complaint', title: '상가 건물명도 소장', progress: 100, amount: '42,000,000', status: '제출완료', submittedAt: dayOffset(-19) }),
  demoDoc('evict', { key: 'd-e18', group: 'evidence', evNo: 1, code: '갑 제1호증', title: '상가임대차계약서.pdf', purpose: '임대차 계약의 성립과 차임 약정 입증', size: '2.1 MB', status: '제출완료', submittedAt: dayOffset(-19) }),
  demoDoc('evict', { key: 'd-e19', group: 'evidence', evNo: 2, code: '갑 제2호증', title: '차임_연체내역.pdf', purpose: '2025. 4.부터 7기분 차임이 연체된 사실 입증', size: '0.7 MB', status: '제출완료', submittedAt: dayOffset(-19) }),
  demoDoc('evict', { key: 'd-e20', group: 'evidence', evNo: 3, code: '갑 제3호증', title: '계약해지_내용증명.pdf', purpose: '2025. 11. 3. 계약 해지를 통고하고 도달한 사실 입증', size: '0.9 MB', status: '제출완료', submittedAt: dayOffset(-19) }),
  demoDoc('evict', { key: 'd-e21', group: 'evidence', evNo: 4, code: '갑 제4호증', title: '등기사항전부증명서.pdf', purpose: '원고가 목적물의 소유자인 사실 입증', size: '1.3 MB', status: '제출예정', due: dayOffset(7) }),
  demoDoc('evict', { key: 'd-p4', group: 'petition', kind: 'petition', docId: 'petition1', title: '점유이전금지가처분 신청서', progress: 100, status: '제출완료', submittedAt: dayOffset(-24) }),

  /* ── 중고차 허위광고 (내용증명까지 보내고 소장은 아직) ── */
  demoDoc('car', { key: 'd-e27', group: 'evidence', evNo: 1, code: '갑 제1호증', title: '중고차_매매계약서.pdf', purpose: '무사고 차량으로 표시하고 매매한 사실 입증', size: '1.6 MB', status: '미제출', due: dayOffset(25) }),
  demoDoc('car', { key: 'd-e28', group: 'evidence', evNo: 2, code: '갑 제2호증', title: '성능점검기록부.pdf', purpose: '판매자가 교부한 점검기록의 내용 입증', size: '0.9 MB', status: '미제출', due: dayOffset(25) }),
  demoDoc('car', { key: 'd-e29', group: 'evidence', evNo: 3, code: '갑 제3호증', title: '사고이력_조회서.pdf', purpose: '실제로는 전손 수준의 사고 이력이 있었던 사실 입증', size: '0.5 MB', status: '미제출', due: dayOffset(25) }),
  demoDoc('car', { key: 'd-e30', group: 'evidence', evNo: 4, code: '갑 제4호증', title: '내용증명_및_배달증명.pdf', purpose: '2026. 7. 28. 손해배상을 최고하고 도달한 사실 입증', size: '0.8 MB', status: '미제출', due: dayOffset(25) }),

  /* ── 웨딩 위약금 (소장 작성 완료 — 접수만 남음) ── */
  demoDoc('wedding', {
    key: 'd-c7', group: 'complaint', kind: 'complaint', docId: 'complaint', title: '웨딩 위약금 반환 소장', progress: 100, amount: '3,900,000', status: '제출예정', due: dayOffset(6),
    versions: [
      { version: 1, createdAt: demoMoment(-11, '13:40'), note: '위약금 약정 정리 초안' },
      { version: 2, createdAt: demoMoment(-2, '09:55'), note: '소비자분쟁해결기준 반영 최종본' },
    ],
  }),
  demoDoc('wedding', { key: 'd-e31', group: 'evidence', evNo: 1, code: '갑 제1호증', title: '웨딩홀_계약서.pdf', purpose: '예식 계약과 위약금 약정의 내용 입증', size: '1.9 MB', status: '제출예정', due: dayOffset(6) }),
  demoDoc('wedding', { key: 'd-e32', group: 'evidence', evNo: 2, code: '갑 제2호증', title: '계약금_이체내역.pdf', purpose: '계약금 3,900,000원을 지급한 사실 입증', size: '0.4 MB', status: '제출예정', due: dayOffset(6) }),
  demoDoc('wedding', { key: 'd-e33', group: 'evidence', evNo: 3, code: '갑 제3호증', title: '해지통보_문자내역.jpg', purpose: '예식 5개월 전에 해지를 통보한 사실 입증', size: '1.1 MB', status: '제출예정', due: dayOffset(6) }),
  demoDoc('wedding', { key: 'd-l4', group: 'evidencelist', kind: 'evidence', docId: 'evidence', title: '증거목록 (갑 제1~3호증)', count: 3, progress: 100, status: '제출예정', due: dayOffset(6) }),

  /* ── 인테리어 하자 (아직 접수 전) ── */
  demoDoc('repair', { key: 'd-c6', group: 'complaint', kind: 'complaint', docId: 'complaint', title: '인테리어 하자 손해배상 소장', progress: 35, amount: '6,300,000', status: '작성 중', due: dayOffset(20) }),
  demoDoc('repair', { key: 'd-e22', group: 'evidence', evNo: 1, code: '갑 제1호증', title: '인테리어_공사계약서.pdf', purpose: '공사 범위와 대금, 하자보수 책임을 정한 사실 입증', size: '1.5 MB', status: '미제출', due: dayOffset(20) }),
  demoDoc('repair', { key: 'd-e23', group: 'evidence', evNo: 2, code: '갑 제2호증', title: '누수_하자사진.jpg', purpose: '준공 2개월 만에 천장 누수가 발생한 사실 입증', size: '3.4 MB', status: '미제출', due: dayOffset(20) }),
  demoDoc('repair', { key: 'd-e24', group: 'evidence', evNo: 3, code: '갑 제3호증', title: '보수견적서.pdf', purpose: '하자 보수에 6,300,000원이 필요한 사실 입증', size: '0.6 MB', status: '미제출', due: dayOffset(20) }),
]

const evidenceFileForCase = (item, index) => ({
  name: item.file,
  size: Math.round(parseFloat(item.size) * (/KB/i.test(item.size) ? 1024 : 1024 * 1024)),
  purpose: item.purpose,
  status: item.status,
  due: item.due || (item.dateLabel === '기한' ? item.date : ''),
  submittedAt: item.submittedAt || (item.dateLabel === '제출일' ? item.date : ''),
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  versions: item.versions,
  lastModified: new Date(item.createdAt).getTime() + index,
})

/** 사건 하나가 들고 있는 증거 파일 — 서류판(demoBoardRows)에 적힌 그대로 가져온다 */
const evidenceFilesFor = (caseKey) => demoBoardRows
  .filter((row) => row.caseKey === caseKey && row.group === 'evidence')
  .map((row, index) => ({
    name: row.title,
    size: Math.round(parseFloat(row.size) * (/KB/i.test(row.size) ? 1024 : 1024 * 1024)),
    purpose: row.purpose,
    status: row.status,
    due: row.due,
    submittedAt: row.submittedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    versions: row.versions,
    lastModified: Date.now() - index,
  }))

/** Figma 캡처와 제품 데모에서 쓰는 완성형 사건. 실제 사용자의 저장값과는 섞지 않는다. */

/* ─────────────────── 단계별 확인용 사건 찍어내기 ───────────────────

   절차 안내가 단계마다 무엇을 다르게 보여주는지 보려면, 유형마다 여섯 칸이 모두
   채워져 있어야 한다. 손으로 서른 건을 적으면 읽지도 고치지도 못하는 데이터가 되므로
   단계의 모양(STAGE_SHAPE)과 유형의 씨앗(STAGE_SEED)을 곱해 찍어낸다.

   할 일은 절차 안내와 같은 표(procedureGuide)에서 가져온다 — 화면이 "이 단계에서
   할 일"이라고 알려 준 것이 사건의 준비사항으로도 그대로 들어가야 앞뒤가 맞는다. */

const STAGE_SHAPE = {
  deal: { n: 1, label: '분쟁 발생', status: '작성 중', entryPoint: 'dispute', flowDone: {} },
  notice: { n: 2, label: '내용증명', status: '작성 중', entryPoint: 'dispute', flowDone: {}, dated: true },
  draft: { n: 3, label: '소장 작성', status: '작성 중', entryPoint: 'notified', flowDone: {}, dated: true, noticed: true, docPct: 55 },
  file: { n: 4, label: '법원 접수', status: '제출 준비', entryPoint: 'notified', flowDone: { draft: true }, dated: true, noticed: true, docPct: 100 },
  trial: { n: 5, label: '변론', status: '진행 중', entryPoint: 'filed', flowDone: {}, dated: true, noticed: true, docPct: 100, filed: true },
  judge: { n: 6, label: '판결', status: '진행 중', entryPoint: 'filed', flowDone: { trial: true }, dated: true, noticed: true, docPct: 100, filed: true },
}

/** 유형마다 다른 것 — 이름·법원·금액·사실관계의 뼈대 */
const STAGE_SEED = {
  deposit: {
    caseNoBase: 331000,
    title: '임대차보증금', court: '서울중앙지방법원', amount: '12000000', docTitle: '임대차보증금 반환 소장',
    dateKey: 'contractDate', dateValue: '2024-03-01',
    parties: ['백지호', '오세영', '문가람', '전유진', '남건우', '허수아'],
    form: { leaseKind: '주택', propertyAddr: '서울특별시 동작구 상도로 88', depositAmount: '12000000', leaseEnd: '2026-03-01', endWay: '기간 만료', handover: '비워줬어요' },
  },
  wage: {
    caseNoBase: 342000,
    title: '임금체불', court: '서울남부지방법원', amount: '6800000', docTitle: '임금 청구 소장',
    dateKey: 'hireDate', dateValue: '2023-09-04',
    parties: ['주식회사 세움테크', '늘품물산', '주식회사 하람에프앤비', '가온기술', '주식회사 담아유통', '해솔산업'],
    form: { leaveDate: '2026-05-31', payKind: '월급', payAmount: '2900000', payDay: '매월 10일', workerCount: '5인 이상', unpaidTotal: '6800000' },
  },
  tort: {
    caseNoBase: 353000,
    title: '손해배상', court: '서울북부지방법원', amount: '9200000', docTitle: '손해배상 소장',
    dateKey: 'incidentDate', dateValue: '2026-01-19',
    parties: ['도경한', '유리안', '천보름', '설민호', '강예찬', '진하율'],
    form: { tortKind: '일반 (기)', hasContract: '없음 (사고·불법행위)', ownFault: '없음' },
  },
  evict: {
    caseNoBase: 364000,
    title: '건물명도', court: '수원지방법원', amount: '38000000', docTitle: '건물명도 소장',
    dateKey: 'contractDate', dateValue: '2023-07-15',
    parties: ['우진상회', '주식회사 미소식품', '한결카페', '주식회사 온다마트', '별빛세탁', '주식회사 다솜케어'],
    form: { leaseKind: '상가', propertyDesc: '경기도 수원시 팔달구 인계로 77\n철근콘크리트조 3층 근린생활시설 제1층 제101호 62.4㎡', monthlyRent: '1800000', unpaidMonths: '4' },
  },
}

const stageCase = (typeKey, stageKey) => {
  const shape = STAGE_SHAPE[stageKey]
  const seed = STAGE_SEED[typeKey]
  const guide = stageGuide(typeKey, stageKey)
  const id = `demo-${typeKey}${shape.n}-case`
  const born = Date.now() - 86400000 * (60 - shape.n * 6)

  // 이 단계에서 할 일 — 절차 안내가 알려 주는 것을 그대로 준비사항으로 둔다
  const todos = guide.items.slice(0, 3).map((text, i) => ({
    id: `${id}-todo-${i + 1}`,
    text,
    due: dayOffset(shape.n + i * 3),
    done: false,
    typeKey: i === 0 && (stageKey === 'file' || stageKey === 'trial') ? 'filing' : 'prepare',
    remind: i === 0 ? 3 : 1,
    createdAt: born,
  }))
  if (shape.filed) {
    todos.unshift({
      id: `${id}-todo-0`,
      text: stageKey === 'judge' ? '판결 선고기일 확인' : '제1회 변론기일 참석',
      due: dayOffset(shape.n + 2),
      time: '14:00',
      place: `${seed.court} 제${300 + shape.n}호 법정`,
      done: false,
      typeKey: 'hearing',
      remind: 3,
      source: 'court-notice',
      noticeName: stageKey === 'judge' ? '판결선고기일통지서' : '변론기일통지서',
      createdAt: born,
    })
  }

  const docs = shape.docPct
    ? [{ id: 'complaint', kind: 'complaint', title: seed.docTitle, progress: shape.docPct, createdAt: born, updatedAt: Date.now() - 86400000 * 2, ...(shape.docPct === 100 ? { versions: [{ version: 1, createdAt: demoMoment(-(12 - shape.n)), ...(shape.filed ? { submittedAt: dayOffset(-(20 - shape.n)) } : {}), note: shape.filed ? '법원 접수본' : '최종본' }] } : {}) }]
    : []

  return {
    id,
    kind: shape.docPct ? 'complaint' : 'case',
    typeKey,
    title: `${seed.title} (${shape.n}) ${shape.label}`,
    caseNo: shape.filed ? `2026가단${seed.caseNoBase + shape.n}` : '',
    filedAt: shape.filed ? dayOffset(-(20 - shape.n)) : '',
    filedVia: shape.filed ? '전자소송' : '',
    status: shape.status,
    entryPoint: shape.entryPoint,
    flowDone: shape.flowDone,
    form: {
      court: stageKey === 'deal' ? '' : seed.court,
      amount: seed.amount,
      pName: '김지민', pRrn: '920315-2******', pAddr: '서울특별시 관악구 남부순환로 1820', pTel: '010-2841-7306',
      dName: seed.parties[shape.n - 1],
      ...(shape.dated ? { [seed.dateKey]: seed.dateValue, ...seed.form } : {}),
      ...(shape.noticed ? { demandMade: '내용증명을 보냈어요', demandDate: dayOffset(-(40 - shape.n)), demandMethod: '내용증명 우편', demandResult: '수령했으나 답변 없음' } : {}),
      evidenceFiles: [],
    },
    statusAt: { [shape.status]: born },
    todos,
    events: [
      { id: `${id}-ev-1`, kind: 'status', title: '사건 등록', desc: `${Number(seed.amount).toLocaleString('ko-KR')}원`, at: born, source: 'app' },
      ...(shape.noticed ? [{ id: `${id}-ev-2`, kind: 'user', title: '내용증명 발송', desc: '배달증명 수령', at: Date.now() - 86400000 * (40 - shape.n), source: 'user' }] : []),
      ...(shape.filed ? [{ id: `${id}-ev-3`, kind: 'status', title: '법원 접수', desc: '전자소송', at: Date.now() - 86400000 * (20 - shape.n), source: 'user' }] : []),
    ],
    precedentNos: [],
    docs,
    docMeta: shape.docPct === 100
      ? { complaint: shape.filed ? { status: '제출완료', due: dayOffset(-(20 - shape.n)), submittedAt: dayOffset(-(20 - shape.n)) } : { status: '제출예정', due: dayOffset(shape.n + 3), submittedAt: '' } }
      : shape.docPct ? { complaint: { status: '작성 중', due: dayOffset(shape.n + 8), submittedAt: '' } } : {},
    createdAt: born,
    updatedAt: Date.now() - 86400000 * shape.n,
  }
}

/**
 * 이미 손으로 적어 둔 상세 사건이 맡고 있는 칸은 비워 둔다 — 같은 자리에 두 건이
 * 있으면 목록만 길어진다. 아래 표는 "그 유형에서 아직 비어 있는 칸"이다.
 */
const MISSING_STAGES = {
  deposit: ['deal', 'notice', 'draft', 'file', 'judge'],   // 변론은 「임대차 보증금 반환 청구」가 맡는다
  wage: ['deal', 'notice', 'file', 'trial', 'judge'],       // 소장 작성은 「임금체불 청구」
  tort: ['deal', 'trial'],                                   // 나머지는 인테리어·중고차·웨딩·교통사고가 맡는다
  evict: ['deal', 'notice', 'draft', 'trial', 'judge'],      // 법원 접수는 「상가 건물명도 청구」
}

const stageCases = Object.entries(MISSING_STAGES)
  .flatMap(([typeKey, stages]) => stages.map((stageKey) => stageCase(typeKey, stageKey)))

export const figmaWorkspaceCases = [
  ...stageCases,
  // ── 대여금 반환 청구 (1)~(5) ────────────────────────────────
  // 같은 유형인데 서 있는 칸만 다르다. 절차 안내가 단계마다 무엇을 다르게 보여주는지
  // 사건을 새로 만들지 않고도 확인할 수 있게, 한 유형으로 다섯 칸을 채워 둔다.
  {
    // (1) 분쟁 발생 — 빌려준 사실은 있는데 아직 정리를 안 했다
    id: 'demo-loan1-case', kind: 'case', typeKey: 'loan', title: '대여금 반환 청구 (1) 분쟁 발생', caseNo: '', filedAt: '', filedVia: '', status: '작성 중',
    entryPoint: 'dispute', flowDone: {},
    form: {
      court: '', amount: '3000000',
      pName: '김지민', pTel: '010-2841-7306', pAddr: '서울특별시 관악구 남부순환로 1820',
      dName: '한도현',
      evidenceFiles: [],
    },
    statusAt: { '작성 중': Date.now() - 86400000 * 2 },
    todos: [
      { id: 'demo-loan1-todo-1', text: '빌려준 날짜와 금액 정리하기', due: dayOffset(2), done: false, typeKey: 'prepare', remind: 1, createdAt: Date.now() - 86400000 * 2 },
      { id: 'demo-loan1-todo-2', text: '계좌이체 내역 내려받기', due: dayOffset(4), done: false, typeKey: 'prepare', remind: 1, createdAt: Date.now() - 86400000 * 2 },
    ],
    events: [{ id: 'demo-loan1-ev-1', kind: 'status', title: '사건 등록', desc: '3,000,000원', at: Date.now() - 86400000 * 2, source: 'app' }],
    precedentNos: [], docs: [], docMeta: {},
    createdAt: Date.now() - 86400000 * 2, updatedAt: Date.now() - 3600000 * 3,
  },
  {
    // (2) 내용증명 — 변제기가 지났고 이제 최고서를 보낼 차례
    id: 'demo-loan2-case', kind: 'case', typeKey: 'loan', title: '대여금 반환 청구 (2) 내용증명', caseNo: '', filedAt: '', filedVia: '', status: '작성 중',
    entryPoint: 'dispute', flowDone: {},
    form: {
      court: '', amount: '7000000',
      pName: '김지민', pTel: '010-2841-7306', pAddr: '서울특별시 관악구 남부순환로 1820',
      dName: '배수민', dAddr: '서울특별시 중랑구 봉화산로 45',
      loanDate: '2024-11-05', loanAmount: '7000000', loanMethod: '계좌이체', interestSet: '약정 없음',
      evidenceFiles: [],
    },
    statusAt: { '작성 중': Date.now() - 86400000 * 9 },
    todos: [
      { id: 'demo-loan2-todo-1', text: '내용증명 발송', due: dayOffset(3), done: false, typeKey: 'prepare', remind: 1, createdAt: Date.now() - 86400000 * 9 },
      { id: 'demo-loan2-todo-2', text: '배달증명 받으면 도달일 적어두기', due: dayOffset(10), done: false, typeKey: 'prepare', remind: 1, createdAt: Date.now() - 86400000 * 9 },
    ],
    events: [{ id: 'demo-loan2-ev-1', kind: 'user', title: '변제기 도과', desc: '2025. 11. 5. 변제기', at: Date.now() - 86400000 * 9, source: 'user' }],
    precedentNos: [], docs: [], docMeta: {},
    createdAt: Date.now() - 86400000 * 9, updatedAt: Date.now() - 86400000,
  },
  {
    // (3) 소장 작성 — 내용증명에 답이 없어 소장을 쓰는 중
    id: 'demo-loan3-case', kind: 'complaint', typeKey: 'loan', title: '대여금 반환 청구 (3) 소장 작성', caseNo: '', filedAt: '', filedVia: '', status: '작성 중',
    entryPoint: 'notified', flowDone: {},
    form: {
      court: '서울중앙지방법원', amount: '12000000',
      pName: '김지민', pRrn: '920315-2******', pAddr: '서울특별시 관악구 남부순환로 1820', pTel: '010-2841-7306',
      dName: '류하람', dAddr: '서울특별시 성북구 화랑로 210',
      loanDate: '2024-05-20', loanAmount: '12000000', payDateSame: '따로 정했어요', loanMethod: '계좌이체', interestSet: '연 5%',
      demandMade: '내용증명을 보냈어요', demandDate: dayOffset(-26), demandMethod: '내용증명 우편', demandResult: '수령했으나 답변 없음',
      evidenceFiles: [],
    },
    statusAt: { '작성 중': Date.now() - 86400000 * 31 },
    todos: [
      { id: 'demo-loan3-todo-1', text: '청구원인 사실관계 마저 쓰기', due: dayOffset(2), done: false, typeKey: 'prepare', remind: 1, createdAt: Date.now() - 86400000 * 5 },
      { id: 'demo-loan3-todo-2', text: '이자 계산 내역 확인', due: dayOffset(4), done: false, typeKey: 'prepare', remind: 1, createdAt: Date.now() - 86400000 * 5 },
      { id: 'demo-loan3-todo-3', text: '내용증명 발송', due: dayOffset(-26), done: true, doneAt: Date.now() - 86400000 * 26, createdAt: Date.now() - 86400000 * 31 },
    ],
    events: [
      { id: 'demo-loan3-ev-1', kind: 'user', title: '내용증명 발송', desc: '변제 최고 · 배달증명 수령', at: Date.now() - 86400000 * 26, source: 'user' },
      { id: 'demo-loan3-ev-2', kind: 'doc', title: '소장 초안 생성', at: Date.now() - 86400000 * 5, source: 'app' },
    ],
    precedentNos: [],
    docs: [{ id: 'complaint', kind: 'complaint', title: '대여금 반환 소장', progress: 62, createdAt: Date.now() - 86400000 * 5, updatedAt: Date.now() - 86400000 }],
    docMeta: { complaint: { status: '작성 중', due: dayOffset(9), submittedAt: '' } },
    createdAt: Date.now() - 86400000 * 31, updatedAt: Date.now() - 86400000,
  },
  {
    // (5) 변론 — 접수 후 기일이 잡혀 서면이 오가는 중
    id: 'demo-loan5-case', kind: 'complaint', typeKey: 'loan', title: '대여금 반환 청구 (5) 변론', caseNo: '2026가단220110', filedAt: dayOffset(-62), filedVia: '전자소송', status: '진행 중',
    entryPoint: 'filed', flowDone: {},
    form: {
      court: '서울서부지방법원', amount: '15000000',
      pName: '김지민', pRrn: '920315-2******', pAddr: '서울특별시 관악구 남부순환로 1820', pTel: '010-2841-7306',
      dName: '신태오', dAddr: '서울특별시 은평구 진관2로 60',
      loanDate: '2023-12-01', loanAmount: '15000000', payDateSame: '따로 정했어요', loanMethod: '계좌이체', interestSet: '연 6%',
      demandMade: '내용증명을 보냈어요', demandDate: dayOffset(-96), demandMethod: '내용증명 우편', demandResult: '수령했으나 답변 없음',
      evidenceFiles: [],
    },
    statusAt: { '작성 중': Date.now() - 86400000 * 110, '제출 준비': Date.now() - 86400000 * 70, '접수함': Date.now() - 86400000 * 62, '진행 중': Date.now() - 86400000 * 30 },
    todos: [
      { id: 'demo-loan5-todo-1', text: '제2회 변론기일 참석', due: dayOffset(8), time: '15:00', done: false, place: '서울서부지방법원 제205호 법정', typeKey: 'hearing', remind: 3, source: 'court-notice', noticeName: '변론기일통지서', createdAt: Date.now() - 86400000 * 5 },
      { id: 'demo-loan5-todo-2', text: '준비서면(2) — 변제 항변 반박 제출', due: dayOffset(5), done: false, typeKey: 'filing', remind: 3, createdAt: Date.now() - 86400000 * 5 },
      { id: 'demo-loan5-todo-3', text: '제1회 변론기일 참석', due: dayOffset(-24), done: true, doneAt: Date.now() - 86400000 * 24, createdAt: Date.now() - 86400000 * 40 },
    ],
    events: [
      { id: 'demo-loan5-ev-1', kind: 'status', title: '법원 접수 — 사건번호 2026가단220110', desc: '전자소송', at: Date.now() - 86400000 * 62, source: 'user' },
      { id: 'demo-loan5-ev-2', kind: 'user', title: '피고 답변서 수령', desc: '일부 변제했다고 주장', at: Date.now() - 86400000 * 33, source: 'user' },
      { id: 'demo-loan5-ev-3', kind: 'user', title: '제1회 변론기일 진행', desc: '쟁점 정리 · 다음 기일 지정', at: Date.now() - 86400000 * 24, source: 'user' },
    ],
    precedentNos: ['2025다213495'],
    docs: [
      { id: 'complaint', kind: 'complaint', title: '대여금 반환 소장', progress: 100, createdAt: Date.now() - 86400000 * 75, updatedAt: Date.now() - 86400000 * 62, versions: [{ version: 1, createdAt: demoMoment(-75, '10:20'), submittedAt: dayOffset(-62), note: '법원 접수본' }] },
      { id: 'brief1', kind: 'brief', title: '준비서면(1) — 변제 항변에 대한 반박', progress: 100, createdAt: Date.now() - 86400000 * 30, updatedAt: Date.now() - 86400000 * 26, versions: [{ version: 1, createdAt: demoMoment(-30, '14:10'), submittedAt: dayOffset(-26), note: '법원 제출본' }] },
      { id: 'brief2', kind: 'brief', title: '준비서면(2) — 일부 변제금 충당', progress: 45, createdAt: Date.now() - 86400000 * 5, updatedAt: Date.now() - 86400000 },
    ],
    docMeta: {
      complaint: { status: '제출완료', due: dayOffset(-62), submittedAt: dayOffset(-62) },
      brief1: { status: '제출완료', due: dayOffset(-26), submittedAt: dayOffset(-26) },
      brief2: { status: '작성 중', due: dayOffset(5), submittedAt: '' },
    },
    createdAt: Date.now() - 86400000 * 110, updatedAt: Date.now() - 86400000,
  },
  {
    // (4) 법원 접수 — 소장은 다 됐고 인지대만 내면 된다
    id: 'demo-loan4-case', kind: 'complaint', typeKey: 'loan', title: '대여금 반환 청구 (4) 법원 접수', caseNo: '', filedAt: '', filedVia: '', status: '제출 준비',
    entryPoint: 'notified', flowDone: { draft: true },
    form: {
      court: '서울남부지방법원', amount: '8500000',
      pName: '김지민', pRrn: '920315-2******', pAddr: '서울특별시 관악구 남부순환로 1820', pTel: '010-2841-7306',
      dName: '고은채', dAddr: '서울특별시 양천구 목동동로 233',
      loanDate: '2024-02-14', loanAmount: '8500000', payDateSame: '따로 정했어요', loanMethod: '현금', interestSet: '약정 없음',
      demandMade: '내용증명을 보냈어요', demandDate: dayOffset(-48), demandMethod: '내용증명 우편', demandResult: '반환 거부 회신',
      evidenceFiles: [],
    },
    statusAt: { '작성 중': Date.now() - 86400000 * 55, '제출 준비': Date.now() - 86400000 * 3 },
    todos: [
      { id: 'demo-loan4-todo-1', text: '인지대·송달료 납부', due: dayOffset(2), done: false, typeKey: 'prepare', remind: 1, createdAt: Date.now() - 86400000 * 3 },
      { id: 'demo-loan4-todo-2', text: '전자소송으로 소장 접수', due: dayOffset(4), done: false, typeKey: 'filing', remind: 3, createdAt: Date.now() - 86400000 * 3 },
    ],
    events: [{ id: 'demo-loan4-ev-1', kind: 'doc', title: '소장 작성 완료', at: Date.now() - 86400000 * 3, source: 'app' }],
    precedentNos: [],
    docs: [{ id: 'complaint', kind: 'complaint', title: '대여금 반환 소장', progress: 100, createdAt: Date.now() - 86400000 * 12, updatedAt: Date.now() - 86400000 * 3, versions: [{ version: 1, createdAt: demoMoment(-12, '11:05'), note: '최초 생성본' }, { version: 2, createdAt: demoMoment(-3, '16:30'), note: '이자 계산 반영 최종본' }] }],
    docMeta: { complaint: { status: '제출예정', due: dayOffset(4), submittedAt: '' } },
    createdAt: Date.now() - 86400000 * 55, updatedAt: Date.now() - 86400000 * 3,
  },
  {
    // ③ 소장 작성 시작 전 — 내용증명까지 보냈고 답이 없어 소를 준비하려는 참
    id: 'demo-car-case', kind: 'case', typeKey: 'tort', title: '중고차 허위광고 손해배상', caseNo: '', filedAt: '', filedVia: '', status: '작성 중',
    entryPoint: 'notified', flowDone: {},
    form: {
      court: '대전지방법원', amount: '5400000',
      pName: '조은결', pRrn: '960712-1******', pAddr: '대전광역시 유성구 대학로 99', pTel: '010-8823-4417',
      dName: '드림오토 중고차매매상사', dAddr: '대전광역시 대덕구 신탄진로 210',
      incidentDate: '2026-06-18',
      tortKind: '일반 (기)', hasContract: '있음 (계약 위반)',
      accidentHow: '무사고 차량으로 광고했으나 인수 후 정비소에서 전손 수리 이력이 확인되었습니다.',
      demandMade: '내용증명을 보냈어요', demandDate: dayOffset(-17), demandMethod: '내용증명 우편', demandResult: '수령했으나 답변 없음',
      evidenceFiles: evidenceFilesFor('demo-car-case'),
    },
    statusAt: { '작성 중': Date.now() - 86400000 * 22 },
    todos: [
      { id: 'demo-car-todo-1', text: '소장 작성 시작하기', due: dayOffset(6), done: false, typeKey: 'prepare', remind: 3, createdAt: Date.now() - 86400000 * 3 },
      { id: 'demo-car-todo-2', text: '수리 견적서 받아 손해액 확정', due: dayOffset(8), done: false, typeKey: 'prepare', remind: 1, createdAt: Date.now() - 86400000 * 3 },
      { id: 'demo-car-todo-3', text: '내용증명 발송', due: dayOffset(-17), done: true, doneAt: Date.now() - 86400000 * 17, createdAt: Date.now() - 86400000 * 22 },
    ],
    events: [
      { id: 'demo-car-event-1', kind: 'user', title: '내용증명 발송', desc: '손해배상 최고 · 배달증명 수령', at: Date.now() - 86400000 * 17, source: 'user' },
      { id: 'demo-car-event-2', kind: 'user', title: '회신 기한 도과', desc: '14일 안에 답변 없음', at: Date.now() - 86400000 * 3, source: 'user' },
    ],
    precedentNos: [], docs: [], docMeta: {},
    createdAt: Date.now() - 86400000 * 22, updatedAt: Date.now() - 86400000 * 3,
  },
  {
    // ⑤ 소장 작성 완료 — 소장은 다 됐고 인지대·송달료를 내고 접수만 하면 된다
    id: 'demo-wedding-case', kind: 'complaint', typeKey: 'tort', title: '웨딩업체 계약해지 위약금', caseNo: '', filedAt: '', filedVia: '', status: '제출 준비',
    // 소장 문서는 100%인데 폼 입력률로는 그걸 알 수 없어, 작성 완료를 직접 표시해 둔다
    entryPoint: 'notified', flowDone: { draft: true },
    form: {
      court: '서울서부지방법원', amount: '3900000',
      pName: '남세린', pRrn: '930204-2******', pAddr: '서울특별시 은평구 통일로 1050', pAddrDetail: '702호', pTel: '010-5560-2213', pEmail: 'wedding.claim@example.com', pEntity: '개인 (자연인)', pLegalRep: '해당 없음',
      dName: '주식회사 라비드웨딩', dAddr: '서울특별시 마포구 양화로 45', dTel: '02-334-7700', dCount: '한 명', dEntity: '법인', dLegalRep: '대표이사 정소윤',
      incidentDate: '2026-03-02',
      tortKind: '일반 (기)', hasContract: '있음 (계약 위반)', ownFault: '없음',
      accidentHow: '예식 5개월 전에 해지를 통보했는데도 계약금 전액을 위약금으로 몰취했습니다. 소비자분쟁해결기준상 이 시기의 위약금은 계약금의 일부에 그칩니다.',
      demandMade: '내용증명을 보냈어요', demandDate: dayOffset(-33), demandMethod: '내용증명 우편', demandResult: '반환 거부 회신',
      evidenceFiles: evidenceFilesFor('demo-wedding-case'),
    },
    statusAt: { '작성 중': Date.now() - 86400000 * 41, '제출 준비': Date.now() - 86400000 * 2 },
    todos: [
      { id: 'demo-wedding-todo-1', text: '인지대·송달료 납부', due: dayOffset(4), done: false, typeKey: 'prepare', remind: 1, createdAt: Date.now() - 86400000 * 2 },
      { id: 'demo-wedding-todo-2', text: '소장 부본·증거 사본 준비', due: dayOffset(5), done: false, typeKey: 'prepare', remind: 1, createdAt: Date.now() - 86400000 * 2 },
      { id: 'demo-wedding-todo-3', text: '전자소송으로 소장 접수', due: dayOffset(6), done: false, typeKey: 'filing', remind: 3, createdAt: Date.now() - 86400000 * 2 },
    ],
    events: [
      { id: 'demo-wedding-event-1', kind: 'user', title: '내용증명 발송', desc: '위약금 반환 최고', at: Date.now() - 86400000 * 33, source: 'user' },
      { id: 'demo-wedding-event-2', kind: 'doc', title: '소장 작성 완료', desc: '소비자분쟁해결기준 반영', at: Date.now() - 86400000 * 2, source: 'app' },
    ],
    precedentNos: [],
    docs: [
      { id: 'complaint', kind: 'complaint', title: '웨딩 위약금 반환 소장', progress: 100, createdAt: Date.now() - 86400000 * 11, updatedAt: Date.now() - 86400000 * 2, versions: [{ version: 1, createdAt: demoMoment(-11, '13:40'), note: '위약금 약정 정리 초안' }, { version: 2, createdAt: demoMoment(-2, '09:55'), note: '소비자분쟁해결기준 반영 최종본' }] },
      { id: 'evidence', kind: 'evidence', title: '증거목록 (갑 제1~3호증)', progress: 100, createdAt: Date.now() - 86400000 * 5, updatedAt: Date.now() - 86400000 * 2 },
    ],
    docMeta: { complaint: { status: '제출예정', due: dayOffset(6), submittedAt: '' }, evidence: { status: '제출예정', due: dayOffset(6), submittedAt: '' } },
    createdAt: Date.now() - 86400000 * 41, updatedAt: Date.now() - 86400000 * 2,
  },
  {
    // ⑦ 변론 — 접수 후 기일이 잡혀 서면이 오가는 중
    id: 'demo-lease-case', kind: 'complaint', typeKey: 'deposit', title: '임대차 보증금 반환 청구',
    caseNo: CASE_NO, filedAt: dayOffset(-88), filedVia: '전자소송', status: '진행 중',
    entryPoint: 'filed', flowDone: {},
    form: {
      court: '서울중앙지방법원', amount: '10000000',
      pName: '김지민', pRrn: '920315-2******', pAddr: '서울특별시 관악구 남부순환로 1820', pAddrDetail: '503호', pTel: '010-2841-7306', pEmail: 'jimin.kim@example.com', pEntity: '개인 (자연인)', pLegalRep: '해당 없음',
      dName: '이현우', dAddr: '서울특별시 강남구 테헤란로 152', dAddrDetail: '1204호', dTel: '010-9274-1185', dCount: '한 명', dEntity: '개인 (자연인)', dLegalRep: '해당 없음',
      leaseKind: '주택', propertyAddr: '서울특별시 관악구 남부순환로 1820', propertyAddrDetail: '503호', contractDate: '2024-01-01', depositAmount: '10000000', leaseStart: '2024-01-01', depositPaidDate: '2024-01-01', leaseEnd: '2026-01-01', endWay: '기간 만료', handover: '비워줬어요', handoverDate: '2026-01-03', leaseReg: '신청·완료', deductClaim: '1200000',
      refuseReasons: ['원상회복 비용을 공제하겠다', '이유 없이 미루기만 한다'], refuseDetail: '도배·장판 교체비 120만원을 공제한 뒤 돌려주겠다는 문자만 반복했습니다.',
      demandMade: '내용증명을 보냈어요', demandDate: dayOffset(-104), demandMethod: '내용증명 우편', demandResult: '수령했으나 답변 없음',
      evidenceFiles: evidenceList.map(evidenceFileForCase),
    },
    statusAt: { '작성 중': new Date(`${dayOffset(-120)}T09:00:00`).getTime(), '제출 준비': new Date(`${dayOffset(-96)}T15:30:00`).getTime(), '접수함': new Date(`${dayOffset(-88)}T10:20:00`).getTime(), '진행 중': new Date(`${dayOffset(-45)}T11:00:00`).getTime() },
    todos: [
      { id: 'demo-todo-1', text: '준비서면(2) 제출', due: BRIEF_DUE, time: '10:00', done: false, createdAt: Date.now() - 86400000 * 7 },
      { id: 'demo-todo-2', text: '제1회 변론기일 참석', due: HEARING, time: '14:00', done: false, place: '서울중앙지방법원 327호', source: 'court-notice', noticeName: '변론기일통지서', createdAt: Date.now() - 86400000 * 5 },
      { id: 'demo-todo-3', text: '임대차계약서 원본 대조', due: dayOffset(-12), done: true, doneAt: Date.now() - 86400000 * 10, createdAt: Date.now() - 86400000 * 20 },
    ],
    events: [
      { id: 'demo-event-1', kind: 'schedule', title: '변론기일통지서에서 일정 등록', desc: `${dateLabel(HEARING)} 14:00 · 327호 법정`, at: Date.now() - 86400000 * 5, source: 'user' },
      { id: 'demo-event-2', kind: 'doc', title: '준비서면(1) 제출 완료', desc: '전자소송 제출', at: Date.now() - 86400000 * 12, source: 'app' },
      { id: 'demo-event-3', kind: 'evidence', title: '갑 제4호증 개인정보 확인', desc: '제3자 전화번호 가림 처리', at: Date.now() - 86400000 * 14, source: 'app' },
    ],
    precedentNos: ['2025다220329', '2024다268508'],
    docs: [
      { id: 'brief1', kind: 'brief', title: '준비서면(1) — 공제 주장 반박', progress: 100, createdAt: Date.now() - 86400000 * 45, updatedAt: Date.now() - 86400000 * 40, versions: [{ version: 1, createdAt: demoMoment(-45), submittedAt: dayOffset(-40), note: '법원 제출본' }] },
      { id: 'brief2', kind: 'brief', title: '준비서면(2) — 원상복구 범위', progress: 65, createdAt: Date.now() - 86400000 * 8, updatedAt: Date.now() - 86400000, versions: [{ version: 1, createdAt: demoMoment(-8), note: '쟁점 정리 초안' }, { version: 2, createdAt: demoMoment(-1), note: '사진 증거 반영본' }] },
      { id: 'evidence', kind: 'evidence', title: '증거목록 (갑 제1~6호증)', progress: 82, createdAt: Date.now() - 86400000 * 18, updatedAt: Date.now() - 86400000 * 2, versions: [{ version: 1, createdAt: demoMoment(-18), note: '최초 생성본' }, { version: 2, createdAt: demoMoment(-2), note: '입증취지 보완본' }] },
    ],
    docMeta: {
      brief1: { status: '제출완료', due: dayOffset(-40), submittedAt: dayOffset(-40) },
      brief2: { status: '작성 중', due: BRIEF_DUE, submittedAt: '' },
      evidence: { status: '제출예정', due: EVID_DUE, submittedAt: '' },
    },
    docVersions: { complaint: demoBoardRows.find((row) => row.key === 'd-c1')?.versions || [] },
    createdAt: Date.now() - 86400000 * 120,
    updatedAt: Date.now() - 3600000 * 2,
  },
  {
    // ④ 소장 작성 중 — 내용증명·진정까지 마치고 소장을 쓰는 중 (80%)
    id: 'demo-labor-case', kind: 'case', typeKey: 'wage', title: '임금체불 청구', caseNo: '', filedAt: '', filedVia: '', status: '작성 중',
    entryPoint: 'notified', flowDone: {},
    form: { court: '서울남부지방법원', amount: '7400000', pName: '박서연', pRrn: '950811-2******', pAddr: '서울특별시 영등포구 선유로 82', pTel: '010-3951-4280', dName: '주식회사 한빛물류', dAddr: '서울특별시 구로구 디지털로 32길 30', hireDate: '2023-03-06', leaveDate: '2026-06-30', payKind: '월급', payAmount: '3100000', payDay: '매월 25일', workerCount: '5인 이상', unpaidItems: ['임금', '연장근로수당'], unpaidTotal: '7400000', calcWage: '6200000', calcOvertime: '1200000', calcBasis: '2026년 5월·6월 급여와 연장근로수당을 합산했습니다.', laborReport: '진정 접수함', reportNo: '2026-서울남부-01234', reportDoc: '발급 완료', evidenceFiles: evidenceFilesFor('2024가단998877') },
    statusAt: { '작성 중': Date.now() - 86400000 * 28, '제출 준비': Date.now() - 86400000 * 3 },
    todos: [{ id: 'demo-labor-todo-1', text: '소장 최종 검토', due: dayOffset(12), done: false, createdAt: Date.now() - 86400000 * 3 }], events: [{ id: 'demo-labor-event-1', kind: 'doc', title: '소장 초안 생성', desc: '연장근로 내역 반영', at: Date.now() - 86400000, source: 'app' }], precedentNos: ['2023두54914'], docs: [], docMeta: {}, createdAt: Date.now() - 86400000 * 28, updatedAt: Date.now() - 86400000,
  },
  {
    // ⑨ 종결 — 선고 후 항소기간이 지나 확정됐다
    id: 'demo-loan-case', kind: 'complaint', typeKey: 'loan', title: '대여금 반환 청구 (6) 판결·종결', caseNo: '2024가소445566', filedAt: dayOffset(-31), filedVia: '전자소송', status: '종결',
    entryPoint: 'filed', flowDone: {},
    form: { court: '서울동부지방법원', amount: '5000000', pName: '최도윤', pRrn: '890201-1******', pAddr: '서울특별시 성동구 왕십리로 115', pTel: '010-7723-6015', dName: '정민수', dAddr: '서울특별시 광진구 아차산로 272', loanDate: '2023-08-10', loanAmount: '5000000', payDateSame: '계약한 날 바로', loanMethod: '계좌이체', interestSet: '약정 없음', evidenceFiles: evidenceFilesFor('2024가소445566') },
    statusAt: { '작성 중': Date.now() - 86400000 * 52, '제출 준비': Date.now() - 86400000 * 36, '접수함': Date.now() - 86400000 * 31, '진행 중': Date.now() - 86400000 * 24, '종결': Date.now() - 86400000 * 3 },
    todos: [
      { id: 'demo-loan-todo-1', text: '피고 주소 보정 여부 확인', due: dayOffset(-20), done: true, doneAt: Date.now() - 86400000 * 20, createdAt: Date.now() - 86400000 * 26 },
      { id: 'demo-loan-todo-2', text: '판결정본·확정증명원 발급받기', due: dayOffset(-1), done: true, doneAt: Date.now() - 86400000, createdAt: Date.now() - 86400000 * 4 },
    ],
    events: [
      { id: 'demo-loan-event-1', kind: 'status', title: '법원 접수 — 사건번호 2024가소445566', desc: '전자소송', at: Date.now() - 86400000 * 31, source: 'user' },
      { id: 'demo-loan-event-2', kind: 'user', title: '제1회 변론기일 진행', desc: '피고 불출석', at: Date.now() - 86400000 * 20, source: 'user' },
      { id: 'demo-loan-event-3', kind: 'user', title: '판결 선고 — 원고 전부 승소', desc: '피고는 원고에게 4,000,000원 및 지연손해금을 지급하라', at: Date.now() - 86400000 * 17, source: 'user' },
      { id: 'demo-loan-event-4', kind: 'status', title: '항소기간 도과로 판결 확정', desc: '판결정본 송달일부터 2주 (민사소송법 제396조)', at: Date.now() - 86400000 * 3, source: 'user' },
    ],
    precedentNos: ['2025다213495'],
    docs: [{ id: 'evidence', kind: 'evidence', title: '증거목록 (갑 제1~3호증)', progress: 100, createdAt: Date.now() - 86400000 * 34, updatedAt: Date.now() - 86400000 * 31 }],
    docMeta: { evidence: { status: '제출완료', due: dayOffset(-31), submittedAt: dayOffset(-31) } },
    createdAt: Date.now() - 86400000 * 52, updatedAt: Date.now() - 86400000 * 3,
  },
  {
    // ⑧ 판결 — 변론이 종결되고 선고를 기다린다
    id: 'demo-crash-case', kind: 'complaint', typeKey: 'tort', title: '교통사고 손해배상', caseNo: '2025가단334455', filedAt: dayOffset(-54), filedVia: '전자소송', status: '진행 중',
    entryPoint: 'filed', flowDone: { trial: true },
    form: { court: '서울북부지방법원', amount: '18600000', pName: '한지우', pRrn: '870624-1******', pAddr: '서울특별시 노원구 동일로 1414', pTel: '010-4408-2276', dName: '오세훈', dAddr: '서울특별시 도봉구 방학로 88', incidentDate: '2025-09-12', accidentPlace: '서울특별시 노원구 상계동 교차로', accidentHow: '피고 차량이 중앙선을 침범해 원고 차량 좌측면을 충격했습니다.', injury: '경추 염좌 등 12주 치료', treatCost: '4120000', lostIncome: '9480000', solatium: '5000000', insurerTalk: '보험사 제시액 720만원, 협의 결렬', evidenceFiles: evidenceFilesFor('2025가단334455') },
    statusAt: { '작성 중': Date.now() - 86400000 * 70, '제출 준비': Date.now() - 86400000 * 58, '접수함': Date.now() - 86400000 * 54, '진행 중': Date.now() - 86400000 * 26 },
    todos: [
      { id: 'demo-crash-todo-1', text: '판결 선고기일 확인', due: dayOffset(9), time: '10:00', done: false, place: '서울북부지방법원 제312호 법정', typeKey: 'hearing', remind: 3, source: 'court-notice', noticeName: '판결선고기일통지서', createdAt: Date.now() - 86400000 * 2 },
      { id: 'demo-crash-todo-2', text: '급여명세서 동료 정보 가림 처리', due: dayOffset(4), done: false, typeKey: 'prepare', remind: 1, createdAt: Date.now() - 86400000 },
      { id: 'demo-crash-todo-3', text: '준비서면(1) — 과실비율 반박 제출', due: dayOffset(-6), done: true, doneAt: Date.now() - 86400000 * 6, createdAt: Date.now() - 86400000 * 14 },
    ],
    events: [
      { id: 'demo-crash-event-1', kind: 'status', title: '법원 접수 — 사건번호 2025가단334455', desc: '전자소송', at: Date.now() - 86400000 * 54, source: 'user' },
      { id: 'demo-crash-event-2', kind: 'user', title: '피고 답변서 수령', desc: '과실비율 30:70 주장', at: Date.now() - 86400000 * 21, source: 'user' },
      { id: 'demo-crash-event-3', kind: 'user', title: '변론 종결', desc: '선고기일 지정', at: Date.now() - 86400000 * 2, source: 'user' },
    ],
    precedentNos: ['2024다268508'],
    docs: [
      { id: 'brief1', kind: 'brief', title: '준비서면(1) — 과실비율에 대한 반박', progress: 100, createdAt: Date.now() - 86400000 * 14, updatedAt: Date.now() - 86400000 * 6, versions: [{ version: 1, createdAt: demoMoment(-14, '15:20'), submittedAt: dayOffset(-6), note: '법원 제출본' }] },
      { id: 'evidence', kind: 'evidence', title: '증거목록 (갑 제1~5호증)', progress: 100, createdAt: Date.now() - 86400000 * 57, updatedAt: Date.now() - 86400000 * 54 },
    ],
    docMeta: { brief1: { status: '제출완료', due: dayOffset(-6), submittedAt: dayOffset(-6) }, evidence: { status: '제출완료', due: dayOffset(-54), submittedAt: dayOffset(-54) } },
    createdAt: Date.now() - 86400000 * 70, updatedAt: Date.now() - 3600000 * 20,
  },
  {
    // ⑥ 법원 접수 완료 — 사건번호는 받았고 아직 기일통지서 전
    id: 'demo-evict-case', kind: 'complaint', typeKey: 'evict', title: '상가 건물명도 청구', caseNo: '2025가단776655', filedAt: dayOffset(-19), filedVia: '전자소송', status: '접수함',
    entryPoint: 'filed', flowDone: {},
    form: { court: '수원지방법원', amount: '42000000', pName: '윤가은', pRrn: '780509-2******', pAddr: '경기도 수원시 팔달구 인계로 123', pTel: '010-6612-9034', dName: '주식회사 미담푸드', dAddr: '경기도 수원시 권선구 세화로 44', leaseKind: '상가', propertyDesc: '경기도 수원시 권선구 세화로 44\n철근콘크리트조 4층 근린생활시설 제1층 제102호 84.3㎡', monthlyRent: '2000000', unpaidMonths: '7', unpaidTotal: '14000000', terminationDate: '2025-11-03', terminationWay: '내용증명 우편', evidenceFiles: evidenceFilesFor('2025가단776655') },
    statusAt: { '작성 중': Date.now() - 86400000 * 40, '제출 준비': Date.now() - 86400000 * 26, '접수함': Date.now() - 86400000 * 19 },
    todos: [
      { id: 'demo-evict-todo-1', text: '등기사항전부증명서 최신본 재발급', due: dayOffset(7), done: false, typeKey: 'prepare', remind: 1, createdAt: Date.now() - 86400000 * 3 },
      { id: 'demo-evict-todo-2', text: '기일통지서 도착하면 일정 등록하기', due: dayOffset(12), done: false, typeKey: 'prepare', remind: 3, createdAt: Date.now() - 86400000 * 2 },
    ],
    events: [
      { id: 'demo-evict-event-1', kind: 'user', title: '점유이전금지가처분 인용', desc: '집행 완료', at: Date.now() - 86400000 * 22, source: 'user' },
      { id: 'demo-evict-event-2', kind: 'status', title: '법원 접수 — 사건번호 2025가단776655', desc: '전자소송', at: Date.now() - 86400000 * 19, source: 'user' },
    ],
    precedentNos: [],
    docs: [{ id: 'petition1', kind: 'petition', title: '점유이전금지가처분 신청서', progress: 100, createdAt: Date.now() - 86400000 * 27, updatedAt: Date.now() - 86400000 * 24 }],
    docMeta: { petition1: { status: '제출완료', due: dayOffset(-24), submittedAt: dayOffset(-24) } },
    createdAt: Date.now() - 86400000 * 40, updatedAt: Date.now() - 86400000 * 2,
  },
  {
    // ② 내용증명 — 분쟁 경위는 정리했고 이제 최고서를 보낼 차례
    id: 'demo-repair-case', kind: 'case', typeKey: 'tort', title: '인테리어 하자 손해배상', caseNo: '', filedAt: '', filedVia: '', status: '작성 중',
    entryPoint: 'dispute', flowDone: {},
    form: { court: '인천지방법원', amount: '6300000', pName: '서준호', pRrn: '910118-1******', pAddr: '인천광역시 연수구 컨벤시아대로 165', pTel: '010-2277-5518', dName: '더한스페이스 인테리어', dAddr: '인천광역시 남동구 논현로 46', incidentDate: '2026-05-20', accidentHow: '준공 2개월 만에 천장 배관에서 누수가 발생해 마루와 벽지가 손상됐습니다.', repairCost: '6300000', demandMade: '전화·문자로만 요구했어요', evidenceFiles: evidenceFilesFor('demo-repair-case') },
    statusAt: { '작성 중': Date.now() - 86400000 * 9 },
    todos: [
      { id: 'demo-repair-todo-1', text: '하자 보수 견적서 한 곳 더 받기', due: dayOffset(5), done: false, createdAt: Date.now() - 86400000 * 2 },
      { id: 'demo-repair-todo-2', text: '내용증명 발송', due: dayOffset(10), done: false, createdAt: Date.now() - 86400000 * 2 },
      { id: 'demo-repair-todo-3', text: '누수 부위 사진 추가 촬영', due: dayOffset(-2), done: true, doneAt: Date.now() - 86400000 * 2, createdAt: Date.now() - 86400000 * 6 },
    ],
    events: [{ id: 'demo-repair-event-1', kind: 'doc', title: '소장 초안 생성', desc: '하자 내역과 보수 견적 반영', at: Date.now() - 86400000 * 3, source: 'app' }],
    precedentNos: [],
    docs: [], docMeta: {},
    createdAt: Date.now() - 86400000 * 9, updatedAt: Date.now() - 86400000 * 2,
  },
]

// 대한민국 법원 전자소송 사이트
export const courtUrl = 'https://ecfs.scourt.go.kr/'

// 폴더 보기(파일 탐색기) 데모 데이터
//
// 종이 서류철이 그렇듯, 자료는 **사건 단위로 묶이고 그 안에서 종류별로 갈린다**.
// 종류를 맨 위에 두면 '영수증' 폴더 안에 서로 다른 사건의 영수증이 섞여
// "이 영수증이 어느 사건 것이더라"를 매번 파일명으로 되짚어야 한다.
const evidenceCaseFolderSeed = [
  {
    key: CASE_NO, caseNo: CASE_NO, title: '임대차 보증금 반환 청구',
    court: '서울중앙지방법원', status: '진행 중', tone: 'blue',
    folders: [
      {
        key: 'complaint', name: '소장·서면', tags: ['소장', '서면'],
        files: [
          { name: '임대차_보증금_반환_소장.pdf', desc: '법원 접수본', size: '1.2 MB', date: '2026-02-14', status: '제출완료' },
          { name: '증거목록.pdf', desc: '갑 제1~6호증 목록', size: '0.4 MB', date: '2026-02-15', status: '제출완료' },
          { name: '준비서면_1차.pdf', desc: '피고 답변에 대한 반박', size: '0.9 MB', date: '2026-03-02', status: '대기중' },
        ],
      },
      {
        key: 'contract', name: '계약서', tags: ['임대차', '계약'],
        files: [
          { name: '임대차계약서.pdf', desc: '2024년 1월 1일자 임대차 계약', size: '2.3 MB', date: '2026-02-15', status: '제출완료' },
          { name: '특약사항_확인서.pdf', desc: '계약서 특약 조항', size: '1.8 MB', date: '2026-03-01', status: '대기중' },
        ],
      },
      {
        key: 'receipt', name: '영수증·입금증', tags: ['영수증', '비용'],
        files: [
          { name: '보증금_입금증.jpg', desc: '보증금 1,000만원 입금 내역', size: '1.1 MB', date: '2026-02-15', status: '제출완료' },
          { name: '월세_납부내역.pdf', desc: '24개월 월세 납부 내역', size: '1.9 MB', date: '2026-02-18', status: '제출완료' },
          { name: '관리비_영수증.jpg', desc: '관리비 납부 영수증', size: '0.7 MB', date: '2026-02-19', status: '대기중' },
          { name: '인지대_영수증.jpg', desc: '소장 인지대 납부', size: '0.5 MB', date: '2026-02-25', status: '제출완료' },
          { name: '송달료_영수증.jpg', desc: '송달료 예납 영수증', size: '0.5 MB', date: '2026-02-25', status: '제출완료' },
        ],
      },
      {
        key: 'chat', name: '대화기록', tags: ['대화', '카카오톡'],
        files: [
          { name: '카카오톡_대화내용.pdf', desc: '보증금 반환 관련 대화', size: '3.2 MB', date: '2026-02-20', status: '검토중' },
          { name: '문자_납부내역.pdf', desc: '월세 납부 문자 내역', size: '8.9 MB', date: '2026-02-18', status: '대기중' },
        ],
      },
      {
        key: 'photo', name: '사진', tags: ['사진', '하자'],
        files: [
          { name: '하자보수_사진1.jpg', desc: '벽면 균열 상태', size: '4.1 MB', date: '2026-02-22', status: '대기중' },
          { name: '하자보수_사진2.jpg', desc: '바닥 손상 상태', size: '3.8 MB', date: '2026-02-22', status: '대기중' },
          { name: '현관_상태.jpg', desc: '입주 시 현관 상태', size: '3.6 MB', date: '2026-02-23', status: '검토중' },
          { name: '벽면_상태.jpg', desc: '퇴거 시 벽면 상태', size: '3.7 MB', date: '2026-02-23', status: '검토중' },
        ],
      },
    ],
  },
  {
    key: '2024가단998877', caseNo: '2024가단998877', title: '임금체불 청구',
    court: '서울남부지방법원', status: '준비 중', tone: 'slate',
    folders: [
      {
        key: 'contract', name: '계약서', tags: ['근로계약'],
        files: [
          { name: '근로계약서.pdf', desc: '2023년 3월 입사 계약', size: '1.4 MB', date: '2026-03-04', status: '대기중' },
        ],
      },
      {
        key: 'receipt', name: '영수증·입금증', tags: ['급여', '이체'],
        files: [
          { name: '급여이체내역.pdf', desc: '최근 6개월 급여 입금 내역', size: '0.8 MB', date: '2026-03-04', status: '대기중' },
          { name: '퇴직금_정산서.pdf', desc: '회사가 보낸 정산 내역', size: '0.6 MB', date: '2026-03-05', status: '대기중' },
        ],
      },
      {
        key: 'chat', name: '대화기록', tags: ['메신저'],
        files: [
          { name: '사내메신저_지시내용.pdf', desc: '연장근로 지시 기록', size: '2.1 MB', date: '2026-03-06', status: '대기중' },
        ],
      },
    ],
  },
  {
    key: '2024가소445566', caseNo: '2024가소445566', title: '대여금 반환 청구 (소액)',
    court: '서울동부지방법원', status: '진행 중', tone: 'slate',
    folders: [
      {
        key: 'complaint', name: '소장·서면', tags: ['소액', '소장'],
        files: [
          { name: '대여금_소장.pdf', desc: '소액사건 소장 접수본', size: '0.7 MB', date: '2026-02-27', status: '제출완료' },
        ],
      },
      {
        key: 'contract', name: '계약서', tags: ['차용증'],
        files: [
          { name: '차용증.jpg', desc: '2023년 8월 작성, 500만원', size: '1.0 MB', date: '2026-02-26', status: '제출완료' },
        ],
      },
      {
        key: 'receipt', name: '영수증·입금증', tags: ['송금'],
        files: [
          { name: '계좌이체_확인증.pdf', desc: '500만원 송금 확인', size: '0.5 MB', date: '2026-02-26', status: '제출완료' },
          { name: '일부변제_입금내역.jpg', desc: '100만원 일부 변제', size: '0.4 MB', date: '2026-03-03', status: '대기중' },
        ],
      },
    ],
  },
]

export const evidenceCaseFolders = evidenceCaseFolderSeed.map((caseItem, caseIndex) => ({
  ...caseItem,
  folders: caseItem.folders.map((folder, folderIndex) => ({
    ...folder,
    files: folder.files.map((file, fileIndex) => {
      const seed = sampleSeed(`${caseItem.key}-${folder.key}-${file.name}`)
      const image = /\.(jpg|jpeg|png|webp)$/i.test(file.name)
      const submittedAt = file.status === '제출완료' ? file.date : ''
      const due = submittedAt ? file.date : dayOffset(7 + ((caseIndex + folderIndex + fileIndex) % 12))
      const createdAt = `${file.date}T${String(9 + (fileIndex % 7)).padStart(2, '0')}:${String(10 + folderIndex * 8).padStart(2, '0')}:00`
      const updatedAt = `${file.date}T${String(14 + (fileIndex % 4)).padStart(2, '0')}:40:00`
      return {
        ...file,
        purpose: file.desc,
        pages: image ? 1 : 2 + (seed % 9),
        resolution: image ? `${3024 + (seed % 2) * 1008} × ${2268 + (seed % 3) * 756}` : 'A4 · 210 × 297 mm',
        mimeType: sampleMime(file.name),
        source: image ? '휴대전화 원본 업로드' : '사용자 직접 업로드',
        uploadedBy: '김지민',
        privacyReview: /카카오톡|메신저|문자/.test(file.name) ? '제3자 정보 확인 완료' : '개인정보 확인 완료',
        checksum: `NH-FILE-${String(seed).padStart(6, '0').slice(-6)}`,
        due,
        submittedAt,
        submissionLabel: submittedAt ? `${submittedAt} 제출 완료` : `${due} 제출 예정`,
        createdAt,
        updatedAt,
        versions: [{
          version: 1,
          createdAt,
          submittedAt,
          note: image ? '휴대전화에서 업로드한 원본 사진' : '원본 파일 업로드',
          createdBy: '김지민',
          size: file.size,
        }],
      }
    }),
  })),
}))

export const evidenceRecent = [
  { name: '임대차계약서.pdf', date: '2026-02-15', kind: 'pdf' },
  { name: '보증금_입금증.jpg', date: '2026-02-15', kind: 'img' },
  { name: '월세_납부내역.pdf', date: '2026-02-18', kind: 'pdf' },
  { name: '카카오톡_대화내용.pdf', date: '2026-02-20', kind: 'pdf' },
  { name: '하자부분_사진1.jpg', date: '2026-02-22', kind: 'img' },
]

export const evidenceTips = [
  '모든 자료는 원본과 사본을 구분하여 보관하세요',
  '시간 순서대로 정리하면 사건 흐름 파악이 쉽습니다',
  '중요한 문서는 공증을 받아두는 것이 좋습니다',
  '디지털 파일은 정기적으로 백업하세요',
]

export const faqs = [
  { q: '나홀로법에는 어떤 서비스인가요?', a: '변호사 없이 직접 소송을 준비하는 분들을 위해 소송 절차 안내, 법률 문서 자동 작성, 판례·법령 분석, 증빙/일정 관리를 한곳에서 제공하는 AI 기반 나홀로 소송 지원 플랫폼입니다.' },
  { q: 'AI가 생성한 법률 문서를 그대로 사용해도 되나요?', a: 'AI가 생성한 문서는 초안으로 활용하시되, 반드시 본인의 상황에 맞게 검토하고 수정하셔야 합니다. 복잡한 사안의 경우 전문가의 조언을 받으시는 것을 권장드립니다. 본 서비스는 법률 자문을 대체하지 않으며, 참고 자료로만 활용하시기 바랍니다.' },
  { q: '어떤 종류의 소송에 도움을 받을 수 있나요?', a: '대여금, 임대차 보증금 반환, 손해배상 등 민사 본안 사건과 3,000만원 이하 소액사건을 중심으로 소장·준비서면·증거목록·신청서 작성과 절차 안내를 지원합니다.' },
  { q: '업로드한 개인정보와 자료는 안전하게 보관되나요?', a: '업로드된 자료는 암호화되어 보관되며, 소송 준비 목적 외에는 사용되지 않습니다. 증거에 포함된 제3자 개인정보는 AI가 자동으로 탐지해 마스킹을 안내합니다.' },
  { q: '법률 문서 작성 경험이 전혀 없어도 이용할 수 있나요?', a: '네. AI가 제안하는 질문에 일상 언어로 답하기만 하면, 법률 요건에 맞는 문서 초안을 자동으로 만들어 드립니다. 어려운 법률 용어는 AI가 알아서 변환합니다.' },
]

export const features = [
  { icon: 'Scroll', title: 'AI 법률 문서 생성', desc: '소송 유형과 상황을 분석하여 소장, 준비서면 등 주요 법률 문서를 자동 생성합니다.' },
  { icon: 'Book', title: '소송 절차 안내', desc: '소장 접수부터 판결까지, 각 단계별 필요 서류와 기한을 단계적으로 안내합니다.' },
  { icon: 'Scale', title: '판례·법령 분석', desc: '내 사건과 유사한 판례를 찾아 참고할 수 있는 정보와 통계를 제공합니다.' },
  { icon: 'Folder', title: '증빙 자료 관리', desc: '증거를 호증 번호 체계로 정리하고, 누락·보안 위험을 AI가 점검합니다.' },
  { icon: 'Calendar', title: '일정·기한 관리', desc: '법원 통지서의 날짜를 추출한 뒤 사용자가 원문과 확인한 일정만 사건 캘린더에 등록합니다.' },
  { icon: 'Sparkles', title: 'Multi-Agent AI', desc: '문서·판례·절차 전담 에이전트가 협업하여 소송 준비 전 과정을 통합 지원합니다.' },
]
