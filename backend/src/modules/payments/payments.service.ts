import { randomUUID } from 'node:crypto'

import type { AuthActor } from '../../authz/index.js'
import { hasPermission, isTaskClient, isTaskStaff } from '../../authz/index.js'
import { runInBackground } from '../../background/index.js'
import {
  conflict,
  forbidden,
  notFound,
  notImplemented,
  validationError,
} from '../../errors/app-error.js'
import { reportError } from '../../errors/report-error.js'
import { formatAmount, fromMinor, sumMinor, toMinor } from '../_shared/money.js'
import type { InvoicesService } from '../invoices/invoices.service.js'
import type { PaymentInvoices } from '../invoices/invoices.types.js'
import { getLoggingService } from '../logging/index.js'
import { derivePaymentStatus } from '../tasks/payment-status.js'
import type { TasksRepository } from '../tasks/tasks.repository.js'
import type { Task, TaskPaymentStatus } from '../tasks/tasks.types.js'
import {
  PaymentCapError,
  type PaymentCapReason,
  type PaymentLogRecord,
  type PaymentsRepository,
} from './payments.repository.js'
import type {
  CheckoutPaymentBody,
  CreateManualPaymentBody,
  CreateRefundBody,
  UpdatePaymentBody,
} from './payments.schema.js'
import {
  MANUAL_GATEWAY,
  type PaymentRecord,
  type PaymentWithInvoice,
  type RefundRecord,
  SIMULATED_GATEWAY,
  type TaskPaymentsSummary,
} from './payments.types.js'

export type TaskPaymentsView = {
  summary: TaskPaymentsSummary
  payments: PaymentWithInvoice[]
  refunds: RefundRecord[]
}

export type PaymentDetail = PaymentWithInvoice & {
  /** Audit trail (staff only; empty for clients). */
  logs: PaymentLogRecord[]
}

export type PaymentsService = {
  getTaskPayments: (taskId: string, actor: AuthActor) => Promise<TaskPaymentsView>
  getPayment: (taskId: string, paymentId: string, actor: AuthActor) => Promise<PaymentDetail>
  createManualPayment: (
    taskId: string,
    body: CreateManualPaymentBody,
    actor: AuthActor,
  ) => Promise<PaymentWithInvoice>
  updatePayment: (
    taskId: string,
    paymentId: string,
    body: UpdatePaymentBody,
    actor: AuthActor,
  ) => Promise<PaymentWithInvoice>
  checkout: (
    taskId: string,
    body: CheckoutPaymentBody,
    actor: AuthActor,
  ) => Promise<PaymentWithInvoice>
  deletePayment: (taskId: string, paymentId: string, actor: AuthActor) => Promise<void>
  createRefund: (taskId: string, body: CreateRefundBody, actor: AuthActor) => Promise<RefundRecord>
  updateRefundStatus: (
    taskId: string,
    refundId: string,
    status: 'paid' | 'canceled',
    actor: AuthActor,
  ) => Promise<RefundRecord>
  deleteRefund: (taskId: string, refundId: string, actor: AuthActor) => Promise<void>
  recomputeForTask: (taskId: string) => Promise<TaskPaymentStatus>
}

export type PaymentsServiceOptions = {
  gatewayMode?: 'simulated' | 'montypay'
}

/** Positive amount in minor units; rejects amounts that round to zero. */
function positiveMinor(amount: number): number {
  const minor = toMinor(amount)
  if (minor <= 0) {
    throw validationError(`Amount must be at least ${formatAmount(fromMinor(1))}`)
  }
  return minor
}

function canManage(
  actor: AuthActor,
  task: Task,
  key: 'manage_payments' | 'manage_refunds',
): boolean {
  return hasPermission(actor, key) && isTaskStaff(actor, task)
}

const CAP_MESSAGES: Record<PaymentCapReason, string> = {
  overpay: 'This change would overpay the task price',
  refund_cap: 'Refund exceeds the refundable amount',
  refund_uncovered: 'This change would leave refunds larger than the amount paid',
}

/** Turns an atomic cap violation from the repository into a 400. */
async function guarded<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write()
  } catch (error) {
    if (error instanceof PaymentCapError) {
      throw validationError(CAP_MESSAGES[error.reason])
    }
    throw error
  }
}

/** The only writer of `tasks.payment_status` once money exists (see `derivePaymentStatus`). */
export async function recomputeTaskPaymentStatus(
  tasksRepository: TasksRepository,
  paymentsRepository: PaymentsRepository,
  task: Task,
): Promise<TaskPaymentStatus> {
  const [paidTotal, refunds] = await Promise.all([
    paymentsRepository.sumPaidByTask(task.id),
    paymentsRepository.listRefundsByTask(task.id),
  ])
  const paidMinor = toMinor(paidTotal)
  const refundedMinor = sumMinor(
    refunds.filter((row) => row.status === 'paid').map((row) => row.amount),
  )
  if (refundedMinor > paidMinor) {
    reportError(new Error('Paid refunds exceed paid payments'), {
      source: 'payments.recompute',
      level: 'warning',
      meta: { taskId: task.id, paidMinor, refundedMinor },
    })
  }
  const paymentStatus = derivePaymentStatus({
    priceMinor: toMinor(task.price),
    paidMinor,
    refundedMinor,
    hasPendingRefund: refunds.some((row) => row.status === 'pending'),
  })
  await tasksRepository.update(task.id, { paymentStatus })
  return paymentStatus
}

export function createPaymentsService(
  repository: PaymentsRepository,
  tasksRepository: TasksRepository,
  invoices: InvoicesService,
  options: PaymentsServiceOptions = {},
): PaymentsService {
  const gatewayMode = options.gatewayMode ?? 'simulated'

  async function loadTask(taskId: string): Promise<Task> {
    const task = await tasksRepository.findById(taskId)
    if (!task) {
      throw notFound('Task not found', 'TASK_NOT_FOUND')
    }
    return task
  }

  async function loadPayment(taskId: string, paymentId: string): Promise<PaymentRecord> {
    const payment = await repository.findPaymentById(paymentId)
    if (!payment || payment.taskId !== taskId) {
      throw notFound('Payment not found', 'PAYMENT_NOT_FOUND')
    }
    return payment
  }

  /** Task staff and the paying client with `view_payments`; tutors never see the ledger. */
  function assertCanView(actor: AuthActor, task: Task) {
    const party = isTaskStaff(actor, task) || isTaskClient(actor, task)
    if (hasPermission(actor, 'view_payments') && party) return
    throw forbidden('You cannot view payments for this task')
  }

  type Totals = { paidMinor: number; refundedMinor: number }

  async function totals(taskId: string): Promise<Totals> {
    const [paidTotal, refundedTotal] = await Promise.all([
      repository.sumPaidByTask(taskId),
      repository.sumRefundedByTask(taskId),
    ])
    return { paidMinor: toMinor(paidTotal), refundedMinor: toMinor(refundedTotal) }
  }

  function dueMinorFor(task: Task, { paidMinor, refundedMinor }: Totals): number {
    return Math.max(0, toMinor(task.price) - paidMinor + refundedMinor)
  }

  /** Paid + pending refunds: money already promised back to the client. */
  async function committedRefundsMinor(taskId: string): Promise<number> {
    const refunds = await repository.listRefundsByTask(taskId)
    return sumMinor(
      refunds
        .filter((row) => row.status === 'paid' || row.status === 'pending')
        .map((row) => row.amount),
    )
  }

  /** Rejects a change that lowers the paid total below the committed refunds. */
  async function assertRefundsStayCovered(taskId: string, nextPaidMinor: number) {
    if (nextPaidMinor < (await committedRefundsMinor(taskId))) {
      throw validationError(CAP_MESSAGES.refund_uncovered)
    }
  }

  async function logEvent(paymentId: string, event: string, payload: Record<string, unknown>) {
    try {
      await repository.addPaymentLog(paymentId, event, payload)
    } catch (error) {
      reportError(error, { source: 'payments.payment_log', meta: { paymentId, event } })
    }
  }

  const NO_INVOICES: PaymentInvoices = { invoice: null, voidedInvoices: [] }

  async function withInvoice(payment: PaymentRecord): Promise<PaymentWithInvoice> {
    const map = await invoices.forPayments([payment.id])
    return { ...payment, ...(map.get(payment.id) ?? NO_INVOICES) }
  }

  /**
   * Paid payments get a pending invoice now; PDF, upload and email run after the response.
   * Invoice failures never undo the payment (a failed or stuck invoice can be resent).
   */
  async function finalize(payment: PaymentRecord, task: Task): Promise<PaymentWithInvoice> {
    await recomputeTaskPaymentStatus(tasksRepository, repository, task)
    if (payment.status === 'paid') {
      await invoices.prepareForPayment(payment)
      runInBackground('invoices.issue', () => invoices.issueForPayment(payment.id))
    }
    return withInvoice(payment)
  }

  async function buildView(task: Task): Promise<TaskPaymentsView> {
    const [payments, refunds, sums] = await Promise.all([
      repository.listPaymentsByTask(task.id),
      repository.listRefundsByTask(task.id),
      totals(task.id),
    ])
    const invoiceMap = await invoices.forPayments(payments.map((row) => row.id))
    return {
      summary: {
        taskId: task.id,
        price: task.price,
        paidTotal: fromMinor(sums.paidMinor),
        refundedTotal: fromMinor(sums.refundedMinor),
        due: fromMinor(dueMinorFor(task, sums)),
        paymentStatus: task.paymentStatus,
      },
      payments: payments.map((row) => ({ ...row, ...(invoiceMap.get(row.id) ?? NO_INVOICES) })),
      refunds,
    }
  }

  return {
    async getTaskPayments(taskId, actor) {
      const task = await loadTask(taskId)
      assertCanView(actor, task)
      return buildView(task)
    },

    async getPayment(taskId, paymentId, actor) {
      const task = await loadTask(taskId)
      assertCanView(actor, task)
      const payment = await loadPayment(taskId, paymentId)
      const detail = await withInvoice(payment)
      const logs = canManage(actor, task, 'manage_payments')
        ? await repository.listPaymentLogs(paymentId)
        : []
      return { ...detail, logs }
    },

    async createManualPayment(taskId, body, actor) {
      const task = await loadTask(taskId)
      if (!canManage(actor, task, 'manage_payments')) {
        throw forbidden('You cannot record payments for this task')
      }
      const status = body.status ?? 'paid'
      const amountMinor = positiveMinor(body.amount)
      if (status === 'paid') {
        const dueMinor = dueMinorFor(task, await totals(taskId))
        if (dueMinor <= 0) {
          throw validationError('Nothing left to pay on this task')
        }
        if (amountMinor > dueMinor) {
          throw validationError(
            `Manual payments cannot exceed the balance due (${formatAmount(fromMinor(dueMinor))})`,
          )
        }
      }
      const payment = await guarded(() =>
        repository.createPayment(
          {
            taskId,
            userId: task.clientId,
            amount: fromMinor(amountMinor),
            status,
            gateway: MANUAL_GATEWAY,
            paymentMethod: body.paymentMethod ?? 'manual',
          },
          { maxNet: task.price },
        ),
      )
      await logEvent(payment.id, 'payment.created', {
        by: actor.id,
        amount: payment.amount,
        status: payment.status,
        gateway: payment.gateway,
      })
      getLoggingService().recordActivitySafe({
        userId: actor.id,
        action: 'payments.create',
        entity: 'payment',
        entityId: payment.id,
        meta: { taskId, amount: payment.amount, status: payment.status },
      })
      return finalize(payment, task)
    },

    async updatePayment(taskId, paymentId, body, actor) {
      const task = await loadTask(taskId)
      if (!canManage(actor, task, 'manage_payments')) {
        throw forbidden('You cannot edit payments for this task')
      }
      const current = await loadPayment(taskId, paymentId)
      const nextStatus = body.status ?? current.status
      const currentMinor = toMinor(current.amount)
      const nextMinor = body.amount !== undefined ? positiveMinor(body.amount) : currentMinor

      const sums = await totals(taskId)
      const othersPaidMinor = sums.paidMinor - (current.status === 'paid' ? currentMinor : 0)
      const nextPaidMinor = othersPaidMinor + (nextStatus === 'paid' ? nextMinor : 0)
      if (nextStatus === 'paid' && nextPaidMinor - sums.refundedMinor > toMinor(task.price)) {
        throw validationError(CAP_MESSAGES.overpay)
      }
      if (nextPaidMinor < sums.paidMinor) {
        await assertRefundsStayCovered(taskId, nextPaidMinor)
      }

      const updated = await guarded(() =>
        repository.updatePayment(
          paymentId,
          {
            amount: body.amount !== undefined ? fromMinor(nextMinor) : undefined,
            status: body.status,
            paymentMethod: body.paymentMethod,
          },
          { maxNet: task.price },
        ),
      )
      if (!updated) {
        throw notFound('Payment not found', 'PAYMENT_NOT_FOUND')
      }

      const invoiceStale =
        current.status === 'paid' && (nextStatus !== 'paid' || nextMinor !== currentMinor)
      if (invoiceStale) {
        await invoices.voidForPayment(
          paymentId,
          nextStatus !== 'paid'
            ? `Payment marked ${nextStatus}`
            : `Payment amount changed from ${formatAmount(current.amount)} to ${formatAmount(updated.amount)} ${updated.currency}`,
        )
      }

      await logEvent(paymentId, 'payment.updated', {
        by: actor.id,
        before: { amount: current.amount, status: current.status, method: current.paymentMethod },
        after: { amount: updated.amount, status: updated.status, method: updated.paymentMethod },
        invoiceReissued: invoiceStale && updated.status === 'paid',
      })
      getLoggingService().recordActivitySafe({
        userId: actor.id,
        action: 'payments.update',
        entity: 'payment',
        entityId: paymentId,
        meta: { taskId, status: updated.status, amount: updated.amount },
      })
      return finalize(updated, task)
    },

    async checkout(taskId, body, actor) {
      const task = await loadTask(taskId)
      if (!hasPermission(actor, 'pay_own_tasks') || !isTaskClient(actor, task)) {
        throw forbidden('Only the task client can start checkout')
      }
      if (gatewayMode !== 'simulated') {
        throw notImplemented('MontyPay checkout')
      }
      const dueMinor = dueMinorFor(task, await totals(taskId))
      if (dueMinor <= 0) {
        throw validationError('Nothing left to pay on this task')
      }
      const amountMinor = body.amount !== undefined ? positiveMinor(body.amount) : dueMinor
      if (amountMinor > dueMinor) {
        throw validationError(
          `Amount exceeds the balance due (${formatAmount(fromMinor(dueMinor))})`,
        )
      }
      const amount = fromMinor(amountMinor)

      const payment = await guarded(() =>
        repository.createPayment(
          {
            taskId,
            userId: actor.id,
            amount,
            status: 'paid',
            gateway: SIMULATED_GATEWAY,
            paymentMethod: 'card',
            montypayTransactionId: `SIM_${taskId}_${randomUUID()}`,
          },
          { maxNet: task.price },
        ),
      )
      await logEvent(payment.id, 'checkout.simulated', {
        amount,
        currency: payment.currency,
        transactionId: payment.montypayTransactionId,
      })
      getLoggingService().recordActivitySafe({
        userId: actor.id,
        action: 'payments.checkout',
        entity: 'payment',
        entityId: payment.id,
        meta: { taskId, amount, gateway: SIMULATED_GATEWAY },
      })
      return finalize(payment, task)
    },

    async deletePayment(taskId, paymentId, actor) {
      const task = await loadTask(taskId)
      if (!canManage(actor, task, 'manage_payments')) {
        throw forbidden('You cannot delete payments for this task')
      }
      const payment = await loadPayment(taskId, paymentId)
      if (await invoices.hasInvoices(paymentId)) {
        throw conflict(
          'Invoiced payments cannot be deleted; mark the payment canceled to void its invoice',
          'PAYMENT_INVOICED',
        )
      }
      if (payment.status === 'paid') {
        const { paidMinor } = await totals(taskId)
        await assertRefundsStayCovered(taskId, paidMinor - toMinor(payment.amount))
      }
      const deleted = await repository.deletePayment(paymentId)
      if (!deleted) {
        throw notFound('Payment not found', 'PAYMENT_NOT_FOUND')
      }
      getLoggingService().recordActivitySafe({
        userId: actor.id,
        action: 'payments.delete',
        entity: 'payment',
        entityId: paymentId,
        meta: { taskId, amount: payment.amount, status: payment.status },
      })
      await recomputeTaskPaymentStatus(tasksRepository, repository, task)
    },

    async createRefund(taskId, body, actor) {
      const task = await loadTask(taskId)
      if (!canManage(actor, task, 'manage_refunds')) {
        throw forbidden('You cannot create refunds for this task')
      }
      const amountMinor = positiveMinor(body.amount)
      const [{ paidMinor }, committedMinor] = await Promise.all([
        totals(taskId),
        committedRefundsMinor(taskId),
      ])
      const refundableMinor = Math.max(0, paidMinor - committedMinor)
      if (amountMinor > refundableMinor) {
        throw validationError(
          `Refund exceeds the refundable amount (${formatAmount(fromMinor(refundableMinor))})`,
        )
      }
      const refund = await guarded(() =>
        repository.createRefund({
          taskId,
          refunderId: actor.id,
          amount: fromMinor(amountMinor),
          refundReason: body.refundReason,
        }),
      )
      getLoggingService().recordActivitySafe({
        userId: actor.id,
        action: 'payments.refund.create',
        entity: 'refund',
        entityId: refund.id,
        meta: { taskId, amount: refund.amount, reason: refund.refundReason },
      })
      await recomputeTaskPaymentStatus(tasksRepository, repository, task)
      return refund
    },

    async updateRefundStatus(taskId, refundId, status, actor) {
      const task = await loadTask(taskId)
      if (!canManage(actor, task, 'manage_refunds')) {
        throw forbidden('You cannot update refunds for this task')
      }
      const existing = await repository.findRefundById(refundId)
      if (!existing || existing.taskId !== taskId) {
        throw notFound('Refund not found', 'REFUND_NOT_FOUND')
      }
      if (existing.status !== 'pending') {
        throw validationError('Only pending refunds can change status')
      }
      const updated = await repository.updateRefundStatus(refundId, status)
      if (!updated) {
        throw notFound('Refund not found', 'REFUND_NOT_FOUND')
      }
      getLoggingService().recordActivitySafe({
        userId: actor.id,
        action: `payments.refund.${status}`,
        entity: 'refund',
        entityId: refundId,
        meta: { taskId, amount: updated.amount },
      })
      await recomputeTaskPaymentStatus(tasksRepository, repository, task)
      return updated
    },

    async deleteRefund(taskId, refundId, actor) {
      const task = await loadTask(taskId)
      if (!canManage(actor, task, 'manage_refunds')) {
        throw forbidden('You cannot delete refunds for this task')
      }
      const existing = await repository.findRefundById(refundId)
      if (!existing || existing.taskId !== taskId) {
        throw notFound('Refund not found', 'REFUND_NOT_FOUND')
      }
      if (existing.status !== 'pending') {
        throw validationError('Only pending refunds can be deleted')
      }
      const deleted = await repository.deleteRefund(refundId)
      if (!deleted) {
        throw notFound('Refund not found', 'REFUND_NOT_FOUND')
      }
      getLoggingService().recordActivitySafe({
        userId: actor.id,
        action: 'payments.refund.delete',
        entity: 'refund',
        entityId: refundId,
        meta: { taskId, amount: existing.amount, reason: existing.refundReason },
      })
      await recomputeTaskPaymentStatus(tasksRepository, repository, task)
    },

    async recomputeForTask(taskId) {
      const task = await loadTask(taskId)
      return recomputeTaskPaymentStatus(tasksRepository, repository, task)
    },
  }
}
