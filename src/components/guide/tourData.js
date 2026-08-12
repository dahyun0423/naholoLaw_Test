const app = (route, selector) => `[data-app-route="${route}"] ${selector}`

export const TOUR_ROUTES = [
  { key: 'dashboard', path: '/app/dashboard', label: '대시보드', desc: '급한 일과 사건 현황에서 바로 다음 행동으로 이동해요.' },
  { key: 'cases', path: '/app/cases', label: '사건 관리', desc: '사건을 만들고 다음 준비사항이 있는 사건부터 열어요.' },
  { key: 'documents', path: '/app/documents', label: '문서 생성', desc: '사건을 고른 뒤 필요한 법률 문서를 이어서 작성해요.' },
  { key: 'search', path: '/app/search', label: '판례·법령 검색', desc: '검색 결과를 읽고 내 사건과 문서에 활용해요.' },
  { key: 'procedure', path: '/app/procedure', label: '절차 안내', desc: '현재 소송 단계와 지금 준비할 일을 확인해요.' },
  { key: 'evidence', path: '/app/evidence', label: '증빙 자료', desc: '사건별 증거와 제출 상태를 관리해요.' },
  { key: 'schedule', path: '/app/schedule', label: '일정 관리', desc: '기일과 제출 기한을 확인하고 일정을 추가해요.' },
  { key: 'notifications', path: '/app/notifications', label: '알림 관리', desc: '놓치면 안 되는 알림을 읽고 종류별 수신 여부를 정해요.' },
  { key: 'my', path: '/app/my', label: '마이페이지', desc: '프로필, 사건, 저장공간과 계정 설정을 관리해요.' },
  { key: 'guide', path: '/app/guide', label: '가이드 모음', desc: '원하는 화면의 스포트라이트 가이드를 다시 실행해요.' },
]

const commonEnd = {
  target: '[data-tour="main-nav"]',
  title: '다른 작업은 왼쪽 메뉴에서',
  body: '사건 관리, 문서, 증거, 일정은 같은 사건 데이터를 공유합니다. 필요한 작업으로 이동해 이어서 진행하세요.',
  place: 'right',
}

export const TOUR_STEPS = {
  dashboard: [
    { target: app('dashboard', 'h1'), title: '오늘 할 일부터 확인하세요', body: '진행 중인 사건 수와 다음 일정이 실제 내 사건 기준으로 표시됩니다.', place: 'bottom' },
    { target: app('dashboard', '> div > div:nth-child(2)'), title: '가장 급한 준비사항', body: '기한이 지난 일이나 가장 가까운 일을 먼저 보여줍니다. 버튼을 누르면 해당 사건 상세로 이동합니다.', place: 'bottom' },
    { target: app('dashboard', '> div > div:nth-child(3)'), title: '숫자도 바로가기입니다', body: '사건·일정·문서·증거 카드를 누르면 각 관리 화면에서 곧바로 이어서 할 수 있어요.', place: 'bottom' },
    { target: app('dashboard', '> div > div:nth-child(4)'), title: '일정과 최근 사건', body: '일정 항목과 최근 사건 카드도 각각 실제 사건으로 연결됩니다.', place: 'top' },
  ],
  cases: [
    { target: app('cases', 'h1'), title: '모든 사건의 출발점', body: '사건마다 문서·증거·판례·일정과 다음 준비사항이 함께 모입니다.', place: 'bottom' },
    { target: app('cases', '[aria-pressed]'), title: '우선순위를 바꿔 보세요', body: '최근 작업순과 급한 순을 바꿔 지금 먼저 볼 사건을 빠르게 찾을 수 있습니다.', place: 'bottom' },
    { target: app('cases', 'ul button[aria-label*="사건 열기"]'), title: '사건 카드 열기', body: '카드에서 현재 단계와 다음 할 일을 확인한 뒤 눌러 상세로 들어가세요.', place: 'right' },
    { target: app('cases', 'button[aria-label="새 사건 만들기"]'), title: '분쟁이 생기면 먼저 등록', body: '사건번호가 아직 없어도 사건을 만들고 자료와 준비사항을 모을 수 있습니다.', place: 'left' },
  ],
  'case-detail': [
    { target: app('case-detail', 'h1'), title: '이 사건의 작업 공간', body: '상태, 사건번호와 법원을 확인하고 필요한 경우 정보를 수정할 수 있습니다.', place: 'bottom' },
    { target: app('case-detail', '> div > div:nth-child(2)'), title: '현재 상황을 한눈에', body: '남은 할 일, 문서, 증거와 검토 항목을 숫자로 확인하고 각 작업으로 이동하세요.', place: 'bottom' },
    { target: app('case-detail', 'button, a'), title: '카드 안 행동을 이용하세요', body: '할 일 추가·문서 작성·증거 정리처럼 각 카드에서 바로 다음 행동을 시작할 수 있습니다.', place: 'bottom' },
    commonEnd,
  ],
  documents: [
    { target: app('documents', 'h1'), title: '법률 문서 작성 도우미', body: '먼저 문서를 붙일 사건을 확인하고 작성할 문서 유형을 선택합니다.', place: 'bottom' },
    { target: app('documents', '> div > div:nth-child(2)'), title: '문서 유형 선택', body: '소장, 준비서면 등 필요한 문서를 고르면 단계별 작성 화면이 열립니다.', place: 'bottom' },
    { target: app('documents', '> div > div:nth-child(3)'), title: '최근 문서 확인', body: '작성한 문서가 있으면 최근 작업을 확인하고 이어서 관리할 수 있습니다.', place: 'top' },
    { target: app('documents', '> div > div:last-child'), title: '도구와 작성 팁', body: '비용 계산과 절차 안내를 함께 참고하면 제출 전에 빠진 내용을 줄일 수 있어요.', place: 'top' },
  ],
  search: [
    { target: app('search', 'h1'), title: '판례와 법령을 함께 찾습니다', body: '사건번호, 사건명이나 일상적인 표현으로 검색을 시작하세요.', place: 'bottom' },
    { target: app('search', 'input[type="search"], input'), title: '검색어는 구체적으로', body: '분쟁 유형과 쟁점을 함께 입력하면 관련 결과를 더 빠르게 좁힐 수 있습니다.', place: 'bottom' },
    { target: app('search', 'button[type="submit"], form button'), title: '검색 실행', body: '검색 후 판례와 법령 탭을 오가며 필요한 근거를 확인하세요.', place: 'bottom' },
    { target: app('search', 'main section, section'), title: '결과를 내 작업으로 연결', body: '원문 출처를 확인하고 저장하거나 문서 작성 화면으로 가져갈 수 있습니다.', place: 'top' },
  ],
  procedure: [
    { target: app('procedure', 'h1'), title: '내 사건의 현재 절차', body: '사건을 고르면 실제 진행 상태에 맞춰 현재 단계와 남은 준비를 보여줍니다.', place: 'bottom' },
    { target: app('procedure', 'ol'), title: '전체 흐름과 현재 위치', body: '분쟁 발생부터 판결까지 흐름을 보고, 강조된 현재 단계에서 할 일을 확인하세요.', place: 'right' },
    { target: app('procedure', 'aside, > div > div > div:last-child'), title: '기한과 준비물', body: '현재 단계에 필요한 기한·자료를 확인하고 바로 관련 화면으로 이동할 수 있습니다.', place: 'left' },
    { target: app('procedure', 'button'), title: '체크리스트와 계산 도구', body: '제출 전 체크리스트와 비용 계산기를 열어 마지막으로 빠진 내용을 점검하세요.', place: 'top' },
  ],
  evidence: [
    { target: app('evidence', 'h1'), title: '사건별 증빙 자료', body: '계약서·사진·송금내역과 법원 제출 상태를 한곳에서 관리합니다.', place: 'bottom' },
    { target: app('evidence', 'button:nth-of-type(1)'), title: '보기 방식을 선택하세요', body: '제출 상태를 훑을 때는 리스트, 파일을 정리할 때는 폴더형 보기가 편합니다.', place: 'bottom' },
    { target: app('evidence', 'table, [role="table"], > div > div:nth-child(2)'), title: '자료와 제출 상태 확인', body: '사건과 서류 종류를 좁히고 각 자료의 이름·입증취지·제출 상태를 관리하세요.', place: 'top' },
    { target: app('evidence', 'a[href="/app/documents"]'), title: '빠진 서류는 바로 작성', body: '증빙을 확인하다 필요한 문서가 생기면 문서 작성 화면으로 바로 이동할 수 있습니다.', place: 'left' },
  ],
  schedule: [
    { target: app('schedule', 'h1'), title: '기일과 제출 기한 관리', body: '사건의 준비사항에 적은 기한을 달력과 목록에서 함께 확인합니다.', place: 'bottom' },
    { target: '[data-guide="schedule-calendar"]', title: '달력에서 날짜 선택', body: '날짜를 누르면 그날의 실제 사건 일정을 확인하고 새 일정을 추가할 수 있습니다.', place: 'right' },
    { target: '[data-guide="schedule-list"]', title: '선택한 날과 다가오는 일정', body: '가까운 기한부터 확인해 놓치기 쉬운 준비사항을 먼저 처리하세요.', place: 'left' },
    { target: '[data-guide="schedule-notice"]', title: '법원 통지서로 등록', body: '전자소송에서 받은 텍스트 PDF를 읽고, 원문과 확인한 날짜만 사건 일정에 저장합니다.', place: 'bottom' },
  ],
  notifications: [
    { target: app('notifications', 'h1'), title: '알림을 한곳에서 확인', body: '기일과 제출 기한처럼 놓치면 안 되는 소식을 읽고 관리합니다.', place: 'bottom' },
    { target: app('notifications', '> div > div:nth-child(2) > div:first-child'), title: '알림 목록', body: '새 알림을 누르면 읽음 상태로 바뀝니다. 모두 읽음으로 한 번에 정리할 수도 있어요.', place: 'right' },
    { target: app('notifications', '> div > div:nth-child(2) > div:last-child'), title: '알림 종류 선택', body: '변론기일, 제출 기한 등 필요한 알림만 켜두세요.', place: 'left' },
  ],
  my: [
    { target: app('my', 'h1'), title: '내 계정과 작업 현황', body: '프로필, 사건 요약과 계정 설정을 한곳에서 관리합니다.', place: 'bottom' },
    { target: app('my', '> div > div:nth-child(2) > div:first-child'), title: '프로필과 작업 요약', body: '프로필을 수정하고 문서·증거·일정 수를 눌러 각 화면으로 이동하세요.', place: 'right' },
    { target: app('my', '> div > div:nth-child(2) > div:last-child > div:first-child'), title: '최근 사건 이어서 하기', body: '최근 수정한 사건을 열어 다음 준비사항을 이어서 처리할 수 있습니다.', place: 'left' },
    { target: app('my', '> div > div:nth-child(2) > div:last-child > div:nth-child(2)'), title: '저장공간과 구독', body: '현재 저장공간 플랜을 확인하고 필요한 경우 구독을 변경하세요.', place: 'left' },
  ],
  guide: [
    { target: app('guide', 'h1'), title: '화면별 사용가이드', body: '글을 따로 읽는 대신 실제 화면 위에서 중요한 기능을 순서대로 짚어드립니다.', place: 'bottom' },
    { target: app('guide', '[data-tour="current-guide"]'), title: '현재 화면 다시 둘러보기', body: '이 버튼을 누르면 지금 보고 있는 가이드 화면의 투어를 언제든 다시 실행합니다.', place: 'bottom' },
    { target: app('guide', '[data-tour="guide-list"]'), title: '원하는 화면을 선택하세요', body: '화면으로 이동하면서 투어가 자동으로 시작됩니다. 완료한 가이드도 다시 볼 수 있어요.', place: 'top' },
    commonEnd,
  ],
}

const STORAGE_PREFIX = 'naholo_tour:'

export function tourKeyForPath(pathname = '') {
  if (/^\/app\/cases\/[^/]+/.test(pathname)) return 'case-detail'
  const found = TOUR_ROUTES.find((route) => pathname === route.path || pathname.startsWith(`${route.path}/`))
  return found?.key || 'dashboard'
}

export function tourStepsForPath(pathname) {
  const key = tourKeyForPath(pathname)
  return { key, steps: TOUR_STEPS[key] || TOUR_STEPS.dashboard }
}

export function tourSeen(key) {
  try { return Boolean(localStorage.getItem(`${STORAGE_PREFIX}${key}`)) } catch { return false }
}

export function markTourSeen(key) {
  try { localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify({ completedAt: Date.now() })) } catch { /* 저장 불가 환경 */ }
  window.dispatchEvent(new CustomEvent('naholo:tour-complete', { detail: { key } }))
}

export function requestProductTour(pathname = window.location.pathname) {
  window.dispatchEvent(new CustomEvent('naholo:start-tour', { detail: { pathname } }))
}
