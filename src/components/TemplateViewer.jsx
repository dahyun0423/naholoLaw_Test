// 템플릿 보기 — 실제로 만들어진 파일을 그대로 읽는다.
//
// 예전에는 "템플릿을 불러옵니다" 토스트만 띄우고 아무것도 보여주지 않았다.
// 문서를 처음 쓰는 사람이 알고 싶은 건 "어떤 모양인가"인데, 그걸 못 봤다.
//
// 여기서 보여주는 것은 `예시/서류/`에 있는 실제 파일이다. 화면용으로 따로 만든
// 문구가 아니라, 그대로 PDF로 구워서 내려받을 수 있는 것과 같은 글이다.
// Vite의 `?raw`로 빌드 시점에 문자열로 가져오므로 서버 요청이 없다.

import { useState } from 'react'
import { Badge, Button, cx } from './ui.jsx'
import Modal from './Modal.jsx'
import { FileText, Copy, Check } from './icons.jsx'

import complaintDeposit from '../../예시/서류/01-소장_임대차보증금반환.txt?raw'
import complaintLoan from '../../예시/서류/02-소장_대여금(소액).txt?raw'
import complaintTort from '../../예시/서류/03-소장_손해배상(자).txt?raw'
import brief from '../../예시/서류/04-준비서면(2)_원상복구범위.txt?raw'
import evidenceList from '../../예시/서류/05-증거목록_갑제1호증부터제6호증.txt?raw'
import answer from '../../예시/서류/06-답변서.txt?raw'
import petition from '../../예시/서류/07-기일변경신청서.txt?raw'
import correction from '../../예시/서류/08-보정서.txt?raw'
import demandLetter from '../../예시/서류/09-내용증명_보증금반환최고.txt?raw'

const TEMPLATES = [
  { key: 'complaint-deposit', group: '소장', name: '임대차보증금 반환', body: complaintDeposit, note: '기간 만료·목적물 인도 후 보증금을 못 받은 경우' },
  { key: 'complaint-loan', group: '소장', name: '대여금 (소액)', body: complaintLoan, note: '소가 3,000만원 이하 — 소액사건' },
  { key: 'complaint-tort', group: '소장', name: '손해배상(자)', body: complaintTort, note: '교통사고 — 치료비·일실수입·위자료를 나눠 적는 형태' },
  { key: 'brief', group: '준비서면', name: '준비서면(2)', body: brief, note: '상대방 주장을 항목별로 반박하는 구조' },
  { key: 'evidence', group: '증거목록', name: '갑 제1~6호증', body: evidenceList, note: '서증명·입증취지·작성자·작성일을 표로' },
  { key: 'answer', group: '답변서', name: '답변서 (피고)', body: answer, note: '인정·부인·항변을 나눠 적는 구조' },
  { key: 'petition', group: '신청서', name: '기일변경신청서', body: petition, note: '신청취지 + 신청이유' },
  { key: 'correction', group: '신청서', name: '보정서', body: correction, note: '보정명령의 항목별로 답하는 형태' },
  { key: 'demand', group: '소 제기 전', name: '내용증명', body: demandLetter, note: '소를 내기 전 최고 — 지연손해금 기산일의 근거가 된다' },
]

const GROUPS = [...new Set(TEMPLATES.map((t) => t.group))]

export default function TemplateViewer({ open, onClose }) {
  const [current, setCurrent] = useState(TEMPLATES[0].key)
  const [copied, setCopied] = useState(false)
  const doc = TEMPLATES.find((t) => t.key === current) || TEMPLATES[0]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(doc.body)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch { /* 클립보드를 막아둔 브라우저 */ }
  }

  return (
    <Modal
      open={open} onClose={onClose} maxW="max-w-[880px]"
      title="템플릿 보기"
      sub="실제 법원 서식으로 만든 예시입니다. 내용은 지어낸 것이니 그대로 내지 마세요."
      footer={<><Button variant="neutral" size="sm" onClick={copy}>{copied ? <><Check size={15} /> 복사했습니다</> : <><Copy size={15} /> 본문 복사</>}</Button><span className="flex-1" /><Button size="sm" onClick={onClose}>확인</Button></>}
    >
      <div className="grid gap-4 sm:grid-cols-[210px_minmax(0,1fr)]">
        <nav aria-label="템플릿 목록" className="space-y-3 sm:max-h-[52vh] sm:overflow-y-auto sm:pr-1">
          {GROUPS.map((group) => (
            <div key={group}>
              <p className="mb-1 px-1 text-[11px] font-semibold text-ink-400">{group}</p>
              <div className="space-y-1">
                {TEMPLATES.filter((t) => t.group === group).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setCurrent(item.key)}
                    className={cx(
                      'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
                      item.key === current ? 'bg-brand-50 font-semibold text-brand-600' : 'text-ink-600 hover:bg-ink-50',
                    )}
                  >
                    <FileText size={14} className="shrink-0" />
                    <span className="min-w-0 truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-bold text-ink-900">{doc.name}</h3>
            <Badge tone="gray">{doc.group}</Badge>
          </div>
          <p className="mt-1 text-xs text-ink-500">{doc.note}</p>
          <pre className="mt-3 max-h-[46vh] overflow-auto rounded-xl border border-ink-200 bg-ink-50 p-4 text-[12px] leading-[1.75] text-ink-700">
            {doc.body}
          </pre>
        </div>
      </div>
    </Modal>
  )
}
