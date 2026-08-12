const pad = (v) => String(v).padStart(2, '0')

const dateValue = (y, m, d) => {
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(m) - 1 || date.getDate() !== Number(d)) return ''
  return `${y}-${pad(m)}-${pad(d)}`
}

const parseTime = (segment) => {
  const match = segment.match(/(오전|오후)?\s*(\d{1,2})\s*(?:시|:|：)\s*(\d{1,2})?\s*분?/)
  if (!match) return ''
  let hour = Number(match[2])
  if (match[1] === '오후' && hour < 12) hour += 12
  if (match[1] === '오전' && hour === 12) hour = 0
  return `${pad(hour)}:${pad(Number(match[3] || 0))}`
}

const classify = (context, dateOffset) => {
  const markers = [
    ['변론준비기일', /변론준비기일/g], ['변론기일', /변론기일/g], ['조정기일', /조정기일/g],
    ['선고기일', /선고기일/g], ['심문기일', /심문기일/g], ['답변서 제출기한', /답변서/g],
    ['준비서면 제출기한', /준비서면/g], ['보정서 제출기한', /보정명령|보정서/g],
    ['증거 제출기한', /증거목록|증거/g], ['서면 제출기한', /제출기한/g],
  ]
  const found = []
  markers.forEach(([title, pattern]) => {
    for (const match of context.matchAll(pattern)) {
      const distance = Math.abs((match.index + match[0].length / 2) - dateOffset)
      if (distance <= 90) found.push({ title, distance })
    }
  })
  return found.sort((a, b) => a.distance - b.distance)[0]?.title || ''
}

export function extractCourtNotice(text) {
  const clean = String(text || '').replace(/\u0000/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n')
  const compact = clean.replace(/\s+/g, ' ')
  const caseNo = compact.match(/\b(20\d{2})\s*([가-힣]{1,4})\s*(\d{1,8})\b/)?.slice(1).join('') || ''
  const court = compact.match(/([가-힣]{2,20}(?:지방법원|고등법원|가정법원|법원))(?:\s*[가-힣0-9]+(?:단독|재판부))?/)?.[0] || ''
  const noticeName = ['변론준비기일통지서', '조정기일통지서', '석명준비명령', '준비서면 제출명령', '보정명령', '답변서 부본', '기일통지서']
    .find((name) => compact.includes(name)) || '법원 통지서'

  const matches = []
  const patterns = [
    /(20\d{2})\s*[.년/-]\s*(\d{1,2})\s*[.월/-]\s*(\d{1,2})\s*[.일]?/g,
  ]
  patterns.forEach((pattern) => {
    for (const match of compact.matchAll(pattern)) {
      const date = dateValue(match[1], match[2], match[3])
      if (!date) continue
      const start = Math.max(0, match.index - 90)
      const context = compact.slice(start, Math.min(compact.length, match.index + match[0].length + 100))
      const dateOffset = match.index - start
      const title = classify(context, dateOffset)
      if (!title) continue
      const timeContext = compact.slice(Math.max(0, match.index - 25), Math.min(compact.length, match.index + match[0].length + 35))
      const time = /기일/.test(title) ? parseTime(timeContext) : ''
      if (!matches.some((item) => item.title === title && item.date === date && item.time === time)) {
        matches.push({ id: `notice_${matches.length}`, title, date, time, checked: true, context: context.slice(0, 180) })
      }
    }
  })

  return { caseNo, court, noticeName, events: matches, text: clean }
}

export async function readCourtNoticeFile(file) {
  if (!file) throw new Error('파일을 선택해 주세요.')
  if (file.type === 'text/plain' || /\.txt$/i.test(file.name)) return file.text()
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const worker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
    const pages = []
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
      const page = await pdf.getPage(pageNo)
      const content = await page.getTextContent()
      pages.push(content.items.map((item) => item.str).join(' '))
    }
    return pages.join('\n')
  }
  throw new Error('텍스트 PDF 또는 TXT 파일만 분석할 수 있습니다.')
}
