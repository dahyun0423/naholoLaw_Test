// 템플릿 보기의 서류를 워드(.docx)와 PDF로 굽는다.
//
//   node scripts/gen-legal-docs.mjs          # docx + pdf
//   node scripts/gen-legal-docs.mjs --no-pdf # docx 만
//
// 원본은 src/lib/legalDocs.js 한 곳이다. 문구를 고치면 이 스크립트를 다시 돌린다.
//   - docx : 화면의 ‘워드 다운로드’가 내려주는 파일 (Vite 가 ?url 로 번들에 넣는다)
//   - pdf  : 증빙 자료·통지서 파서를 시험할 때 쓰는 텍스트 레이어 있는 PDF
//
// 용지는 법원 제출 서면 기준인 A4, 여백 위 45mm · 아래 30mm · 좌우 20mm, 바탕 12pt.

import { writeFile, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AlignmentType, BorderStyle, Document, Packer, Paragraph, ShadingType, Table, TableCell,
  TableRow, TabStopType, TextRun, WidthType, TableLayoutType,
} from 'docx'
import { LEGAL_DOCS, LEGAL_DOC_CSS, spaced, toHtml } from '../src/lib/legalDocs.js'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const OUT = path.join(ROOT, '예시', '서류')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

// ─── 단위: twip (1mm ≈ 56.7) ───
const mm = (v) => Math.round(v * 56.7)
const PAGE = { width: 11906, height: 16838 }
const MARGIN = { top: mm(45), bottom: mm(30), left: mm(20), right: mm(20) }
const CONTENT_W = PAGE.width - MARGIN.left - MARGIN.right
const STEP = 460 // 들여쓰기 한 단계

const FONT = { ascii: 'Batang', hAnsi: 'Batang', eastAsia: '바탕', cs: 'Batang' }
const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE }
const LINE = { style: BorderStyle.SINGLE, size: 6, color: '333333' }

const run = (text, opts = {}) => new TextRun({ text, ...opts })
const para = (children, opts = {}) => new Paragraph({ children: Array.isArray(children) ? children : [run(children)], ...opts })

/** ‘원고’처럼 짧은 머리말을 칸 너비에 맞춰 벌린다 */
const labelPara = (label) => para(label, { alignment: AlignmentType.DISTRIBUTE })

function partiesTable(rows) {
  const labelW = 1150
  const gapW = 450
  const valueW = CONTENT_W - labelW - gapW
  const cell = (children, width) => new TableCell({ children, width: { size: width, type: WidthType.DXA }, borders: NO_BORDERS })
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [labelW, gapW, valueW],
    layout: TableLayoutType.FIXED,
    borders: NO_BORDERS,
    rows: rows.map((r, i) => new TableRow({
      children: [
        cell([labelPara(r.label)], labelW),
        cell([para('')], gapW),
        cell(r.lines.map((l, j) => para(l, { spacing: { after: j === r.lines.length - 1 && i < rows.length - 1 ? 160 : 0 } })), valueW),
      ],
    })),
  })
}

function dataTable(b) {
  const total = b.cols.reduce((s, c) => s + c.w, 0)
  const widths = b.cols.map((c) => Math.floor((c.w / total) * CONTENT_W))
  widths[widths.length - 1] += CONTENT_W - widths.reduce((s, w) => s + w, 0)
  const borders = { top: LINE, bottom: LINE, left: LINE, right: LINE }
  const cell = (text, w, head) => new TableCell({
    width: { size: w, type: WidthType.DXA },
    borders,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    shading: head ? { type: ShadingType.CLEAR, color: 'auto', fill: 'F1F1F1' } : undefined,
    children: [para([run(text, { size: 20, bold: head })], { alignment: head ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { line: 300 } })],
  })
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({ tableHeader: true, children: b.cols.map((c, i) => cell(c.label, widths[i], true)) }),
      ...b.rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, widths[i], false)) })),
    ],
  })
}

function blockToDocx(b) {
  switch (b.t) {
    case 'title':
      return [para([run(spaced(b.text), { bold: true, size: 40, characterSpacing: b.text.length <= 3 ? 240 : 80 })], { alignment: AlignmentType.CENTER, spacing: { after: 560 } })]
    case 'parties':
      return [partiesTable(b.rows), para('')]
    case 'center':
      return [para([run(b.text, { bold: true })], { alignment: AlignmentType.CENTER, spacing: { before: 120, after: 160 } })]
    case 'kv': {
      const left = (b.indent || 0) * STEP
      return b.rows.map(([k, v]) => {
        const sum = k === '합계'
        return para([run(k, { bold: sum }), run(`\t${v}`, { bold: sum })], {
          indent: { left },
          tabStops: [{ type: TabStopType.RIGHT, position: left + 4700 }],
          border: sum ? { top: { style: BorderStyle.SINGLE, size: 4, color: '555555', space: 2 } } : undefined,
        })
      })
    }
    case 'h':
      return [para([run(spaced(b.text), { bold: true, characterSpacing: 60 })], { alignment: AlignmentType.CENTER, spacing: { before: 480, after: 200 }, pageBreakBefore: !!b.page })]
    case 'p': {
      const base = (b.lv || 0) * STEP
      if (!b.n) return [para(b.text, { alignment: AlignmentType.BOTH, indent: { left: base } })]
      return [para([run(`${b.n}\t${b.text}`)], {
        alignment: AlignmentType.BOTH,
        indent: { left: base + STEP, hanging: STEP },
        tabStops: [{ type: TabStopType.LEFT, position: base + STEP }],
      })]
    }
    case 'list':
      return b.rows.map(([l, r]) => para(`${l}\t${r}`, { tabStops: [{ type: TabStopType.LEFT, position: 3700 }] }))
    case 'table':
      return [para(''), dataTable(b), para('')]
    case 'note':
      return [para([run(b.text, { size: 21 })], { alignment: AlignmentType.BOTH, spacing: { before: 240 } })]
    case 'sign':
      return [
        para(b.date, { alignment: AlignmentType.RIGHT, spacing: { before: 720, after: 240 } }),
        para(b.line, { alignment: AlignmentType.RIGHT }),
      ]
    case 'court':
      return [para([run(b.text, { bold: true, size: 28 })], { spacing: { before: 720 } })]
    case 'gap':
      return [para('')]
    default:
      return []
  }
}

function toDocx(doc) {
  return new Document({
    creator: '나홀로법에',
    title: `${doc.group} — ${doc.name} (양식 예시)`,
    description: '나홀로법에 템플릿 보기에서 내려받은 양식 예시입니다. 당사자와 사실관계는 지어낸 것입니다.',
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 24 },
          paragraph: { spacing: { line: 384 } },
        },
      },
    },
    sections: [{
      properties: { page: { size: PAGE, margin: MARGIN } },
      children: doc.blocks.flatMap(blockToDocx),
    }],
  })
}

function pdfHtml(doc) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${doc.name}</title><style>
@page { size: A4; margin: 45mm 20mm 30mm 20mm; }
html, body { margin: 0; }
body { font-size: 12pt; }
.ld { font-family: "AppleMyungjo", "Batang", serif; }
${LEGAL_DOC_CSS}
</style></head><body>${toHtml(doc)}</body></html>`
}

async function main() {
  const withPdf = !process.argv.includes('--no-pdf')
  await mkdir(OUT, { recursive: true })
  const tmp = path.join(tmpdir(), `legal-docs-${process.pid}`)
  if (withPdf) await mkdir(tmp, { recursive: true })

  for (const doc of LEGAL_DOCS) {
    const docxPath = path.join(OUT, `${doc.file}.docx`)
    await writeFile(docxPath, await Packer.toBuffer(toDocx(doc)))
    console.log('docx', path.relative(ROOT, docxPath))

    if (withPdf) {
      if (!existsSync(CHROME)) { console.warn('Chrome 이 없어 PDF 는 건너뜀'); continue }
      const htmlPath = path.join(tmp, `${doc.key}.html`)
      const pdfPath = path.join(OUT, `${doc.file}.pdf`)
      await writeFile(htmlPath, pdfHtml(doc))
      execFileSync(CHROME, ['--headless', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`], { stdio: 'ignore' })
      console.log('pdf ', path.relative(ROOT, pdfPath))
    }
  }
  if (withPdf) await rm(tmp, { recursive: true, force: true })
}

main().catch((err) => { console.error(err); process.exit(1) })
