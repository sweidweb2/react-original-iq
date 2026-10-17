import { randomUUID } from 'node:crypto'

import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin } from '../../database/index.js'
import { notFound } from '../../errors/app-error.js'
import { fromMinor, sumMinor, toMinor } from '../_shared/money.js'
import {
  type CreatePaymentInput,
  type CreateRefundInput,
  LEDGER_CURRENCY,
  type PaymentRecord,
  type PaymentStatus,
  type RefundRecord,
  type UpdatePaymentInput,
} from './payments.types.js'

/** Why a guarded write was refused (raised atomically by the DB functions in migration 020). */
export type PaymentCapReason = 'overpay' | 'refund_cap' | 'refund_uncovered'

export class PaymentCapError extends Error {
  readonly reason: PaymentCapReason

  constructor(reason: PaymentCapReason) {
    super(reason)
    this.name = 'PaymentCapError'
    this.reason = reason
  }
}

/** Task price: paid payments − paid refunds may never exceed this. */
export type PaymentGuard = { maxNet: number }

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
  /** Locks the task; throws PaymentCapError('overpay') if a paid insert would exceed `maxNet`. */
  createPayment: (input: CreatePaymentInput, guard: PaymentGuard) => Promise<PaymentRecord>
  /**
   * Locks the task; throws PaymentCapError('overpay') or ('refund_uncovered') when the change would
   * overpay the task or leave committed refunds larger than the remaining paid total.
   */
  updatePayment: (
    id: string,
    input: UpdatePaymentInput,
    guard: PaymentGuard,
  ) => Promise<PaymentRecord | null>
  deletePayment: (id: string) => Promise<boolean>
  addPaymentLog: (
    paymentId: string,
    event: string,
    payload?: Record<string, unknown>,
  ) => Promise<void>
  listPaymentLogs: (paymentId: string) => Promise<PaymentLogRecord[]>
  /** Locks the task; throws PaymentCapError('refund_cap') above paid − (paid + pending refunds). */
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

/** Minor units, like the guard checks below. */
function memoryTotals(taskId: string) {
  const sum = (rows: { amount: number }[]) => sumMinor(rows.map((row) => row.amount))
  const payments = memoryPayments.filter((row) => row.taskId === taskId && row.status === 'paid')
  const refunds = memoryRefunds.filter((row) => row.taskId === taskId)
  return {
    paidPayments: sum(payments),
    paidRefunds: sum(refunds.filter((row) => row.status === 'paid')),
    pendingRefunds: sum(refunds.filter((row) => row.status === 'pending')),
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
    async createPayment(input, guard) {
      if (input.status === 'paid') {
        const totals = memoryTotals(input.taskId)
        if (
          totals.paidPayments - totals.paidRefunds + toMinor(input.amount) >
          toMinor(guard.maxNet)
        ) {
          throw new PaymentCapError('overpay')
        }
      }
      const stamp = nowIso()
      const payment: PaymentRecord = {
        id: randomUUID(),
        taskId: input.taskId,
        userId: input.userId,
        amount: input.amount,
        currency: LEDGER_CURRENCY,
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
    async updatePayment(id, input, guard) {
      const index = memoryPayments.findIndex((row) => row.id === id)
      if (index === -1) return null
      const current = memoryPayments[index]!
      const nextAmount = input.amount ?? current.amount
      const nextStatus = input.status ?? current.status
      const totals = memoryTotals(current.taskId)
      const others = totals.paidPayments - (current.status === 'paid' ? toMinor(current.amount) : 0)
      const nextPaid = others + (nextStatus === 'paid' ? toMinor(nextAmount) : 0)
      if (nextStatus === 'paid' && nextPaid - totals.paidRefunds > toMinor(guard.maxNet)) {
        throw new PaymentCapError('overpay')
      }
      if (
        nextPaid < totals.paidPayments &&
        nextPaid < totals.paidRefunds + totals.pendingRefunds
      ) {
        throw new PaymentCapError('refund_uncovered')
      }
      const updated: PaymentRecord = {
        ...current,
        amount: nextAmount,
        status: nextStatus,
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
      const totals = memoryTotals(input.taskId)
      const refundable = totals.paidPayments - totals.paidRefunds - totals.pendingRefunds
      if (toMinor(input.amount) > refundable) {
        throw new PaymentCapError('refund_cap')
      }
      const stamp = nowIso()
      const refund: RefundRecord = {
        id: randomUUID(),
        taskId: input.taskId,
        refunderId: input.refunderId,
        amount: input.amount,
        refundReason: input.refundReason?.trim() || null,
        currency: LEDGER_CURRENCY,
        gateway: 'manual',
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
      return fromMinor(memoryTotals(taskId).paidPayments)
    },
    async sumRefundedByTask(taskId) {
      return fromMinor(memoryTotals(taskId).paidRefunds)
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

  const CAP_REASONS: Record<string, PaymentCapReason> = {
    OVERPAY: 'overpay',
    REFUND_CAP: 'refund_cap',
    REFUND_UNCOVERED: 'refund_uncovered',
  }

  function mapRpcError(error: { message?: string }): Error {
    const message = error.message ?? ''
    const reason = CAP_REASONS[message]
    if (reason) return new PaymentCapError(reason)
    if (message === 'TASK_NOT_FOUND') return notFound('Task not found', 'TASK_NOT_FOUND')
    return error as Error
  }

  async function sumAmounts(table: 'payments' | 'refunds', taskId: string): Promise<number> {
    const { data, error } = await client
      .from(table)
      .select('amount')
      .eq('task_id', taskId)
      .eq('status', 'paid')
    if (error) throw error
    return fromMinor(sumMinor((data as { amount: number | string }[]).map((row) => Number(row.amount))))
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
    async createPayment(input, guard) {
      const { data, error } = await client
        .rpc('create_task_payment', {
          p_task_id: input.taskId,
          p_user_id: input.userId,
          p_amount: input.amount,
          p_status: input.status,
          p_gateway: input.gateway,
          p_method: input.paymentMethod ?? null,
          p_txn_id: input.montypayTransactionId ?? null,
          p_max_net: guard.maxNet,
        })
        .single()
      if (error) throw mapRpcError(error)
      return fromPaymentRow(data as PaymentRow)
    },
    async updatePayment(id, input, guard) {
      const { data, error } = await client
        .rpc('update_task_payment', {
          p_payment_id: id,
          p_amount: input.amount ?? null,
          p_status: input.status ?? null,
          p_set_method: input.paymentMethod !== undefined,
          p_method: input.paymentMethod ?? null,
          p_max_net: guard.maxNet,
        })
        .single()
      if (error) {
        if (error.message === 'PAYMENT_NOT_FOUND') return null
        throw mapRpcError(error)
      }
      return fromPaymentRow(data as PaymentRow)
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
        .rpc('create_task_refund', {
          p_task_id: input.taskId,
          p_refunder_id: input.refunderId,
          p_amount: input.amount,
          p_reason: input.refundReason?.trim() || null,
        })
        .single()
      if (error) throw mapRpcError(error)
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
