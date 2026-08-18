// Figma 캡처용 문서 완성 화면 — 준비서면 · 증거목록 · 신청서
//
// 소장은 이미 /figma/complaint-result/:caseId 가 있다. 나머지 세 종류도 같은 방식으로
// **완성된 그 화면 그대로** 한 장씩 열 수 있어야 Figma로 옮길 수 있어서 이 화면을 둔다.
//
// 화면을 새로 그리지 않는다 — 마법사가 쓰는 완성 화면 컴포넌트를 그대로 부른다.
// 새로 그리면 캡처본과 실제 제품이 갈라져, 옮겨 둔 Figma가 곧 거짓말이 된다.
//
// 데이터도 마찬가지로 앱이 심는 데모 초안(demoDrafts)과 데모 사건(figmaWorkspaceCases)을
// 그대로 읽는다. 캡처 전용 값을 따로 두면 화면마다 당사자·금액이 어긋난다.

import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'

import { BriefDoneView } from '../components/BriefWizard.jsx'
import { PetitionDoneView } from '../components/PetitionWizard.jsx'
import { EvidenceDoneView, EvidencePaper, evidenceRowsFromCase } from '../components/EvidenceListBuilder.jsx'
import { PrintSheet } from '../components/docform.jsx'
import { figmaWorkspaceCases } from '../data/mock.js'
import { demoBriefFor, demoPetitionsFor } from '../data/demoDrafts.js'
import { findType } from '../lib/complaint.js'
import { findPetition } from '../lib/petition.js'

/** 캡처 화면은 앱 레이아웃 밖에서 혼자 뜬다 — 본문 폭과 배경을 여기서 맞춘다 */
function CaptureFrame({ children }) {
  return (
    <main className="min-h-screen bg-ink-50 p-8">
      <div className="mx-auto max-w-7xl">{children}</div>
    </main>
  )
}

function NotFound({ what }) {
  return (
    <main className="grid min-h-screen place-items-center bg-ink-50 px-6 text-center text-ink-600">
      <div>
        <p>{what}</p>
        <Link to="/figma/docs" className="mt-3 inline-block text-brand-500 underline">캡처 목록으로</Link>
      </div>
    </main>
  )
}

/* ─────────────────── 증거목록 ─────────────────── */

// 증거목록은 사건에 올려 둔 증빙자료를 그대로 표로 편다.
// 갑호증(원고)이 기본이고, 이 목록이 첫 목록이라 번호는 1부터 시작한다.
const EVIDENCE_CODE = '갑'
const EVIDENCE_PARTY = '원고'

function EvidenceCapture({ caseItem }) {
  const form = caseItem.form || {}
  const rows = useMemo(() => evidenceRowsFromCase(caseItem) || [], [caseItem])
  const header = {
    court: form.court || '',
    caseNo: caseItem.caseNo || '',
    caseName: caseItem.title || findType(caseItem.typeKey)?.caseName || '',
    plaintiff: form.pName || '',
    defendant: form.dName || '',
    courtDept: form.courtDept || '',
  }
  const withPurpose = rows.filter((r) => r.name && r.purpose).length
  const percent = rows.length === 0 ? 0 : Math.round((withPurpose / rows.length) * 100)
  const paper = <EvidencePaper code={EVIDENCE_CODE} party={EVIDENCE_PARTY} header={header} rows={rows} startNo={1} />

  return (
    <>
      <PrintSheet>{paper}</PrintSheet>
      <CaptureFrame>
        <EvidenceDoneView
          paper={paper}
          code={EVIDENCE_CODE}
          startNo={1}
          rows={rows}
          header={header}
          percent={percent}
          caseId={caseItem.id}
          caseTitle={caseItem.title}
        />
      </CaptureFrame>
    </>
  )
}

/* ─────────────────── 화면 ─────────────────── */

const DOC_LABEL = { brief: '준비서면', evidence: '증거목록', petition: '신청서' }

export default function FigmaDocResult() {
  const { kind, caseId, variant } = useParams()
  const caseItem = figmaWorkspaceCases.find((item) => item.id === caseId)

  useEffect(() => {
    if (!caseItem) return undefined
    const previous = document.title
    document.title = `${DOC_LABEL[kind] || '문서'} 완성본 · ${caseItem.title}`
    return () => { document.title = previous }
  }, [caseItem, kind])

  if (!caseItem) return <NotFound what={`캡처할 사건을 찾지 못했습니다 — ${caseId}`} />

  if (kind === 'brief') {
    const form = demoBriefFor(caseItem.id)
    if (!form) return <NotFound what={`${caseItem.title}에는 준비서면 초안이 없습니다`} />
    return (
      <CaptureFrame>
        <BriefDoneView form={form} caseTitle={caseItem.title} caseId={caseItem.id} />
      </CaptureFrame>
    )
  }

  if (kind === 'evidence') return <EvidenceCapture caseItem={caseItem} />

  if (kind === 'petition') {
    const list = demoPetitionsFor(caseItem.id)
    // 한 사건에 신청서가 둘 이상이면 URL 끝의 유형 키로 고른다 (없으면 첫 번째)
    const picked = variant ? list.find((item) => item.typeKey === variant) : list[0]
    const type = picked ? findPetition(picked.typeKey) : null
    if (!picked || !type) return <NotFound what={`${caseItem.title}에는 ${variant || ''} 신청서 초안이 없습니다`} />
    return (
      <CaptureFrame>
        <PetitionDoneView type={type} form={picked.form} caseTitle={caseItem.title} caseId={caseItem.id} />
      </CaptureFrame>
    )
  }

  return <NotFound what={`알 수 없는 문서 종류입니다 — ${kind}`} />
}

/* ─────────────────── 캡처 목록 ─────────────────── */

/**
 * 사건 × 문서 종류로 열리는 완성 화면을 한자리에 모아 둔다.
 * Figma로 옮길 때 이 목록을 위에서부터 차례로 열면 빠짐없이 담긴다.
 */
export function figmaDocRoutes() {
  return figmaWorkspaceCases.map((caseItem) => ({
    caseItem,
    docs: [
      { kind: 'complaint', label: '소장', path: `/figma/complaint-result/${caseItem.id}` },
      ...(demoBriefFor(caseItem.id) ? [{ kind: 'brief', label: '준비서면', path: `/figma/doc/brief/${caseItem.id}` }] : []),
      { kind: 'evidence', label: '증거목록', path: `/figma/doc/evidence/${caseItem.id}` },
      ...demoPetitionsFor(caseItem.id).map(({ typeKey }) => ({
        kind: 'petition',
        label: `신청서 — ${findPetition(typeKey)?.title || typeKey}`,
        path: `/figma/doc/petition/${caseItem.id}/${typeKey}`,
      })),
    ],
  }))
}

export function FigmaDocIndex() {
  const groups = useMemo(() => figmaDocRoutes(), [])
  const total = groups.reduce((sum, g) => sum + g.docs.length, 0)

  return (
    <main className="min-h-screen bg-ink-50 p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-bold text-ink-900">Figma 캡처용 문서 완성 화면</h1>
        <p className="mt-1 text-[13px] text-ink-500">사건 {groups.length}건 · 화면 {total}장. 각 링크가 그 문서의 완성된 화면 한 장입니다.</p>
        <div className="mt-6 space-y-5">
          {groups.map(({ caseItem, docs }) => (
            <section key={caseItem.id} className="rounded-2xl border border-ink-200 bg-white p-5">
              <h2 className="text-[15px] font-semibold text-ink-900">{caseItem.title}</h2>
              <p className="text-[12px] text-ink-400">{caseItem.caseNo} · {caseItem.form?.court}</p>
              <ul className="mt-3 space-y-1.5">
                {docs.map((doc) => (
                  <li key={doc.path}>
                    <Link to={doc.path} className="text-[13px] text-brand-500 underline">{doc.label}</Link>
                    <span className="ml-2 text-[12px] text-ink-400">{doc.path}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
