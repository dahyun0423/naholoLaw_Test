// 준비서면 — 분기 축이 "사건 유형"이 아니라 "소송 진행 단계"다.
// 이미 진행 중인 사건에 대한 대응 문서라, 구조가
//   기존 사건 불러오기 → 상대방 주장 요약 → 반박 포인트별 작성
// 이어야 맞다. 소장처럼 "유형 선택 → 필드 입력"이 아니다.

import { citationLines } from './citation.js'
import { fmtDate } from './complaint.js'
import {
  text, money, date, area, select, radio, checks, note, files, signature, repeat,
  F, P, or, date$, today, filled, completenessOf, summaryOf,
} from './docschema.js'

/* 소송 진행 단계 — 이게 준비서면의 성격을 정한다 */
export const stages = [
  {
    label: '상대방 답변서를 받았어요',
    advice: '답변서에 담긴 부인·항변을 조목조목 반박하는 첫 준비서면이에요. 상대방이 다투는 부분과 인정하는 부분을 먼저 갈라내면 쟁점이 선명해집니다.',
    round: '준비서면(1)',
  },
  {
    label: '첫 변론기일을 앞두고 있어요',
    advice: '기일 1주 전까지 내는 것이 원칙이에요. 재판부가 미리 읽고 들어오도록 쟁점을 3개 이내로 압축해서 쓰세요.',
    round: '준비서면(1)',
  },
  {
    label: '변론기일에서 석명 요구를 받았어요',
    advice: '재판부가 물어본 것에만 정확히 답하는 게 핵심이에요. 새로운 주장을 덧붙이기보다 요구받은 부분을 자료로 뒷받침하세요.',
    round: '준비서면(2)',
  },
  {
    label: '상대방 준비서면을 또 받았어요',
    advice: '이미 한 주장을 반복하지 말고, 새로 나온 주장에만 대응하세요. 반복 서면은 재판부에 좋은 인상을 주지 않습니다.',
    round: '준비서면(2)',
  },
  {
    label: '조정에 회부됐어요',
    advice: '조정에서는 법리 다툼보다 수용 가능한 조건 제시가 중요해요. 최소 수용 금액과 그 근거를 정리해 두세요.',
    round: '준비서면(조정용)',
  },
]

/* 상대방이 흔히 드는 항변 — 고르면 반박 방향을 안내한다 */
export const defenses = {
  '전부 부인 (그런 사실 없다)': '부인은 증명책임을 원고에게 돌리는 것뿐이에요. 계약서·이체내역 같은 객관적 자료로 사실을 다시 못 박으면 됩니다.',
  '변제 항변 (이미 갚았다)': '변제 사실은 상대방이 증명해야 해요. 상대방이 제시한 이체내역이 이 사건 채무와 무관하다는 점을 짚으세요.',
  '소멸시효 항변': '시효 기산점과 중단 사유를 확인하세요. 일부 변제·채무 승인·내용증명 후 6개월 내 제소는 시효를 중단시킵니다.',
  '상계 항변': '상계하려면 상대방의 반대채권이 존재하고 변제기가 도래해야 해요. 반대채권 자체를 다투는 게 우선입니다.',
  '동시이행 항변': '내 의무를 이미 이행했다면 항변이 깨져요. 이행 완료 사실(인도·검수 등)을 자료로 보이세요.',
  '공제 주장 (원상회복비 등)': '공제하려는 금액은 상대방이 구체적으로 증명해야 해요. 견적서 없는 막연한 공제 주장은 배척되는 경우가 많습니다.',
  '과실상계 주장': '상대방이 주장하는 내 과실이 손해와 인과관계가 있는지 따져보세요. 비율 자체를 다투는 것도 방법입니다.',
}

export const briefSteps = [
  {
    title: '어떤 사건의 준비서면인가요?',
    hint: '이미 작성한 소장이 있으면 불러와서 당사자·사건 정보를 그대로 씁니다.',
    fields: [
      { kind: 'caseLoader' },
      { kind: 'court', key: 'court', label: '법원', required: true },
      text('caseNo', '사건번호', { required: true, half: true, placeholder: '2026가단123456' }),
      text('caseName', '사건명', { half: true, placeholder: '대여금' }),
      text('plaintiff', '원고', { required: true, half: true, placeholder: '홍길동' }),
      text('defendant', '피고', { required: true, half: true, placeholder: '김철수' }),
      radio('side', '나는 어느 쪽인가요?', ['원고', '피고'], { required: true }),
      text('agent', '대리인 (있으면)', { half: true, placeholder: '변호사 ○○○', hint: '준비서면 기재사항이에요. 본인이 직접 하면 비워두세요.' }),
      radio('stage', '지금 소송이 어느 단계인가요?', stages.map((s) => s.label), { required: true }),
      { kind: 'stageAdvice' },
      note('warn', '준비서면을 내지 않거나 <b>준비서면에 적지 않은 사실은, 상대방이 변론기일에 나오지 않으면 변론에서 주장할 수 없습니다.</b> 하고 싶은 말은 미리 다 적어두세요.'),
      note('info', '적시제출주의(민사소송법 제146조·제147조) — 재판장이 정한 기간을 넘기면 정당한 사유가 없는 한 주장을 더 내거나 증거를 신청할 수 없어요.'),
      text('round', '준비서면 회차', { half: true, placeholder: '예: 준비서면(1)' }),
      date('dueDate', '제출 기한 / 다음 변론기일', { half: true }),
    ],
  },
  {
    title: '상대방은 뭐라고 했나요?',
    fields: [
      select('opponentDoc', '상대방이 낸 서면', ['답변서', '준비서면(1)', '준비서면(2)', '증거설명서', '기타'], { required: true }),
      date('opponentDate', '받은 날 (도달일)', { half: true }),
      area('opponentClaim', '상대방 주장 요약', {
        rows: 4, required: true,
        placeholder: '예) 피고는 원고로부터 돈을 빌린 사실이 없고, 받은 돈은 투자금이었다고 주장합니다.',
      }),
      checks('defenses', '상대방이 든 항변을 골라주세요', Object.keys(defenses), { required: true }),
      { kind: 'defenseAdvice' },
      area('admitted', '상대방이 인정한 부분', { rows: 2, placeholder: '다툼 없는 사실을 적어두면 쟁점이 줄어듭니다. 예) 3,000만원을 이체받은 사실은 인정' }),
    ],
  },
  {
    title: '어떤 부분을 반박하나요?',
    hint: '쟁점 하나당 한 묶음으로 적으면 그대로 준비서면의 항목이 됩니다.',
    fields: [
      repeat('rebuttals', '반박 포인트', [
        { key: 'claim', label: '상대방 주장', kind: 'area', rows: 2, placeholder: '예) 받은 돈은 투자금이었다' },
        { key: 'answer', label: '나의 반박', kind: 'area', rows: 3, placeholder: '예) 이체 당시 “빌려준다”는 문자를 보냈고, 원리금 상환 계획까지 주고받았습니다.' },
        { key: 'evidence', label: '근거 증거', placeholder: '예: 갑 제3호증 문자메시지 사본' },
        { key: 'citation', label: '인용 판례 (선택)', placeholder: '예: 대법원 2020다112233 — 4단계에서 고르면 사건번호가 보입니다' },
      ], { required: true, itemLabel: '쟁점', addLabel: '반박 포인트 추가', empty: '반박할 쟁점을 하나씩 추가해 주세요.' }),
      note('info', '“상대방 주장 → 반박 → 근거”를 한 세트로 쓰면 재판부가 읽기 쉬워요. 감정적인 표현은 빼고 사실과 법리만 적으세요.'),
      area('conclusion', '결론', { rows: 2, placeholder: '비워두면 “원고의 청구는 이유 있으므로 인용되어야 합니다.”로 들어갑니다.' }),
    ],
  },
  {
    title: '증거 · 판례 첨부',
    fields: [
      repeat('newEvidence', '추가로 낼 증거', [
        { key: 'name', label: '서증명', placeholder: '예: 문자메시지 사본' },
        { key: 'purpose', label: '입증취지', placeholder: '예: 대여 사실을 입증' },
      ], { itemLabel: '증거', addLabel: '증거 추가', empty: '이번 준비서면과 함께 낼 증거가 있으면 추가하세요.' }),
      text('evidenceStart', '이어서 매길 호증 번호', { half: true, placeholder: '예: 4 (갑 제4호증부터)' }),
      { kind: 'citation', key: 'citations' },
      note('warn', '인용한 판례는 <b>증거도 첨부서류도 아닙니다.</b> 별도 파일로 올리지 마시고, 준비서면 본문의 「관련 법리」에 사건번호와 요지를 적는 것으로 충분해요. 전자소송에서 판례를 입증서류로 올리면 서증 번호만 낭비됩니다.'),
      files('briefFiles', '파일 업로드'),
      note('ok', '준비서면은 소장과 달라요. 「민사소송 등에서의 전자문서 이용 등에 관한 규칙」 제11조 제1항이 "해당란에 직접 입력하거나 전자문서를 등재하는 방식"을 모두 허용해서, 전자소송에서 한글·PDF 파일로 첨부해 낼 수 있습니다. 실무에서도 파일로 내는 경우가 많아요.'),
      note('info', '준비서면에는 기명날인 또는 서명이 필요합니다(민사소송법 제274조 제1항). 전자소송은 제출할 때 공동인증서 전자서명으로 갈음해요.'),
      note('ok', '준비서면을 낼 때 <b>송달료를 따로 내지 않습니다.</b> 「송달료규칙의 시행에 따른 업무처리요령」 제6조 제4항이 답변서·준비서면 같은 중간 서류는 따로 예납하지 않는다고 정하고 있어요. 소장 낼 때 예납한 금액에서 씁니다.'),
      signature(),
    ],
  },
]

export function buildBrief(form) {
  const side = form.side || '원고'
  const other = side === '원고' ? '피고' : '원고'
  const rebuttals = (form.rebuttals || []).filter((r) => r.claim || r.answer)
  const evidences = (form.newEvidence || []).filter((e) => e.name)
  const startNo = Number(form.evidenceStart) || 1
  const mark = side === '원고' ? '갑' : '을'

  const lines = []
  lines.push(`1. ${other} 주장의 요지`)
  // 어떤 서면에 대한 반박인지 특정한다 — 없으면 무엇에 대응하는 서면인지 알 수 없다
  if (form.opponentDoc) {
    const when = form.opponentDate ? `${fmtDate(form.opponentDate)}자 ` : ''
    lines.push(`　　${other}는 ${F(when + form.opponentDoc)}에서 다음과 같이 주장합니다.`)
  }
  lines.push(`　　${or(form.opponentClaim, '2단계에서 상대방 주장을 입력해 주세요')}`)
  if ((form.defenses || []).length) {
    lines.push(`　　이는 ${F(form.defenses.join(', '))}에 해당합니다.`)
  }
  if (form.admitted) lines.push(`　　다만 ${F(form.admitted)}는 점은 당사자 사이에 다툼이 없습니다.`)

  lines.push('')
  lines.push(`2. ${side}의 반박`)
  if (rebuttals.length === 0) {
    lines.push(`　　${P('3단계에서 반박 포인트를 추가해 주세요')}`)
  } else {
    rebuttals.forEach((r, i) => {
      lines.push(`　가. 쟁점 ${i + 1} — ${or(r.claim, '상대방 주장')}`)
      lines.push(`　　　${or(r.answer, '반박 내용')}`)
      if (r.evidence) lines.push(`　　　(근거 : ${F(r.evidence)})`)
      if (r.citation) lines.push(`　　　(참조 : ${F(r.citation)})`)
    })
  }

  // 관련 법리 — 준비서면에서 판례가 가장 크게 작동하는 자리
  const cites = citationLines(form.citations || [])
  if (cites.length) {
    lines.push('')
    lines.push('3. 관련 법리')
    cites.forEach((c) => {
      const [head, ...rest] = c.split('\n')
      lines.push(`　　${F(head)}`)
      rest.forEach((r) => lines.push(r))
    })
  }

  lines.push('')
  lines.push(`${cites.length ? '4' : '3'}. 결론`)
  lines.push(`　　${form.conclusion ? F(form.conclusion) : `그러므로 ${side}의 주장은 이유 있으므로 받아들여져야 합니다.`}`)

  return {
    docTitle: form.round ? `준 비 서 면 ${form.round.replace(/^준비서면/, '').trim() || ''}`.trim() : '준 비 서 면',
    header: [
      `사　건　${or(form.caseNo, '1단계에서 사건번호를 입력해 주세요')} ${form.caseName || ''}`,
      `원　고　${or(form.plaintiff, '원고')}`,
      `피　고　${or(form.defendant, '피고')}`,
      // 민사소송법 제274조 제1항 제2호 — 대리인의 성명과 주소
      ...(form.agent ? [`${side} 대리인　${F(form.agent)}`] : []),
    ],
    lead: `위 사건에 관하여 ${side}는 다음과 같이 변론을 준비합니다.`,
    sections: [
      { heading: '다　　　음', lines },
      {
        heading: '입 증 방 법',
        lines: evidences.length
          ? evidences.map((e, i) => `${i + 1}. ${mark} 제${startNo + i}호증　　${F(e.name)}${e.purpose ? `　(${e.purpose})` : ''}`)
          : ['필요한 경우 변론기일에 추가 증거를 제출하겠습니다.'],
      },
    ],
    attach: ['준비서면 부본　1통', ...(evidences.length ? ['위 입증방법　각 1통'] : [])],
    role: `위 ${side}`,
    court: form.court,
    name: side === '원고' ? form.plaintiff : form.defendant,
    date: today(),
    signature: form.signature,
  }
}

export const briefCompleteness = (form) => completenessOf(briefSteps, form)
export const briefSummary = (i, form) => summaryOf(briefSteps[i], form)

export const emptyBrief = {
  court: '', caseNo: '', caseName: '', plaintiff: '', defendant: '',
  side: '원고', stage: '', round: '', dueDate: '',
  opponentDoc: '', opponentDate: '', opponentClaim: '', defenses: [], admitted: '',
  rebuttals: [], conclusion: '',
  newEvidence: [], evidenceStart: '', citations: [], signature: '',
}
