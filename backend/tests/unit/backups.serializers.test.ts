import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'

import {
  collectColumns,
  sqlLiteral,
  tablesToXlsx,
  tableToCsv,
  tableToJson,
  tableToSql,
} from '../../src/modules/backups/backups.serializers.js'

const rows = [
  { id: 'u1', name: "O'Brien", active: true, meta: { a: 1 }, note: null },
  { id: 'u2', name: 'Line, "quoted"', active: false, meta: null, extra: 5 },
]

describe('backup serializers', () => {
  it('collects the union of columns in first-seen order', () => {
    expect(collectColumns(rows)).toEqual(['id', 'name', 'active', 'meta', 'note', 'extra'])
  })

  it('writes CSV with BOM, escaped cells and JSON for objects', () => {
    const csv = tableToCsv(rows)
    expect(csv.startsWith('\uFEFFid,name,active,meta,note,extra\n')).toBe(true)
    expect(csv).toContain(`u1,O'Brien,true,"{""a"":1}",,\n`)
    expect(csv).toContain('u2,"Line, ""quoted""",false,,,5\n')
  })

  it('writes JSON with table name, row count and raw rows', () => {
    const parsed = JSON.parse(tableToJson('users', rows, new Date('2026-01-01T00:00:00Z')))
    expect(parsed).toMatchObject({
      table: 'users',
      rowCount: 2,
      exportedAt: '2026-01-01T00:00:00.000Z',
    })
    expect(parsed.rows).toEqual(rows)
  })

  it('escapes SQL literals', () => {
    expect(sqlLiteral(null)).toBe('NULL')
    expect(sqlLiteral(3)).toBe('3')
    expect(sqlLiteral(Number.NaN)).toBe('NULL')
    expect(sqlLiteral(true)).toBe('TRUE')
    expect(sqlLiteral("it's")).toBe("'it''s'")
    expect(sqlLiteral({ q: "a'b" })).toBe(`'{"q":"a''b"}'`)
  })

  it('writes one idempotent INSERT per row', () => {
    const sql = tableToSql('users', rows)
    expect(sql).toContain('-- users: 2 row(s)')
    expect(sql).toContain(
      `INSERT INTO "public"."users" ("id", "name", "active", "meta", "note", "extra") VALUES ('u1', 'O''Brien', TRUE, '{"a":1}', NULL, NULL) ON CONFLICT DO NOTHING;`,
    )
    expect(tableToSql('empty', [])).toBe('-- empty: 0 row(s)\n\n')
  })

  it('writes one worksheet per table', async () => {
    const buffer = await tablesToXlsx([
      { name: 'users', rows },
      { name: 'empty', rows: [] },
    ])
    expect(buffer.subarray(0, 2).toString()).toBe('PK')

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['users', 'empty'])
    const sheet = workbook.getWorksheet('users')
    expect(sheet?.getRow(1).values).toEqual([
      undefined,
      'id',
      'name',
      'active',
      'meta',
      'note',
      'extra',
    ])
    expect(sheet?.getRow(2).getCell(4).value).toBe('{"a":1}')
  })
})
