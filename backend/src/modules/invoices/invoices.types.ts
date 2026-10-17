export type InvoiceStatus = 'sent' | 'failed'

export type InvoiceRecord = {
  id: string
  paymentId: string
  invoiceSeq: number
  invoiceNumber: string
  invoiceDate: string | null
  invoiceStatus: InvoiceStatus | null
  /** What this invoice billed; fixed at issue time even if the payment is edited later. */
  amount: number
  currency: string
  pdfPath: string | null
  sentAt: string | null
  lastError: string | null
  /** Set when the payment was edited or canceled; voided invoices are kept, never deleted. */
  voidedAt: string | null
  voidReason: string | null
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
  amount: number
  currency: string
  hasPdf: boolean
  sentAt: string | null
  lastError: string | null
  voidedAt: string | null
  voidReason: string | null
}

/** A payment's current invoice plus the ones it superseded (oldest first). */
export type PaymentInvoices = {
  invoice: InvoiceSummary | null
  voidedInvoices: InvoiceSummary[]
}

export type CreateInvoiceInput = {
  paymentId: string
  amount: number
  currency: string
}

export type UpdateInvoiceInput = {
  invoiceDate?: string
  invoiceStatus?: InvoiceStatus
  pdfPath?: string | null
  sentAt?: string | null
  lastError?: string | null
}

/** `INV-000123`; grows past 6 digits instead of truncating (same rule as migration 024). */
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
    amount: invoice.amount,
    currency: invoice.currency,
    hasPdf: Boolean(invoice.pdfPath),
    sentAt: invoice.sentAt,
    lastError: invoice.lastError,
    voidedAt: invoice.voidedAt,
    voidReason: invoice.voidReason,
  }
}
