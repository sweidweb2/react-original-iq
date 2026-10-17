import { type AuthActor, isSuper } from '../../authz/index.js'
import { forbidden } from '../../errors/app-error.js'
import { rowsToCsv } from '../_shared/csv.js'
import { csvExport, type ExportFile } from '../_shared/export-file.js'
import type { ContactRepository } from '../contact/contact.repository.js'
import type { FeedbackRepository } from '../feedback/feedback.repository.js'
import { getLoggingService } from '../logging/index.js'
import type { PaymentsRepository } from '../payments/payments.repository.js'
import type { PaymentRecord } from '../payments/payments.types.js'
import type { TasksRepository } from '../tasks/tasks.repository.js'
import type { Task } from '../tasks/tasks.types.js'
import type { UsersRepository } from '../users/users.repository.js'
import type { User } from '../users/users.types.js'
import type { ExportsRepository, RevisionSessionExportRow } from './exports.repository.js'
import type { ExportResource } from './exports.schema.js'

export type ExportsService = {
  exportCsv: (resource: ExportResource, actor: AuthActor) => Promise<ExportFile>
}

export type ExportsServiceDeps = {
  usersRepository: UsersRepository
  tasksRepository: TasksRepository
  paymentsRepository: PaymentsRepository
  feedbackRepository: FeedbackRepository
  contactRepository: ContactRepository
  exportsRepository: ExportsRepository
}

type Cell = string | number | boolean | null | undefined
type Table = { headers: string[]; rows: Cell[][] }

const MAX_ROWS = 10000

function assertSuper(actor: AuthActor): void {
  if (!isSuper(actor.roles)) {
    throw forbidden('Only super admins can export data')
  }
}

function toCell(value: Cell): string | number | null | undefined {
  return typeof value === 'boolean' ? String(value) : value
}

/** Memoized lookups for doc 13 label columns (names, task labels). */
function createLabels(deps: ExportsServiceDeps) {
  let users: Promise<Map<string, User>> | null = null
  let tasks: Promise<Map<string, Task>> | null = null
  let payments: Promise<Map<string, PaymentRecord>> | null = null
  let revisions: Promise<Map<string, RevisionSessionExportRow>> | null = null

  return {
    users() {
      users ??= deps.usersRepository
        .findMany()
        .then((rows) => new Map(rows.map((row) => [row.id, row])))
      return users
    },
    tasks() {
      tasks ??= deps.tasksRepository
        .findPage({ page: 1, limit: MAX_ROWS, scope: { kind: 'all' } })
        .then(({ items }) => new Map(items.map((row) => [row.id, row])))
      return tasks
    },
    payments() {
      payments ??= deps.paymentsRepository
        .exportAllPayments()
        .then((rows) => new Map(rows.map((row) => [row.id, row])))
      return payments
    },
    revisions() {
      revisions ??= deps.exportsRepository
        .listRevisionSessions()
        .then((rows) => new Map(rows.map((row) => [row.id, row])))
      return revisions
    },
  }
}

function nameOf(users: Map<string, User>, id: string | null | undefined): string {
  if (!id) return ''
  const user = users.get(id)
  return user?.profile?.displayName?.trim() || user?.email || ''
}

function taskLabel(tasks: Map<string, Task>, id: string | null | undefined): string {
  if (!id) return ''
  return tasks.get(id)?.topic?.trim() || `Task ${id.slice(0, 8)}`
}

export function createExportsService(deps: ExportsServiceDeps): ExportsService {
  async function build(resource: ExportResource): Promise<Table> {
    const labels = createLabels(deps)

    switch (resource) {
      case 'users': {
        const users = await deps.usersRepository.findMany()
        return {
          headers: ['id', 'name', 'email', 'phone', 'role', 'status', 'created_at', 'updated_at'],
          rows: users.map((user) => [
            user.id,
            user.profile?.displayName ?? '',
            user.email,
            user.phone,
            user.role,
            user.status,
            user.createdAt,
            user.updatedAt,
          ]),
        }
      }
      case 'tasks': {
        const [tasks, users] = await Promise.all([labels.tasks(), labels.users()])
        return {
          headers: [
            'id',
            'topic',
            'type',
            'category',
            'status',
            'price',
            'payment_status',
            'allow_view',
            'client_id',
            'client_name',
            'tutor_id',
            'tutor_name',
            'coordinator_id',
            'coordinator_name',
            'deadline',
            'created_at',
          ],
          rows: [...tasks.values()].map((task) => [
            task.id,
            task.topic,
            task.type,
            task.category,
            task.status,
            task.price,
            task.paymentStatus,
            task.allowView,
            task.clientId,
            nameOf(users, task.clientId),
            task.tutorId,
            nameOf(users, task.tutorId),
            task.coordinatorId,
            nameOf(users, task.coordinatorId),
            task.deadline,
            task.createdAt,
          ]),
        }
      }
      case 'files':
      case 'solutions': {
        const [rows, tasks, users] = await Promise.all([
          resource === 'files'
            ? deps.exportsRepository.listFiles()
            : deps.exportsRepository.listSolutions(),
          labels.tasks(),
          labels.users(),
        ])
        return {
          headers: [
            'id',
            'task_id',
            'task_label',
            'client_name',
            'original_name',
            'content_type',
            'size_bytes',
            'file_location',
            ...(resource === 'files' ? ['note'] : []),
            'created_at',
          ],
          rows: rows.map((row) => [
            row.id,
            row.task_id,
            taskLabel(tasks, row.task_id),
            nameOf(users, tasks.get(row.task_id)?.clientId),
            row.original_name,
            row.content_type,
            row.size_bytes,
            row.file_location,
            ...(resource === 'files' ? [(row as { note?: string | null }).note ?? null] : []),
            row.created_at,
          ]),
        }
      }
      case 'revision-sessions': {
        const [sessions, tasks, users] = await Promise.all([
          labels.revisions(),
          labels.tasks(),
          labels.users(),
        ])
        return {
          headers: [
            'id',
            'task_id',
            'task_label',
            'client_name',
            'title',
            'status',
            'start_date',
            'deadline',
            'submit_date',
            'created_at',
          ],
          rows: [...sessions.values()].map((row) => [
            row.id,
            row.task_id,
            taskLabel(tasks, row.task_id),
            nameOf(users, tasks.get(row.task_id)?.clientId),
            row.title,
            row.status,
            row.start_date,
            row.deadline,
            row.submit_date,
            row.created_at,
          ]),
        }
      }
      case 'revision-session-solutions': {
        const [rows, sessions, tasks, users] = await Promise.all([
          deps.exportsRepository.listRevisionSessionSolutions(),
          labels.revisions(),
          labels.tasks(),
          labels.users(),
        ])
        return {
          headers: [
            'id',
            'revision_session_id',
            'solution_id',
            'revision_task_label',
            'client_name',
            'date',
            'created_at',
          ],
          rows: rows.map((row) => {
            const taskId = sessions.get(row.revision_session_id)?.task_id
            return [
              row.id,
              row.revision_session_id,
              row.solution_id,
              taskLabel(tasks, taskId),
              nameOf(users, taskId ? tasks.get(taskId)?.clientId : null),
              row.date,
              row.created_at,
            ]
          }),
        }
      }
      case 'payments': {
        const [payments, tasks, users] = await Promise.all([
          labels.payments(),
          labels.tasks(),
          labels.users(),
        ])
        return {
          headers: [
            'id',
            'task_id',
            'task_label',
            'user_id',
            'client_name',
            'amount',
            'currency',
            'status',
            'gateway',
            'payment_method',
            'transaction_id',
            'created_at',
          ],
          rows: [...payments.values()].map((row) => [
            row.id,
            row.taskId,
            taskLabel(tasks, row.taskId),
            row.userId,
            nameOf(users, row.userId),
            row.amount,
            row.currency,
            row.status,
            row.gateway,
            row.paymentMethod,
            row.montypayTransactionId,
            row.createdAt,
          ]),
        }
      }
      case 'payment-logs': {
        const [logs, payments, tasks, users] = await Promise.all([
          deps.exportsRepository.listPaymentLogs(),
          labels.payments(),
          labels.tasks(),
          labels.users(),
        ])
        return {
          headers: [
            'id',
            'payment_id',
            'event',
            'payment_amount',
            'task_label',
            'client_name',
            'payload',
            'created_at',
          ],
          rows: logs.map((row) => {
            const payment = payments.get(row.payment_id)
            return [
              row.id,
              row.payment_id,
              row.event,
              payment?.amount,
              taskLabel(tasks, payment?.taskId),
              nameOf(users, payment?.userId),
              row.payload ? JSON.stringify(row.payload) : '',
              row.created_at,
            ]
          }),
        }
      }
      case 'refunds': {
        const [refunds, tasks, users] = await Promise.all([
          deps.paymentsRepository.exportAllRefunds(),
          labels.tasks(),
          labels.users(),
        ])
        return {
          headers: [
            'id',
            'task_id',
            'task_label',
            'client_name',
            'refunder_id',
            'refunder_name',
            'amount',
            'currency',
            'status',
            'reason',
            'created_at',
          ],
          rows: refunds.map((row) => [
            row.id,
            row.taskId,
            taskLabel(tasks, row.taskId),
            nameOf(users, tasks.get(row.taskId)?.clientId),
            row.refunderId,
            nameOf(users, row.refunderId),
            row.amount,
            row.currency,
            row.status,
            row.refundReason,
            row.createdAt,
          ]),
        }
      }
      case 'feedback': {
        const [page, tasks, users] = await Promise.all([
          deps.feedbackRepository.findPage({ page: 1, limit: MAX_ROWS }),
          labels.tasks(),
          labels.users(),
        ])
        return {
          headers: [
            'id',
            'task_id',
            'task_label',
            'tutor_id',
            'tutor_name',
            'client_id',
            'client_name',
            'rating',
            'comments',
            'suggestions',
            'created_at',
          ],
          rows: page.items.map((row) => [
            row.id,
            row.taskId,
            taskLabel(tasks, row.taskId),
            row.tutorId,
            nameOf(users, row.tutorId),
            row.clientId,
            nameOf(users, row.clientId),
            row.rating,
            row.comments,
            row.suggestions,
            row.createdAt,
          ]),
        }
      }
      case 'specializations': {
        const [rows, users] = await Promise.all([
          deps.exportsRepository.listSpecializations(),
          labels.users(),
        ])
        return {
          headers: ['id', 'tutor_id', 'tutor_name', 'name', 'note', 'created_at'],
          rows: rows.map((row) => [
            row.id,
            row.tutor_id,
            nameOf(users, row.tutor_id),
            row.name,
            row.note,
            row.created_at,
          ]),
        }
      }
      case 'leads': {
        const leads = await deps.contactRepository.exportLeads()
        return {
          headers: [
            'id',
            'first_name',
            'last_name',
            'phone',
            'email',
            'country',
            'zip',
            'created_at',
          ],
          rows: leads.map((row) => [
            row.id,
            row.firstName,
            row.lastName,
            row.phone,
            row.email,
            row.country,
            row.zip,
            row.createdAt,
          ]),
        }
      }
      case 'login-attempts': {
        const rows = await deps.exportsRepository.listLoginAttempts()
        return {
          headers: [
            'id',
            'email',
            'ip_address',
            'user_agent',
            'success',
            'failed_attempts',
            'locked_until',
            'last_attempt_at',
            'created_at',
          ],
          rows: rows.map((row) => [
            row.id,
            row.email,
            row.ip_address,
            row.user_agent,
            row.success,
            row.failed_attempts,
            row.locked_until,
            row.last_attempt_at,
            row.created_at,
          ]),
        }
      }
      case 'login-verifications': {
        const [rows, users] = await Promise.all([
          deps.exportsRepository.listLoginVerifications(),
          labels.users(),
        ])
        return {
          headers: [
            'id',
            'user_id',
            'user_name',
            'type',
            'expires_at',
            'used',
            'used_at',
            'created_at',
          ],
          rows: rows.map((row) => [
            row.id,
            row.user_id,
            nameOf(users, row.user_id),
            row.type,
            row.expires_at,
            row.used,
            row.used_at,
            row.created_at,
          ]),
        }
      }
    }
  }

  return {
    async exportCsv(resource, actor) {
      assertSuper(actor)
      const table = await build(resource)
      getLoggingService().recordActivitySafe({
        userId: actor.id,
        action: 'exports.download',
        entity: 'export',
        entityId: resource,
        meta: { resource, format: 'csv', rows: table.rows.length },
      })
      return csvExport(
        resource,
        rowsToCsv(
          table.headers,
          table.rows.map((row) => row.map(toCell)),
        ),
      )
    },
  }
}
