// 이용약관·개인정보처리방침을 읽는 모달.
//
// 마이페이지와 회원가입 동의 문구 두 곳에서 같은 글을 띄운다.
// 본문은 src/data/legal.js 하나만 본다 — 두 화면이 서로 다른 약관을 보여주면 안 된다.

import Modal from './Modal.jsx'
import { Button } from './ui.jsx'
import { LEGAL_DOCS } from '../data/legal.js'

// 본문에 적힌 주소·이메일을 누를 수 있게 한다. 약관 글은 그대로 두고 화면에서만 링크로 바꾼다.
// 한글이 바로 붙는 경우("https://www.sololaw.site에서")가 있어 주소에 쓰이는 문자만 잡는다.
const LINK_PATTERN = /(https?:\/\/[\w.~:/?#@!$&'*+,;=%-]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|(?:[a-z0-9-]+\.)+(?:go|or)\.kr(?:\/[\w.~/?#=&%-]*)?)/gi

const hrefOf = (match) => {
  if (match.includes('@') && !match.startsWith('http')) return `mailto:${match}`
  return match.startsWith('http') ? match : `https://${match}`
}

const Linked = ({ text }) => {
  const parts = text.split(LINK_PATTERN)
  if (parts.length === 1) return text
  return parts.map((part, index) => {
    if (index % 2 === 0) return part
    // 문장 끝 마침표·쉼표는 주소가 아니다.
    const url = part.replace(/[.,]+$/, '')
    const rest = part.slice(url.length)
    return (
      <span key={index}>
        <a
          href={hrefOf(url)}
          target={url.includes('@') ? undefined : '_blank'}
          rel="noopener noreferrer"
          className="text-brand-500 underline underline-offset-2 hover:text-brand-600"
        >
          {url}
        </a>
        {rest}
      </span>
    )
  })
}

const Section = ({ s }) => (
  <section className={s.important ? 'rounded-xl border border-brand-200 bg-brand-50 p-3.5' : undefined}>
    <h3 className="text-[14px] font-bold text-ink-800">{s.h}</h3>
    {s.p && <div className="mt-1.5 space-y-1.5">{s.p.map((text) => <p key={text}><Linked text={text} /></p>)}</div>}
    {s.list && (
      <ol className="mt-1.5 space-y-1.5">
        {s.list.map((text, index) => (
          <li key={text} className="flex gap-2">
            <span className="shrink-0 tabular-nums text-ink-400">{index + 1}.</span>
            <span><Linked text={text} /></span>
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
                  <td key={cell} className="border border-ink-200 px-2.5 py-1.5 align-top text-[12px] text-ink-600"><Linked text={cell} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    {s.p2 && <div className="mt-1.5 space-y-1.5">{s.p2.map((text) => <p key={text}><Linked text={text} /></p>)}</div>}
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
