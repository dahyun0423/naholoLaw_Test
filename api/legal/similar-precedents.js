import { precedentEntitlement } from '../_precedent.js'

const BASE = process.env.KSKILL_PROXY_BASE_URL || 'https://k-skill-proxy.nomadamas.org'
const CACHE_TTL = 10 * 60 * 1000
const cache = new Map()

const TYPE = {
  loan: { queries: ['대여금', '차용금'], laws: [['민법 제598조', 'https://www.law.go.kr/법령/민법/제598조'], ['민법 제397조', 'https://www.law.go.kr/법령/민법/제397조']] },
  deposit: { queries: ['임대차보증금 반환', '임대차보증금'], laws: [['민법 제618조', 'https://www.law.go.kr/법령/민법/제618조'], ['주택임대차보호법 제3조의2', 'https://www.law.go.kr/법령/주택임대차보호법/제3조의2']] },
  wage: { queries: ['임금 퇴직금', '부당해고'], laws: [['근로기준법 제36조', 'https://www.law.go.kr/법령/근로기준법/제36조'], ['근로기준법 제43조', 'https://www.law.go.kr/법령/근로기준법/제43조']] },
  tort: { queries: ['손해배상 불법행위', '과실상계'], laws: [['민법 제750조', 'https://www.law.go.kr/법령/민법/제750조'], ['민법 제763조', 'https://www.law.go.kr/법령/민법/제763조']] },
  evict: { queries: ['건물인도', '건물명도'], laws: [['민법 제213조', 'https://www.law.go.kr/법령/민법/제213조'], ['민법 제640조', 'https://www.law.go.kr/법령/민법/제640조']] },
}

const clean = (value) => String(value || '')
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const redact = (value) => clean(value)
  .replace(/\d{6}\s*[- ]?\s*\d{7}/g, '')
  .replace(/01[016789]\s*[- ]?\s*\d{3,4}\s*[- ]?\s*\d{4}/g, '')
  .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '')
  .replace(/\d{2,4}\s*[- ]\s*\d{3,4}\s*[- ]\s*\d{4}/g, '')
  .slice(0, 80)

const getJson = async (path) => {
  const response = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`공개 법령 API 응답 오류 (${response.status})`)
  return response.json()
}

const normalizeDate = (value) => {
  const v = clean(value).replace(/[^0-9]/g, '')
  return v.length === 8 ? `${v.slice(0, 4)}.${v.slice(4, 6)}.${v.slice(6)}` : clean(value)
}

const firstText = (...values) => values.map(clean).find(Boolean) || ''

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: '지원하지 않는 요청입니다.' })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const typeKey = TYPE[body.typeKey] ? body.typeKey : ''
    const issueTerms = Array.isArray(body.issueTerms)
      ? body.issueTerms.map(clean).filter((v) => v && v.length <= 30).slice(0, 8)
      : []
    const rawQuery = redact(body.query)
    const base = TYPE[typeKey]
    const queries = [...new Set([
      ...(base?.queries || []),
      rawQuery,
      ...issueTerms.slice(0, 2).map((term) => `${base?.queries?.[0] || ''} ${term}`.trim()),
    ].filter(Boolean))].slice(0, 4)
    if (!queries.length) throw new Error('검색할 사건 유형이나 법적 쟁점을 입력해 주세요.')

    const requestedLimit = Math.min(20, Math.max(5, Number(body.limit) || 12))
    const entitlement = body.searchMode === 'similar'
      ? await precedentEntitlement(body.precedentSessionId)
      : null
    const limit = entitlement ? Math.min(requestedLimit, entitlement.similarLimit) : requestedLimit
    const key = JSON.stringify({ queries, issueTerms, limit })
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < CACHE_TTL) {
      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800')
      res.status(200).json(hit.value)
      return
    }

    const searches = await Promise.all(queries.map((query) => getJson(
      `/v1/korean-law/search?target=prec&display=20&query=${encodeURIComponent(query)}`,
    )))
    const candidates = new Map()
    searches.forEach((data) => {
      const rows = data?.PrecSearch?.prec || []
      ;(Array.isArray(rows) ? rows : [rows]).filter(Boolean).forEach((row) => {
        const id = clean(row['판례일련번호'])
        if (id && !candidates.has(id)) candidates.set(id, row)
      })
    })

    const detailRows = await Promise.all([...candidates.entries()].slice(0, 18).map(async ([id, row]) => {
      try {
        const data = await getJson(`/v1/korean-law/detail?target=prec&ID=${encodeURIComponent(id)}`)
        return { id, row, detail: data?.PrecService || {} }
      } catch {
        return { id, row, detail: {} }
      }
    }))

    const items = detailRows.map(({ id, row, detail }) => {
      const title = firstText(detail['사건명'], row['사건명'], '판례')
      const court = firstText(detail['법원명'], row['법원명'])
      const no = firstText(detail['사건번호'], row['사건번호'], id)
      const point = firstText(detail['판결요지'], detail['판시사항'], detail['판례내용']).slice(0, 520)
      const haystack = clean([title, point, detail['판시사항'], detail['참조조문']].join(' '))
      const matchedTerms = issueTerms.filter((term) => haystack.includes(term))
      let score = 45
      if (queries.some((query) => title.includes(query.split(' ')[0]))) score += 20
      score += Math.min(25, matchedTerms.length * 8)
      if (/대법원/.test(court)) score += 5
      if (point) score += 5
      return {
        title,
        result: `${court || '법원'} ${firstText(detail['판결유형'], row['판결유형'], '판결')}`,
        tone: 'blue', officialId: id, court, no,
        issues: matchedTerms.length ? matchedTerms : [typeKey ? base.queries[0] : queries[0]],
        date: normalizeDate(firstText(detail['선고일자'], row['선고일자'])),
        relevance: Math.min(98, score),
        point: point || '공개 판례 상세에서 판결 요지를 제공하지 않았습니다. 원문을 확인해 주세요.',
        apply: matchedTerms.length ? `입력 사건과 겹치는 쟁점: ${matchedTerms.join(', ')}` : `사건 유형 검색어 “${queries[0]}”와 사건명이 일치합니다.`,
        matchReasons: matchedTerms,
        source: '국가법령정보센터 공개 판례',
      }
    }).sort((a, b) => b.relevance - a.relevance).slice(0, limit)

    const value = {
      items,
      relatedLaws: (base?.laws || []).map(([name, href]) => ({ name, href })),
      searchedQueries: queries,
      totalCandidates: candidates.size,
      retrievedAt: new Date().toISOString(),
      notice: '공개 판례의 사건명·판시사항·판결요지와 입력 쟁점의 텍스트 일치 결과이며, 승소 가능성이나 재판 결과 예측이 아닙니다.',
    }
    cache.set(key, { at: Date.now(), value })
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800')
    res.status(200).json(value)
  } catch (error) {
    console.error('precedent search error', error?.name || 'unknown')
    res.status(502).json({ error: error?.message || '공개 판례를 조회하지 못했습니다.' })
  }
}
