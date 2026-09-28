// 템플릿 보기 — 법원 서면 양식을 A4 종이 모양 그대로 보여주고, 워드 파일로 내려준다.
//
// 문서를 처음 쓰는 사람이 알고 싶은 건 "어떤 모양인가"다. 그래서 글자만 늘어놓지 않고
// 제출하는 종이처럼 제목·당사자 표시·청구취지·서명란을 배치해 보여준다.
// 화면의 글자는 그대로 선택·복사할 수 있고, ‘워드 다운로드’는 같은 내용의 .docx 를 준다.
//
// 원본은 src/lib/legalDocs.js 한 곳이다. 화면과 워드, 파서 시험용 PDF 가 모두 여기서 나온다.
// 당사자는 원고 홍길동 · 피고 김철수, 번호는 실제로 쓰일 수 없는 값으로 통일했다.

import { useEffect, useRef, useState } from 'react'
import { Button, cx } from './ui.jsx'
import Modal from './Modal.jsx'
import { Check, Copy, Download, FileText } from './icons.jsx'
import { LEGAL_DOCS, LEGAL_DOC_GROUPS, LEGAL_DOC_CSS, toHtml, toPlainText } from '../lib/legalDocs.js'
import { downloadLegalDoc } from '../lib/legalDocFiles.js'

// 문서마다 한 번만 만든다 — 목록을 오갈 때 다시 계산하지 않게
const RENDERED = Object.fromEntries(LEGAL_DOCS.map((d) => [d.key, { html: toHtml(d), text: toPlainText(d) }]))

export default function TemplateViewer({ open, onClose }) {
  const [current, setCurrent] = useState(LEGAL_DOCS[0].key)
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef(null)
  const doc = LEGAL_DOCS.find((t) => t.key === current) || LEGAL_DOCS[0]

  // 다른 문서를 고르면 종이를 맨 위부터 보여준다
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }) }, [current])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(RENDERED[doc.key].text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch { /* 클립보드를 막아둔 브라우저 */ }
  }

  return (
    <Modal
      open={open} onClose={onClose} maxW="max-w-[1040px]" variant="templateViewer"
      title="템플릿 보기"
      sub="법원 제출 서면의 양식 예시입니다. 당사자·금액·날짜는 지어낸 것이니 내 사건에 맞게 바꿔 쓰세요."
      footer={(
        <>
          <Button variant="neutral" size="sm" className="mr-auto min-w-[108px] gap-1.5" onClick={copy}>
            {copied ? <><Check size={15} /> 복사함</> : <><Copy size={15} /> 본문 복사</>}
          </Button>
          <Button variant="neutral" size="sm" className="min-w-[132px] gap-1.5" onClick={() => downloadLegalDoc(doc.key)}>
            <Download size={15} /> 워드 다운로드
          </Button>
          <Button size="sm" className="min-w-[112px]" onClick={onClose}>확인</Button>
        </>
      )}
    >
      <style>{LEGAL_DOC_CSS}</style>
      <div className="grid h-full min-h-0 gap-4 sm:grid-cols-[232px_minmax(0,1fr)] sm:gap-6">
        <nav aria-label="템플릿 목록" className="min-h-[300px] rounded-xl bg-[#f8fafc] px-2 py-[14px] sm:h-full sm:overflow-y-auto">
          {LEGAL_DOC_GROUPS.map((group) => (
            <div key={group} className="mb-3 last:mb-0">
              <p className="h-[22px] px-1.5 text-[11px] font-semibold leading-5 text-[#667085]">{group}</p>
              <div className="space-y-1">
                {LEGAL_DOCS.filter((t) => t.group === group).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    aria-current={item.key === current ? 'true' : undefined}
                    onClick={() => setCurrent(item.key)}
                    className={cx(
                      'flex h-[38px] w-full items-center gap-2 rounded-lg px-2.5 text-left text-[13px] transition-colors',
                      item.key === current ? 'bg-[#eaf2ff] font-semibold text-[#2f6fed]' : 'font-medium text-[#344054] hover:bg-white',
                    )}
                  >
                    <FileText size={15} className="shrink-0 opacity-70" />
                    <span className="min-w-0 truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <section className="flex min-h-[520px] min-w-0 flex-col sm:h-full">
          <div className="flex items-center gap-2.5">
            <h3 className="min-w-0 truncate text-[20px] font-semibold leading-8 text-[#1c2430]">{doc.name}</h3>
            <span className="grid h-6 shrink-0 place-items-center rounded-full bg-[#eaf2ff] px-2.5 text-[12px] font-semibold text-[#2f6fed]">{doc.group}</span>
          </div>
          <p className="mt-0.5 truncate text-[13px] font-medium leading-5 text-[#667085]">{doc.desc}</p>

          {/* 종이 — PDF 뷰어처럼 회색 바탕 위에 A4 한 장. 글자는 그대로 선택된다. */}
          <div ref={scrollRef} className="mt-3 min-h-0 flex-1 overflow-auto rounded-xl bg-[#eef0f3] px-3 py-5 lg:px-8">
            <div
              className="mx-auto min-h-[848px] w-full max-w-[600px] bg-white px-[2.2em] pb-[3.6em] pt-[4em] text-[12px] lg:px-[3.2em] lg:text-[12.5px] shadow-[0_1px_3px_rgba(16,24,40,0.12),0_8px_24px_rgba(16,24,40,0.08)] selection:bg-[#cfe0ff]"
              dangerouslySetInnerHTML={{ __html: RENDERED[doc.key].html }}
            />
          </div>
        </section>
      </div>
    </Modal>
  )
}
