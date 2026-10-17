import type { PaymentInvoices } from '../invoices/invoices.types.js'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'canceled' | 'refunded'

/** Ledger currency; totals are summed without conversion (DB CHECK enforces it). */
export const LEDGER_CURRENCY = 'USD'

/** Gateway labels: manual staff entries use `No Gateway` (doc 06). */
export const MANUAL_GATEWAY = 'No Gateway'
export const SIMULATED_GATEWAY = 'simulated'

export type PaymentRecord = {
  id: string
  taskId: string
  userId: string
  amount: number
  currency: string
  gateway: string
  montypayTransactionId: string | null
  status: PaymentStatus
  paymentUrl: string | null
  paymentMethod: string | null
  createdAt: string
  updatedAt: string
}

export type PaymentWithInvoice = PaymentRecord & PaymentInvoices

export type RefundRecord = {
  id: string
  taskId: string
  refunderId: string
  amount: number
  refundReason: string | null
  currency: string
  gateway: string
  montypayTransactionId: string | null
  status: PaymentStatus
  paymentUrl: string | null
  paymentMethod: string | null
  createdAt: string
  updatedAt: string
}

export type TaskPaymentsSummary = {
  taskId: string
  price: number
  paidTotal: number
  refundedTotal: number
  due: number
  paymentStatus: 'unpaid' | 'paid' | 'refund_pending'
}

export type CreatePaymentInput = {
  taskId: string
  userId: string
  amount: number
  status: PaymentStatus
  gateway: string
  paymentMethod?: string | null
  montypayTransactionId?: string | null
}

export type UpdatePaymentInput = {
  amount?: number
  status?: PaymentStatus
  paymentMethod?: string | null
}

export type CreateRefundInput = {
  taskId: string
  refunderId: string
  amount: number
  refundReason?: string
}
