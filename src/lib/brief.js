// 준비서면 — 분기 축이 "사건 유형"이 아니라 "소송 진행 단계"다.
// 이미 진행 중인 사건에 대한 대응 문서라, 구조가
//   기존 사건 불러오기 → 상대방 주장 요약 → 반박 포인트별 작성
// 이어야 맞다. 소장처럼 "유형 선택 → 필드 입력"이 아니다.

import { citationLines } from './citation.js'
import { fmtDate, spaceName } from './complaint.js'
import {
  text, money, date, area, select, radio, checks, note, files, repeat,
  F, P, or, date$, today, filled, legalNarrative, completenessOf, summaryOf,
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

/**
 * 상대방 서면 본문에서 항변을 찾아내는 단서.
 *
 * PDF를 우리가 읽을 수는 없다. 대신 포털에서 **본문을 복사해 붙여넣으면**
 * 아래 단어로 어떤 항변이 들어있는지 짚어 준다. 읽는 척이 아니라 실제로 세는 것이다.
 */
export const DEFENSE_CUES = {
  '전부 부인 (그런 사실 없다)': ['부인한다', '사실이 없다', '차용한 사실이 없', '빌린 사실이 없', '부인합니다'],
  '변제 항변 (이미 갚았다)': ['변제', '이미 지급', '갚았', '상환하였', '완제'],
  '소멸시효 항변': ['소멸시효', '시효가 완성', '시효완성', '제척기간'],
  '상계 항변': ['상계', '반대채권', '대등액'],
  '동시이행 항변': ['동시이행', '이행제공', '선이행'],
  '공제 주장 (원상회복비 등)': ['공제', '원상회복', '수리비', '차감'],
  '과실상계 주장': ['과실상계', '과실 비율', '기여도'],
}

/** 붙여넣은 본문에서 항변을 찾는다 */
export function detectDefenses(text) {
  const t = String(text || '')
  if (t.trim().length < 20) return []
  return Object.entries(DEFENSE_CUES)
    .filter(([, cues]) => cues.some((c) => t.includes(c)))
    .map(([name]) => name)
}

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
    tips: [
      ['상대방이 기일에 안 나오면', '준비서면에 적어 두지 않은 내용은 그날 말할 수 없어요 (민사소송법 제276조).'],
      ['하고 싶은 말은', '미리 다 적어 두세요.'],
    ],
    fields: [
      { kind: 'caseLoader' },
      { kind: 'court', key: 'court', label: '법원', required: true },
      // 준비서면은 이미 재판부가 정해진 사건에 낸다. 법원 서식도 「○○지방법원 제12민사단독 귀중」까지 적는다.
      text('courtDept', '재판부 (있으면)', {
        half: true, placeholder: '예: 제12민사단독 / 제3민사부',
        hint: '법원에서 받은 기일통지서나 전자소송 사건 화면에 적혀 있어요. 모르면 비워두셔도 됩니다.',
      }),
      text('caseNo', '사건번호', { required: true, half: true, placeholder: '2026가단123456' }),
      text('caseName', '사건명', { half: true, placeholder: '대여금' }),
      text('plaintiff', '원고', { required: true, half: true, placeholder: '홍길동' }),
      text('defendant', '피고', { required: true, half: true, placeholder: '김철수' }),
      radio('side', '나는 어느 쪽인가요?', ['원고', '피고'], { required: true }),
      text('agent', '대리인 (있으면)', { half: true, placeholder: '변호사 ○○○', hint: '준비서면 기재사항이에요. 본인이 직접 하면 비워두세요.' }),
      radio('stage', '지금 소송이 어느 단계인가요?', stages.map((s) => s.label), {
        required: true,
        info: '적시제출주의(민사소송법 제146조·제147조) — 재판장이 정한 기간을 넘기면 정당한 사유가 없는 한 주장을 더 내거나 증거를 신청할 수 없어요.',
      }),
      { kind: 'stageAdvice' },
      text('round', '준비서면 회차', { half: true, placeholder: '예: 준비서면(1)' }),
      date('dueDate', '제출 기한 / 다음 변론기일', { half: true }),
    ],
  },
  {
    title: '상대방은 뭐라고 했나요?',
    tips: [
      ['포털에서 내려받아', '여기 올리고 본문을 붙여넣으면 항변을 찾아 드려요.'],
      ['상대방이 인정한 것', '까지 적어 두면 쟁점이 줄어 재판이 빨라집니다.'],
    ],
    hint: '전자소송이면 서류가 올라올 때 이메일·문자로 알려 줍니다. 포털에서 내려받아 여기 올리고, 본문을 붙여넣으면 항변을 찾아 드려요.',
    fields: [
      select('opponentDoc', '상대방이 낸 서면', ['답변서', '준비서면(1)', '준비서면(2)', '증거설명서', '기타'], {
        required: true,
        info: '상대방이 나에게 직접 보내는 게 아니라 **법원이 부본을 송달**합니다(민사소송법 제273조).\n· 전자소송에 동의했으면 — 포털에 등재되고 이메일·문자로 알려 줍니다. 「나의전자소송 > 송달문서확인」에서 내려받으세요.\n· 동의 전이거나 종이 소송이면 — 우편으로 옵니다.',
      }),
      date('opponentDate', '받은 날 (도달일)', {
        half: true,
        info: '전자송달은 **포털에서 열어 본 때** 송달된 것으로 봅니다. 다만 등재 통지일부터 **1주 안에 열지 않으면 1주가 지난 날 송달된 것으로 처리**돼요(전자문서법 제11조 제4항). 기한은 이 날짜부터 셉니다.',
      }),
      files('opponentFiles', '받은 서면 파일', {
        role: 'reference',
        info: '포털에서 내려받은 PDF를 올려 두면 사건에 함께 보관됩니다. 파일 자체를 읽어 분석하지는 않아요 — 분석은 아래에 본문을 붙여넣으면 됩니다.',
      }),
      { kind: 'opponentAnalyzer' },
      {
        // 상대방 서면을 읽고 옮겨 적는 자리다. 요약을 법률 문장으로 쓰라고 하면
        // 대부분 서면을 그대로 복사해 붙이고, 그러면 반박할 쟁점이 드러나지 않는다.
        kind: 'aiPrompt', key: 'opponentClaim', required: true,
        eyebrow: '읽은 대로 평소 말로 적어주세요',
        question: '상대방이 뭐라고 주장하던가요?',
        why: '항변 종류는 아래에서 골라요. 여기에는 상대방 서면에 적힌 말을 읽은 대로만 적으면 AI가 주장 요지로 정리해요.',
        placeholder: '예) 돈을 빌린 적이 없고 받은 건 투자금이었다고 해요.',
        exampleGroups: [
          { label: '부인 추가', items: ['빌린 적이 없다고 해요.', '그런 계약을 한 적이 없다고 해요.', '자기가 한 일이 아니라고 해요.'] },
          { label: '다른 주장 추가', items: ['받은 돈은 투자금이었다고 해요.', '이미 다 갚았다고 해요.', '금액이 그만큼은 아니라고 해요.'] },
        ],
      },
      checks('defenses', '상대방이 든 항변을 골라주세요', Object.keys(defenses), { required: true }),
      { kind: 'defenseAdvice' },
      {
        kind: 'aiPrompt', key: 'admitted',
        eyebrow: '인정한 부분이 있으면 적어주세요 (선택)',
        question: '상대방이 맞다고 인정한 부분이 있나요?',
        why: '다툼 없는 사실을 먼저 갈라내면 재판부가 볼 쟁점이 줄어들어요. 없으면 비워두셔도 됩니다.',
        placeholder: '예) 3,000만원을 받은 사실은 맞다고 해요.',
        exampleGroups: [
          { label: '인정 내용 추가', items: ['돈을 받은 사실은 맞다고 해요.', '계약서에 서명한 건 맞다고 해요.', '날짜와 금액은 다투지 않아요.'] },
        ],
      },
    ],
  },
  {
    title: '증거 · 판례 첨부',
    tips: [
      ['판례는 파일이 아니라', '본문 「관련 법리」에 사건번호와 요지만 적습니다.'],
      ['준비서면 본문은', '우리가 만들어 드려요. 전자소송에 한글·PDF로 첨부해 내면 됩니다 (전자문서규칙 제11조 제1항).'],
      ['낼 때 돈은', '따로 들지 않아요 — 소장 낼 때 넣어 둔 송달료에서 나갑니다.'],
    ],
    fields: [
      // 소장과 같은 업로드 양식이다 — 올린 파일의 이름이 곧 서증명이 되고,
      // 이어서 매길 호증 번호는 목록 바로 위에서 보여 주고 거기서 고친다.
      files('newEvidence', '이번에 함께 낼 증거', {
        startFrom: 'evidenceStart',
        info: '올린 순서대로 호증 번호가 붙고, 파일 이름이 그대로 입증방법란의 서증명이 됩니다.',
      }),
      { kind: 'citation', key: 'citations' },
    ],
  },
  {
    title: '어떤 부분을 반박하나요?',
    hint: '쟁점 하나당 한 묶음으로 적으면 그대로 준비서면의 항목이 됩니다.',
    tips: [
      ['쟁점마다', '상대방 주장 → 나의 반박 → 근거 한 세트로 적으면 그대로 항목이 됩니다.'],
      ['문장은 평소 말로', '적으셔도 돼요 — AI가 서면 문장으로 정리합니다.'],
    ],
    fields: [
      repeat('rebuttals', '반박 포인트', [
        { key: 'claim', label: '상대방은 뭐라고 하나요?', kind: 'area', rows: 2, placeholder: '예) 받은 돈은 투자금이었다고 해요.' },
        { key: 'answer', label: '어디가 사실과 다른가요?', kind: 'area', rows: 3, placeholder: '예) 보낼 때 빌려준다고 문자로 말했고, 언제까지 갚을지도 정했어요.' },
        {
          key: 'evidence', label: '무엇으로 보여줄 수 있나요?', kind: 'pick',
          placeholder: '증거를 고르세요',
          empty: '앞 단계에서 증거 파일을 올리면 여기에서 고를 수 있어요.',
          options: (f) => {
            const start = Math.max(1, Number(f.evidenceStart) || 1)
            const mark = f.side === '피고' ? '을' : '갑'
            return (f.newEvidence || []).filter((e) => e.name).map((e, i) => `${mark} 제${start + i}호증 ${e.name}`)
          },
        },
        {
          key: 'citation', label: '인용 판례 (선택)', kind: 'pick',
          placeholder: '판례를 고르세요',
          empty: '앞 단계에서 판례를 고르면 여기에서 선택할 수 있어요. 판례 검색에서 「내 문서에 인용」으로 담아 두면 목록에 나옵니다.',
          options: (f) => (f.citations || []).map((c) => (typeof c === 'string' ? c : `${c.no}${c.title ? ` ${c.title}` : ''}`)),
        },
      ], {
        required: true, itemLabel: '쟁점', addLabel: '반박 포인트 추가', empty: '반박할 쟁점을 하나씩 추가해 주세요.',
        info: '감정적인 표현은 빼고 있었던 일과 자료만 적으세요. 재판부가 읽는 것은 사실과 근거입니다.',
      }),
      {
        kind: 'aiPrompt', key: 'conclusion',
        eyebrow: '마무리로 하고 싶은 말이 있으면 적어주세요 (선택)',
        question: '재판부에 마지막으로 강조하고 싶은 것이 있나요?',
        why: '비워두면 “원고의 청구는 이유 있으므로 인용되어야 합니다.”로 들어갑니다.',
        placeholder: '예) 상대방 주장은 어느 것도 자료로 뒷받침되지 않았어요.',
        exampleGroups: [
          { label: '마무리 추가', items: ['상대방 주장은 자료로 뒷받침되지 않았어요.', '제출한 증거로 사실이 충분히 확인돼요.', '조속한 판단을 구하고 싶어요.'] },
        ],
      },
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
  lines.push(`　　${or(legalNarrative(form.opponentClaim), '2단계에서 상대방 주장을 입력해 주세요')}`)
  if ((form.defenses || []).length) {
    lines.push(`　　이는 ${F(form.defenses.join(', '))}에 해당합니다.`)
  }
  // 사용자가 적는 것은 완결된 문장이다. 「~는 점은」으로 이으면 「맞다고 합니다는 점은」이
  // 되므로 문장을 끊고 이어 받는다.
  if (form.admitted) lines.push(`　　다만 ${F(legalNarrative(form.admitted))} 이 점은 당사자 사이에 다툼이 없습니다.`)

  lines.push('')
  lines.push(`2. ${side}의 반박`)
  if (rebuttals.length === 0) {
    lines.push(`　　${P('3단계에서 반박 포인트를 추가해 주세요')}`)
  } else {
    rebuttals.forEach((r, i) => {
      lines.push(`　가. 쟁점 ${i + 1} — ${or(legalNarrative(r.claim), '상대방 주장')}`)
      lines.push(`　　　${or(legalNarrative(r.answer), '반박 내용')}`)
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
  lines.push(`　　${form.conclusion ? F(legalNarrative(form.conclusion)) : `그러므로 ${side}의 주장은 이유 있으므로 받아들여져야 합니다.`}`)

  return {
    docTitle: form.round ? `준 비 서 면 ${form.round.replace(/^준비서면/, '').trim() || ''}`.trim() : '준 비 서 면',
    header: [
      `사　건　${or(form.caseNo, '1단계에서 사건번호를 입력해 주세요')} ${form.caseName || ''}`,
      `원　고　${or(spaceName(form.plaintiff), '원고')}`,
      `피　고　${or(spaceName(form.defendant), '피고')}`,
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
    // 법원 서식은 「위 입증방법」을 먼저 적고 부본을 뒤에 둔다 (소장도 같은 순서)
    attach: [...(evidences.length ? ['위 입증방법　각 1통'] : []), '준비서면 부본　1통'],
    role: `위 ${side}`,
    court: [form.court, form.courtDept].filter(Boolean).join(' '),
    name: spaceName(side === '원고' ? form.plaintiff : form.defendant),
    date: today(),
  }
}

export const briefCompleteness = (form) => completenessOf(briefSteps, form)
export const briefSummary = (i, form) => summaryOf(briefSteps[i], form)

export const emptyBrief = {
  opponentText: '', opponentFiles: [],
  court: '', caseNo: '', caseName: '', plaintiff: '', defendant: '',
  side: '원고', stage: '', round: '', dueDate: '', courtDept: '',
  opponentDoc: '', opponentDate: '', opponentClaim: '', defenses: [], admitted: '',
  rebuttals: [], conclusion: '',
  newEvidence: [], evidenceStart: '', citations: [],
}
