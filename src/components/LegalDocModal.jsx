// 이용약관·개인정보처리방침을 읽는 모달.
//
// 마이페이지와 회원가입 동의 문구 두 곳에서 같은 글을 띄운다.
// 본문은 src/data/legal.js 하나만 본다 — 두 화면이 서로 다른 약관을 보여주면 안 된다.

import Modal from './Modal.jsx'
import { Button } from './ui.jsx'
import { LEGAL_DOCS } from '../data/legal.js'

const Section = ({ s }) => (
  <section className={s.important ? 'rounded-xl border border-brand-200 bg-brand-50 p-3.5' : undefined}>
    <h3 className="text-[14px] font-bold text-ink-800">{s.h}</h3>
    {s.p && <div className="mt-1.5 space-y-1.5">{s.p.map((text) => <p key={text}>{text}</p>)}</div>}
    {s.list && (
      <ol className="mt-1.5 space-y-1.5">
        {s.list.map((text, index) => (
          <li key={text} className="flex gap-2">
            <span className="shrink-0 tabular-nums text-ink-400">{index + 1}.</span>
            <span>{text}</span>
          </li>
        ))}
      </ol>
    )}
    {s.table && (
      <div className="mt-2.5 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left">
          <thead>
            <tr>
              {s.table.head.map((cell) => (
                <th key={cell} className="border border-ink-200 bg-ink-50 px-2.5 py-1.5 text-[12px] font-semibold text-ink-700">{cell}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s.table.rows.map((row) => (
              <tr key={row.join('|')}>
                {row.map((cell) => (
                  <td key={cell} className="border border-ink-200 px-2.5 py-1.5 align-top text-[12px] text-ink-600">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    {s.p2 && <div className="mt-1.5 space-y-1.5">{s.p2.map((text) => <p key={text}>{text}</p>)}</div>}
  </section>
)

export default function LegalDocModal({ docKey, onClose }) {
  const doc = LEGAL_DOCS[docKey]
  return (
    <Modal
      open={!!doc}
      onClose={onClose}
      maxW="max-w-2xl"
      title={doc?.title || ''}
      sub={doc?.sub}
      footer={<Button onClick={onClose}>확인</Button>}
    >
      {doc && (
        <div className="max-h-[58vh] space-y-4 overflow-y-auto pr-1 text-[13px] leading-relaxed text-ink-600">
          {doc.sections.map((s) => <Section key={s.h} s={s} />)}
        </div>
      )}
    </Modal>
  )
}
