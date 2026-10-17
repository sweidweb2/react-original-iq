import PDFDocument from 'pdfkit'

export type InvoicePdfData = {
  companyName: string
  invoiceNumber: string
  invoiceDate: Date
  billedTo: { name: string; email: string }
  task: { id: string; topic: string | null }
  payment: {
    id: string
    amount: number
    currency: string
    method: string | null
    gateway: string
    status: string
    paidAt: Date
  }
}

function money(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}

function dateLabel(value: Date): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(value)
}

/** Render a single-page invoice PDF. Layout fields stay stable for accounting (doc 09). */
export function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: data.invoiceNumber } })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const left = 50
    const right = doc.page.width - 50

    doc.fontSize(22).font('Helvetica-Bold').text(data.companyName, left, 50)
    doc.fontSize(10).font('Helvetica').fillColor('#555555').text('Tutoring & academic support')

    doc
      .fillColor('#000000')
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('INVOICE', left, 50, { align: 'right', width: right - left })
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Invoice #: ${data.invoiceNumber}`, { align: 'right', width: right - left })
      .text(`Date: ${dateLabel(data.invoiceDate)}`, { align: 'right', width: right - left })

    doc.moveTo(left, 120).lineTo(right, 120).strokeColor('#dddddd').stroke()

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text('Billed to', left, 135)
    doc.font('Helvetica').fontSize(10).text(data.billedTo.name).text(data.billedTo.email)

    doc.font('Helvetica-Bold').fontSize(11).text('Task', 320, 135)
    doc
      .font('Helvetica')
      .fontSize(10)
      .text(data.task.topic ?? 'Untitled task', 320)
      .text(`Ref: ${data.task.id}`, 320)

    const tableTop = 220
    doc.rect(left, tableTop, right - left, 22).fill('#f3f4f6')
    doc
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Description', left + 10, tableTop + 6)
      .text('Amount', left, tableTop + 6, { align: 'right', width: right - left - 10 })

    const rowY = tableTop + 32
    doc
      .font('Helvetica')
      .text(`Payment for task: ${data.task.topic ?? data.task.id}`, left + 10, rowY, {
        width: 330,
      })
      .text(money(data.payment.amount, data.payment.currency), left, rowY, {
        align: 'right',
        width: right - left - 10,
      })

    const totalY = rowY + 40
    doc.moveTo(left, totalY).lineTo(right, totalY).strokeColor('#dddddd').stroke()
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Total paid', left + 10, totalY + 10)
      .text(money(data.payment.amount, data.payment.currency), left, totalY + 10, {
        align: 'right',
        width: right - left - 10,
      })

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#333333')
      .text(`Payment ID: ${data.payment.id}`, left, totalY + 50)
      .text(`Method: ${data.payment.method ?? '—'} (${data.payment.gateway})`)
      .text(`Status: ${data.payment.status}`)
      .text(`Paid on: ${dateLabel(data.payment.paidAt)}`)

    doc
      .fontSize(9)
      .fillColor('#777777')
      .text(
        `Thank you for choosing ${data.companyName}. Keep this invoice for your records.`,
        left,
        doc.page.height - 90,
        { align: 'center', width: right - left },
      )

    doc.end()
  })
}
