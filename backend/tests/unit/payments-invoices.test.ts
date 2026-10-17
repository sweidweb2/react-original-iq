import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthActor } from '../../src/authz/index.js'
import type { Mailer } from '../../src/mail/index.js'
import {
  createInvoicesRepository,
  resetInvoicesRepositoryForTests,
} from '../../src/modules/invoices/invoices.repository.js'
import {
  createInvoicesService,
  type InvoicesService,
} from '../../src/modules/invoices/invoices.service.js'
import { formatInvoiceNumber } from '../../src/modules/invoices/invoices.types.js'
import {
  createPaymentsRepository,
  type PaymentsRepository,
  resetPaymentsRepositoryForTests,
} from '../../src/modules/payments/payments.repository.js'
import { createManualPaymentBodySchema } from '../../src/modules/payments/payments.schema.js'
import {
  createPaymentsService,
  type PaymentsService,
} from '../../src/modules/payments/payments.service.js'
import type { TasksRepository } from '../../src/modules/tasks/tasks.repository.js'
import type { Task } from '../../src/modules/tasks/tasks.types.js'
import type { UsersRepository } from '../../src/modules/users/users.repository.js'
import type { StorageService } from '../../src/storage/index.js'
import { loadTestConfig } from '../helpers/test-config.js'

vi.mock('../../src/modules/logging/index.js', () => ({
  getLoggingService: () => ({ recordActivitySafe: vi.fn(), recordErrorSafe: vi.fn() }),
}))

const TASK_ID = '11111111-1111-1111-1111-111111111111'

const client: AuthActor = { id: 'client-1', roles: ['client'] }
const otherClient: AuthActor = { id: 'client-2', roles: ['client'] }
const admin: AuthActor = { id: 'admin-1', roles: ['admin'] }

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: TASK_ID,
    clientId: 'client-1',
    tutorId: null,
    coordinatorId: 'coord-1',
    topic: 'Essay help',
    type: 'assignment',
    description: 'Need help',
    isAssigned: false,
    status: 'pending',
    deadline: '2030-01-01T12:00:00.000Z',
    price: 100,
    paymentStatus: 'unpaid',
    category: 'Writing',
    feedback: null,
    allowView: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('payments + invoices', () => {
  let task: Task
  let paymentsRepository: PaymentsRepository
  let tasksRepository: TasksRepository
  let storage: StorageService
  let mailer: Mailer
  let invoices: InvoicesService
  let payments: PaymentsService

  beforeEach(() => {
    resetPaymentsRepositoryForTests()
    resetInvoicesRepositoryForTests()
    const config = loadTestConfig()
    task = makeTask()

    paymentsRepository = createPaymentsRepository(config)
    tasksRepository = {
      findById: vi.fn(async () => task),
      update: vi.fn(async (_id: string, patch: Partial<Task>) => {
        task = { ...task, ...patch }
        return task
      }),
    } as unknown as TasksRepository
    const usersRepository = {
      findById: vi.fn(async () => ({
        id: 'client-1',
        email: 'client@example.com',
        profile: { firstName: 'Ada', lastName: null, displayName: 'Ada' },
      })),
    } as unknown as UsersRepository

    storage = {
      isConfigured: () => true,
      putObject: vi.fn(async (input) => ({
        key: `invoices/${input.taskId}/obj_${input.originalFilename}`,
        bucket: 'test',
        contentType: input.contentType,
        sizeBytes: input.body.byteLength,
        originalFilename: input.originalFilename,
      })),
      getSignedDownloadUrl: vi.fn(async (key: string) => ({
        url: `https://signed.example/${key}`,
        expiresInSec: 900,
        key,
      })),
      getSignedUploadUrl: vi.fn(),
      deleteObject: vi.fn(async () => undefined),
      deleteObjects: vi.fn(),
      objectExists: vi.fn(),
    } as unknown as StorageService
    mailer = {
      isConfigured: () => true,
      send: vi.fn(async () => ({ messageId: 'm-1', delivered: true })),
    }

    invoices = createInvoicesService({
      repository: createInvoicesRepository(config),
      paymentsRepository,
      tasksRepository,
      usersRepository,
      storage,
      mailer,
      companyName: 'Original IQ',
    })
    payments = createPaymentsService(paymentsRepository, tasksRepository, invoices, {
      gatewayMode: 'simulated',
    })
  })

  it('formats invoice numbers as INV-000123', () => {
    expect(formatInvoiceNumber(1)).toBe('INV-000001')
    expect(formatInvoiceNumber(123)).toBe('INV-000123')
  })

  it('simulated checkout pays the balance and emails a stored PDF invoice', async () => {
    const payment = await payments.checkout(TASK_ID, {}, client)

    expect(payment).toMatchObject({ amount: 100, status: 'paid', gateway: 'simulated' })
    expect(payment.montypayTransactionId).toMatch(/^SIM_/)
    expect(payment.invoice).toMatchObject({
      invoiceNumber: 'INV-000001',
      invoiceStatus: 'sent',
      hasPdf: true,
    })
    expect(storage.putObject).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'invoices', contentType: 'application/pdf' }),
    )
    const mail = vi.mocked(mailer.send).mock.calls[0]![0]
    expect(mail.to).toBe('client@example.com')
    expect(mail.attachments?.[0]?.filename).toBe('INV-000001.pdf')
    expect(task.paymentStatus).toBe('paid')

    const logs = await paymentsRepository.listPaymentLogs(payment.id)
    expect(logs.map((row) => row.event)).toEqual(
      expect.arrayContaining(['checkout.simulated', 'invoice.created', 'invoice.sent']),
    )
  })

  it('blocks checkout for other clients, overpayment, and fully paid tasks', async () => {
    await expect(payments.checkout(TASK_ID, {}, otherClient)).rejects.toMatchObject({ status: 403 })
    await expect(payments.checkout(TASK_ID, { amount: 150 }, client)).rejects.toMatchObject({
      status: 400,
    })

    await payments.checkout(TASK_ID, { amount: 40 }, client)
    expect(task.paymentStatus).toBe('unpaid')
    await payments.checkout(TASK_ID, {}, client)
    expect(task.paymentStatus).toBe('paid')
    await expect(payments.checkout(TASK_ID, {}, client)).rejects.toMatchObject({ status: 400 })
  })

  it('rejects manual payments above the balance due', async () => {
    await expect(
      payments.createManualPayment(TASK_ID, { amount: 120 }, admin),
    ).rejects.toMatchObject({ status: 400 })

    const manual = await payments.createManualPayment(TASK_ID, { amount: 100 }, admin)
    expect(manual).toMatchObject({ gateway: 'No Gateway', status: 'paid' })
    expect(manual.invoice?.invoiceStatus).toBe('sent')
  })

  it('always attributes manual payments to the task client, ignoring a supplied userId', async () => {
    const body = createManualPaymentBodySchema.parse({ amount: 50, userId: 'someone-else' })

    const manual = await payments.createManualPayment(TASK_ID, body, admin)
    expect(manual.userId).toBe(task.clientId)
    expect(vi.mocked(mailer.send).mock.calls[0]![0].to).toBe('client@example.com')
  })

  it('marks the invoice failed but keeps the PDF when email fails, then resend fixes it', async () => {
    vi.mocked(mailer.send).mockRejectedValueOnce(new Error('SMTP down'))

    const payment = await payments.checkout(TASK_ID, {}, client)
    expect(payment.status).toBe('paid')
    expect(payment.invoice).toMatchObject({ invoiceStatus: 'failed', hasPdf: true })
    expect(payment.invoice?.lastError).toContain('SMTP down')

    await expect(invoices.resend(payment.invoice!.id, client)).rejects.toMatchObject({
      status: 403,
    })
    const resent = await invoices.resend(payment.invoice!.id, admin)
    expect(resent).toMatchObject({ invoiceStatus: 'sent', lastError: null })
    expect(storage.putObject).toHaveBeenCalledTimes(1)
  })

  it('issueForPayment is idempotent once sent', async () => {
    const payment = await payments.checkout(TASK_ID, {}, client)
    const again = await invoices.issueForPayment(payment.id)

    expect(again?.id).toBe(payment.invoice?.id)
    expect(mailer.send).toHaveBeenCalledTimes(1)
  })

  it('limits invoice downloads to the task client and staff', async () => {
    const payment = await payments.checkout(TASK_ID, {}, client)
    const invoiceId = payment.invoice!.id

    await expect(invoices.getDownloadUrl(invoiceId, otherClient)).rejects.toMatchObject({
      status: 403,
    })
    const download = await invoices.getDownloadUrl(invoiceId, client)
    expect(download).toMatchObject({ invoiceNumber: 'INV-000001' })
    expect(download.url).toContain('https://signed.example/invoices/')
  })

  it('editing a paid payment reissues the invoice; deleting purges it', async () => {
    const payment = await payments.createManualPayment(TASK_ID, { amount: 100 }, admin)
    const firstKey = vi.mocked(storage.putObject).mock.results[0]!

    const edited = await payments.updatePayment(TASK_ID, payment.id, { amount: 80 }, admin)
    expect(edited.invoice?.invoiceNumber).toBe('INV-000002')
    expect(storage.deleteObject).toHaveBeenCalledTimes(1)
    expect(firstKey.type).toBe('return')
    expect(task.paymentStatus).toBe('unpaid')

    await expect(
      payments.updatePayment(TASK_ID, payment.id, { amount: 120 }, admin),
    ).rejects.toMatchObject({ status: 400 })

    await payments.deletePayment(TASK_ID, payment.id, admin)
    expect(storage.deleteObject).toHaveBeenCalledTimes(2)
    expect(await paymentsRepository.findPaymentById(payment.id)).toBeNull()
    expect((await invoices.summariesForPayments([payment.id])).size).toBe(0)
  })
})
