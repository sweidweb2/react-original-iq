import { randomUUID } from 'node:crypto'

import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin } from '../../database/index.js'
import type {
  CreatePaymentInput,
  CreateRefundInput,
  PaymentRecord,
  PaymentStatus,
  RefundRecord,
  UpdatePaymentInput,
} from './payments.types.js'

export type PaymentLogRecord = {
  id: string
  paymentId: string
  event: string
  payload: Record<string, unknown> | null
  createdAt: string
}

export type PaymentsRepository = {
  hasAnyForTask: (taskId: string) => Promise<boolean>
  listPaymentsByTask: (taskId: string) => Promise<PaymentRecord[]>
  listRefundsByTask: (taskId: string) => Promise<RefundRecord[]>
  findPaymentById: (id: string) => Promise<PaymentRecord | null>
  createPayment: (input: CreatePaymentInput) => Promise<PaymentRecord>
  updatePayment: (id: string, input: UpdatePaymentInput) => Promise<PaymentRecord | null>
  deletePayment: (id: string) => Promise<boolean>
  addPaymentLog: (
    paymentId: string,
    event: string,
    payload?: Record<string, unknown>,
  ) => Promise<void>
  listPaymentLogs: (paymentId: string) => Promise<PaymentLogRecord[]>
  createRefund: (input: CreateRefundInput) => Promise<RefundRecord>
  findRefundById: (id: string) => Promise<RefundRecord | null>
  updateRefundStatus: (id: string, status: PaymentStatus) => Promise<RefundRecord | null>
  deleteRefund: (id: string) => Promise<boolean>
  sumPaidByTask: (taskId: string) => Promise<number>
  sumRefundedByTask: (taskId: string) => Promise<number>
  exportAllPayments: () => Promise<PaymentRecord[]>
  exportAllRefunds: () => Promise<RefundRecord[]>
}

const memoryPayments: PaymentRecord[] = []
const memoryRefunds: RefundRecord[] = []
const memoryLogs: PaymentLogRecord[] = []

export function resetPaymentsRepositoryForTests(): void {
  memoryPayments.length = 0
  memoryRefunds.length = 0
  memoryLogs.length = 0
}

function nowIso(): string {
  return new Date().toISOString()
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

type PaymentLogRow = {
  id: string
  payment_id: string
  event: string
  payload: Record<string, unknown> | null
  created_at: string
}

const PAYMENT_COLUMNS =
  'id, task_id, user_id, amount, currency, gateway, montypay_transaction_id, status, payment_url, payment_method, created_at, updated_at'
const REFUND_COLUMNS =
  'id, task_id, refunder_id, amount, refund_reason, currency, gateway, montypay_transaction_id, status, payment_url, payment_method, created_at, updated_at'

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

function fromLogRow(row: PaymentLogRow): PaymentLogRecord {
  return {
    id: row.id,
    paymentId: row.payment_id,
    event: row.event,
    payload: row.payload,
    createdAt: row.created_at,
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
    async createPayment(input) {
      const stamp = nowIso()
      const payment: PaymentRecord = {
        id: randomUUID(),
        taskId: input.taskId,
        userId: input.userId,
        amount: input.amount,
        currency: input.currency ?? 'USD',
        gateway: input.gateway,
        montypayTransactionId: input.montypayTransactionId ?? null,
        status: input.status,
        paymentUrl: null,
        paymentMethod: input.paymentMethod ?? null,
        createdAt: stamp,
        updatedAt: stamp,
      }
      memoryPayments.push(payment)
      return payment
    },
    async updatePayment(id, input) {
      const index = memoryPayments.findIndex((row) => row.id === id)
      if (index === -1) return null
      const current = memoryPayments[index]!
      const updated: PaymentRecord = {
        ...current,
        amount: input.amount ?? current.amount,
        status: input.status ?? current.status,
        paymentMethod:
          input.paymentMethod !== undefined ? input.paymentMethod : current.paymentMethod,
        updatedAt: nowIso(),
      }
      memoryPayments[index] = updated
      return updated
    },
    async deletePayment(id) {
      const index = memoryPayments.findIndex((row) => row.id === id)
      if (index === -1) return false
      memoryPayments.splice(index, 1)
      for (let i = memoryLogs.length - 1; i >= 0; i -= 1) {
        if (memoryLogs[i]!.paymentId === id) memoryLogs.splice(i, 1)
      }
      return true
    },
    async addPaymentLog(paymentId, event, payload) {
      memoryLogs.push({
        id: randomUUID(),
        paymentId,
        event,
        payload: payload ?? null,
        createdAt: nowIso(),
      })
    },
    async listPaymentLogs(paymentId) {
      return memoryLogs
        .filter((row) => row.paymentId === paymentId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
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
  const supabase = getSupabaseAdmin(config)
  if (!supabase) {
    throw new Error('Supabase admin client is not available')
  }
  const client = supabase

  async function sumAmounts(table: 'payments' | 'refunds', taskId: string): Promise<number> {
    const { data, error } = await client
      .from(table)
      .select('amount')
      .eq('task_id', taskId)
      .eq('status', 'paid')
    if (error) throw error
    return (data as { amount: number | string }[]).reduce((sum, row) => sum + Number(row.amount), 0)
  }

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
        .select(PAYMENT_COLUMNS)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as PaymentRow[]).map(fromPaymentRow)
    },
    async listRefundsByTask(taskId) {
      const { data, error } = await client
        .from('refunds')
        .select(REFUND_COLUMNS)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as RefundRow[]).map(fromRefundRow)
    },
    async findPaymentById(id) {
      const { data, error } = await client
        .from('payments')
        .select(PAYMENT_COLUMNS)
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data ? fromPaymentRow(data as PaymentRow) : null
    },
    async createPayment(input) {
      const { data, error } = await client
        .from('payments')
        .insert({
          task_id: input.taskId,
          user_id: input.userId,
          amount: input.amount,
          currency: input.currency ?? 'USD',
          gateway: input.gateway,
          status: input.status,
          payment_method: input.paymentMethod ?? null,
          montypay_transaction_id: input.montypayTransactionId ?? null,
        })
        .select(PAYMENT_COLUMNS)
        .single()
      if (error) throw error
      return fromPaymentRow(data as PaymentRow)
    },
    async updatePayment(id, input) {
      const patch: Record<string, unknown> = {}
      if (input.amount !== undefined) patch.amount = input.amount
      if (input.status !== undefined) patch.status = input.status
      if (input.paymentMethod !== undefined) patch.payment_method = input.paymentMethod
      const { data, error } = await client
        .from('payments')
        .update(patch)
        .eq('id', id)
        .select(PAYMENT_COLUMNS)
        .maybeSingle()
      if (error) throw error
      return data ? fromPaymentRow(data as PaymentRow) : null
    },
    async deletePayment(id) {
      const { error, count } = await client.from('payments').delete({ count: 'exact' }).eq('id', id)
      if (error) throw error
      return (count ?? 0) > 0
    },
    async addPaymentLog(paymentId, event, payload) {
      const { error } = await client
        .from('payment_logs')
        .insert({ payment_id: paymentId, event, payload: payload ?? null })
      if (error) throw error
    },
    async listPaymentLogs(paymentId) {
      const { data, error } = await client
        .from('payment_logs')
        .select('id, payment_id, event, payload, created_at')
        .eq('payment_id', paymentId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data as PaymentLogRow[]).map(fromLogRow)
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
        .select(REFUND_COLUMNS)
        .single()
      if (error) throw error
      return fromRefundRow(data as RefundRow)
    },
    async findRefundById(id) {
      const { data, error } = await client
        .from('refunds')
        .select(REFUND_COLUMNS)
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
        .select(REFUND_COLUMNS)
        .maybeSingle()
      if (error) throw error
      return data ? fromRefundRow(data as RefundRow) : null
    },
    async deleteRefund(id) {
      const { error, count } = await client.from('refunds').delete({ count: 'exact' }).eq('id', id)
      if (error) throw error
      return (count ?? 0) > 0
    },
    sumPaidByTask(taskId) {
      return sumAmounts('payments', taskId)
    },
    sumRefundedByTask(taskId) {
      return sumAmounts('refunds', taskId)
    },
    async exportAllPayments() {
      const { data, error } = await client
        .from('payments')
        .select(PAYMENT_COLUMNS)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as PaymentRow[]).map(fromPaymentRow)
    },
    async exportAllRefunds() {
      const { data, error } = await client
        .from('refunds')
        .select(REFUND_COLUMNS)
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
