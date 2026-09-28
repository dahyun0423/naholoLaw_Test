// 워드 양식 파일의 주소 — Vite 전용.
//
// legalDocs.js 는 Node 스크립트도 읽어야 해서 import.meta 를 쓸 수 없다.
// 그래서 파일 주소만 여기서 따로 묶는다. docx 는 scripts/gen-legal-docs.mjs 가 굽는다.

import { LEGAL_DOCS } from './legalDocs.js'

const urls = import.meta.glob('../../예시/서류/*.docx', { query: '?url', import: 'default', eager: true })

/** 문서 key → { url, filename } */
export const LEGAL_DOC_FILES = Object.fromEntries(LEGAL_DOCS.map((doc) => {
  const url = urls[`../../예시/서류/${doc.file}.docx`]
  return [doc.key, url ? { url, filename: `${doc.file.replace(/^\d+-/, '')}_양식.docx` } : null]
}))

export function downloadLegalDoc(key) {
  const file = LEGAL_DOC_FILES[key]
  if (!file) return false
  const a = document.createElement('a')
  a.href = file.url
  a.download = file.filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  return true
}
