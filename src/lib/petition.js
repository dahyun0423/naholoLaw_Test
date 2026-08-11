// 신청서 — 분기 축이 "청구원인"이 아니라 "소송 중 무엇을 하고 싶은지(절차적 목적)"다.
// 나홀로소송에서 실제 사용 빈도가 높은 5종.

import { stampFee, won, fmtDate } from './complaint.js'
import { citationLines } from './citation.js'
import {
  text, money, date, num, area, select, radio, checks, note, files, signature, repeat,
  partyPair, F, P, or, money$, date$, today, filled, partyLines, completenessOf, summaryOf,
} from './docschema.js'

/* 채권자·채무자 / 신청인·피신청인 키 묶음 */
const CRED = { tag: '채권자', desc: '돈을 받을 사람 · 나', name: 'aName', rrn: 'aRrn', addr: 'aAddr', tel: 'aTel', email: 'aEmail' }
const DEBT = { tag: '채무자', desc: '돈을 갚아야 할 사람 · 상대방', name: 'bName', rrn: 'bRrn', addr: 'bAddr', tel: 'bTel' }
const TENANT = { tag: '임차인', desc: '보증금을 돌려받을 사람 · 나', name: 'aName', rrn: 'aRrn', addr: 'aAddr', tel: 'aTel', email: 'aEmail' }
const LANDLORD = { tag: '임대인', desc: '보증금을 돌려줘야 할 사람 · 상대방', name: 'bName', rrn: 'bRrn', addr: 'bAddr', tel: 'bTel' }

const attachStep = (items, { citation = false } = {}) => ({
  title: '첨부서류 · 서명',
  fields: [
    checks('attachItems', '함께 낼 서류를 골라주세요', items, { required: true }),
    ...(citation ? [{ kind: 'citation', key: 'citations' }] : []),
    files('attachFiles', '파일 업로드'),
    note('warn', '전자소송으로 내려면 **사건마다 「전자소송 동의」를 먼저** 해야 해요. 소송 중에 내는 신청서는 그 소송에 대한 동의를 이미 마쳤을 때만 전자로 낼 수 있습니다. 한 번 동의하면 이후 서류는 전자로만 내고, 송달도 전자로 받아요.'),
    note('info', '전자송달은 열람하지 않아도 통지받은 날부터 1주가 지나면 송달된 것으로 봅니다(그 날 0시 기준). 기한 계산에 주의하세요.'),
    signature(),
  ],
})

export const petitionTypes = [
  /* ── 1. 지급명령 ── */
  {
    key: 'payment',
    title: '지급명령신청서',
    short: '지급명령',
    desc: '다툼 여지가 적은 금전채권을 빠르게 회수하고 싶을 때 (소장보다 먼저 시도하는 경우가 많아요)',
    docTitle: '지 급 명 령 신 청 서',
    role: '위 채권자',
    intro: '법원 출석 없이 서류 심사만으로 1~2개월 안에 강제집행 권원을 얻을 수 있어요. 채무자가 이의신청을 하면 자동으로 정식 소송으로 넘어갑니다.',
    steps: [
      {
        title: '어느 법원에 얼마를 청구하나요?',
        hint: '지급명령은 채무자 주소지 관할 법원에 냅니다. 인지대가 소장의 1/10이라 훨씬 저렴해요.',
        fields: [
          { kind: 'court', key: 'court', label: '신청할 법원', required: true },
          note('info', '채무자의 주소지, 근무지, 사무소 소재지 관할 법원에 낼 수 있어요.'),
          money('amount', '청구 금액', { required: true }),
          { kind: 'paymentCost' },
        ],
      },
      { title: '누가 누구에게 청구하나요?', fields: partyPair(CRED, DEBT) },
      {
        title: '어떤 돈인가요?',
        fields: [
          radio('claimKind', '청구 종류', ['대여금', '물품대금', '용역대금', '임대료·관리비', '기타'], { required: true }),
          text('claimKindEtc', '어떤 채권인가요?', { when: (f) => f.claimKind === '기타', placeholder: '예: 공사대금' }),
          date('claimDate', '채권 발생일', { required: true, half: true }),
          date('dueDate', '변제기 (갚기로 한 날)', { half: true }),
          radio('interestSet', '이자·지연손해금을 청구할까요?', ['청구함', '청구 안 함'], { required: true }),
          num('interestRate', '연 이율', { half: true, unit: '%', when: (f) => f.interestSet === '청구함' }),
          note('info', '약정 이율이 없으면 상법상 연 6%(상행위) 또는 민법상 연 5%가 기준이고, 지급명령 송달 다음 날부터는 연 12%를 청구할 수 있어요.', { when: (f) => f.interestSet === '청구함' }),
          area('claimStory', '청구 이유', { rows: 4, required: true, placeholder: '예) 채권자는 2023. 5. 10. 채무자에게 3,000만원을 대여하였으나 변제기가 지나도록 변제받지 못하였습니다.' }),
          note('warn', '채무자가 2주 안에 이의신청을 하면 정식 소송으로 전환돼요. 다툼이 예상되면 처음부터 소장을 내는 편이 빠를 수 있습니다.'),
        ],
      },
      attachStep(['차용증·계약서', '계좌이체 내역', '세금계산서·거래명세서', '내용증명 우편물', '법인등기부등본']),
    ],
    build(form) {
      const kind = form.claimKind === '기타' ? form.claimKindEtc : form.claimKind
      const rate = form.interestSet === '청구함' && form.interestRate ? `연 ${form.interestRate}%` : '연 12%'
      return {
        docTitle: '지 급 명 령 신 청 서',
        header: partyLines(form, [CRED, DEBT], ['채권자', '채무자']),
        lead: `${or(kind, '청구 종류')} 청구의 독촉사건`,
        sections: [
          {
            heading: '신 청 취 지',
            lines: [
              `채무자는 채권자에게 ${money$(form.amount, '1단계에서 청구금액을 입력해 주세요')} 및 이에 대하여 이 사건 지급명령 정본이 송달된 다음 날부터 다 갚는 날까지 ${F(rate)}의 비율로 계산한 돈을 지급하라.`,
              '독촉절차비용은 채무자가 부담한다.',
              '라는 재판을 구합니다.',
            ],
          },
          {
            heading: '신 청 이 유',
            lines: [
              `1. 채권자는 ${date$(form.claimDate, '3단계에서 채권 발생일을 입력해 주세요')} 채무자에 대하여 ${or(kind, '청구 종류')} 채권 ${money$(form.amount, '청구금액')}을 가지고 있습니다.`,
              form.dueDate ? `2. 변제기는 ${date$(form.dueDate, '변제기')}였습니다.` : `2. ${P('변제기를 3단계에서 입력해 주세요')}`,
              `3. ${or(form.claimStory, '3단계에서 청구 이유를 입력해 주세요')}`,
              '4. 따라서 신청취지와 같은 지급명령을 구합니다.',
            ],
          },
        ],
        attach: (form.attachItems || []).map((a) => `${a}　1통`),
        role: '위 채권자',
        court: form.court,
        name: form.aName,
        date: today(),
        signature: form.signature,
      }
    },
  },

  /* ── 2. 소송구조 ── */
  {
    key: 'aid',
    title: '소송구조신청서',
    short: '소송구조',
    desc: '소송비용(인지대·송달료·변호사보수) 낼 형편이 안 될 때',
    docTitle: '소 송 구 조 신 청 서',
    role: '위 신청인',
    intro: '법원이 소송비용의 납입을 미뤄주거나 면제해 주는 제도예요. 자금 능력이 부족하고 패소할 것이 분명하지 않으면 받을 수 있습니다.',
    steps: [
      {
        title: '어떤 사건에 대한 신청인가요?',
        fields: [
          { kind: 'court', key: 'court', label: '사건이 걸린 법원', required: true },
          text('caseNo', '사건번호', { half: true, placeholder: '2026가단123456 (소 제기 전이면 비워두세요)' }),
          text('caseName', '사건명', { half: true, placeholder: '대여금' }),
          radio('stage', '지금 어느 단계인가요?', ['소 제기 전 (같이 낼 예정)', '이미 소송이 진행 중'], { required: true }),
          checks('aidScope', '어떤 비용을 구조받고 싶나요?', ['인지대', '송달료', '변호사 보수', '감정료·증인여비'], { required: true }),
          note('info', '소 제기 전에도 신청할 수 있어요. 이 경우 소장과 함께 내면 인지대를 내지 않고 접수됩니다.', { when: (f) => f.stage === '소 제기 전 (같이 낼 예정)' }),
        ],
      },
      {
        title: '형편을 알려주세요 (무자력 소명)',
        fields: [
          radio('welfare', '아래에 해당하나요?', ['기초생활수급자', '차상위계층', '한부모가족', '해당 없음'], { required: true }),
          note('ok', '수급자·차상위·한부모가족은 증명서만으로 자금능력 부족이 비교적 쉽게 인정돼요.', { when: (f) => f.welfare && f.welfare !== '해당 없음' }),
          money('income', '월 평균 소득', { required: true, half: true }),
          num('family', '부양가족 수', { half: true, unit: '명' }),
          money('assets', '보유 재산 (부동산·예금 등 합계)', { half: true }),
          money('debts', '채무 총액', { half: true }),
          radio('houseKind', '주거 형태', ['자가', '전세', '월세', '기타'], { required: true }),
          area('aidReason', '왜 비용을 내기 어려운가요?', { rows: 4, required: true, placeholder: '예) 실직 후 소득이 없고, 부양가족 2명의 생계비로 매월 적자가 발생하고 있어 인지대 14만원을 마련하기 어렵습니다.' }),
          note('warn', '소명자료가 없으면 기각될 수 있어요. 소득금액증명·건강보험료 납부확인서·통장 거래내역을 꼭 첨부하세요.'),
        ],
      },
      attachStep([
        '소득금액증명 (세무서)', '건강보험료 납부확인서', '기초생활수급자 증명서', '한부모가족 증명서',
        '지방세 세목별 과세증명', '통장 거래내역', '재산세 과세증명',
      ], { citation: true }),
    ],
    build(form) {
      const scope = (form.aidScope || []).join('·')
      return {
        docTitle: '소 송 구 조 신 청 서',
        header: [
          `사　건　${or(form.caseNo, '사건번호')} ${form.caseName || ''}`,
          `신청인　${or(form.aName, '2단계에서 이름을 입력해 주세요')}`,
          `　　　　${or(form.aAddr, '주소')}`,
        ],
        sections: [
          {
            heading: '신 청 취 지',
            lines: [
              `신청인에게 위 사건에 관한 ${scope ? F(scope) : P('구조받을 비용을 1단계에서 골라 주세요')}의 납입을 유예하는 소송구조를 하여 주시기 바랍니다.`,
            ],
          },
          {
            heading: '신 청 이 유',
            lines: [
              `1. 신청인은 ${form.welfare && form.welfare !== '해당 없음' ? F(form.welfare) : '자금능력이 부족한 사람'}으로서, 월 소득이 ${money$(form.income, '2단계에서 월 소득을 입력해 주세요')}에 불과합니다.`,
              form.family ? `2. 부양가족 ${F(`${form.family}명`)}의 생계를 책임지고 있으며, 보유 재산은 ${money$(form.assets, '재산')}입니다.` : `2. ${P('부양가족·재산을 2단계에서 입력해 주세요')}`,
              `3. ${or(form.aidReason, '2단계에서 사유를 입력해 주세요')}`,
              form.stage === '소 제기 전 (같이 낼 예정)'
                ? '4. 신청인은 이 사건 소를 제기하면서 이 신청을 함께 제출합니다.'
                : '4. 위 사건은 현재 소송 계속 중입니다.',
              '5. 또한 이 사건 청구는 패소할 것이 분명하지 아니합니다.',
              '6. 따라서 신청취지와 같은 재판을 구합니다.',
            ],
          },
        ],
        attach: (form.attachItems || []).map((a) => `${a}　1통`),
        role: '위 신청인',
        court: form.court,
        name: form.aName,
        date: today(),
        signature: form.signature,
      }
    },
  },

  /* ── 3. 임차권등기명령 ── */
  {
    key: 'leasereg',
    title: '임차권등기명령신청서',
    short: '임차권등기',
    desc: '보증금 못 받고 이사해야 하는데 대항력을 유지하고 싶을 때',
    docTitle: '임 차 권 등 기 명 령 신 청 서',
    role: '위 신청인(임차인)',
    intro: '등기를 마치면 이사를 나가도 대항력과 우선변제권이 그대로 유지돼요. 보증금 반환 소송보다 먼저 해두는 게 안전합니다.',
    steps: [
      {
        title: '어느 법원에, 어떤 집인가요?',
        fields: [
          { kind: 'court', key: 'court', label: '신청할 법원', required: true },
          note('info', '임차 건물이 있는 곳을 관할하는 지방법원·지원·시군법원에 냅니다.'),
          radio('leaseKind', '어떤 임대차인가요?', ['주택', '상가'], { required: true }),
          area('propertyDesc', '부동산의 표시 (등기부 기재대로)', { rows: 3, required: true, placeholder: '서울특별시 마포구 월드컵북로 21\n철근콘크리트조 5층 다세대주택 제3층 제302호 59.8㎡' }),
          text('leasePart', '임차 부분', { placeholder: '예: 3층 302호 전부' }),
          money('deposit', '보증금액', { required: true, half: true }),
          money('rent', '월세 (없으면 비워두세요)', { half: true }),
        ],
      },
      { title: '누가 누구를 상대로 하나요?', fields: partyPair(TENANT, LANDLORD) },
      {
        title: '임대차 관계를 알려주세요',
        fields: [
          date('contractDate', '계약체결일', { required: true, half: true }),
          date('moveIn', '점유 시작일 (입주일)', { required: true, half: true }),
          date('residentDate', '전입신고일', { required: true, half: true }),
          date('fixedDate', '확정일자', { half: true }),
          note('warn', '전입신고와 확정일자가 대항력·우선변제권의 근거예요. 날짜를 반드시 확인해서 적어주세요.'),
          radio('endWay', '임대차가 어떻게 끝났나요?', ['기간 만료', '해지통고로 종료', '묵시적 갱신 후 해지'], { required: true }),
          date('endDate', '임대차 종료일', { required: true, half: true }),
          radio('stillLiving', '지금도 살고 계신가요?', ['아직 살고 있어요', '이미 이사했어요'], { required: true }),
          note('warn', '이사부터 하면 대항력을 잃습니다. 반드시 등기가 완료된 것을 확인한 뒤 이사하세요.', { when: (f) => f.stillLiving === '아직 살고 있어요' }),
          area('reason', '보증금을 못 받은 사정', { rows: 3, required: true, placeholder: '예) 계약이 만료되어 반환을 요청했으나 임대인이 새 임차인이 구해지면 주겠다며 반환을 미루고 있습니다.' }),
        ],
      },
      attachStep(['임대차계약서 사본', '주민등록등본', '건물 등기사항전부증명서', '내용증명 우편물', '건축물대장'], { citation: true }),
    ],
    build(form) {
      return {
        docTitle: '임 차 권 등 기 명 령 신 청 서',
        header: partyLines(form, [TENANT, LANDLORD], ['신청인', '피신청인']),
        sections: [
          {
            heading: '신 청 취 지',
            lines: [
              '별지 목록 기재 건물에 관하여 아래와 같은 주택임차권등기를 명한다. 라는 재판을 구합니다.',
              `1. 임대차계약일자 : ${date$(form.contractDate, '계약체결일')}`,
              `2. 임차보증금액 : ${money$(form.deposit, '보증금액')}${form.rent ? ` / 차임 ${F(`${won(form.rent)}원`)}` : ''}`,
              ...(form.leasePart ? [`　 임차 부분 : ${F(form.leasePart)}`] : []),
              `3. 주민등록일자 : ${date$(form.residentDate, '전입신고일')}`,
              `4. 점유개시일자 : ${date$(form.moveIn, '점유 시작일')}`,
              `5. 확정일자 : ${date$(form.fixedDate, '확정일자')}`,
            ],
          },
          {
            heading: '신 청 이 유',
            lines: [
              `1. 신청인은 ${date$(form.contractDate, '3단계에서 계약체결일을 입력해 주세요')} 피신청인과 별지 목록 기재 건물에 관하여 보증금 ${money$(form.deposit, '보증금액')}으로 하는 임대차계약을 체결하고 입주와 전입신고를 마쳤습니다.`,
              `2. 위 임대차는 ${date$(form.endDate, '임대차 종료일')} ${form.endWay ? F(form.endWay) : P('종료 사유')}로 종료되었습니다.`,
              `3. ${or(form.reason, '3단계에서 사정을 입력해 주세요')}`,
              form.stillLiving === '아직 살고 있어요'
                ? '4. 신청인은 현재까지 위 건물에 거주하고 있으나, 보증금을 반환받지 못한 상태에서 이사할 사정이 있어 대항력과 우선변제권을 유지하기 위하여 이 사건 신청에 이르렀습니다.'
                : '4. 신청인은 보증금을 반환받지 못한 채 이미 위 건물에서 퇴거하였으므로, 대항력과 우선변제권을 유지하기 위하여 이 사건 신청에 이르렀습니다.',
            ],
          },
        ],
        attach: (form.attachItems || []).map((a) => `${a}　1통`),
        // 별지 목록 — 등기 대상 부동산이 특정되어야 등기명령이 나온다
        appendix: { title: '부동산의 표시', body: form.propertyDesc || '' },
        role: '위 신청인(임차인)',
        court: form.court,
        name: form.aName,
        date: today(),
        signature: form.signature,
      }
    },
  },

  /* ── 4. 강제집행 ── */
  {
    key: 'execution',
    title: '강제집행신청서',
    short: '강제집행',
    desc: '판결은 받았는데 상대방이 스스로 이행하지 않을 때',
    docTitle: '강 제 집 행 신 청 서',
    role: '위 채권자',
    intro: '판결문만으로는 돈이 들어오지 않아요. 집행문을 받아 이 신청을 해야 압류·경매·인도집행이 시작됩니다.',
    steps: [
      {
        title: '어떤 집행권원을 가지고 계신가요?',
        fields: [
          radio('titleKind', '집행권원 종류', ['확정판결', '지급명령', '조정조서·화해조서', '공정증서'], { required: true }),
          { kind: 'court', key: 'court', label: '집행권원을 발급한 법원', required: true },
          text('caseNo', '사건번호', { required: true, half: true, placeholder: '2026가단123456' }),
          date('finalDate', '확정일 / 작성일', { required: true, half: true }),
          radio('hasClause', '집행문을 부여받으셨나요?', ['받았어요', '아직이에요'], { required: true }),
          note('warn', '집행문·송달증명원·확정증명원 3종이 없으면 집행을 시작할 수 없어요. 판결을 선고한 법원에서 먼저 발급받으세요.', { when: (f) => f.hasClause === '아직이에요' }),
          money('amount', '집행할 청구금액', { required: true }),
          note('info', '원금 외에 판결에서 인정된 지연손해금과 소송비용도 함께 집행할 수 있어요.'),
        ],
      },
      { title: '누가 누구에게 집행하나요?', fields: partyPair(CRED, DEBT) },
      {
        title: '무엇을 어떻게 집행할까요?',
        fields: [
          radio('method', '집행 방법', ['유체동산 압류', '채권 압류 및 추심', '부동산 강제경매', '건물 인도집행'], { required: true }),
          note('info', '월급·예금처럼 상대방이 제3자에게 받을 돈을 묶는 방법이에요. 회수 가능성이 가장 높습니다.', { when: (f) => f.method === '채권 압류 및 추심' }),
          note('warn', '급여는 월 185만원 또는 1/2 중 채무자에게 유리한 금액이 압류금지 범위예요.', { when: (f) => f.method === '채권 압류 및 추심' }),
          area('targetDesc', '집행할 목적물', { rows: 3, required: true, placeholder: '예) 채무자가 주식회사 대한물류로부터 매월 지급받는 급여채권 중 압류 가능한 금액' }),
          text('thirdParty', '제3채무자 (은행·회사 등)', { when: (f) => f.method === '채권 압류 및 추심', placeholder: '예: 주식회사 국민은행' }),
          text('targetAddr', '집행 장소', { when: (f) => ['유체동산 압류', '건물 인도집행'].includes(f.method), placeholder: '채무자 주소 또는 물건 소재지' }),
          radio('askedFirst', '집행 전에 임의 이행을 요구했나요?', ['요구했어요', '안 했어요']),
        ],
      },
      attachStep(['집행력 있는 판결정본', '송달증명원', '확정증명원', '집행문', '법인등기부등본']),
    ],
    build(form) {
      return {
        docTitle: '강 제 집 행 신 청 서',
        header: partyLines(form, [CRED, DEBT], ['채권자', '채무자']),
        sections: [
          {
            heading: '집 행 권 원',
            lines: [`${or(form.court, '법원')} ${or(form.caseNo, '사건번호')} ${form.titleKind ? F(form.titleKind) : P('집행권원 종류')} (${date$(form.finalDate, '확정일')} 확정)`],
          },
          {
            heading: '집 행 목 적 물',
            lines: [
              `${or(form.targetDesc, '3단계에서 집행할 목적물을 입력해 주세요')}`,
              ...(form.thirdParty ? [`제3채무자 : ${F(form.thirdParty)}`] : []),
              ...(form.targetAddr ? [`집행 장소 : ${F(form.targetAddr)}`] : []),
            ],
          },
          {
            heading: '청 구 금 액',
            lines: [
              `금 ${money$(form.amount, '1단계에서 청구금액을 입력해 주세요')}`,
              '(위 집행권원에 표시된 원금·지연손해금 및 소송비용)',
            ],
          },
          {
            heading: '신 청 취 지',
            lines: [
              `위 집행권원에 기초하여 채무자에 대하여 ${form.method ? F(form.method) : P('집행 방법을 3단계에서 골라 주세요')}을(를) 하여 주시기 바랍니다.`,
              ...(form.hasClause === '받았어요'
                ? [F('위 집행권원에는 집행문이 부여되어 있습니다.')]
                : [P('집행문을 먼저 부여받아야 집행을 개시할 수 있습니다')]),
              ...(form.askedFirst === '요구했어요'
                ? [F('채권자는 집행에 앞서 채무자에게 임의 이행을 최고하였으나 응하지 아니하였습니다.')]
                : []),
            ],
          },
        ],
        attach: (form.attachItems || []).map((a) => `${a}　1통`),
        role: '위 채권자',
        court: form.court,
        name: form.aName,
        date: today(),
        signature: form.signature,
      }
    },
  },

  /* ── 5. 가압류 ── */
  {
    key: 'provisional',
    title: '가압류신청서',
    short: '가압류',
    desc: '소송 전·중에 상대방 재산을 미리 묶어둬야 할 때 (재산 빼돌림 방지)',
    docTitle: '부 동 산 가 압 류 신 청 서',
    role: '위 채권자',
    intro: '판결까지 기다리는 동안 상대방이 재산을 처분하면 이겨도 받을 게 없어요. 가압류로 먼저 묶어둡니다.',
    steps: [
      {
        title: '무엇을 근거로 신청하나요? (피보전권리)',
        fields: [
          { kind: 'court', key: 'court', label: '신청할 법원', required: true },
          note('info', '본안 소송을 낼 법원이나 가압류할 물건이 있는 곳의 법원에 냅니다.'),
          radio('claimKind', '청구채권 종류', ['대여금', '물품대금', '임대차보증금', '손해배상', '임금'], { required: true }),
          money('amount', '청구채권 금액', { required: true }),
          date('claimDate', '채권 발생일', { required: true, half: true }),
          radio('suitStage', '본안 소송은 어떤 상태인가요?', ['아직 안 냈어요', '이미 냈어요'], { required: true }),
          text('suitCaseNo', '본안 사건번호', { half: true, when: (f) => f.suitStage === '이미 냈어요' }),
          note('warn', '가압류만 하고 본안 소송을 내지 않으면, 상대방의 제소명령 신청으로 가압류가 취소될 수 있어요.', { when: (f) => f.suitStage === '아직 안 냈어요' }),
        ],
      },
      { title: '누가 누구의 재산을 묶나요?', fields: partyPair(CRED, DEBT) },
      {
        title: '어떤 재산을 가압류할까요?',
        fields: [
          radio('targetKind', '가압류할 재산', ['부동산', '채권 (예금·급여·임대차보증금)', '유체동산'], { required: true }),
          area('targetDesc', '목적물의 표시', { rows: 3, required: true, placeholder: '부동산이면 등기부 기재대로, 채권이면 제3채무자와 채권 내용을 적어주세요.' }),
          text('thirdParty', '제3채무자', { when: (f) => f.targetKind === '채권 (예금·급여·임대차보증금)', placeholder: '예: 주식회사 국민은행' }),
          note('info', '부동산 가압류는 등기부에 기입되어 사실상 처분을 막습니다. 채권 가압류는 회수 가능성이 높은 대신 상대방이 바로 알게 돼요.'),
        ],
      },
      {
        title: '왜 지금 묶어야 하나요? (보전의 필요성)',
        fields: [
          checks('needReasons', '해당하는 사정을 골라주세요', [
            '재산을 처분하려는 정황이 있어요', '다른 채권자가 이미 집행에 들어갔어요', '연락이 두절됐어요', '변제 능력이 없어 보여요', '사업을 정리하고 있어요',
          ], { required: true }),
          area('needDetail', '구체적인 사정', { rows: 3, required: true, placeholder: '예) 채무자가 소유 부동산을 급매로 내놓았다는 사실을 중개업소를 통해 확인했습니다.' }),
          radio('security', '담보는 어떻게 제공할까요?', ['공탁보증보험증권', '현금 공탁', '법원 결정에 따르겠음'], { required: true }),
          note('info', '가압류는 상대방에게 손해를 줄 수 있어 담보 제공이 원칙이에요. 보증보험증권을 쓰면 현금 부담이 크게 줄어듭니다.'),
          note('warn', '허위 사실로 가압류하면 나중에 손해배상 책임을 질 수 있어요. 근거 자료로 확인되는 사정만 적어주세요.'),
        ],
      },
      {
        title: '가압류신청 진술서',
        hint: '가압류는 신청서만으로 부족해요. 아래 진술서를 함께 내지 않으면 보정 기회 없이 기각될 수 있습니다.',
        fields: [
          note('warn', '진술서를 빠뜨리거나 일부러 감추고 적으면 **고쳐 낼 기회 없이 바로 기각될 수 있어요.** 사실대로 적어 주세요. (재민 2003-4 제3조)'),

          { kind: 'partyTag', tone: 'brand', tag: '1', desc: '피보전권리(청구채권)와 관련하여' },
          radio('stDebtorAdmits', '채무자가 청구채권을 인정하고 있나요?', ['인정하고 있어요', '다투고 있어요', '아직 모르겠어요'], { required: true }),
          area('stDebtorClaim', '채무자의 주장 요지', {
            rows: 2, required: true,
            when: (f) => f.stDebtorAdmits === '다투고 있어요',
            placeholder: '예) 빌린 것이 아니라 투자금이었다고 주장합니다.',
          }),
          text('stConfirmedHow', '채무자의 의사를 언제, 어떤 방법으로 확인했나요?', {
            required: true,
            placeholder: '예) 2026. 5. 3. 내용증명 발송 후 전화 통화',
          }),
          radio('stOtherClaim', '이 신청서에 적은 청구채권 외에 다른 채권도 있나요?', ['없어요', '있어요'], { required: true }),
          text('stOtherClaimDetail', '다른 채권의 내용', {
            required: true, when: (f) => f.stOtherClaim === '있어요',
            placeholder: '예) 2025. 3. 대여금 1,000만원 (이 신청과 별개)',
          }),

          { kind: 'partyTag', tone: 'brand', tag: '2', desc: '보전의 필요성과 관련하여' },
          area('stWhyNeeded', '지금 가압류하지 않으면 왜 집행이 어려워지나요?', {
            rows: 3, required: true,
            placeholder: '예) 채무자가 유일한 재산인 아파트를 부동산에 내놓았다는 사실을 이웃에게 들었습니다.',
            hint: '4단계에서 고른 사정을 구체적인 사실로 풀어 적으세요. 막연한 우려만으로는 부족합니다.',
          }),
          radio('stAmountProper', '신청 금액이 본안에서 승소할 수 있는 금액으로 적정하게 산출된 것인가요?', ['예', '아니오'], { required: true }),
          note('warn', '과다한 금액으로 가압류하면 나중에 손해배상 책임을 질 수 있어요. 실제로 받을 수 있는 범위로 적으세요.', { when: (f) => f.stAmountProper === '아니오' }),
          radio('stDebtorBiz', '채무자가 법인이라면, 지금 영업활동을 하고 있나요?', ['채무자가 법인이 아니에요', '영업 중이에요', '영업하지 않는 것 같아요'], { required: true }),

          { kind: 'partyTag', tone: 'brand', tag: '3', desc: '본안소송과 관련하여' },
          radio('stSuitFiled', '이 청구채권으로 본안소송을 낸 적이 있나요?', ['아직 없어요', '냈어요'], { required: true }),
          text('stSuitDetail', '본안 사건번호와 진행 상황', {
            required: true, when: (f) => f.stSuitFiled === '냈어요',
            placeholder: '예) 서울중앙지방법원 2026가단12345, 변론 준비 중',
          }),
          radio('stPast5y', '최근 5년 안에 채무자를 상대로 보전처분을 신청한 적이 있나요?', ['없어요', '있어요'], { required: true }),
          text('stPast5yDetail', '그 사건의 내용', {
            required: true, when: (f) => f.stPast5y === '있어요',
            placeholder: '예) 2024카단1234 부동산가압류, 인용',
          }),

          { kind: 'partyTag', tone: 'brand', tag: '4', desc: '중복 보전처분과 관련하여' },
          radio('stDup', '같은 채권으로 이미 보전처분 결정을 받은 적이 있나요?', ['없어요', '있어요'], { required: true }),
          text('stDupDetail', '사건번호 · 결과 · 목적물', {
            required: true, when: (f) => f.stDup === '있어요',
            placeholder: '예) 2025카단5678, 인용, 채무자 소유 ○○아파트',
          }),

          note('info', '이 진술서는 신청서와 **따로 된 서면**이라 함께 냅니다. 미리보기 아래쪽에 따로 만들어져요. 종이로 낼 때는 도장을 찍거나 서명해야 합니다.'),
        ],
      },
      attachStep(['가압류신청 진술서 (필수)', '차용증·계약서', '부동산 등기사항전부증명서', '내용증명 우편물', '공탁보증보험증권', '법인등기부등본'], { citation: true }),
    ],
    build(form) {
      const titleByTarget = {
        '부동산': '부 동 산 가 압 류 신 청 서',
        '채권 (예금·급여·임대차보증금)': '채 권 가 압 류 신 청 서',
        '유체동산': '유 체 동 산 가 압 류 신 청 서',
      }
      return {
        docTitle: titleByTarget[form.targetKind] || '가 압 류 신 청 서',
        header: partyLines(form, [CRED, DEBT], ['채권자', '채무자']),
        sections: [
          {
            heading: '청 구 채 권 의 표 시',
            lines: [
              `금 ${money$(form.amount, '1단계에서 금액을 입력해 주세요')}`,
              `${date$(form.claimDate, '채권 발생일')}자 ${form.claimKind ? F(form.claimKind) : P('청구채권 종류')} 채권`,
            ],
          },
          { heading: '가압류할 목적물의 표시', lines: [or(form.targetDesc, '3단계에서 목적물을 입력해 주세요'), ...(form.thirdParty ? [`제3채무자 : ${F(form.thirdParty)}`] : [])] },
          {
            heading: '신 청 취 지',
            lines: [
              `채권자가 채무자에 대하여 가지는 위 청구채권의 집행을 보전하기 위하여, 채무자 소유의 별지 목록 기재 ${form.targetKind ? F(form.targetKind) : '재산'}을 가압류한다.`,
              '라는 재판을 구합니다.',
            ],
          },
          {
            heading: '신 청 이 유',
            lines: [
              `1. 채권자는 ${date$(form.claimDate, '채권 발생일')} 채무자에 대하여 ${money$(form.amount, '금액')}의 ${or(form.claimKind, '청구채권 종류')} 채권을 취득하였습니다.`,
              `2. ${(form.needReasons || []).length ? F(form.needReasons.join(', ')) : P('4단계에서 보전의 필요성을 골라 주세요')}`,
              `3. ${or(form.needDetail, '4단계에서 구체적 사정을 입력해 주세요')}`,
              `4. 따라서 지금 가압류해 두지 않으면 나중에 승소하더라도 집행이 불가능하거나 매우 곤란해질 우려가 있습니다.`,
              form.suitStage === '이미 냈어요'
                ? `5. 본안 소송은 ${or(form.suitCaseNo, '본안 사건번호')}로 계속 중입니다.`
                : `5. 본안 소송은 이 신청 후 즉시 제기할 예정입니다.`,
              `6. 담보 제공은 ${or(form.security, '담보 방법')}으로 하고자 합니다.`,
            ],
          },
        ],
        attach: (form.attachItems || []).map((a) => `${a}　1통`),
        role: '위 채권자',
        court: form.court,
        name: form.aName,
        date: today(),
        signature: form.signature,
        // 가압류는 신청서만으로 부족하다 — 진술서를 별개 서면으로 함께 낸다
        extraDoc: statementDoc(form),
      }
    },
  },
]

/**
 * 가압류신청 진술서 — 전산양식 A4705
 * 근거: 「보전처분 신청사건의 사무처리요령」(재민 2003-4) 제2조 제5호·제3조
 * 첨부하지 않거나 허위·누락이 발견되면 보정명령 없이 기각될 수 있다.
 */
function statementDoc(form) {
  const yn = (v, yes) => (v === yes ? '☑' : '☐')
  const q = (n, text, ...lines) => [`${n}. ${text}`, ...lines.filter(Boolean)]

  return {
    docTitle: '가 압 류 신 청 진 술 서',
    header: [],
    lead: '채권자는 가압류신청과 관련하여 다음 사실을 진술하며, 만일 허위진술을 하거나 진술 사항을 고의로 누락한 경우에는 특별한 사정이 없는 한 보정명령 없이 신청이 기각될 것임을 잘 알고 있습니다.',
    sections: [
      {
        heading: '1. 피보전권리(청구채권)와 관련하여',
        lines: [
          ...q('가', '채무자가 신청서에 기재한 청구채권을 인정하고 있습니까?',
            `　　${yn(form.stDebtorAdmits, '인정하고 있어요')} 인정　${yn(form.stDebtorAdmits, '다투고 있어요')} 다툼　${yn(form.stDebtorAdmits, '아직 모르겠어요')} 확인되지 않음`,
            form.stDebtorAdmits === '다투고 있어요' ? `　　└ 채무자의 주장 요지 : ${or(form.stDebtorClaim, '주장 요지')}` : ''),
          ...q('나', '채무자의 의사를 언제, 어떠한 방법으로 확인하였습니까?',
            `　　${or(form.stConfirmedHow, '확인 시기와 방법')}`),
          ...q('다', '채권자가 신청서에 기재한 청구채권 외에 다른 채권이 있습니까?',
            `　　${yn(form.stOtherClaim, '없어요')} 없음　${yn(form.stOtherClaim, '있어요')} 있음`,
            form.stOtherClaim === '있어요' ? `　　└ ${or(form.stOtherClaimDetail, '다른 채권의 내용')}` : ''),
        ],
      },
      {
        heading: '2. 보전의 필요성과 관련하여',
        lines: [
          ...q('가', '가압류하지 않으면 향후 강제집행이 불가능하거나 매우 곤란해질 사유는 무엇입니까?',
            `　　${or(form.stWhyNeeded, '구체적인 사유')}`),
          ...q('나', '신청서에 기재한 청구금액은 본안소송에서 승소할 수 있는 금액으로 적정하게 산출된 것입니까?',
            `　　${yn(form.stAmountProper, '예')} 예　${yn(form.stAmountProper, '아니오')} 아니오`),
          ...q('다', '(채무자가 법인인 경우) 채무자 법인이 영업활동을 하고 있습니까?',
            `　　${yn(form.stDebtorBiz, '채무자가 법인이 아니에요')} 해당 없음　${yn(form.stDebtorBiz, '영업 중이에요')} 영업 중　${yn(form.stDebtorBiz, '영업하지 않는 것 같아요')} 영업하지 않음`),
        ],
      },
      {
        heading: '3. 본안소송과 관련하여',
        lines: [
          ...q('가', '채권자는 이 청구채권과 관련하여 본안소송을 제기한 사실이 있습니까?',
            `　　${yn(form.stSuitFiled, '아직 없어요')} 없음　${yn(form.stSuitFiled, '냈어요')} 있음`,
            form.stSuitFiled === '냈어요' ? `　　└ 사건번호·진행 상황 : ${or(form.stSuitDetail, '사건번호와 진행 상황')}` : ''),
          ...q('나', '채권자가 최근 5년간 채무자를 상대로 신청한 보전처분 사건이 있습니까?',
            `　　${yn(form.stPast5y, '없어요')} 없음　${yn(form.stPast5y, '있어요')} 있음`,
            form.stPast5y === '있어요' ? `　　└ ${or(form.stPast5yDetail, '사건의 내용')}` : ''),
        ],
      },
      {
        heading: '4. 중복 보전처분과 관련하여',
        lines: [
          ...q('가', '같은 청구채권에 기하여 이 신청 이전에 보전처분을 신청하여 결정을 받은 사실이 있습니까?',
            `　　${yn(form.stDup, '없어요')} 없음　${yn(form.stDup, '있어요')} 있음`,
            form.stDup === '있어요' ? `　　└ 사건번호·결과·목적물 : ${or(form.stDupDetail, '내용')}` : ''),
        ],
      },
    ],
    attach: [],
    role: '위 채권자',
    court: form.court,
    name: form.aName,
    date: today(),
    signature: form.signature,
  }
}

/** 판례 입력칸을 둔 신청서인지 — 스키마에 없으면 문서에도 넣지 않는다 */
const usesCitation = (type) => type.steps.some((s) => s.fields.some((f) => f.kind === 'citation'))

/** build() 결과에 인용 판례를 '관련 법리'로 덧붙인다 (판례를 쓰는 3종만) */
export function buildPetition(type, form) {
  const doc = type.build(form)
  const cites = usesCitation(type) ? citationLines(form.citations || []) : []
  if (cites.length) {
    doc.sections = [...doc.sections, { heading: '관 련 법 리', lines: cites }]
  }
  return doc
}

export const findPetition = (key) => petitionTypes.find((t) => t.key === key)

export const petitionCompleteness = (type, form) => completenessOf(type.steps, form)
export const petitionSummary = (type, i, form) => summaryOf(type.steps[i], form)

/** 지급명령 인지대는 소장의 1/10, 송달료는 당사자수 × 6회분 */
export function paymentOrderCost(amount) {
  const suit = stampFee(amount)
  const stamp = Math.floor((suit / 10) / 100) * 100
  const service = 2 * 5_200 * 6
  return { suit, stamp, service, total: stamp + service }
}

export const emptyPetition = {
  court: '', amount: '',
  aName: '', aRrn: '', aAddr: '', aTel: '', aEmail: '',
  bName: '', bRrn: '', bAddr: '', bTel: '',
  signature: '',
}
