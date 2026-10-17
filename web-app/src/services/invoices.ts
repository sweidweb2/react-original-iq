import { apiRequest } from './api'

export type InvoiceStatus = 'sent' | 'failed'

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

export type InvoiceDownload = {
  url: string
  expiresInSec: number
  invoiceNumber: string
}

export function getInvoiceDownloadUrl(invoiceId: string) {
  return apiRequest<InvoiceDownload>(`/invoices/${invoiceId}/download`)
}

export function resendInvoice(invoiceId: string) {
  return apiRequest<InvoiceSummary>(`/invoices/${invoiceId}/resend`, { method: 'POST' })
}
