// 문서를 쓰기 전에 갖춰져 있어야 하는 것
//
// 문서마다 "언제 쓰는 것인가"가 다르다.
//
//   소장     — 소송을 **시작**하는 문서. 전제가 없다.
//   준비서면 — 상대방 주장에 **대응**하는 문서. 사건이 접수돼 사건번호가 있어야 한다.
//   증거목록 — 이미 모은 증거를 **재구성**하는 문서. 올려둔 자료가 있어야 한다.
//   신청서   — 절차적 목적. 지급명령·소송구조처럼 **소 제기 전에도** 내는 것이 있어
//              사건을 전제하지 않는다.
//
// ── 막지 않고 알린다 ────────────────────────────────────────
// 사용자가 다른 곳에서 이미 소송 중일 수 있다. 우리 앱에 사건을 안 만들었다는 이유로
// 문을 잠그면, 사건번호를 손에 들고 온 사람이 아무것도 못 한다.
// 그래서 전제가 안 맞으면 **왜 그런지 알리고 다음 행동을 제안하되, 진행은 허용**한다.

import { caseEvidence } from './casebook.js'

/**
 * @param kind  complaint | brief | evidence | petition
 * @param cases 내가 만든 사건 원본 배열
 * @returns null(통과) 또는 안내에 필요한 것들
 */
export function checkDoc(kind, cases = []) {
  const filed = cases.filter((c) => c.caseNo)
  const withEvidence = cases.filter((c) => caseEvidence(c).length > 0)

  if (kind === 'brief') {
    if (cases.length === 0) {
      return {
        level: 'block',
        title: '준비서면은 진행 중인 사건이 있어야 써요',
        why: '준비서면은 소송을 시작하는 문서가 아니라, 상대방이 낸 답변서·준비서면에 반박하는 **대응 문서**예요. 그래서 먼저 소장을 내고 법원에서 사건번호를 받은 뒤에 씁니다.',
        facts: [
          ['지금 사건', '0건'],
          ['접수한 사건', '0건'],
        ],
        order: ['소장 작성', '법원 접수 · 사건번호 받기', '상대방 답변서 수령', '준비서면 작성'],
        actions: [
          { label: '소장부터 작성하기', to: null, pick: 'complaint', primary: true },
        ],
        proceed: '사건번호를 알고 있어요 · 그냥 작성할래요',
      }
    }
    if (filed.length === 0) {
      return {
        level: 'warn',
        title: '아직 법원에 접수한 사건이 없어요',
        why: '준비서면 첫 줄에는 **사건번호**가 들어갑니다. 접수해야 법원이 번호를 주기 때문에, 보통은 접수를 마친 뒤에 작성해요.',
        facts: [
          ['지금 사건', `${cases.length}건`],
          ['접수한 사건', '0건'],
        ],
        order: ['법원 접수', '사건번호를 사건관리에 적기', '준비서면 작성'],
        actions: [
          { label: '접수 정보 적으러 가기', to: '/app/cases', primary: true },
        ],
        proceed: '사건번호 없이 먼저 써 둘래요',
      }
    }
    return null
  }

  if (kind === 'evidence') {
    if (withEvidence.length === 0) {
      return {
        level: 'warn',
        title: '아직 올린 증거 자료가 없어요',
        why: '증거목록은 새로 입력하는 문서가 아니라, **이미 올린 자료를 갑호증 표로 재구성**하는 문서예요. 소장 6단계에서 파일을 올리면 그대로 목록이 됩니다.',
        facts: [
          ['올린 자료', '0건'],
          ['입증취지 작성', '0건'],
        ],
        order: ['소장 6단계에서 자료 올리기', '자료마다 입증취지 적기', '증거목록 만들기'],
        actions: [
          { label: '증빙자료로 가기', to: '/app/evidence', primary: true },
        ],
        proceed: '빈 목록부터 만들래요',
      }
    }
    return null
  }

  // 소장·신청서는 전제를 두지 않는다.
  // 특히 신청서는 지급명령·소송구조처럼 소 제기 전에 내는 것이 있다.
  return null
}
