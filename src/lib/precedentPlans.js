export const PRECEDENT_PLANS = Object.freeze({
  free: {
    id: 'free',
    name: '기본 검색',
    price: 0,
    similarLimit: 5,
    description: '내 사건과 유사한 판례를 검색당 최대 5건까지 확인',
  },
  premium: {
    id: 'premium',
    name: '판례검색 프리미엄',
    price: 14900,
    similarLimit: 20,
    description: '내 사건 유사판례의 전체 검색 결과와 공식 원문을 연속해서 확인',
  },
})

export const precedentPlan = (id) => PRECEDENT_PLANS[id] || PRECEDENT_PLANS.free

