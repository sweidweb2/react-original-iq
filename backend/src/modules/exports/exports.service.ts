import { forbidden } from '../../errors/app-error.js'
import { isAdmin, isSuper, type AuthActor } from '../../authz/index.js'
import { rowsToCsv } from '../_shared/csv.js'
import type { ContactRepository } from '../contact/contact.repository.js'
import type { FeedbackRepository } from '../feedback/feedback.repository.js'
import type { PaymentsRepository } from '../payments/payments.repository.js'
import type { TasksRepository } from '../tasks/tasks.repository.js'
import type { UsersRepository } from '../users/users.repository.js'
import type { ExportResourceParams } from './exports.schema.js'

export type ExportsService = {
  exportCsv: (resource: ExportResourceParams['resource'], actor: AuthActor) => Promise<string>
}

function assertAdmin(actor: AuthActor): void {
  if (!isSuper(actor.roles) && !isAdmin(actor.roles)) {
    throw forbidden('Only admins can export data')
  }
}

export function createExportsService(deps: {
  usersRepository: UsersRepository
  tasksRepository: TasksRepository
  paymentsRepository: PaymentsRepository
  feedbackRepository: FeedbackRepository
  contactRepository: ContactRepository
}): ExportsService {
  return {
    async exportCsv(resource, actor) {
      assertAdmin(actor)

      switch (resource) {
        case 'users': {
          const users = await deps.usersRepository.findMany()
          return rowsToCsv(
            ['id', 'email', 'role', 'status', 'name', 'createdAt'],
            users.map((user) => [
              user.id,
              user.email,
              user.role,
              user.status,
              user.profile?.displayName ?? '',
              user.createdAt,
            ]),
          )
        }
        case 'tasks': {
          const { items } = await deps.tasksRepository.findPage({
            page: 1,
            limit: 10000,
            scope: { kind: 'all' },
          })
          return rowsToCsv(
            [
              'id',
              'topic',
              'status',
              'price',
              'paymentStatus',
              'clientId',
              'tutorId',
              'coordinatorId',
              'deadline',
              'createdAt',
            ],
            items.map((task) => [
              task.id,
              task.topic,
              task.status,
              task.price,
              task.paymentStatus,
              task.clientId,
              task.tutorId,
              task.coordinatorId,
              task.deadline,
              task.createdAt,
            ]),
          )
        }
        case 'payments': {
          const payments = await deps.paymentsRepository.exportAllPayments()
          return rowsToCsv(
            ['id', 'taskId', 'userId', 'amount', 'currency', 'status', 'gateway', 'createdAt'],
            payments.map((row) => [
              row.id,
              row.taskId,
              row.userId,
              row.amount,
              row.currency,
              row.status,
              row.gateway,
              row.createdAt,
            ]),
          )
        }
        case 'refunds': {
          const refunds = await deps.paymentsRepository.exportAllRefunds()
          return rowsToCsv(
            ['id', 'taskId', 'refunderId', 'amount', 'currency', 'status', 'reason', 'createdAt'],
            refunds.map((row) => [
              row.id,
              row.taskId,
              row.refunderId,
              row.amount,
              row.currency,
              row.status,
              row.refundReason,
              row.createdAt,
            ]),
          )
        }
        case 'leads': {
          const leads = await deps.contactRepository.exportLeads()
          return rowsToCsv(
            ['id', 'firstName', 'lastName', 'email', 'phone', 'country', 'createdAt'],
            leads.map((row) => [
              row.id,
              row.firstName,
              row.lastName,
              row.email,
              row.phone,
              row.country,
              row.createdAt,
            ]),
          )
        }
        case 'feedback': {
          const page = await deps.feedbackRepository.findPage({ page: 1, limit: 10000 })
          return rowsToCsv(
            ['id', 'taskId', 'tutorId', 'clientId', 'rating', 'comments', 'createdAt'],
            page.items.map((row) => [
              row.id,
              row.taskId,
              row.tutorId,
              row.clientId,
              row.rating,
              row.comments,
              row.createdAt,
            ]),
          )
        }
        default:
          return rowsToCsv([], [])
      }
    },
  }
}
