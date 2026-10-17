import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import PDFDocument from 'pdfkit'

import { getLogger } from '../logging/index.js'

export type TableColumn = {
  key: string
  label: string
  /** Relative width weight (columns are scaled to the page width). */
  width?: number
}

export type TablePdfInput = {
  title: string
  columns: TableColumn[]
  rows: Record<string, string | number | null | undefined>[]
  generatedAt?: Date
}

type Doc = InstanceType<typeof PDFDocument>
type Run = { text: string; arabic: boolean }

const LATIN = 'Helvetica'
const LATIN_BOLD = 'Helvetica-Bold'
const ARABIC = 'arabic'
const ARABIC_BOLD = 'arabic-bold'

const MARGIN = 36
const HEADER_H = 22
const ROW_H = 18
const FONT_SIZE = 9
const CELL_PAD = 4
const MAX_CELL_CHARS = 200

const ARABIC_CHAR = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

const moduleDir = path.dirname(fileURLToPath(import.meta.url))
let warnedMissingFont = false

/** Fonts live in `backend/assets/fonts`; resolve from both `src/pdf` and `dist/src/pdf`. */
function resolveFont(file: string): string | null {
  const candidates = [
    path.resolve(moduleDir, '../../assets/fonts', file),
    path.resolve(moduleDir, '../../../assets/fonts', file),
    path.resolve(process.cwd(), 'assets/fonts', file),
  ]
  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

function registerArabicFonts(doc: Doc): boolean {
  const regular = resolveFont('NotoSansArabic-Regular.ttf')
  const bold = resolveFont('NotoSansArabic-Bold.ttf')
  if (!regular || !bold) {
    if (!warnedMissingFont) {
      getLogger().warn(
        'Arabic PDF font missing (backend/assets/fonts); Arabic text will not render',
      )
      warnedMissingFont = true
    }
    return false
  }
  doc.registerFont(ARABIC, regular)
  doc.registerFont(ARABIC_BOLD, bold)
  return true
}

type RunKind = 'arabic' | 'latin' | 'space'

/**
 * Split into Arabic, Latin, and whitespace runs. Whitespace is its own (Latin-font) run:
 * the Arabic font has no space glyph, and neutral runs keep spacing correct when RTL
 * cells are drawn in reverse run order.
 */
function splitRuns(text: string): Run[] {
  const runs: (Run & { kind: RunKind })[] = []
  for (const char of text) {
    const kind: RunKind = /\s/.test(char) ? 'space' : ARABIC_CHAR.test(char) ? 'arabic' : 'latin'
    const last = runs[runs.length - 1]
    if (last && last.kind === kind) {
      last.text += char
    } else {
      runs.push({ text: char, arabic: kind === 'arabic', kind })
    }
  }
  return runs
}

function cellText(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\s+/g, ' ').trim().slice(0, MAX_CELL_CHARS)
}

export function renderTablePdf(input: TablePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: MARGIN,
      bufferPages: true,
      info: { Title: input.title },
    })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const hasArabicFont = registerArabicFonts(doc)
    const generatedAt = input.generatedAt ?? new Date()
    const left = MARGIN
    const usable = doc.page.width - MARGIN * 2
    const bottom = doc.page.height - MARGIN - 16
    const totalWeight = input.columns.reduce((sum, col) => sum + (col.width ?? 1), 0)
    const widths = input.columns.map((col) => ((col.width ?? 1) / totalWeight) * usable)

    function fontFor(arabic: boolean, bold: boolean): string {
      if (arabic && hasArabicFont) return bold ? ARABIC_BOLD : ARABIC
      return bold ? LATIN_BOLD : LATIN
    }

    function measure(runs: Run[], bold: boolean): number {
      return runs.reduce(
        (sum, run) =>
          sum + doc.font(fontFor(run.arabic, bold)).fontSize(FONT_SIZE).widthOfString(run.text),
        0,
      )
    }

    /** Trim the logical string until it fits, appending an ellipsis. */
    function fit(text: string, maxWidth: number, bold: boolean): Run[] {
      let runs = splitRuns(text)
      if (measure(runs, bold) <= maxWidth) return runs
      const chars = [...text]
      const ellipsis = doc.font(fontFor(false, bold)).fontSize(FONT_SIZE).widthOfString('…')
      while (chars.length > 0) {
        chars.pop()
        runs = splitRuns(chars.join('').trimEnd())
        if (measure(runs, bold) + ellipsis <= maxWidth) break
      }
      return [...runs, { text: '…', arabic: false }]
    }

    /** `baselineY` is the alphabetic baseline so Arabic and Latin runs line up. */
    function drawCell(value: string, x: number, baselineY: number, width: number, bold: boolean) {
      const inner = width - CELL_PAD * 2
      const runs = fit(value, inner, bold)
      const rtl = runs.find((run) => run.text.trim())?.arabic ?? false
      const ordered = rtl ? [...runs].reverse() : runs
      const total = measure(ordered, bold)
      let cursor = rtl ? x + CELL_PAD + Math.max(0, inner - total) : x + CELL_PAD
      for (const run of ordered) {
        doc.font(fontFor(run.arabic, bold)).fontSize(FONT_SIZE)
        doc.text(run.text, cursor, baselineY, { lineBreak: false, baseline: 'alphabetic' })
        cursor += doc.widthOfString(run.text)
      }
    }

    function drawTitle() {
      doc.font(LATIN_BOLD).fontSize(16).fillColor('#111111').text(input.title, left, MARGIN)
      doc
        .font(LATIN)
        .fontSize(9)
        .fillColor('#555555')
        .text(
          `Generated ${generatedAt.toISOString().replace('T', ' ').slice(0, 19)} UTC  ·  ${input.rows.length} rows`,
          left,
          MARGIN + 20,
        )
      return MARGIN + 40
    }

    function drawHeader(y: number): number {
      doc.rect(left, y, usable, HEADER_H).fill('#e5e7eb')
      doc.fillColor('#111111')
      let x = left
      input.columns.forEach((col, index) => {
        drawCell(col.label, x, y + 14, widths[index]!, true)
        x += widths[index]!
      })
      return y + HEADER_H
    }

    let y = drawHeader(drawTitle())

    if (input.rows.length === 0) {
      doc
        .font(LATIN)
        .fontSize(10)
        .fillColor('#555555')
        .text('No records.', left, y + 10)
    }

    input.rows.forEach((row, rowIndex) => {
      if (y + ROW_H > bottom) {
        doc.addPage()
        y = drawHeader(MARGIN)
      }
      if (rowIndex % 2 === 1) {
        doc.rect(left, y, usable, ROW_H).fill('#f9fafb')
      }
      doc.fillColor('#111111')
      let x = left
      input.columns.forEach((col, index) => {
        drawCell(cellText(row[col.key]), x, y + 12, widths[index]!, false)
        x += widths[index]!
      })
      y += ROW_H
    })

    const range = doc.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i += 1) {
      doc.switchToPage(i)
      const footerY = doc.page.height - MARGIN
      doc.page.margins.bottom = 0
      doc
        .font(LATIN)
        .fontSize(8)
        .fillColor('#777777')
        .text(`Page ${i + 1} of ${range.count}`, left, footerY, {
          width: usable,
          align: 'right',
          lineBreak: false,
        })
    }

    doc.end()
  })
}
