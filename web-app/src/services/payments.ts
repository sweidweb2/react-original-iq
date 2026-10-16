import { apiRequest } from './api'

import type { TaskPaymentStatus } from './tasks'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'canceled' | 'refunded'

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
}

export function getTaskPayments(taskId: string) {
  return apiRequest<TaskPaymentsView>(`/tasks/${taskId}/payments`)
}

export function createManualPayment(
  taskId: string,
  input: { amount: number; status?: PaymentStatus; paymentMethod?: string; userId?: string },
) {
  return apiRequest<PaymentRecord>(`/tasks/${taskId}/payments`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function checkoutTaskPayment(taskId: string, input?: { amount?: number }) {
  return apiRequest<PaymentRecord>(`/tasks/${taskId}/payments/checkout`, {
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
