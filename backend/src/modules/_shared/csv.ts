/** UTF-8 byte-order mark so Excel opens Arabic text correctly (doc 13). */
export const CSV_BOM = '\uFEFF'

/** Spreadsheet apps run cells starting with these as formulas (CSV injection). */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/

export type CsvOptions = {
  /**
   * Prefix text cells that look like formulas with `'` so Excel/Sheets show them as text.
   * Disable only for machine-restorable dumps (backups) where values must round-trip exactly.
   */
  neutralizeFormulas?: boolean
}

export function escapeCsvCell(
  value: string | number | null | undefined,
  options: CsvOptions = {},
): string {
  const { neutralizeFormulas = true } = options
  let raw = value === null || value === undefined ? '' : String(value)
  if (neutralizeFormulas && typeof value === 'string' && FORMULA_TRIGGER.test(raw)) {
    raw = `'${raw}`
  }
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`
  }
  return raw
}

export function rowsToCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
  options: CsvOptions = {},
): string {
  const escape = (cell: string | number | null | undefined) => escapeCsvCell(cell, options)
  const lines = [headers.map(escape).join(',')]
  for (const row of rows) {
    lines.push(row.map(escape).join(','))
  }
  return `${CSV_BOM}${lines.join('\n')}\n`
}
