const ISSUE_TERMS = [
  '동시이행', '원상회복', '필요비', '유익비', '묵시적 갱신', '대항력', '우선변제',
  '지연손해금', '소멸시효', '변제', '상계', '차용증', '투자금', '근로자성',
  '부당해고', '임금체불', '퇴직금', '과실상계', '위자료', '인과관계', '불법행위',
  '하자', '건물인도', '건물명도', '차임 연체', '무단점유', '보전의 필요성', '가압류',
]

const TYPE_WORDS = {
  loan: ['대여금', '차용금', '차용증'],
  deposit: ['임대차보증금', '보증금 반환', '임대차'],
  wage: ['임금', '퇴직금', '부당해고'],
  tort: ['손해배상', '불법행위'],
  evict: ['건물인도', '건물명도', '무단점유'],
}

const strings = (value, out = []) => {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((item) => strings(item, out))
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => strings(item, out))
  return out
}

export function buildCaseSearchProfile(caseData, extra = '') {
  const text = [...strings(caseData?.form || {}), extra].join(' ')
  return {
    searchMode: 'similar',
    typeKey: caseData?.typeKey || '',
    issueTerms: ISSUE_TERMS.filter((term) => text.includes(term)).slice(0, 8),
    limit: 12,
  }
}

export function buildKeywordSearchProfile(query, chip = '') {
  const text = `${query || ''} ${chip || ''}`.trim()
  const typeKey = Object.entries(TYPE_WORDS).find(([, words]) => words.some((word) => text.includes(word)))?.[0] || ''
  return {
    searchMode: 'keyword',
    typeKey,
    // 직접 입력 검색은 서버에서 개인정보 모양을 한 번 더 제거한다.
    query: String(query || '').slice(0, 120),
    issueTerms: ISSUE_TERMS.filter((term) => text.includes(term)).slice(0, 8),
    limit: 20,
  }
}
