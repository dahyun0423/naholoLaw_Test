// 절차 안내 노트를 앱 코드에서 그대로 뽑아 옵시디언에 쓴다.
// 손으로 옮겨 적으면 앱과 문서가 곧 어긋난다 — 같은 표를 두 벌 관리하지 않는다.
import { writeFileSync } from 'node:fs'
import { BASE_GUIDE, TYPE_GUIDE, stageGuide, deadlineSpan } from '/Users/limdahyun/naholo-beobe/src/lib/procedureGuide.js'

const VAULT = '/Users/limdahyun/Documents/Obsidian Vault/한이음_나홀로소송'
const TODAY = new Date().toISOString().slice(0, 10)

const STAGES = [
  ['deal', '분쟁 발생'],
  ['notice', '내용증명'],
  ['draft', '소장 작성'],
  ['file', '법원 접수'],
  ['trial', '변론'],
  ['judge', '판결'],
]

const TYPES = [
  ['loan', '대여금 반환 청구', '빌려준 돈을 못 받았을 때', 'loan'],
  ['deposit', '임대차보증금 반환 청구', '계약이 끝났는데 보증금을 못 받았을 때', 'deposit'],
  ['wage', '임금체불 (임금·퇴직금 청구)', '일한 돈을 못 받았을 때', 'wage'],
  ['tort', '손해배상 청구', '사고·불법행위로 손해를 입었을 때', 'tort'],
  ['evict', '건물명도 청구', '차임을 안 내거나 나가지 않을 때', 'evict'],
]

const bullets = (list) => (list?.length ? list.map((x) => `- ${x}`).join('\n') : '_해당 없음_')

const deadlineTable = (items) => {
  if (!items?.length) return '이 단계에는 법으로 정해진 기한이 없다. 다만 청구권은 시효로 사라지므로 미루지 않는다.\n'
  const rows = items.map((d) =>
    `| ${d.label} | ${d.base} | **${deadlineSpan(d)}** | ${d.who} | ${d.law} |`).join('\n')
  const notes = items.filter((d) => d.note).map((d) => `> **${d.label}** — ${d.note}`).join('\n>\n')
  return `| 기한 | 기산일 | 기간 | 누가 | 근거 |\n|---|---|---|---|---|\n${rows}\n\n${notes}\n`
}

const typeNote = ([key, title, when]) => {
  const body = STAGES.map(([sk, sl], i) => {
    const g = stageGuide(key, sk)
    const own = TYPE_GUIDE[key]?.[sk] ? '' : '\n_(이 단계는 사건 유형과 무관하게 공통이다.)_\n'
    return `## ${i + 1}. ${sl}

${g.desc}
${own}
### 이 단계에서 할 일
${bullets(g.items)}

### 챙길 기한
${deadlineTable(g.deadlines)}
### 준비물
${bullets(g.materials)}

### 도구
${bullets(g.tools.map((t) => t.label))}
`
  }).join('\n---\n\n')

  return `---
title: 절차 단계별 안내 — ${title}
project: 한이음 나홀로소송
updated: ${TODAY}
tags: [나홀로소송, 절차안내, ${key}]
---

# ${title}

${when}. 앱의 **절차 안내** 화면이 이 표를 그대로 읽는다
(\`src/lib/procedureGuide.js\`). 문서와 화면이 어긋나지 않도록 코드에서 생성했다.

> [!warning] 참고용
> 아래 기간은 법령 원문을 확인해 적었지만, 개별 사건에서는 기산일·중단 사유에 따라
> 달라진다. 실제 기한은 법원에서 받은 통지서로 반드시 확인할 것.

관련: [[07_법률 근거]] · [[10_절차 단계별 안내]]

---

${body}`
}

// 유형별 노트
TYPES.forEach((t) => {
  const [, title] = t
  const file = `${VAULT}/11_절차_${title.split(' ')[0]}.md`
  writeFileSync(file, typeNote(t), 'utf8')
  console.log('wrote', file)
})

// 한눈에 비교하는 색인 노트
const compareRow = (sk) => {
  const cells = TYPES.map(([key]) => {
    const g = stageGuide(key, sk)
    const d = g.deadlines?.[0]
    return d ? `${d.label} ${deadlineSpan(d)}` : '—'
  })
  return `| ${STAGES.find(([k]) => k === sk)[1]} | ${cells.join(' | ')} |`
}

const index = `---
title: 절차 단계별 안내 — 개요
project: 한이음 나홀로소송
updated: ${TODAY}
tags: [나홀로소송, 절차안내]
---

# 절차 단계별 안내

우리가 지원하는 5개 유형이 **어느 단계에서 무엇이 다른지** 모아 둔 색인.
각 유형의 상세는 아래 노트에 있다.

- [[11_절차_대여금]]
- [[11_절차_임대차보증금]]
- [[11_절차_임금체불]]
- [[11_절차_손해배상]]
- [[11_절차_건물명도]]

## 단계는 여섯 칸

${STAGES.map(([k, l], i) => `${i + 1}. **${l}** — ${BASE_GUIDE[k].desc}`).join('\n')}

앱에서는 이 여섯 칸이 가로 스텝퍼로 보이고, 사용자가 칸을 눌러 직접 옮길 수 있다.
법원에서 벌어지는 일(변론 종결·선고)은 우리가 조회할 수 없기 때문이다.

## 단계별 첫 번째 기한 비교

| 단계 | ${TYPES.map(([, t]) => t.split(' ')[0]).join(' | ')} |
|---|${TYPES.map(() => '---').join('|')}|
${STAGES.map(([k]) => compareRow(k)).join('\n')}

## 유형마다 다른 것 / 같은 것

| 단계 | 유형별로 다른가 | 이유 |
|---|---|---|
| 분쟁 발생 | **다름** | 무엇을 다투느냐에 따라 모을 자료와 시효가 갈린다 |
| 내용증명 | **다름** | 임금은 노동청 진정, 명도는 해지 통고처럼 성격이 다르다 |
| 소장 작성 | **다름** | 청구원인의 요건사실이 유형마다 다르다 |
| 법원 접수 | 같음 | 인지·송달료·부본 수는 절차가 정한다 |
| 변론 | 대체로 같음 | 답변서 30일·준비서면은 공통. 다투는 쟁점만 다르다 |
| 판결 | 거의 같음 | 항소 2주는 공통. 명도만 인도집행이 더 붙는다 |

## 시효 한눈에

| 유형 | 소멸시효 | 근거 |
|---|---|---|
| 대여금 | 10년 | 민법 제162조 제1항 |
| 임대차보증금 | 10년 | 민법 제162조 제1항 |
| 임금·퇴직금 | **3년** | 근로기준법 제49조 · 근로자퇴직급여 보장법 제10조 |
| 손해배상(불법행위) | 안 날부터 **3년** / 행위일부터 10년 | 민법 제766조 |
| 건물명도 | (소유권에 기한 청구는 시효 없음) | — |

> [!tip] 임금 사건은 3년
> 다른 유형보다 훨씬 짧다. 퇴직하고 미루다 시효가 지나는 경우가 실제로 많으므로
> 앱에서도 분쟁 발생 단계부터 시효를 함께 보여준다.

## 데모 사건과의 대응

절차 안내 화면을 단계별로 확인하려고 **대여금 반환 청구 (1)~(6)** 을 만들어 두었다.
같은 유형인데 서 있는 칸만 다르다.

| 데모 사건 | 서 있는 칸 |
|---|---|
| 대여금 반환 청구 (1) 분쟁 발생 | 분쟁 발생 |
| 대여금 반환 청구 (2) 내용증명 | 내용증명 |
| 대여금 반환 청구 (3) 소장 작성 | 소장 작성 |
| 대여금 반환 청구 (4) 법원 접수 | 법원 접수 |
| 대여금 반환 청구 (5) 변론 | 변론 |
| 대여금 반환 청구 (6) 판결·종결 | 판결 (종결) |

나머지 유형은 실제 사건 예시로 한 건씩 두었다 — 임대차보증금·임금체불·손해배상·건물명도.

관련: [[07_법률 근거]] · [[08_진행 현황]]
`
writeFileSync(`${VAULT}/10_절차 단계별 안내.md`, index, 'utf8')
console.log('wrote index')
