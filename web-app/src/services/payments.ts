import { apiRequest } from './api'
import type { InvoiceSummary } from './invoices'
import type { TaskPaymentStatus } from './tasks'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'canceled' | 'refunded'

export const PAYMENT_STATUSES: PaymentStatus[] = [
  'pending',
  'paid',
  'failed',
  'canceled',
  'refunded',
]

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
  /** Current (non-voided) invoice. */
  invoice: InvoiceSummary | null
  /** Invoices replaced by edits or cancellation, oldest first. */
  voidedInvoices: InvoiceSummary[]
}

export type PaymentLog = {
  id: string
  paymentId: string
  event: string
  payload: Record<string, unknown> | null
  createdAt: string
}

export type PaymentDetail = PaymentRecord & {
  logs: PaymentLog[]
}

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
  paymentStatus: TaskPaymentStatus
}

export type TaskPaymentsView = {
  summary: TaskPaymentsSummary
  payments: PaymentRecord[]
  refunds: RefundRecord[]
  checkoutMode: 'simulated' | 'montypay'
}

export type CheckoutRedirect = { redirectUrl: string }

export function isCheckoutRedirect(
  value: PaymentRecord | CheckoutRedirect,
): value is CheckoutRedirect {
  return 'redirectUrl' in value && !('id' in value)
}

export type ManualPaymentInput = {
  amount: number
  status?: PaymentStatus
  paymentMethod?: string
}

export type UpdatePaymentInput = {
  amount?: number
  status?: PaymentStatus
  paymentMethod?: string | null
}

export function getTaskPayments(taskId: string) {
  return apiRequest<TaskPaymentsView>(`/tasks/${taskId}/payments`)
}

export function getPayment(taskId: string, paymentId: string) {
  return apiRequest<PaymentDetail>(`/tasks/${taskId}/payments/${paymentId}`)
}

export function createManualPayment(taskId: string, input: ManualPaymentInput) {
  return apiRequest<PaymentRecord>(`/tasks/${taskId}/payments`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updatePayment(taskId: string, paymentId: string, input: UpdatePaymentInput) {
  return apiRequest<PaymentRecord>(`/tasks/${taskId}/payments/${paymentId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

/** Simulated mode returns the paid payment. MontyPay mode returns a hosted checkout URL. */
export function checkoutTaskPayment(
  taskId: string,
  input?: { amount?: number; currency?: string },
) {
  return apiRequest<PaymentRecord | CheckoutRedirect>(`/tasks/${taskId}/payments/checkout`, {
    method: 'POST',
    body: JSON.stringify(input ?? {}),
  })
}

export function deletePayment(taskId: string, paymentId: string) {
  return apiRequest<void>(`/tasks/${taskId}/payments/${paymentId}`, { method: 'DELETE' })
}

export function createRefund(taskId: string, input: { amount: number; refundReason?: string }) {
  return apiRequest<RefundRecord>(`/tasks/${taskId}/refunds`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateRefundStatus(taskId: string, refundId: string, status: 'paid' | 'canceled') {
  return apiRequest<RefundRecord>(`/tasks/${taskId}/refunds/${refundId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function deleteRefund(taskId: string, refundId: string) {
  return apiRequest<void>(`/tasks/${taskId}/refunds/${refundId}`, { method: 'DELETE' })
}
