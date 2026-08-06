// 도움 콘텐츠용 유틸: 실제 양식 다운로드 · 영상 검색 · 공식 자료 링크

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function youtubeSearch(query) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
}

// 실제 공공 법률 자료
export const resources = {
  naholo: 'https://help.scourt.go.kr/',     // 대한민국 법원 전자민원센터(나홀로소송)
  easylaw: 'https://www.easylaw.go.kr/',    // 찾기 쉬운 생활법령정보
  ecfs: 'https://ecfs.scourt.go.kr/',       // 대한민국 법원 전자소송
}

const NOTE = '\n\n※ 본 양식은 참고용 표준 서식입니다. 법률 자문이 아니며, 제출 전 본인 상황에 맞게\n   수정하고 법원 전자민원센터(help.scourt.go.kr)의 최신 서식을 확인하시기 바랍니다.'

export const templates = {
  소장:
`소                  장

사 건 명 : OOO 청구의 소
소송목적의 값 : 금              원

원    고  (이름)
          (주민등록번호)
          (주소)
          (연락처)

피    고  (이름)
          (주소)

                    청 구 취 지

1. 피고는 원고에게 OOO원 및 이에 대하여 이 사건 소장 부본 송달
   다음 날부터 다 갚는 날까지 연 12%의 비율로 계산한 돈을 지급하라.
2. 소송비용은 피고가 부담한다.
3. 제1항은 가집행할 수 있다.
   라는 판결을 구합니다.

                    청 구 원 인

1. 당사자의 지위
   (원고와 피고의 관계를 적습니다.)

2. 사건의 경위
   (언제, 어떤 일이 있었는지 시간 순서대로 적습니다.)

3. 결론
   따라서 원고는 청구취지와 같은 판결을 구하기 위하여
   이 사건 소를 제기합니다.

                    입 증 방 법

1. 갑 제1호증   (예: 계약서)
2. 갑 제2호증   (예: 입금내역)

                    첨 부 서 류

1. 위 입증방법      각 1통
2. 소장 부본        1통
3. 송달료 납부서    1통

            20  .    .    .

            위 원고                (서명 또는 날인)

     OO지방법원 귀중` + NOTE,

  기일변경신청서:
`기 일 변 경 신 청 서

사    건  20  가단        OOO
원    고
피    고

                    신 청 취 지

이 사건에 관하여 귀원이 지정한 20  .  .  . OO:OO 변론기일을
변경하여 주시기 바랍니다.

                    신 청 이 유

1. (기일에 출석하기 어려운 구체적 사유를 적습니다.
    예: 같은 날 다른 재판 출석, 질병, 출장 등)

2. 이에 부득이 변론기일의 변경을 신청합니다.

                    첨 부 서 류

1. 소명자료(진단서 등)      1통

            20  .    .    .

            위 신청인(원고)                (서명 또는 날인)

     OO지방법원 귀중` + NOTE,

  준비서면:
`준 비 서 면

사    건  20  가단        OOO
원    고
피    고

위 사건에 관하여 원고는 다음과 같이 변론을 준비합니다.

                    다          음

1. 피고 주장의 요지
   (상대방이 어떤 주장을 했는지 정리합니다.)

2. 원고의 반박
   (사실과 법리를 중심으로 반박 내용을 적습니다.)

3. 결론
   그러므로 원고의 청구는 이유 있으므로 인용되어야 합니다.

                    입 증 방 법

필요한 경우 변론기일에 추가 증거를 제출하겠습니다.

            20  .    .    .

            위 원고                (서명 또는 날인)

     OO지방법원 귀중` + NOTE,

  증거목록:
`증 거 목 록 (갑호증)

사건번호  20  가단        OOO
원    고
피    고

호증번호      | 서증명             | 작성일        | 입증취지
------------- + ------------------ + ------------- + --------------------------
갑 제1호증    | (예: 계약서)       | 20  .  .  .   | (이 증거로 입증하려는 사실)
갑 제2호증    | (예: 입금내역)     | 20  .  .  .   |
갑 제3호증    |                    |               |

※ 각 호증의 원본을 소지하고 있으며, 필요 시 법원에 제출하겠습니다.

            20  .    .    .

            위 원고                (서명 또는 날인)

     OO지방법원 귀중` + NOTE,
}

export function templateFor(title = '') {
  if (title.includes('기일변경')) return { name: '기일변경신청서_표준양식.txt', text: templates.기일변경신청서 }
  if (title.includes('준비서면')) return { name: '준비서면_표준양식.txt', text: templates.준비서면 }
  if (title.includes('증거')) return { name: '증거목록_표준양식.txt', text: templates.증거목록 }
  return { name: '소장_표준양식.txt', text: templates.소장 }
}
