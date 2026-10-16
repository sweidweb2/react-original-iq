import { randomUUID } from 'node:crypto'

import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin } from '../../database/index.js'
import type {
  CreateCheckoutPaymentInput,
  CreateManualPaymentInput,
  CreateRefundInput,
  InvoiceRecord,
  PaymentRecord,
  PaymentStatus,
  RefundRecord,
} from './payments.types.js'

export type PaymentsRepository = {
  hasAnyForTask: (taskId: string) => Promise<boolean>
  listPaymentsByTask: (taskId: string) => Promise<PaymentRecord[]>
  listRefundsByTask: (taskId: string) => Promise<RefundRecord[]>
  findPaymentById: (id: string) => Promise<PaymentRecord | null>
  createManualPayment: (input: CreateManualPaymentInput) => Promise<PaymentRecord>
  createCheckoutPayment: (input: CreateCheckoutPaymentInput) => Promise<PaymentRecord>
  updatePaymentStatus: (id: string, status: PaymentStatus) => Promise<PaymentRecord | null>
  deletePayment: (id: string) => Promise<boolean>
  createRefund: (input: CreateRefundInput) => Promise<RefundRecord>
  findRefundById: (id: string) => Promise<RefundRecord | null>
  updateRefundStatus: (id: string, status: PaymentStatus) => Promise<RefundRecord | null>
  deleteRefund: (id: string) => Promise<boolean>
  createInvoiceForPayment: (paymentId: string, invoiceNumber: string) => Promise<InvoiceRecord>
  sumPaidByTask: (taskId: string) => Promise<number>
  sumRefundedByTask: (taskId: string) => Promise<number>
  exportAllPayments: () => Promise<PaymentRecord[]>
  exportAllRefunds: () => Promise<RefundRecord[]>
}

const memoryPayments: PaymentRecord[] = []
const memoryRefunds: RefundRecord[] = []
const memoryInvoices: InvoiceRecord[] = []

export function resetPaymentsRepositoryForTests(): void {
  memoryPayments.length = 0
  memoryRefunds.length = 0
  memoryInvoices.length = 0
}

function nowIso(): string {
  return new Date().toISOString()
}

function fakeCheckoutUrl(paymentId: string): string {
  return `https://checkout.montypay.example/pay/${paymentId}`
}

function toPayment(input: CreateManualPaymentInput, id: string, stamp: string): PaymentRecord {
  return {
    id,
    taskId: input.taskId,
    userId: input.userId,
    amount: input.amount,
    currency: input.currency ?? 'USD',
    gateway: 'montypay',
    montypayTransactionId: null,
    status: input.status ?? 'paid',
    paymentUrl: null,
    paymentMethod: input.paymentMethod ?? 'manual',
    createdAt: stamp,
    updatedAt: stamp,
  }
}

type PaymentRow = {
  id: string
  task_id: string
  user_id: string
  amount: number | string
  currency: string
  gateway: string
  montypay_transaction_id: string | null
  status: PaymentStatus
  payment_url: string | null
  payment_method: string | null
  created_at: string
  updated_at: string
}

type RefundRow = {
  id: string
  task_id: string
  refunder_id: string
  amount: number | string
  refund_reason: string | null
  currency: string
  gateway: string
  montypay_transaction_id: string | null
  status: PaymentStatus
  payment_url: string | null
  payment_method: string | null
  created_at: string
  updated_at: string
}

type InvoiceRow = {
  id: string
  payment_id: string
  invoice_number: string | null
  invoice_date: string | null
  invoice_status: 'sent' | 'failed' | null
  pdf_path: string | null
  created_at: string
  updated_at: string
}

function fromPaymentRow(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
    amount: Number(row.amount),
    currency: row.currency,
    gateway: row.gateway,
    montypayTransactionId: row.montypay_transaction_id,
    status: row.status,
    paymentUrl: row.payment_url,
    paymentMethod: row.payment_method,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function fromRefundRow(row: RefundRow): RefundRecord {
  return {
    id: row.id,
    taskId: row.task_id,
    refunderId: row.refunder_id,
    amount: Number(row.amount),
    refundReason: row.refund_reason,
    currency: row.currency,
    gateway: row.gateway,
    montypayTransactionId: row.montypay_transaction_id,
    status: row.status,
    paymentUrl: row.payment_url,
    paymentMethod: row.payment_method,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function fromInvoiceRow(row: InvoiceRow): InvoiceRecord {
  return {
    id: row.id,
    paymentId: row.payment_id,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    invoiceStatus: row.invoice_status,
    pdfPath: row.pdf_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function createMemoryPaymentsRepository(): PaymentsRepository {
  return {
    async hasAnyForTask(taskId) {
      return (
        memoryPayments.some((row) => row.taskId === taskId) ||
        memoryRefunds.some((row) => row.taskId === taskId)
      )
    },
    async listPaymentsByTask(taskId) {
      return memoryPayments
        .filter((row) => row.taskId === taskId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    async listRefundsByTask(taskId) {
      return memoryRefunds
        .filter((row) => row.taskId === taskId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    async findPaymentById(id) {
      return memoryPayments.find((row) => row.id === id) ?? null
    },
    async createManualPayment(input) {
      const stamp = nowIso()
      const payment = toPayment(input, randomUUID(), stamp)
      memoryPayments.push(payment)
      if (payment.status === 'paid') {
        const invoiceNumber = `INV-${payment.id.slice(0, 8).toUpperCase()}`
        memoryInvoices.push({
          id: randomUUID(),
          paymentId: payment.id,
          invoiceNumber,
          invoiceDate: stamp,
          invoiceStatus: 'sent',
          pdfPath: null,
          createdAt: stamp,
          updatedAt: stamp,
        })
      }
      return payment
    },
    async createCheckoutPayment(input) {
      const stamp = nowIso()
      const id = randomUUID()
      const payment: PaymentRecord = {
        id,
        taskId: input.taskId,
        userId: input.userId,
        amount: input.amount,
        currency: input.currency ?? 'USD',
        gateway: 'montypay',
        montypayTransactionId: null,
        status: 'pending',
        paymentUrl: fakeCheckoutUrl(id),
        paymentMethod: 'card',
        createdAt: stamp,
        updatedAt: stamp,
      }
      memoryPayments.push(payment)
      return payment
    },
    async updatePaymentStatus(id, status) {
      const index = memoryPayments.findIndex((row) => row.id === id)
      if (index === -1) return null
      const current = memoryPayments[index]!
      const updated = { ...current, status, updatedAt: nowIso() }
      memoryPayments[index] = updated
      if (status === 'paid' && !memoryInvoices.some((inv) => inv.paymentId === id)) {
        const stamp = nowIso()
        memoryInvoices.push({
          id: randomUUID(),
          paymentId: id,
          invoiceNumber: `INV-${id.slice(0, 8).toUpperCase()}`,
          invoiceDate: stamp,
          invoiceStatus: 'sent',
          pdfPath: null,
          createdAt: stamp,
          updatedAt: stamp,
        })
      }
      return updated
    },
    async deletePayment(id) {
      const index = memoryPayments.findIndex((row) => row.id === id)
      if (index === -1) return false
      memoryPayments.splice(index, 1)
      return true
    },
    async createRefund(input) {
      const stamp = nowIso()
      const refund: RefundRecord = {
        id: randomUUID(),
        taskId: input.taskId,
        refunderId: input.refunderId,
        amount: input.amount,
        refundReason: input.refundReason?.trim() || null,
        currency: input.currency ?? 'USD',
        gateway: input.gateway ?? 'manual',
        montypayTransactionId: null,
        status: 'pending',
        paymentUrl: null,
        paymentMethod: 'manual',
        createdAt: stamp,
        updatedAt: stamp,
      }
      memoryRefunds.push(refund)
      return refund
    },
    async findRefundById(id) {
      return memoryRefunds.find((row) => row.id === id) ?? null
    },
    async updateRefundStatus(id, status) {
      const index = memoryRefunds.findIndex((row) => row.id === id)
      if (index === -1) return null
      const current = memoryRefunds[index]!
      const updated = { ...current, status, updatedAt: nowIso() }
      memoryRefunds[index] = updated
      return updated
    },
    async deleteRefund(id) {
      const index = memoryRefunds.findIndex((row) => row.id === id)
      if (index === -1) return false
      memoryRefunds.splice(index, 1)
      return true
    },
    async createInvoiceForPayment(paymentId, invoiceNumber) {
      const stamp = nowIso()
      const invoice: InvoiceRecord = {
        id: randomUUID(),
        paymentId,
        invoiceNumber,
        invoiceDate: stamp,
        invoiceStatus: 'sent',
        pdfPath: null,
        createdAt: stamp,
        updatedAt: stamp,
      }
      memoryInvoices.push(invoice)
      return invoice
    },
    async sumPaidByTask(taskId) {
      return memoryPayments
        .filter((row) => row.taskId === taskId && row.status === 'paid')
        .reduce((sum, row) => sum + row.amount, 0)
    },
    async sumRefundedByTask(taskId) {
      return memoryRefunds
        .filter((row) => row.taskId === taskId && row.status === 'paid')
        .reduce((sum, row) => sum + row.amount, 0)
    },
    async exportAllPayments() {
      return [...memoryPayments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    async exportAllRefunds() {
      return [...memoryRefunds].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
  }
}

function createSupabasePaymentsRepository(config: AppConfig): PaymentsRepository {
  const client = getSupabaseAdmin(config)
  if (!client) {
    throw new Error('Supabase admin client is not available')
  }

  const paymentColumns =
    'id, task_id, user_id, amount, currency, gateway, montypay_transaction_id, status, payment_url, payment_method, created_at, updated_at'

  return {
    async hasAnyForTask(taskId) {
      const { count: paymentCount, error: paymentError } = await client
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('task_id', taskId)
      if (paymentError) throw paymentError
      if ((paymentCount ?? 0) > 0) return true
      const { count: refundCount, error: refundError } = await client
        .from('refunds')
        .select('id', { count: 'exact', head: true })
        .eq('task_id', taskId)
      if (refundError) throw refundError
      return (refundCount ?? 0) > 0
    },
    async listPaymentsByTask(taskId) {
      const { data, error } = await client
        .from('payments')
        .select(paymentColumns)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as PaymentRow[]).map(fromPaymentRow)
    },
    async listRefundsByTask(taskId) {
      const { data, error } = await client
        .from('refunds')
        .select(
          'id, task_id, refunder_id, amount, refund_reason, currency, gateway, montypay_transaction_id, status, payment_url, payment_method, created_at, updated_at',
        )
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as RefundRow[]).map(fromRefundRow)
    },
    async findPaymentById(id) {
      const { data, error } = await client
        .from('payments')
        .select(paymentColumns)
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data ? fromPaymentRow(data as PaymentRow) : null
    },
    async createManualPayment(input) {
      const { data, error } = await client
        .from('payments')
        .insert({
          task_id: input.taskId,
          user_id: input.userId,
          amount: input.amount,
          currency: input.currency ?? 'USD',
          status: input.status ?? 'paid',
          payment_method: input.paymentMethod ?? 'manual',
        })
        .select(paymentColumns)
        .single()
      if (error) throw error
      const payment = fromPaymentRow(data as PaymentRow)
      if (payment.status === 'paid') {
        await this.createInvoiceForPayment(
          payment.id,
          `INV-${payment.id.slice(0, 8).toUpperCase()}`,
        )
      }
      return payment
    },
    async createCheckoutPayment(input) {
      const id = randomUUID()
      const paymentUrl = fakeCheckoutUrl(id)
      const { data, error } = await client
        .from('payments')
        .insert({
          id,
          task_id: input.taskId,
          user_id: input.userId,
          amount: input.amount,
          currency: input.currency ?? 'USD',
          status: 'pending',
          payment_url: paymentUrl,
          payment_method: 'card',
        })
        .select(paymentColumns)
        .single()
      if (error) throw error
      return fromPaymentRow(data as PaymentRow)
    },
    async updatePaymentStatus(id, status) {
      const { data, error } = await client
        .from('payments')
        .update({ status })
        .eq('id', id)
        .select(paymentColumns)
        .maybeSingle()
      if (error) throw error
      if (data && status === 'paid') {
        const payment = fromPaymentRow(data as PaymentRow)
        await this.createInvoiceForPayment(
          payment.id,
          `INV-${payment.id.slice(0, 8).toUpperCase()}`,
        )
        return payment
      }
      return data ? fromPaymentRow(data as PaymentRow) : null
    },
    async deletePayment(id) {
      const { error, count } = await client.from('payments').delete({ count: 'exact' }).eq('id', id)
      if (error) throw error
      return (count ?? 0) > 0
    },
    async createRefund(input) {
      const { data, error } = await client
        .from('refunds')
        .insert({
          task_id: input.taskId,
          refunder_id: input.refunderId,
          amount: input.amount,
          refund_reason: input.refundReason?.trim() || null,
          currency: input.currency ?? 'USD',
          gateway: input.gateway ?? 'manual',
          status: 'pending',
          payment_method: 'manual',
        })
        .select(
          'id, task_id, refunder_id, amount, refund_reason, currency, gateway, montypay_transaction_id, status, payment_url, payment_method, created_at, updated_at',
        )
        .single()
      if (error) throw error
      return fromRefundRow(data as RefundRow)
    },
    async findRefundById(id) {
      const { data, error } = await client
        .from('refunds')
        .select(
          'id, task_id, refunder_id, amount, refund_reason, currency, gateway, montypay_transaction_id, status, payment_url, payment_method, created_at, updated_at',
        )
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data ? fromRefundRow(data as RefundRow) : null
    },
    async updateRefundStatus(id, status) {
      const { data, error } = await client
        .from('refunds')
        .update({ status })
        .eq('id', id)
        .select(
          'id, task_id, refunder_id, amount, refund_reason, currency, gateway, montypay_transaction_id, status, payment_url, payment_method, created_at, updated_at',
        )
        .maybeSingle()
      if (error) throw error
      return data ? fromRefundRow(data as RefundRow) : null
    },
    async deleteRefund(id) {
      const { error, count } = await client.from('refunds').delete({ count: 'exact' }).eq('id', id)
      if (error) throw error
      return (count ?? 0) > 0
    },
    async createInvoiceForPayment(paymentId, invoiceNumber) {
      const { data, error } = await client
        .from('invoices')
        .insert({
          payment_id: paymentId,
          invoice_number: invoiceNumber,
          invoice_date: new Date().toISOString(),
          invoice_status: 'sent',
        })
        .select(
          'id, payment_id, invoice_number, invoice_date, invoice_status, pdf_path, created_at, updated_at',
        )
        .single()
      if (error) throw error
      return fromInvoiceRow(data as InvoiceRow)
    },
    async sumPaidByTask(taskId) {
      const { data, error } = await client
        .from('payments')
        .select('amount')
        .eq('task_id', taskId)
        .eq('status', 'paid')
      if (error) throw error
      return (data as { amount: number | string }[]).reduce(
        (sum, row) => sum + Number(row.amount),
        0,
      )
    },
    async sumRefundedByTask(taskId) {
      const { data, error } = await client
        .from('refunds')
        .select('amount')
        .eq('task_id', taskId)
        .eq('status', 'paid')
      if (error) throw error
      return (data as { amount: number | string }[]).reduce(
        (sum, row) => sum + Number(row.amount),
        0,
      )
    },
    async exportAllPayments() {
      const { data, error } = await client
        .from('payments')
        .select(paymentColumns)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as PaymentRow[]).map(fromPaymentRow)
    },
    async exportAllRefunds() {
      const { data, error } = await client
        .from('refunds')
        .select(
          'id, task_id, refunder_id, amount, refund_reason, currency, gateway, montypay_transaction_id, status, payment_url, payment_method, created_at, updated_at',
        )
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as RefundRow[]).map(fromRefundRow)
    },
  }
}

export function createPaymentsRepository(config: AppConfig = loadConfig()): PaymentsRepository {
  if (isSupabaseConfigured(config)) {
    return createSupabasePaymentsRepository(config)
  }
  return createMemoryPaymentsRepository()
}
