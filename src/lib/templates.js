// 도움 콘텐츠용 유틸: 워드 양식 고르기 · 영상 검색 · 공식 자료 링크

export function youtubeSearch(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
}

// 실제 공공 법률 자료
export const resources = {
  // 옛 전자민원센터(help.scourt.go.kr)는 2025.1.31 전자소송포털로 통합되어 도메인이 없어졌다.
  naholo: 'https://ecfs.scourt.go.kr/psp/index.on?m=PSPJ02M01', // 전자소송포털 > 나홀로소송
  easylaw: 'https://www.easylaw.go.kr/',    // 찾기 쉬운 생활법령정보
  ecfs: 'https://ecfs.scourt.go.kr/',       // 대한민국 법원 전자소송
}

// 도움 콘텐츠의 ‘템플릿’ 항목 → 템플릿 보기와 같은 워드 양식
// (예전에는 .txt 를 즉석에서 만들어 내려줬다. 이제는 법원 서면 모양을 갖춘 .docx 를 준다.)
export function templateFor(title = '') {
  if (title.includes('기일변경')) return 'petition'
  if (title.includes('준비서면')) return 'brief'
  if (title.includes('증거')) return 'evidence'
  if (title.includes('답변서')) return 'answer'
  if (title.includes('보정')) return 'correction'
  if (title.includes('내용증명')) return 'demand'
  return 'complaint-deposit'
}
