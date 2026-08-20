// 데모 사건의 준비서면·신청서 초안.
//
// 소장은 사건(form)에 붙어 있지만 준비서면·신청서는 각자 초안 저장소를 쓴다
// (naholo_draft_brief_<사건id> / naholo_draft_petition_<유형>_<사건id>).
// 그래서 데모 사건을 심을 때 이 초안들도 같이 심어야 네 종류 문서가 전부 열린다.
//
// 값은 사건의 소장 내용과 어긋나면 안 된다 — 같은 당사자, 같은 사건번호, 같은 금액이다.
// 사람이 말한 것처럼 읽혀야 하는 칸(aiPrompt)은 구어체로 둔다. 문어체로 다듬는 건 AI 몫이다.

import { dayOffset } from './mock.js'

/* ─────────────────── 준비서면 ─────────────────── */

export const demoBriefs = {
  // 임대차 — 상대방이 원상회복비 공제와 동시이행을 들고 나왔다
  'demo-lease-case': {
    court: '서울중앙지방법원', courtDept: '제12민사단독',
    caseNo: '2024가단123456', caseName: '임대차보증금',
    plaintiff: '홍길동', defendant: '김철수', side: '원고',
    stage: '상대방 준비서면을 또 받았어요', round: '준비서면(2)', dueDate: dayOffset(4),
    opponentDoc: '준비서면(1)', opponentDate: dayOffset(-11),
    opponentFiles: [
      { id: 'lease-op-1', name: '피고 준비서면(1)', fileName: '피고_준비서면1_원상회복.pdf', size: 486_000, type: 'application/pdf' },
    ],
    opponentClaim: '피고는 제가 나갈 때 도배랑 장판을 다 망가뜨려 놨다고 합니다. 그래서 120만원을 빼고 주는 게 맞다고 해요. 그리고 보증금은 원래 이사 나간 다음에 천천히 줘도 되는 거라고 합니다.',
    defenses: ['공제 주장 (원상회복비 등)', '동시이행 항변'],
    admitted: '보증금 1,000만원을 받은 사실과 계약이 2026년 1월 1일에 끝난 건 피고도 맞다고 인정합니다.',
    rebuttals: [
      {
        claim: '공제 주장 (원상회복비 등)',
        answer: '2년 살면서 생긴 벽지 색 바램하고 장판 눌린 자국뿐이에요. 나갈 때 사진도 다 찍어뒀습니다. 못 박거나 구멍 낸 데는 없어요.',
        evidence: '갑 제7호증 목적물 인도 확인서',
        citation: '',
      },
      {
        claim: '동시이행 항변',
        answer: '이미 2026년 1월 3일에 열쇠 넘기고 다 비웠어요. 관리사무소 확인도 받았습니다. 비워준 다음에도 넉 달째 안 주고 있는 겁니다.',
        evidence: '갑 제8호증 통상손모 비교 사진',
        citation: '',
      },
    ],
    conclusion: '피고 주장은 근거가 없으니 보증금 1,000만원 전부와 늦어진 기간만큼의 이자를 돌려받게 해주세요.',
    newEvidence: [
      { id: 'lease-brief-ev-1', name: '목적물 인도 확인서', fileName: '인도확인서_관악.pdf', size: 184_000, type: 'application/pdf' },
      { id: 'lease-brief-ev-2', name: '통상손모 비교 사진', fileName: '입주시_퇴거시_비교.jpg', size: 2_140_000, type: 'image/jpeg' },
    ],
    evidenceStart: '7',
    citations: ['2025다220329'],
  },

  // 교통사고 — 과실비율을 다툰다
  'demo-crash-case': {
    court: '서울북부지방법원', courtDept: '제3민사단독',
    caseNo: '2025가단334455', caseName: '손해배상(자)',
    plaintiff: '홍길동', defendant: '김철수', side: '원고',
    stage: '상대방 답변서를 받았어요', round: '준비서면(1)', dueDate: dayOffset(-6),
    opponentDoc: '답변서', opponentDate: dayOffset(-21),
    opponentFiles: [
      { id: 'crash-op-1', name: '피고 답변서', fileName: '피고_답변서_과실비율.pdf', size: 512_000, type: 'application/pdf' },
    ],
    opponentClaim: '피고는 제가 과속을 해서 사고가 커졌다고 합니다. 과실이 3대 7이라고 하면서 배상액을 깎아야 한다고 해요. 치료비도 너무 많이 나왔다고 합니다.',
    defenses: ['과실상계 주장'],
    admitted: '사고가 난 날짜와 장소, 피고가 중앙선을 넘은 사실은 피고도 다투지 않습니다.',
    rebuttals: [
      {
        claim: '과실상계 주장',
        answer: '블랙박스를 보면 제 차는 제한속도 안으로 달리고 있었어요. 피고가 중앙선을 넘어와서 제 차 왼쪽을 받은 거라 제가 피할 수가 없었습니다.',
        evidence: '갑 제6호증 블랙박스 원본 영상 캡처',
        citation: '2024다268508',
      },
    ],
    conclusion: '사고는 전적으로 피고가 중앙선을 넘어서 생긴 것이니, 과실을 따지지 말고 청구한 1,860만원 전부를 배상하게 해주세요.',
    newEvidence: [
      { id: 'crash-brief-ev-1', name: '블랙박스 원본 영상 캡처', fileName: '블랙박스_연속캡처.pdf', size: 4_260_000, type: 'application/pdf' },
    ],
    evidenceStart: '6',
    citations: ['2024다268508'],
  },

  // 대여금 — 소멸시효와 변제를 들고 나온 사건 (종결됐지만 지난 서면을 볼 수 있게)
  'demo-loan-case': {
    court: '서울동부지방법원', courtDept: '제5민사단독',
    caseNo: '2024가소445566', caseName: '대여금',
    plaintiff: '홍길동', defendant: '김철수', side: '원고',
    stage: '상대방 답변서를 받았어요', round: '준비서면(1)', dueDate: dayOffset(-26),
    opponentDoc: '답변서', opponentDate: dayOffset(-30),
    opponentFiles: [
      { id: 'loan-op-1', name: '피고 답변서', fileName: '피고_답변서_대여금부인.pdf', size: 344_000, type: 'application/pdf' },
    ],
    opponentClaim: '피고는 그 돈이 빌린 게 아니라 동아리 후배한테 그냥 준 거라고 합니다. 그리고 이미 100만원을 갚았으니 남은 것도 다 정리된 걸로 알고 있다고 해요.',
    defenses: ['전부 부인 (그런 사실 없다)', '변제 항변 (이미 갚았다)'],
    admitted: '2023년 8월 10일에 500만원을 계좌로 받은 사실은 피고도 인정합니다.',
    rebuttals: [
      {
        claim: '전부 부인 (그런 사실 없다)',
        answer: '차용증에 빌린 돈이라고 적고 도장까지 찍었어요. 갚을 날짜도 2023년 11월 10일로 써 있습니다. 그냥 준 돈이면 차용증을 쓸 이유가 없어요.',
        evidence: '갑 제4호증 차용증 원본 대조본',
        citation: '2025다213495',
      },
      {
        claim: '변제 항변 (이미 갚았다)',
        answer: '100만원 받은 건 맞지만 그건 일부만 갚은 거예요. 그때 카톡으로도 나머지는 다음 달에 준다고 했습니다.',
        evidence: '갑 제5호증 일부변제 당시 카카오톡 대화',
        citation: '',
      },
    ],
    conclusion: '일부 갚은 100만원을 뺀 400만원과 갚기로 한 날부터의 지연손해금을 지급하게 해주세요.',
    newEvidence: [
      { id: 'loan-brief-ev-1', name: '차용증 원본 대조본', fileName: '차용증_원본대조.pdf', size: 720_000, type: 'application/pdf' },
      { id: 'loan-brief-ev-2', name: '일부변제 당시 카카오톡 대화', fileName: '카카오톡_일부변제.png', size: 1_320_000, type: 'image/png' },
    ],
    evidenceStart: '4',
    citations: ['2025다213495'],
  },

  // 임금체불 — 사용자가 「프리랜서였다」며 근로자성을 다툰다
  'demo-labor-case': {
    court: '서울남부지방법원', courtDept: '제7민사단독',
    caseNo: '2026가단221457', caseName: '임금',
    plaintiff: '홍길동', defendant: '김철수', side: '원고',
    stage: '상대방 답변서를 받았어요', round: '준비서면(1)', dueDate: dayOffset(18),
    opponentDoc: '답변서', opponentDate: dayOffset(-9),
    opponentFiles: [
      { id: 'labor-op-1', name: '피고 답변서', fileName: '피고_답변서_도급계약주장.pdf', size: 428_000, type: 'application/pdf' },
    ],
    opponentClaim: '피고는 제가 직원이 아니라 프리랜서라서 임금이 아니라고 합니다. 계약서도 도급계약이라고 하고요. 그리고 연장근로는 제가 알아서 한 거라 수당을 줄 이유가 없다고 해요.',
    defenses: ['전부 부인 (그런 사실 없다)'],
    admitted: '2023년 3월부터 2026년 6월까지 일한 사실과 매달 310만원을 받은 사실은 피고도 인정합니다.',
    rebuttals: [
      {
        claim: '전부 부인 (그런 사실 없다)',
        answer: '매일 아침 피고가 배차표를 짜서 알려주면 그대로 처리했어요. 출퇴근도 지문으로 찍었고 4대보험도 회사에서 들어줬습니다. 제가 일정을 정한 적이 없어요.',
        evidence: '갑 제4호증 사내메신저 업무지시 내역',
        citation: '2023두54914',
      },
      {
        claim: '연장근로수당 부인',
        answer: '주 6일 근무는 팀장이 배차표에 넣어서 정한 거예요. 제가 원해서 나간 게 아니라 그날 배차가 있으면 나가야 했습니다.',
        evidence: '갑 제5호증 근태기록 (2026. 5.~6.)',
        citation: '',
      },
    ],
    conclusion: '근로기준법상 근로자가 맞으니 못 받은 임금 620만원과 연장근로수당 120만원을 지급하도록 하여 주시기 바랍니다.',
    newEvidence: [
      { id: 'labor-brief-ev-1', name: '사내메신저 업무지시 내역', fileName: '사내메신저_지시내용.pdf', size: 1_180_000, type: 'application/pdf' },
      { id: 'labor-brief-ev-2', name: '근태기록 (2026. 5.~6.)', fileName: '근태기록_2026상반기.pdf', size: 640_000, type: 'application/pdf' },
    ],
    evidenceStart: '4',
    citations: ['2023두54914'],
  },

  // 건물명도 — 임차인이 시설 하자를 이유로 차임 지급을 거절한다
  'demo-evict-case': {
    court: '수원지방법원', courtDept: '제2민사부',
    caseNo: '2025가단776655', caseName: '건물명도',
    plaintiff: '홍길동', defendant: '김철수', side: '원고',
    stage: '첫 변론기일을 앞두고 있어요', round: '준비서면(1)', dueDate: dayOffset(9),
    opponentDoc: '답변서', opponentDate: dayOffset(-7),
    opponentFiles: [
      { id: 'evict-op-1', name: '피고 답변서', fileName: '피고_답변서_누수항변.pdf', size: 396_000, type: 'application/pdf' },
    ],
    opponentClaim: '피고는 가게 누수를 제가 안 고쳐줘서 장사를 못 했으니 그만큼 차임을 낼 수 없다고 합니다. 그래서 계약 해지도 무효라고 해요.',
    defenses: ['동시이행 항변', '공제 주장 (원상회복비 등)'],
    admitted: '2023년 4월 1일에 상가 임대차계약을 맺은 사실과 월 차임이 200만원인 사실은 피고도 인정합니다.',
    rebuttals: [
      {
        claim: '동시이행 항변',
        answer: '누수는 2025년 5월에 신고받고 그달에 바로 고쳤어요. 수리비 영수증도 있습니다. 그런데 차임은 2025년 4월부터 안 들어왔으니 수리와는 상관이 없어요.',
        evidence: '갑 제5호증 누수 수리 내역 및 영수증',
        citation: '',
      },
      {
        claim: '공제 주장 (원상회복비 등)',
        answer: '영업을 못 했다는 기간에도 카드매출이 계속 찍혔어요. 매출자료를 보면 장사를 계속하고 있었습니다.',
        evidence: '갑 제6호증 카드매출 내역 (2025. 4.~10.)',
        citation: '',
      },
    ],
    conclusion: '7개월분 차임 1,400만원이 밀려 계약이 적법하게 해지되었으니 건물을 인도하도록 하여 주시기 바랍니다.',
    newEvidence: [
      { id: 'evict-brief-ev-1', name: '누수 수리 내역 및 영수증', fileName: '누수수리_영수증.pdf', size: 520_000, type: 'application/pdf' },
      { id: 'evict-brief-ev-2', name: '카드매출 내역 (2025. 4.~10.)', fileName: '카드매출내역_2025.pdf', size: 880_000, type: 'application/pdf' },
    ],
    evidenceStart: '5',
    citations: ['2024다256116'],
  },
}

/* ─────────────────── 신청서 ─────────────────── */
// 사건마다 그 상황에서 실제로 낼 만한 신청서를 하나씩 붙인다.

export const demoPetitions = {
  // 임금체불 — 다툼이 적으니 지급명령부터
  'demo-labor-case': {
    typeKey: 'payment',
    form: {
      court: '서울남부지방법원', amount: '7400000',
      aName: '홍길동', aRrn: '880417-1******', aAddr: '서울특별시 동작구 상도로 200', aAddrDetail: '1102호', aTel: '010-2841-7306', aEmail: 'gildong.hong@example.com',
      bName: '김철수', bRrn: '761208-1******', bAddr: '서울특별시 강남구 테헤란로 152', bAddrDetail: '1204호', bTel: '010-9274-1185',
      claimKind: '기타', claimKindEtc: '임금·연장근로수당',
      claimDate: '2026-06-30', dueDate: '2026-07-14',
      interestSet: '청구함', interestRate: '20',
      claimStory: '피고가 운영하는 물류센터에서 배차 담당으로 일하다 2026년 6월 말에 그만뒀는데, 5월하고 6월 월급 620만원이랑 그 두 달 연장근로수당 120만원을 못 받았어요. 노동청에 진정 넣어서 체불금품확인원도 받아뒀습니다.',
      attachItems: ['차용증·계약서', '계좌이체 내역', '내용증명 우편물'],
      attachFiles: [
        { id: 'labor-pt-1', name: '근로계약서', fileName: '근로계약서.pdf', size: 480_000, type: 'application/pdf' },
        { id: 'labor-pt-2', name: '체불금품확인원', fileName: '체불금품확인원_2026.pdf', size: 210_000, type: 'application/pdf' },
        { id: 'labor-pt-3', name: '주민등록초본', fileName: '주민등록초본_홍길동.pdf', size: 121_000, type: 'application/pdf' },
      ],
    },
  },

  // 임금체불 — 퇴사 후 수입이 끊겨 인지대·송달료를 감당하기 어렵다
  'demo-labor-case-aid': {
    caseId: 'demo-labor-case',
    typeKey: 'aid',
    form: {
      court: '서울남부지방법원', caseNo: '2026가단221457', caseName: '임금',
      stage: '이미 소송이 진행 중',
      aName: '홍길동', aRrn: '880417-1******', aAddr: '서울특별시 동작구 상도로 200', aAddrDetail: '1102호', aTel: '010-2841-7306',
      aidScope: ['인지대', '송달료'],
      welfare: '해당 없음',
      income: '0', family: '2', assets: '3200000', debts: '18000000',
      houseKind: '월세',
      aidReason: '2026년 6월에 퇴사하고 나서 임금을 못 받아 수입이 아예 없어요. 월세 55만원하고 대출 이자를 카드로 돌려 막고 있는 형편입니다. 인지대랑 송달료 낼 돈이 없어서 소장을 못 내고 있어요.',
      attachItems: ['소득금액증명 (세무서)', '건강보험료 납부확인서', '통장 거래내역', '지방세 세목별 과세증명'],
      attachFiles: [
        { id: 'aid-1', name: '소득금액증명', fileName: '소득금액증명_2025.pdf', size: 142_000, type: 'application/pdf' },
        { id: 'aid-2', name: '건강보험료 납부확인서', fileName: '건강보험료_납부확인서.pdf', size: 96_000, type: 'application/pdf' },
        { id: 'aid-3', name: '통장 거래내역', fileName: '통장거래내역_최근3개월.pdf', size: 388_000, type: 'application/pdf' },
        { id: 'aid-4', name: '지방세 세목별 과세증명', fileName: '지방세_세목별과세증명.pdf', size: 88_000, type: 'application/pdf' },
      ],
    },
  },

  // 임대차 — 이사하면서 대항력을 지키려면 임차권등기명령
  'demo-lease-case': {
    typeKey: 'leasereg',
    form: {
      court: '서울중앙지방법원',
      leaseKind: '주택',
      propertyDesc: '서울특별시 관악구 남부순환로 1820\n철근콘크리트조 15층 아파트 제5층 제503호 59.8㎡',
      leasePart: '전부', deposit: '10000000', rent: '450000',
      aName: '홍길동', aRrn: '880417-1******', aAddr: '서울특별시 동작구 상도로 200', aAddrDetail: '1102호', aTel: '010-2841-7306', aEmail: 'gildong.hong@example.com',
      bName: '김철수', bRrn: '761208-1******', bAddr: '서울특별시 강남구 테헤란로 152', bAddrDetail: '1204호', bTel: '010-9274-1185',
      contractDate: '2024-01-01', moveIn: '2024-01-01', residentDate: '2024-01-02', fixedDate: '2024-01-02',
      endWay: '기간 만료', endDate: '2026-01-01', stillLiving: '이미 이사했어요',
      reason: '계약이 끝나서 2026년 1월 3일에 짐 다 빼고 열쇠도 넘겼는데 보증금을 안 돌려줘요. 회사 때문에 다른 데로 옮겨야 해서 전입신고를 빼야 하는데, 그러면 대항력이 없어진다고 해서 등기를 먼저 해두려고 합니다.',
      attachItems: ['임대차계약서 사본', '주민등록등본', '건물 등기사항전부증명서', '내용증명 우편물'],
      attachFiles: [
        { id: 'lease-pt-1', name: '임대차계약서 사본', fileName: '임대차계약서.pdf', size: 2_411_725, type: 'application/pdf' },
        { id: 'lease-pt-2', name: '주민등록등본', fileName: '주민등록등본_홍길동.pdf', size: 132_000, type: 'application/pdf' },
        { id: 'lease-pt-3', name: '건물 등기사항전부증명서', fileName: '등기사항전부증명서_관악구.pdf', size: 412_000, type: 'application/pdf' },
      ],
      citations: ['2025다220329'],
    },
  },

  // 건물명도 — 소송 중 가게를 넘겨버리지 못하도록 차임채권 가압류
  'demo-evict-case': {
    typeKey: 'provisional',
    form: {
      court: '수원지방법원',
      claimKind: '임대차보증금', amount: '14860000', claimDate: '2025-04-01',
      suitStage: '이미 냈어요', suitCaseNo: '2025가단776655',
      aName: '홍길동', aRrn: '880417-1******', aAddr: '서울특별시 동작구 상도로 200', aAddrDetail: '1102호', aTel: '010-2841-7306', aEmail: 'gildong.hong@example.com',
      bName: '김철수', bRrn: '761208-1******', bAddr: '서울특별시 강남구 테헤란로 152', bAddrDetail: '1204호', bTel: '010-9274-1185',
      targetKind: '채권 (예금·급여·임대차보증금)',
      targetDesc: '채무자가 제3채무자에 대하여 가지는 카드매출채권 중 청구금액에 이르기까지의 금액',
      thirdParty: '주식회사 케이지이니시스',
      needReasons: ['재산을 처분하려는 정황이 있어요', '사업을 정리하고 있어요'],
      needDetail: '가게 안에 다른 업체 간판이 걸린 걸 본 사람이 있다고 해요. 권리금 받고 넘기려는 것 같습니다. 그러면 판결을 받아도 받을 데가 없어져요.',
      security: '공탁보증보험증권',
      stDebtorAdmits: '다투고 있어요',
      stDebtorClaim: '채무자는 코로나 때 매출이 없어서 못 낸 거고, 임대인이 시설을 안 고쳐줘서 손해를 봤으니 그만큼 빼야 한다고 합니다.',
      stConfirmedHow: '2025. 11. 3. 내용증명 발송 후 통화',
      stOtherClaim: '없어요', stOtherClaimDetail: '해당 없음',
      stAmountProper: '예',
      stDebtorBiz: '영업 중이에요',
      stSuitFiled: '냈어요', stSuitDetail: '수원지방법원 2025가단776655 건물명도',
      stPast5y: '없어요', stPast5yDetail: '해당 없음',
      stDup: '없어요', stDupDetail: '해당 없음',
      citations: ['2021마7088'],
      attachItems: ['가압류신청 진술서 (필수)', '차용증·계약서', '부동산 등기사항전부증명서', '내용증명 우편물', '공탁보증보험증권'],
      attachFiles: [
        { id: 'evict-pt-1', name: '상가임대차계약서', fileName: '상가임대차계약서.pdf', size: 2_100_000, type: 'application/pdf' },
        { id: 'evict-pt-2', name: '부동산 등기사항전부증명서', fileName: '등기사항전부증명서_세화로44.pdf', size: 388_000, type: 'application/pdf' },
        { id: 'evict-pt-3', name: '계약해지 내용증명', fileName: '계약해지_내용증명.pdf', size: 640_000, type: 'application/pdf' },
        { id: 'evict-pt-4', name: '주민등록초본', fileName: '주민등록초본_홍길동.pdf', size: 121_000, type: 'application/pdf' },
      ],
    },
  },

  // 대여금 — 판결이 확정됐으니 강제집행
  'demo-loan-case': {
    typeKey: 'execution',
    form: {
      titleKind: '확정판결', court: '서울동부지방법원', caseNo: '2024가소445566',
      finalDate: dayOffset(-3), hasClause: '받았어요', amount: '4000000',
      aName: '홍길동', aRrn: '880417-1******', aAddr: '서울특별시 동작구 상도로 200', aAddrDetail: '1102호', aTel: '010-2841-7306', aEmail: 'gildong.hong@example.com',
      bName: '김철수', bRrn: '761208-1******', bAddr: '서울특별시 강남구 테헤란로 152', bAddrDetail: '1204호', bTel: '010-9274-1185',
      method: '채권 압류 및 추심',
      targetDesc: '채무자가 제3채무자에 대하여 가지는 예금채권 중 청구금액에 이르기까지의 금액',
      thirdParty: '주식회사 국민은행',
      targetAddr: '서울특별시 영등포구 국제금융로8길 26',
      askedFirst: '요구했어요',
      attachItems: ['집행력 있는 판결정본', '송달증명원', '확정증명원', '집행문'],
      attachFiles: [
        { id: 'loan-pt-1', name: '집행력 있는 판결정본', fileName: '판결정본_2024가소445566.pdf', size: 520_000, type: 'application/pdf' },
        { id: 'loan-pt-2', name: '송달증명원', fileName: '송달증명원.pdf', size: 96_000, type: 'application/pdf' },
        { id: 'loan-pt-3', name: '확정증명원', fileName: '확정증명원.pdf', size: 94_000, type: 'application/pdf' },
      ],
    },
  },

  // 교통사고 — 판결 전에 상대방 재산을 묶어둔다
  'demo-crash-case': {
    typeKey: 'provisional',
    form: {
      court: '서울북부지방법원',
      claimKind: '손해배상', amount: '18600000', claimDate: '2025-09-12',
      suitStage: '이미 냈어요', suitCaseNo: '2025가단334455',
      aName: '홍길동', aRrn: '880417-1******', aAddr: '서울특별시 동작구 상도로 200', aAddrDetail: '1102호', aTel: '010-2841-7306', aEmail: 'gildong.hong@example.com',
      bName: '김철수', bRrn: '761208-1******', bAddr: '서울특별시 강남구 테헤란로 152', bAddrDetail: '1204호', bTel: '010-9274-1185',
      targetKind: '부동산',
      targetDesc: '서울특별시 도봉구 방학로 88\n철근콘크리트조 12층 아파트 제4층 제401호 84.9㎡',
      needReasons: ['재산을 처분하려는 정황이 있어요', '변제 능력이 없어 보여요'],
      needDetail: '피고가 사는 아파트를 부동산에 내놨다는 얘기를 들었어요. 보험으로도 다 안 되는 금액이라 집이 넘어가면 받을 방법이 없습니다.',
      security: '공탁보증보험증권',
      stDebtorAdmits: '다투고 있어요',
      stDebtorClaim: '피고는 제가 과속해서 사고가 커진 거라며 과실이 3대 7이라고 합니다. 치료비도 과하다고 해요.',
      stConfirmedHow: '2025. 12. 답변서 및 보험사 통화',
      stOtherClaim: '없어요', stOtherClaimDetail: '해당 없음',
      stAmountProper: '예',
      stDebtorBiz: '채무자가 법인이 아니에요',
      stSuitFiled: '냈어요', stSuitDetail: '서울북부지방법원 2025가단334455 손해배상(자)',
      stPast5y: '없어요', stPast5yDetail: '해당 없음',
      stDup: '없어요', stDupDetail: '해당 없음',
      citations: ['2021마7088'],
      attachItems: ['가압류신청 진술서 (필수)', '부동산 등기사항전부증명서', '공탁보증보험증권'],
      attachFiles: [
        { id: 'crash-pt-1', name: '부동산 등기사항전부증명서', fileName: '등기사항전부증명서_방학로88.pdf', size: 402_000, type: 'application/pdf' },
        { id: 'crash-pt-2', name: '교통사고사실확인원', fileName: '교통사고사실확인원.pdf', size: 168_000, type: 'application/pdf' },
      ],
    },
  },
}

/** 사건 하나의 준비서면 초안 */
export const demoBriefFor = (caseId) => demoBriefs[caseId] || null

/**
 * 사건 하나에 달린 신청서 초안들.
 * 한 사건에 신청서가 둘 이상일 수 있어서(임금체불 = 지급명령 + 소송구조) 배열로 돌려준다.
 */
export const demoPetitionsFor = (caseId) => Object.entries(demoPetitions)
  .filter(([key, entry]) => (entry.caseId || key) === caseId)
  .map(([key, entry]) => ({ key, typeKey: entry.typeKey, form: entry.form }))

const key = (kind) => `naholo_draft_${kind}`

/**
 * 데모 초안을 심는다. 이미 있는 것은 사용자가 고쳤을 수 있으니 건드리지 않는다.
 * (사건 시드와 같은 규칙 — casebook.seedCases 참고)
 */
export function seedDemoDrafts() {
  const put = (k, form) => {
    const id = key(k)
    try {
      if (localStorage.getItem(id)) return
      localStorage.setItem(id, JSON.stringify({ form, meta: { demo: true }, savedAt: Date.now() }))
    } catch { /* 저장소가 꽉 찼으면 데모 초안은 포기한다 */ }
  }
  Object.entries(demoBriefs).forEach(([caseId, form]) => put(`brief_${caseId}`, form))
  // 한 사건에 신청서가 둘 이상일 수 있어서, 표의 키와 사건 id를 따로 둔다
  Object.entries(demoPetitions).forEach(([key, { typeKey, form, caseId }]) => put(`petition_${typeKey}_${caseId || key}`, form))
}
