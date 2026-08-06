// 입력받은 값이 실제로 소장에 반영되는지 검사한다.
//
//   node scripts/qa-fields.mjs
//
// "값이 문서에 그대로 찍히는가"가 아니라 "값을 바꾸면 문서가 달라지는가"를 본다.
// 그래야 분기용 필드(라디오·체크)도 정상으로 통과하고,
// 입력만 받고 어디에도 쓰이지 않는 필드가 걸러진다.
//
// 조건부(when) 필드는 게이트가 닫혀 있으면 당연히 반영되지 않으므로
//   - 체크박스는 항상 전체 선택해 게이트를 최대한 열어두고
//   - 라디오·셀렉트는 옵션을 한 바퀴 돌린다
// 한 번이라도 차이가 나면 "쓰인다"로 판정한다.

import { complaintTypes, allSteps, buildPreview, requiredChecklist } from '../src/lib/complaint.js'

/** 값이 없거나 화면 표시 전용인 위젯 */
const SKIP = [
  'note', 'partyTag', 'venue', 'cost', 'remain', 'sum', 'evictCalc',
  'paymentCost', 'caseLoader', 'stageAdvice', 'defenseAdvice', 'evidenceGap',
]

/** 문서에 안 들어가는 게 정상인 필드 — 이유를 적어두지 않으면 여기 넣지 말 것 */
const BY_DESIGN = {
  evidenceItems: '준비물 체크리스트. 실제 갑호증은 업로드한 파일에서 만들어진다.',
  signature: '서명 이미지는 buildPreview가 아니라 ComplaintPaper에 prop으로 직접 전달된다.',
}

const val = (f, pick, alt) => {
  switch (f.kind) {
    case 'radio': case 'select': return f.options[pick % f.options.length]
    // 게이트를 최대한 열어두려고 기본값을 전체 선택으로 둔다
    case 'checks': return alt ? f.options.slice(0, 1) : f.options.slice()
    case 'money': case 'num': return alt ? '2222222' : '1000000'
    case 'date': return alt ? '2025-11-30' : '2024-01-02'
    case 'files': return alt ? [{ name: '계좌이체내역' }, { name: '내용증명' }] : [{ name: '차용증' }]
    case 'citation': return alt ? ['2020다112233'] : []
    case 'signature': return alt ? 'data:image/png;base64,ZZZ' : ''
    case 'repeat': {
      const row = (v) => Object.fromEntries((f.columns || []).map((c) => [c.key, v]))
      return alt ? [row('B'), row('C')] : [row('A')]
    }
    default: return alt ? 'ZZZ' : 'AAA'
  }
}

const render = (t, form) => {
  try { return JSON.stringify({ d: buildPreview(t, form), c: requiredChecklist(t, form) }) }
  catch (e) { return `ERR:${e.message}` }
}

let dead = 0
for (const type of complaintTypes) {
  const fields = allSteps(type).flatMap((s) => s.fields).filter((f) => f.key && !SKIP.includes(f.kind))
  const choices = fields.filter((f) => f.kind === 'radio' || f.kind === 'select')

  // 선택지 조합을 무작위로 뽑는다.
  // "이자를 약정함 + 주기가 기타"처럼 두 선택이 동시에 맞아야 열리는 문장이 있어서,
  // 옵션을 순서대로 돌리면 특정 조합이 영영 나오지 않는다.
  const build = (rand) => {
    const form = {}
    for (const f of fields) form[f.key] = val(f, f.options ? rand(f.options.length) : 0, false)
    for (const f of fields) if (f.kind === 'address') { form[`${f.key}Zip`] = '00000'; form[`${f.key}Detail`] = '101호' }
    // 개인정보 「소장 표시」 토글은 기본값이 꺼짐이라 켜두고 잰다
    for (const k of ['pRrnShow', 'dRrnShow', 'pPhoneShow', 'dPhoneShow', 'pEmailShow', 'dEmailShow', 'pFaxShow', 'dFaxShow']) form[k] = true
    return form
  }

  const used = new Set()
  const TRIES = Math.max(60, choices.length * 30)
  for (let i = 0; i < TRIES && used.size < fields.length; i++) {
    const form = build((n) => Math.floor(Math.random() * n))
    const before = render(type, form)
    if (before.startsWith('ERR:')) { console.log(`  ‼ ${type.title} 렌더 실패 — ${before}`); break }
    for (const f of fields) {
      if (used.has(f.key)) continue
      const other = f.options ? (form[f.key] === f.options[0] ? 1 : 0) : 0
      if (render(type, { ...form, [f.key]: val(f, other, true) }) !== before) used.add(f.key)
    }
  }

  const missing = fields.filter((f) => !used.has(f.key) && !BY_DESIGN[f.key])
  const skipped = fields.filter((f) => !used.has(f.key) && BY_DESIGN[f.key])

  if (missing.length === 0) {
    console.log(`✅ ${type.title} — ${fields.length}개 모두 문서에 반영됨`)
  } else {
    dead += missing.length
    console.log(`❌ ${type.title} — 값을 바꿔도 문서가 그대로 (${missing.length}/${fields.length}개)`)
    for (const f of missing) console.log(`     · ${f.key} (${f.label || f.kind})`)
  }
  for (const f of skipped) console.log(`     · (의도됨) ${f.key} — ${BY_DESIGN[f.key]}`)
}

console.log(dead === 0 ? '\n반영 안 되는 필드 없음' : `\n반영 안 되는 필드 ${dead}개`)
process.exit(dead === 0 ? 0 : 1)
