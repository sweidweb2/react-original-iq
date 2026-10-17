import { describe, expect, it } from 'vitest'

import { CSV_BOM, escapeCsvCell, rowsToCsv } from '../../src/modules/_shared/csv.js'

describe('csv', () => {
  it.each(['=HYPERLINK("http://evil")', '+1+1', '-2+3', '@SUM(A1)', '\tcmd'])(
    'neutralizes formula-looking text %j',
    (value) => {
      expect(escapeCsvCell(value).replace(/^"/, '')).toMatch(/^'/)
    },
  )

  it('leaves ordinary text and numbers alone, including negative numbers', () => {
    expect(escapeCsvCell('Ada Lovelace')).toBe('Ada Lovelace')
    expect(escapeCsvCell(-5)).toBe('-5')
    expect(escapeCsvCell(42)).toBe('42')
  })

  it('still quotes cells containing separators after neutralizing', () => {
    expect(escapeCsvCell('=1,2')).toBe(`"'=1,2"`)
  })

  it('keeps raw values when neutralizing is disabled (backups)', () => {
    const csv = rowsToCsv(['note'], [['=1+1']], { neutralizeFormulas: false })
    expect(csv).toBe(`${CSV_BOM}note\n=1+1\n`)
  })
})
