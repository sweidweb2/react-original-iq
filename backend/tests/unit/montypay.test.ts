import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthActor } from '../../src/authz/index.js'
import { flushBackgroundTasks } from '../../src/background/index.js'
import type { MontyPayConfig } from '../../src/config/index.js'
import type { Mailer } from '../../src/mail/index.js'
import {
  createInvoicesRepository,
  resetInvoicesRepositoryForTests,
} from '../../src/modules/invoices/invoices.repository.js'
import { createInvoicesService } from '../../src/modules/invoices/invoices.service.js'
import {
  checkoutOrderDescription,
  formatGatewayAmount,
  montyPayHash,
  parseCallbackAmount,
  parseCheckoutOrderNumber,
} from '../../src/modules/payments/montypay.js'
import {
  createPaymentsRepository,
  resetPaymentsRepositoryForTests,
} from '../../src/modules/payments/payments.repository.js'
import { createPaymentsService } from '../../src/modules/payments/payments.service.js'
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
const admin: AuthActor = { id: 'admin-1', roles: ['admin'] }

const montypay: MontyPayConfig = {
  apiUrl: 'https://checkout.montypay.com/api/v1/session',
  merchantKey: 'merchant-key',
  merchantPassword: 'merchant-pass',
  callbackSecret: 'callback-secret',
}

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

type CallbackInput = {
  id?: string
  order_number?: string
  order_amount?: string
  order_currency?: string
  order_description?: string
  order_status?: string
  status?: string
  hash?: string
}

function callbackBody(overrides: CallbackInput = {}) {
  const fields = {
    id: overrides.id ?? 'txn-1',
    order_number: overrides.order_number ?? `TASK_${TASK_ID}_1700000000000`,
    order_amount: overrides.order_amount ?? '100.00',
    order_currency: overrides.order_currency ?? 'USD',
    order_description: overrides.order_description ?? checkoutOrderDescription(TASK_ID),
    order_status: overrides.order_status ?? 'settled',
    status: overrides.status ?? 'success',
  }
  const hash =
    overrides.hash ??
    montyPayHash([
      fields.id,
      fields.order_number,
      fields.order_amount,
      fields.order_currency,
      fields.order_description,
      montypay.merchantPassword,
    ])
  return { ...fields, hash }
}

describe('montypay hash', () => {
  it('matches sha1 of the md5 hex of the uppercased fields', () => {
    expect(montyPayHash(['order-1234', '0.19', 'USD', 'Important gift', 'secret'])).toBe(
      '1d70260a2a419f14fe7e71c71f491db537c2759b',
    )
  })

  it('parses order numbers and callback amounts', () => {
    expect(parseCheckoutOrderNumber(`TASK_${TASK_ID}_1700000000000`)?.taskId).toBe(TASK_ID)
    expect(parseCheckoutOrderNumber('order-1')).toBeNull()
    expect(parseCallbackAmount('10.50')).toBe(10.5)
    expect(parseCallbackAmount('10.501')).toBeNull()
    expect(parseCallbackAmount('0')).toBeNull()
    expect(formatGatewayAmount(10)).toBe('10.00')
  })
})

describe('montypay checkout and callback', () => {
  let task: Task
  let fetchImpl: ReturnType<typeof vi.fn>
  let payments: ReturnType<typeof createPaymentsService>
  let paymentsRepository: ReturnType<typeof createPaymentsRepository>

  beforeEach(() => {
    resetPaymentsRepositoryForTests()
    resetInvoicesRepositoryForTests()
    task = makeTask()
    const config = loadTestConfig()
    paymentsRepository = createPaymentsRepository(config)
    const tasksRepository = {
      findById: vi.fn(async (id: string) => (id === task.id ? task : null)),
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
    const storage = {
      isConfigured: () => true,
      putObject: vi.fn(async (input: { taskId: string; originalFilename: string; contentType: string; body: Uint8Array }) => ({
        key: `invoices/${input.taskId}/${input.originalFilename}`,
        bucket: 'test',
        contentType: input.contentType,
        sizeBytes: input.body.byteLength,
        originalFilename: input.originalFilename,
      })),
      getSignedDownloadUrl: vi.fn(),
      getSignedUploadUrl: vi.fn(),
      deleteObject: vi.fn(),
      deleteObjects: vi.fn(),
      objectExists: vi.fn(),
    } as unknown as StorageService
    const mailer: Mailer = {
      isConfigured: () => true,
      send: vi.fn(async () => ({ messageId: 'm-1', delivered: true })),
    }
    const invoices = createInvoicesService({
      repository: createInvoicesRepository(config),
      paymentsRepository,
      tasksRepository,
      usersRepository,
      storage,
      mailer,
      companyName: 'Original IQ',
    })
    fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const sent = JSON.parse(String(init?.body)) as Record<string, unknown>
      expect(sent).not.toHaveProperty('card')
      expect(JSON.stringify(sent)).not.toMatch(/cvc|cvv|pan/i)
      return new Response(JSON.stringify({ redirect_url: 'https://checkout.montypay.com/pay/abc' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    payments = createPaymentsService(paymentsRepository, tasksRepository, invoices, {
      gatewayMode: 'montypay',
      montypay,
      webOrigin: 'http://localhost:5173',
      findPayer: async () => ({ name: 'Ada', email: 'client@example.com' }),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
  })

  afterEach(flushBackgroundTasks)

  async function post(body: unknown, token: string | undefined = montypay.callbackSecret) {
    return payments.handleMontyPayCallback({ token, body })
  }

  it('returns a redirect and does not record a payment until the callback', async () => {
    const result = await payments.checkout(TASK_ID, { amount: 40 }, client)

    expect(result).toEqual({ redirectUrl: 'https://checkout.montypay.com/pay/abc' })
    expect(await paymentsRepository.listPaymentsByTask(TASK_ID)).toEqual([])
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    const sent = JSON.parse(String(init.body)) as {
      order: { amount: string; description: string; number: string }
      hash: string
      success_url: string
    }
    expect(sent.order.amount).toBe('40.00')
    expect(sent.hash).toBe(
      montyPayHash([
        sent.order.number,
        sent.order.amount,
        'USD',
        sent.order.description,
        montypay.merchantPassword,
      ]),
    )
    expect(sent.success_url).toContain('/tasks/')
    expect(sent.success_url).toContain('checkout=success')
  })

  it('does not write a payment when the gateway is down', async () => {
    fetchImpl.mockRejectedValueOnce(new Error('timeout'))
    await expect(payments.checkout(TASK_ID, {}, client)).rejects.toMatchObject({ status: 503 })
    expect(await paymentsRepository.listPaymentsByTask(TASK_ID)).toEqual([])
  })

  it('rejects a bad token and a bad hash without writing', async () => {
    expect((await post(callbackBody(), 'nope')).status).toBe(401)
    expect((await post(callbackBody({ hash: 'deadbeef' }))).status).toBe(400)
    expect(await paymentsRepository.listPaymentsByTask(TASK_ID)).toEqual([])
  })

  it('ignores a declined callback', async () => {
    const result = await post(callbackBody({ status: 'fail', order_status: 'declined' }))
    expect(result).toEqual({ status: 200, body: 'OK' })
    expect(await paymentsRepository.listPaymentsByTask(TASK_ID)).toEqual([])
  })

  it('settles once, issues an invoice, and ignores a replay', async () => {
    const body = callbackBody()
    expect(await post(body, undefined)).toEqual({ status: 200, body: 'OK' })
    expect(await post(body, undefined)).toEqual({ status: 200, body: 'OK' })

    const rows = await paymentsRepository.listPaymentsByTask(TASK_ID)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      amount: 100,
      status: 'paid',
      gateway: 'montypay',
      montypayTransactionId: 'txn-1',
    })
    expect(task.paymentStatus).toBe('paid')

    await flushBackgroundTasks()
    const detail = await payments.getPayment(TASK_ID, rows[0]!.id, admin)
    expect(detail.invoice).toMatchObject({ invoiceStatus: 'sent' })
    expect((await paymentsRepository.listPaymentLogs(rows[0]!.id)).map((row) => row.event)).toContain(
      'checkout.settled',
    )
  })

  it('records an overpayment as refund_pending and lets a ledger refund bring it back to paid', async () => {
    expect(await post(callbackBody({ order_amount: '150.00' }))).toEqual({ status: 200, body: 'OK' })
    expect(task.paymentStatus).toBe('refund_pending')

    const payment = (await paymentsRepository.listPaymentsByTask(TASK_ID))[0]!
    const before = await payments.getPayment(TASK_ID, payment.id, admin)
    expect(before.invoice?.invoiceNumber).toBe('INV-000001')

    const pending = await payments.createRefund(TASK_ID, { amount: 50, refundReason: 'overpay' }, admin)
    expect(pending.status).toBe('pending')
    expect(task.paymentStatus).toBe('refund_pending')
    const during = await payments.getPayment(TASK_ID, payment.id, admin)
    expect(during.invoice?.id).toBe(before.invoice?.id)
    expect(during.voidedInvoices).toEqual([])

    await payments.updateRefundStatus(TASK_ID, pending.id, 'paid', admin)
    expect(task.paymentStatus).toBe('paid')

    await expect(
      payments.createRefund(TASK_ID, { amount: 100.01 }, admin),
    ).rejects.toMatchObject({ status: 400 })
  })
})
