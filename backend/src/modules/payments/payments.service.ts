import type { AuthActor } from '../../authz/index.js'
import { assertTaskRelated, isAdmin, isClient, isOps, isSuper } from '../../authz/index.js'
import { forbidden, notFound, notImplemented, validationError } from '../../errors/app-error.js'
import { getLogger } from '../../logging/index.js'
import type { InvoicesService } from '../invoices/invoices.service.js'
import { getLoggingService } from '../logging/index.js'
import type { TasksRepository } from '../tasks/tasks.repository.js'
import type { Task, TaskPaymentStatus } from '../tasks/tasks.types.js'
import type { PaymentLogRecord, PaymentsRepository } from './payments.repository.js'
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

const CENT = 0.005

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function canManagePayments(actor: AuthActor, task: Task): boolean {
  if (isAdmin(actor.roles) || isSuper(actor.roles)) return true
  return isOps(actor.roles) && task.coordinatorId === actor.id
}

/** Doc 06: net = paid payments − paid refunds. */
export async function recomputeTaskPaymentStatus(
  tasksRepository: TasksRepository,
  paymentsRepository: PaymentsRepository,
  task: Task,
): Promise<TaskPaymentStatus> {
  const [paidTotal, refundedTotal, refunds] = await Promise.all([
    paymentsRepository.sumPaidByTask(task.id),
    paymentsRepository.sumRefundedByTask(task.id),
    paymentsRepository.listRefundsByTask(task.id),
  ])
  const net = roundMoney(paidTotal - refundedTotal)
  const hasPendingRefund = refunds.some((row) => row.status === 'pending')
  let paymentStatus: TaskPaymentStatus = 'unpaid'
  if (hasPendingRefund || (task.price > 0 && net > task.price)) {
    paymentStatus = 'refund_pending'
  } else if (task.price > 0 && net === task.price) {
    paymentStatus = 'paid'
  } else if (task.price === 0 && net === 0) {
    paymentStatus = 'paid'
  }
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
  const log = getLogger().child({ component: 'payments' })

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

  function assertCanView(actor: AuthActor, task: Task) {
    assertTaskRelated(actor, task)
    if (isClient(actor.roles) && task.clientId !== actor.id) {
      throw forbidden()
    }
  }

  async function totals(taskId: string) {
    const [paidTotal, refundedTotal] = await Promise.all([
      repository.sumPaidByTask(taskId),
      repository.sumRefundedByTask(taskId),
    ])
    return { paidTotal, refundedTotal }
  }

  function dueFor(task: Task, paidTotal: number, refundedTotal: number): number {
    return roundMoney(Math.max(0, task.price - paidTotal + refundedTotal))
  }

  async function logEvent(paymentId: string, event: string, payload: Record<string, unknown>) {
    try {
      await repository.addPaymentLog(paymentId, event, payload)
    } catch (error) {
      log.error({ err: error, paymentId, event }, 'failed to write payment log')
    }
  }

  async function withInvoice(payment: PaymentRecord): Promise<PaymentWithInvoice> {
    const map = await invoices.summariesForPayments([payment.id])
    return { ...payment, invoice: map.get(payment.id) ?? null }
  }

  /** Issue the invoice when a payment is paid; invoice failures never undo the payment. */
  async function finalize(payment: PaymentRecord, task: Task): Promise<PaymentWithInvoice> {
    await recomputeTaskPaymentStatus(tasksRepository, repository, task)
    if (payment.status === 'paid') {
      await invoices.issueForPayment(payment.id)
    }
    return withInvoice(payment)
  }

  async function buildView(task: Task): Promise<TaskPaymentsView> {
    const [payments, refunds, { paidTotal, refundedTotal }] = await Promise.all([
      repository.listPaymentsByTask(task.id),
      repository.listRefundsByTask(task.id),
      totals(task.id),
    ])
    const invoiceMap = await invoices.summariesForPayments(payments.map((row) => row.id))
    return {
      summary: {
        taskId: task.id,
        price: task.price,
        paidTotal,
        refundedTotal,
        due: dueFor(task, paidTotal, refundedTotal),
        paymentStatus: task.paymentStatus,
      },
      payments: payments.map((row) => ({ ...row, invoice: invoiceMap.get(row.id) ?? null })),
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
      const logs = canManagePayments(actor, task) ? await repository.listPaymentLogs(paymentId) : []
      return { ...detail, logs }
    },

    async createManualPayment(taskId, body, actor) {
      const task = await loadTask(taskId)
      if (!canManagePayments(actor, task)) {
        throw forbidden('Only coordinators or admins can record manual payments')
      }
      const status = body.status ?? 'paid'
      if (status === 'paid') {
        const { paidTotal, refundedTotal } = await totals(taskId)
        const due = dueFor(task, paidTotal, refundedTotal)
        if (due <= 0) {
          throw validationError('Nothing left to pay on this task')
        }
        if (body.amount > due + CENT) {
          throw validationError(`Manual payments cannot exceed the balance due (${due.toFixed(2)})`)
        }
      }
      const payment = await repository.createPayment({
        taskId,
        userId: body.userId ?? task.clientId,
        amount: roundMoney(body.amount),
        status,
        gateway: MANUAL_GATEWAY,
        paymentMethod: body.paymentMethod ?? 'manual',
        currency: body.currency,
      })
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
      if (!canManagePayments(actor, task)) {
        throw forbidden('Only coordinators or admins can edit payments')
      }
      const current = await loadPayment(taskId, paymentId)
      const nextStatus = body.status ?? current.status
      const nextAmount = body.amount !== undefined ? roundMoney(body.amount) : current.amount

      if (nextStatus === 'paid') {
        const { paidTotal, refundedTotal } = await totals(taskId)
        const othersPaid = paidTotal - (current.status === 'paid' ? current.amount : 0)
        const net = roundMoney(othersPaid + nextAmount - refundedTotal)
        if (net > task.price + CENT) {
          throw validationError('This change would overpay the task price')
        }
      }

      const updated = await repository.updatePayment(paymentId, {
        amount: body.amount !== undefined ? nextAmount : undefined,
        status: body.status,
        paymentMethod: body.paymentMethod,
      })
      if (!updated) {
        throw notFound('Payment not found', 'PAYMENT_NOT_FOUND')
      }

      const invoiceStale =
        current.status === 'paid' && (nextStatus !== 'paid' || nextAmount !== current.amount)
      if (invoiceStale) {
        await invoices.purgeForPayment(paymentId)
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
      if (!isClient(actor.roles) || task.clientId !== actor.id) {
        throw forbidden('Only the task client can start checkout')
      }
      if (gatewayMode !== 'simulated') {
        throw notImplemented('MontyPay checkout')
      }
      const { paidTotal, refundedTotal } = await totals(taskId)
      const due = dueFor(task, paidTotal, refundedTotal)
      if (due <= 0) {
        throw validationError('Nothing left to pay on this task')
      }
      const amount = roundMoney(body.amount ?? due)
      if (amount > due + CENT) {
        throw validationError(`Amount exceeds the balance due (${due.toFixed(2)})`)
      }

      const payment = await repository.createPayment({
        taskId,
        userId: actor.id,
        amount,
        status: 'paid',
        gateway: SIMULATED_GATEWAY,
        paymentMethod: 'card',
        currency: body.currency ?? 'USD',
        montypayTransactionId: `SIM_${taskId}_${Date.now()}`,
      })
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
      if (!canManagePayments(actor, task)) {
        throw forbidden('Only coordinators or admins can delete payments')
      }
      const payment = await loadPayment(taskId, paymentId)
      await invoices.purgeForPayment(paymentId)
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
      if (!canManagePayments(actor, task)) {
        throw forbidden('Only coordinators or admins can create refunds')
      }
      const refund = await repository.createRefund({
        taskId,
        refunderId: actor.id,
        amount: body.amount,
        refundReason: body.refundReason,
        currency: body.currency,
      })
      await recomputeTaskPaymentStatus(tasksRepository, repository, task)
      return refund
    },

    async updateRefundStatus(taskId, refundId, status, actor) {
      const task = await loadTask(taskId)
      if (!canManagePayments(actor, task)) {
        throw forbidden('Only coordinators or admins can update refunds')
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
      await recomputeTaskPaymentStatus(tasksRepository, repository, task)
      return updated
    },

    async deleteRefund(taskId, refundId, actor) {
      const task = await loadTask(taskId)
      if (!canManagePayments(actor, task)) {
        throw forbidden('Only coordinators or admins can delete refunds')
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
      await recomputeTaskPaymentStatus(tasksRepository, repository, task)
    },

    async recomputeForTask(taskId) {
      const task = await loadTask(taskId)
      return recomputeTaskPaymentStatus(tasksRepository, repository, task)
    },
  }
}
