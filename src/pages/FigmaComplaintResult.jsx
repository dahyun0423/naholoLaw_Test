import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'

import { FullView } from '../components/ComplaintWizard.jsx'
import { figmaWorkspaceCases } from '../data/mock.js'
import { findType } from '../lib/complaint.js'

const captureFormOverrides = {
  'demo-lease-case': {
    demandWay: '내용증명을 보냈어요',
    demandDate: '2026-04-20',
    demandResult: '피고는 내용증명을 수령하였으나 보증금을 반환하지 아니하였습니다.',
  },
  'demo-labor-case': {
    jobTitle: '물류 입·출고 및 재고관리 업무',
    demandWay: '문자·카톡으로 요구했어요',
    demandDate: '2026-07-15',
    demandResult: '피고는 지급하겠다고 답변하였으나 현재까지 체불임금을 지급하지 아니하였습니다.',
  },
  'demo-loan-case': {
    aiRelationshipDetail: '대학 동창으로 오래 알고 지냈어요. 피고가 가게 보증금이 급하다고 부탁했어요. 가게 계약이 끝나면 바로 갚겠다고 약속했어요.',
    loanTimes: '한 번에 전부',
    dueSet: '날짜를 정했어요',
    dueDate: '2024-02-10',
    interestSet: '정하지 않았어요',
    repaid: '한 푼도 못 받았어요',
    aiDemandDetail: '2024년 3월 15일 카톡으로 갚아달라고 했어요. 두 달만 기다려달라고 했는데 아직도 갚지 않았어요.',
  },
  'demo-crash-case': {
    tortKind: '교통사고 (자)',
    incidentStory: '피고는 2025. 9. 12. 서울특별시 노원구 상계동 교차로에서 중앙선을 침범하여 정상 진행 중이던 원고 차량의 좌측면을 충격하였습니다.',
    hasContract: '없음 (불법행위)',
    damageKinds: ['치료비·수리비 (적극손해)', '일하지 못한 손해 (일실수입)', '위자료'],
    dmgDirect: '4120000',
    dmgIncome: '9480000',
    dmgSolace: '5000000',
    claimAmount: '18600000',
    calcBasis: '진료비 계산서와 휴업기간 급여자료를 기준으로 적극손해와 일실수입을 산정하고, 상해 정도와 치료기간을 고려하여 위자료를 산정하였습니다.',
    calcDocs: ['진단서', '진료비 계산서', '급여명세서'],
    ownFault: '없음',
    demandWay: '문자·카톡으로 요구했어요',
    demandDate: '2025-10-20',
    demandResult: '피고 측 보험사는 720만 원만 지급하겠다고 제안하여 협의가 결렬되었습니다.',
  },
  'demo-evict-case': {
    ownership: '원고가 소유자',
    ownDate: '2020-03-18',
    contractDate: '2023-01-05',
    rent: '2000000',
    unpaidFrom: '2025-04-01',
    unpaidDetail: '2025. 4.부터 2025. 10.까지 매월 차임 2,000,000원씩 합계 14,000,000원을 지급하지 않았습니다.',
    terminated: '통고했어요',
    terminateDate: '2025-11-03',
    occupancy: '영업 중',
    demandWay: '내용증명을 보냈어요',
    demandDate: '2025-11-03',
    demandResult: '피고는 내용증명을 수령한 뒤에도 차임을 지급하지 않고 영업을 계속하고 있습니다.',
  },
}

export default function FigmaComplaintResult() {
  const { caseId } = useParams()
  const caseItem = figmaWorkspaceCases.find((item) => item.id === caseId)
  const type = caseItem ? findType(caseItem.typeKey) : null
  const form = useMemo(() => (
    caseItem
      ? { ...caseItem.form, ...(captureFormOverrides[caseItem.id] || {}) }
      : null
  ), [caseItem])

  useEffect(() => {
    if (!caseItem) return undefined
    const previousTitle = document.title
    document.title = `AI 소장 완성본 · ${caseItem.title}`
    return () => { document.title = previousTitle }
  }, [caseItem])

  if (!caseItem || !type || !form) {
    return <main className="grid min-h-screen place-items-center bg-ink-50 text-ink-600">캡처할 소장 사건을 찾지 못했습니다.</main>
  }

  return (
    <FullView
      type={type}
      form={form}
      captureMode
      onClose={() => {}}
      onEdit={() => {}}
    />
  )
}
