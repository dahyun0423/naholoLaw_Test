// ── 투어가 가리킬 곳을 고르는 규칙 ─────────────────────────────
//
// 화면 구조로 짚지 않는다. `> div > div:nth-child(3)` 같은 선택자는 그 화면을
// 한 번만 손봐도 엉뚱한 칸을 강조하거나 아무것도 못 찾는다 — 실제로 리팩터링
// 뒤에 문서·절차·증빙 투어가 그렇게 어긋났다. 그래서 짚을 곳에는 페이지 쪽에
// `data-guide="…"` 를 직접 달고, 여기서는 그 이름만 부른다.
//
// 콤마로 여러 후보를 적지 않는다. `app()` 은 맨 앞 하나에만 접두사를 붙이므로
// `app(r, 'a, b')` 의 `b` 는 사이드바까지 포함한 화면 전체에서 아무거나 잡는다.
//
// 화면 상태에 따라 아직 없는 칸을 짚을 때는 대상을 하나만 두고 본문을 그 상태에서도
// 말이 되게 쓴다. 대상이 없으면 투어가 강조 없이 설명만 보여준다.

const app = (route, selector) => `[data-app-route="${route}"] ${selector}`
const guide = (name) => `[data-guide="${name}"]`

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
    { target: guide('case-overview'), title: '현재 상황을 한눈에', body: '남은 할 일, 문서, 증거와 검토 항목을 숫자로 확인하고 각 작업으로 이동하세요.', place: 'bottom' },
    { target: guide('case-cards'), title: '카드 안 행동을 이용하세요', body: '할 일 추가·문서 작성·증거 정리처럼 각 카드에서 바로 다음 행동을 시작할 수 있습니다.', place: 'top' },
    commonEnd,
  ],
  documents: [
    { target: app('documents', 'h1'), title: '법률 문서 작성 도우미', body: '먼저 문서를 붙일 사건을 확인하고 작성할 문서 유형을 선택합니다.', place: 'bottom' },
    { target: guide('doc-types'), title: '문서 유형 선택', body: '소장, 준비서면 등 필요한 문서를 고르면 단계별 작성 화면이 열립니다.', place: 'bottom' },
    { target: guide('doc-tools'), title: '만들기 전에 볼 도구', body: '비용 계산기와 절차 안내를 먼저 열어보면 제출 전에 빠진 내용을 줄일 수 있어요.', place: 'top' },
    { target: guide('doc-recent'), title: '만든 문서와 작성 팁', body: '지금까지 만든 문서를 확인하고, 옆의 작성 팁을 참고해 이어서 고칠 수 있습니다.', place: 'top' },
  ],
  search: [
    { target: app('search', 'h1'), title: '판례와 법령을 함께 찾습니다', body: '국가법령정보센터의 공개 판례를 내 사건 쟁점에 맞춰 찾아드립니다.', place: 'bottom' },
    { target: guide('search-tabs'), title: '찾는 방법은 두 가지', body: 'AI 분석은 등록한 사건에서 쟁점을 뽑아 찾고, 키워드 검색은 직접 적은 말로 찾습니다.', place: 'bottom' },
    { target: guide('search-body'), title: '여기서 검색을 시작하세요', body: 'AI 분석 탭에서는 분석할 사건을 고르고, 키워드 탭으로 옮기면 검색창이 열립니다.', place: 'top' },
    { target: guide('search-side'), title: '관련 법령과 결과 요약', body: '검색과 함께 관련 법령이 정리됩니다. 원문 출처를 확인하고 내 문서에 인용해 두세요.', place: 'left' },
  ],
  procedure: [
    { target: app('procedure', 'h1'), title: '내 사건의 현재 절차', body: '사건을 고르면 실제 진행 상태에 맞춰 현재 단계와 남은 준비를 보여줍니다.', place: 'bottom' },
    // 사건을 고르기 전에는 아래 두 칸이 아직 화면에 없다. 없으면 설명만 보여주므로
    // 본문을 "고르면 …" 으로 적어 두 상태 모두에서 말이 되게 한다.
    { target: guide('procedure-pick'), title: '먼저 볼 사건을 고르세요', body: '고른 사건 기준으로 절차를 보여드립니다. 이미 고르셨다면 제목 위의 「사건 다시 고르기」로 언제든 바꿀 수 있어요.', place: 'bottom' },
    { target: guide('procedure-flow'), title: '전체 흐름과 현재 위치', body: '사건을 고르면 분쟁 발생부터 판결까지 흐름이 열리고, 지금 서 있는 단계가 강조됩니다.', place: 'right' },
    { target: guide('procedure-side'), title: '기한·준비물과 도구', body: '현재 단계의 기한과 필요한 자료가 오른쪽에 함께 나옵니다. 체크리스트와 비용 계산기로 마지막 점검을 하세요.', place: 'left' },
  ],
  evidence: [
    { target: app('evidence', 'h1'), title: '사건별 증빙 자료', body: '계약서·사진·송금내역과 법원 제출 상태를 한곳에서 관리합니다.', place: 'bottom' },
    { target: guide('evidence-view'), title: '보기 방식을 선택하세요', body: '제출 상태를 훑을 때는 리스트, 파일을 정리할 때는 폴더형 보기가 편합니다.', place: 'bottom' },
    { target: guide('evidence-body'), title: '자료와 제출 상태 확인', body: '사건과 서류 종류를 좁히고 각 자료의 이름·입증취지·제출 상태를 관리하세요.', place: 'top' },
    commonEnd,
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
