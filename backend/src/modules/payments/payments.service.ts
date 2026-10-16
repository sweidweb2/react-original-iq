import type { AuthActor } from '../../authz/index.js'
import { isAdmin, isOps, isSuper } from '../../authz/index.js'
import { forbidden, notFound, validationError } from '../../errors/app-error.js'
import { hasAnyRole } from '../../authz/roles.js'
import type { TasksRepository } from '../tasks/tasks.repository.js'
import type { Task, TaskPaymentStatus } from '../tasks/tasks.types.js'
import type { PaymentsRepository } from './payments.repository.js'
import type {
  CheckoutPaymentBody,
  CreateManualPaymentBody,
  CreateRefundBody,
} from './payments.schema.js'
import type { PaymentRecord, RefundRecord, TaskPaymentsSummary } from './payments.types.js'

export type TaskPaymentsView = {
  summary: TaskPaymentsSummary
  payments: PaymentRecord[]
  refunds: RefundRecord[]
}

export type PaymentsService = {
  getTaskPayments: (taskId: string, actor: AuthActor) => Promise<TaskPaymentsView>
  createManualPayment: (
    taskId: string,
    body: CreateManualPaymentBody,
    actor: AuthActor,
  ) => Promise<PaymentRecord>
  checkout: (taskId: string, body: CheckoutPaymentBody, actor: AuthActor) => Promise<PaymentRecord>
  deletePayment: (taskId: string, paymentId: string, actor: AuthActor) => Promise<void>
  createRefund: (taskId: string, body: CreateRefundBody, actor: AuthActor) => Promise<RefundRecord>
}

function isClient(roles: readonly string[]): boolean {
  return hasAnyRole(roles, ['client'])
}

function assertTaskRelated(actor: AuthActor, task: Task): void {
  if (isSuper(actor.roles) || isAdmin(actor.roles)) return
  if (isOps(actor.roles) && task.coordinatorId === actor.id) return
  if (hasAnyRole(actor.roles, ['tutor']) && task.tutorId === actor.id) return
  if (isClient(actor.roles) && task.clientId === actor.id) return
  throw forbidden('You cannot access this task')
}

function canManagePayments(actor: AuthActor, task: Task): boolean {
  if (isAdmin(actor.roles) || isSuper(actor.roles)) return true
  return isOps(actor.roles) && task.coordinatorId === actor.id
}

async function recomputeTaskPaymentStatus(
  tasksRepository: TasksRepository,
  paymentsRepository: PaymentsRepository,
  task: Task,
): Promise<TaskPaymentStatus> {
  const paidTotal = await paymentsRepository.sumPaidByTask(task.id)
  const pendingRefunds = (await paymentsRepository.listRefundsByTask(task.id)).some(
    (row) => row.status === 'pending',
  )
  let paymentStatus: TaskPaymentStatus = 'unpaid'
  if (pendingRefunds) {
    paymentStatus = 'refund_pending'
  } else if (paidTotal >= task.price && task.price > 0) {
    paymentStatus = 'paid'
  }
  await tasksRepository.update(task.id, { paymentStatus })
  return paymentStatus
}

export function createPaymentsService(
  repository: PaymentsRepository,
  tasksRepository: TasksRepository,
): PaymentsService {
  async function loadTask(taskId: string): Promise<Task> {
    const task = await tasksRepository.findById(taskId)
    if (!task) {
      throw notFound('Task not found', 'TASK_NOT_FOUND')
    }
    return task
  }

  async function buildView(task: Task): Promise<TaskPaymentsView> {
    const [payments, refunds, paidTotal, refundedTotal] = await Promise.all([
      repository.listPaymentsByTask(task.id),
      repository.listRefundsByTask(task.id),
      repository.sumPaidByTask(task.id),
      repository.sumRefundedByTask(task.id),
    ])
    const due = Math.max(0, task.price - paidTotal + refundedTotal)
    return {
      summary: {
        taskId: task.id,
        price: task.price,
        paidTotal,
        refundedTotal,
        due,
        paymentStatus: task.paymentStatus,
      },
      payments,
      refunds,
    }
  }

  return {
    async getTaskPayments(taskId, actor) {
      const task = await loadTask(taskId)
      assertTaskRelated(actor, task)
      if (isClient(actor.roles) && task.clientId !== actor.id) {
        throw forbidden()
      }
      return buildView(task)
    },

    async createManualPayment(taskId, body, actor) {
      const task = await loadTask(taskId)
      if (!canManagePayments(actor, task)) {
        throw forbidden('Only coordinators or admins can record manual payments')
      }
      const userId = body.userId ?? task.clientId
      const payment = await repository.createManualPayment({
        taskId,
        userId,
        amount: body.amount,
        status: body.status ?? 'paid',
        paymentMethod: body.paymentMethod,
        currency: body.currency,
      })
      await recomputeTaskPaymentStatus(tasksRepository, repository, task)
      return payment
    },

    async checkout(taskId, body, actor) {
      const task = await loadTask(taskId)
      if (!isClient(actor.roles) || task.clientId !== actor.id) {
        throw forbidden('Only the task client can start checkout')
      }
      const amount = body.amount ?? Math.max(0, task.price - (await repository.sumPaidByTask(taskId)))
      if (amount <= 0) {
        throw validationError('Nothing left to pay on this task')
      }
      return repository.createCheckoutPayment({
        taskId,
        userId: actor.id,
        amount,
        currency: body.currency,
      })
    },

    async deletePayment(taskId, paymentId, actor) {
      const task = await loadTask(taskId)
      if (!canManagePayments(actor, task)) {
        throw forbidden('Only coordinators or admins can delete payments')
      }
      const payment = await repository.findPaymentById(paymentId)
      if (!payment || payment.taskId !== taskId) {
        throw notFound('Payment not found', 'PAYMENT_NOT_FOUND')
      }
      const deleted = await repository.deletePayment(paymentId)
      if (!deleted) {
        throw notFound('Payment not found', 'PAYMENT_NOT_FOUND')
      }
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
  }
}
