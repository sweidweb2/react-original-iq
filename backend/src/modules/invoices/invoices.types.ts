export type InvoiceStatus = 'sent' | 'failed'

export type InvoiceRecord = {
  id: string
  paymentId: string
  invoiceSeq: number
  invoiceNumber: string
  invoiceDate: string | null
  invoiceStatus: InvoiceStatus | null
  pdfPath: string | null
  sentAt: string | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

/** Public shape attached to payments and returned by the API (no storage key). */
export type InvoiceSummary = {
  id: string
  paymentId: string
  invoiceNumber: string
  invoiceDate: string | null
  invoiceStatus: InvoiceStatus | null
  hasPdf: boolean
  sentAt: string | null
  lastError: string | null
}

export type UpdateInvoiceInput = {
  invoiceDate?: string
  invoiceStatus?: InvoiceStatus
  pdfPath?: string | null
  sentAt?: string | null
  lastError?: string | null
}

/** `INV-000123` (doc 06). */
export function formatInvoiceNumber(seq: number): string {
  return `INV-${String(seq).padStart(6, '0')}`
}

export function toInvoiceSummary(invoice: InvoiceRecord): InvoiceSummary {
  return {
    id: invoice.id,
    paymentId: invoice.paymentId,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    invoiceStatus: invoice.invoiceStatus,
    hasPdf: Boolean(invoice.pdfPath),
    sentAt: invoice.sentAt,
    lastError: invoice.lastError,
  }
}
