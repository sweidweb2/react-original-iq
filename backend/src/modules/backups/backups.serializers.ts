import ExcelJS from 'exceljs'

import { rowsToCsv } from '../_shared/csv.js'
import type { TableRow } from './backups.repository.js'
import type { BackupDataFormat } from './backups.schema.js'

/** Excel rejects cells longer than this. */
const XLSX_MAX_CELL_LENGTH = 32767

export const FORMAT_CONTENT_TYPE: Record<BackupDataFormat | 'zip', string> = {
  csv: 'text/csv; charset=utf-8',
  json: 'application/json; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  sql: 'application/sql; charset=utf-8',
  zip: 'application/zip',
}

/** Union of keys in first-seen order (PostgREST returns columns in table order). */
export function collectColumns(rows: TableRow[]): string[] {
  const columns = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) columns.add(key)
  }
  return [...columns]
}

function cellText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function tableToCsv(rows: TableRow[]): string {
  const columns = collectColumns(rows)
  return rowsToCsv(
    columns,
    rows.map((row) => columns.map((column) => cellText(row[column]))),
    { neutralizeFormulas: false },
  )
}

export function tableToJson(table: string, rows: TableRow[], exportedAt: Date): string {
  return `${JSON.stringify({ table, exportedAt: exportedAt.toISOString(), rowCount: rows.length, rows }, null, 2)}\n`
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

export function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return `'${text.replace(/'/g, "''")}'`
}

export function sqlHeader(exportedAt: Date): string {
  return [
    '-- Original IQ backup',
    `-- Exported at ${exportedAt.toISOString()}`,
    '-- Replays into an existing schema (run migrations first); existing rows are skipped.',
    '',
    'BEGIN;',
    '',
  ].join('\n')
}

export function sqlFooter(): string {
  return '\nCOMMIT;\n'
}

export function tableToSql(table: string, rows: TableRow[]): string {
  const lines = [`-- ${table}: ${rows.length} row(s)`]
  const columns = collectColumns(rows)
  if (columns.length > 0) {
    const target = `${quoteIdent('public')}.${quoteIdent(table)} (${columns.map(quoteIdent).join(', ')})`
    for (const row of rows) {
      const values = columns.map((column) => sqlLiteral(row[column])).join(', ')
      lines.push(`INSERT INTO ${target} VALUES (${values}) ON CONFLICT DO NOTHING;`)
    }
  }
  return `${lines.join('\n')}\n\n`
}

function xlsxCell(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' || typeof value === 'boolean') return value
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return text.length > XLSX_MAX_CELL_LENGTH ? text.slice(0, XLSX_MAX_CELL_LENGTH) : text
}

/** One worksheet per table. */
export async function tablesToXlsx(tables: { name: string; rows: TableRow[] }[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.created = new Date()
  for (const table of tables) {
    const sheet = workbook.addWorksheet(table.name.slice(0, 31))
    const columns = collectColumns(table.rows)
    if (columns.length === 0) continue
    sheet.addRow(columns).font = { bold: true }
    for (const row of table.rows) {
      sheet.addRow(columns.map((column) => xlsxCell(row[column])))
    }
  }
  return Buffer.from(await workbook.xlsx.writeBuffer())
}
