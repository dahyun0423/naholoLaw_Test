// 알림 — **우리가 실제로 아는 것만** 알린다.
//
// 이 서비스는 법원 전자소송이나 상대방과 연결되어 있지 않다. 그래서 알 수 없는 것이 있다.
//
//   · 상대방이 답변서·준비서면을 냈는지          — 법원 시스템에만 있다
//   · 법원이 기일을 새로 잡거나 바꿨는지          — 통지서를 받아야 안다
//   · 사건 진행 상태가 바뀌었는지                — 마찬가지
//   · 새 판례가 올라왔는지, 내 사건과 비슷한지    — 검색은 사용자가 누를 때만 한다
//
// 예전에는 이런 것들을 알림 목록에 넣어 두었다. 보여줄 수는 있지만 실제로는 오지 않는
// 알림이라, 사용자가 "알림이 없으니 아직 아무 일도 없구나"라고 믿게 만든다. 그게 기한을
// 놓치는 것보다 위험하다. 그래서 전부 뺐다.
//
// 남긴 것은 **사용자가 직접 적어 둔 것에서 계산되는 것**뿐이다.

import { caseTitle, caseUpcoming, caseEvidence, caseDocs } from './casebook.js'

/** 알림 종류 — 설정 화면의 스위치와 같은 표를 쓴다 */
export const ALERT_KINDS = [
  { key: 'hearing', label: '기일 알림', desc: '내가 등록한 기일 7일 전·3일 전·1일 전' },
  { key: 'deadline', label: '제출기한 알림', desc: '답변서·준비서면 등 기한이 다가올 때' },
  { key: 'overdue', label: '기한 지남 알림', desc: '기한이 지났는데 완료 표시가 없을 때' },
  { key: 'evidence', label: '증거 보완 알림', desc: '보완필요로 표시해 둔 증거가 남아 있을 때' },
]

export const DEFAULT_ALERT_PREFS = { hearing: true, deadline: true, overdue: true, evidence: true }

const dayLabel = (dday) => (dday < 0 ? `D+${-dday}` : dday === 0 ? 'D-DAY' : `D-${dday}`)

/**
 * 사건들에서 알림을 만든다.
 *
 * 읽기만 한다 — 저장하지 않는다. 사건 데이터가 곧 알림의 원본이라, 일정을 지우면
 * 알림도 같이 사라지는 게 맞다.
 */
export function buildAlerts(rawCases = [], prefs = DEFAULT_ALERT_PREFS) {
  const out = []

  rawCases.forEach((c) => {
    const name = caseTitle(c)

    caseUpcoming(c).forEach((todo) => {
      const hearing = todo.typeKey === 'hearing' || /기일/.test(todo.text)
      const overdue = todo.dday < 0
      const kind = overdue ? 'overdue' : hearing ? 'hearing' : 'deadline'
      if (!prefs[kind]) return
      // 지난 것과 일주일 안쪽만 — 그보다 먼 일정까지 알리면 목록이 의미를 잃는다
      if (!overdue && todo.dday > 7) return
      out.push({
        id: `${c.id}-${todo.id}`,
        kind,
        title: `${todo.text} ${dayLabel(todo.dday)}`,
        meta: `${name}${todo.time ? ` · ${todo.time}` : ''}${todo.place ? ` · ${todo.place}` : ''}`,
        due: todo.due,
        sort: todo.dday,
        to: '/app/schedule',
      })
    })

    if (prefs.evidence) {
      caseEvidence(c)
        .filter((item) => item.status === '보완필요')
        .forEach((item) => out.push({
          id: `${c.id}-ev-${item.no}`,
          kind: 'evidence',
          title: `${item.code} 보완이 필요합니다`,
          meta: `${name} · ${item.file}`,
          sort: 100,
          to: '/app/evidence',
        }))
    }
  })

  return out.sort((a, b) => a.sort - b.sort)
}

/** 사건에서 "아직 안 끝난 것" 수 — 배지 숫자 */
export const alertCount = (rawCases, prefs) => buildAlerts(rawCases, prefs).length

/** 알림으로 만들 수 없는 것들 — 화면에 그대로 적어 둔다 */
export const OUT_OF_SCOPE = [
  '상대방이 답변서·준비서면을 냈는지',
  '법원이 기일을 새로 잡거나 바꿨는지',
  '사건 진행 상태가 바뀌었는지',
  '내 사건과 비슷한 판례가 새로 나왔는지',
]

export { caseDocs }
