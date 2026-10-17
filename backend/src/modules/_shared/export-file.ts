import type { Request, RequestHandler, Response } from 'express'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** `{base}_{YYYY-MM-DD_HH-mm-ss}.{ext}` (doc 13), in server local time. */
export type ExportExtension = 'csv' | 'pdf' | 'json' | 'xlsx' | 'sql' | 'zip'

export function exportFilename(base: string, ext: ExportExtension, at: Date = new Date()): string {
  const date = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
  const time = `${pad(at.getHours())}-${pad(at.getMinutes())}-${pad(at.getSeconds())}`
  return `${base}_${date}_${time}.${ext}`
}

export type ExportFile = {
  filename: string
  contentType: string
  body: string | Buffer
}

export function csvExport(base: string, csv: string): ExportFile {
  return {
    filename: exportFilename(base, 'csv'),
    contentType: 'text/csv; charset=utf-8',
    body: csv,
  }
}

export function pdfExport(base: string, pdf: Buffer): ExportFile {
  return {
    filename: exportFilename(base, 'pdf'),
    contentType: 'application/pdf',
    body: pdf,
  }
}

export function sendExport(res: Response, file: ExportFile): void {
  res.setHeader('Content-Type', file.contentType)
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`)
  res.status(200).send(file.body)
}

/** Send a file download. Errors go to the shared error middleware. */
export function respondExport(
  handle: (req: Request) => ExportFile | Promise<ExportFile>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve()
      .then(() => handle(req))
      .then((file) => {
        sendExport(res, file)
      })
      .catch(next)
  }
}
