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

export type InvoiceRecord = {
  id: string
  paymentId: string
  invoiceNumber: string | null
  invoiceDate: string | null
  invoiceStatus: 'sent' | 'failed' | null
  pdfPath: string | null
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

export type CreateManualPaymentInput = {
  taskId: string
  userId: string
  amount: number
  status?: PaymentStatus
  paymentMethod?: string
  currency?: string
}

export type CreateCheckoutPaymentInput = {
  taskId: string
  userId: string
  amount: number
  currency?: string
}

export type CreateRefundInput = {
  taskId: string
  refunderId: string
  amount: number
  refundReason?: string
  currency?: string
  gateway?: string
}
