import { describe, expect, it, vi } from 'vitest'

import { reportError } from '../../src/errors/report-error.js'
import type { PaymentsRepository } from '../../src/modules/payments/payments.repository.js'
import { recomputeTaskPaymentStatus } from '../../src/modules/payments/payments.service.js'
import type { RefundRecord } from '../../src/modules/payments/payments.types.js'
import type { TasksRepository } from '../../src/modules/tasks/tasks.repository.js'
import type { Task } from '../../src/modules/tasks/tasks.types.js'

vi.mock('../../src/errors/report-error.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/errors/report-error.js')>()),
  reportError: vi.fn(),
}))

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    clientId: 'client-1',
    tutorId: null,
    coordinatorId: 'coord-1',
    topic: 'Essay',
    type: 'assignment',
    description: null,
    isAssigned: false,
    status: 'pending',
    deadline: null,
    price: 100,
    paymentStatus: 'unpaid',
    category: null,
    feedback: null,
    allowView: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeRefund(overrides: Partial<RefundRecord> = {}): RefundRecord {
  return {
    id: 'refund-1',
    taskId: 'task-1',
    refunderId: 'admin-1',
    amount: 10,
    refundReason: null,
    currency: 'USD',
    gateway: 'manual',
    montypayTransactionId: null,
    status: 'pending',
    paymentUrl: null,
    paymentMethod: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

/** `refundedTotal` becomes one paid refund row; `refunds` adds more rows (e.g. pending). */
function makeRepos(opts: { paidTotal: number; refundedTotal: number; refunds?: RefundRecord[] }) {
  const tasksRepository = {
    update: vi.fn().mockResolvedValue(makeTask()),
  } as unknown as TasksRepository

  const refunds = [
    ...(opts.refundedTotal > 0
      ? [makeRefund({ id: 'refund-paid', amount: opts.refundedTotal, status: 'paid' })]
      : []),
    ...(opts.refunds ?? []),
  ]
  const paymentsRepository = {
    sumPaidByTask: vi.fn().mockResolvedValue(opts.paidTotal),
    listRefundsByTask: vi.fn().mockResolvedValue(refunds),
  } as unknown as PaymentsRepository

  return { tasksRepository, paymentsRepository }
}

describe('recomputeTaskPaymentStatus', () => {
  it('marks unpaid when net is below price', async () => {
    const { tasksRepository, paymentsRepository } = makeRepos({
      paidTotal: 40,
      refundedTotal: 0,
    })

    await expect(
      recomputeTaskPaymentStatus(tasksRepository, paymentsRepository, makeTask({ price: 100 })),
    ).resolves.toBe('unpaid')
    expect(tasksRepository.update).toHaveBeenCalledWith('task-1', { paymentStatus: 'unpaid' })
  })

  it('marks paid when net equals price', async () => {
    const { tasksRepository, paymentsRepository } = makeRepos({
      paidTotal: 100,
      refundedTotal: 0,
    })

    await expect(
      recomputeTaskPaymentStatus(tasksRepository, paymentsRepository, makeTask({ price: 100 })),
    ).resolves.toBe('paid')
  })

  it('marks refund_pending when a refund is pending', async () => {
    const { tasksRepository, paymentsRepository } = makeRepos({
      paidTotal: 100,
      refundedTotal: 0,
      refunds: [makeRefund({ status: 'pending' })],
    })

    await expect(
      recomputeTaskPaymentStatus(tasksRepository, paymentsRepository, makeTask({ price: 100 })),
    ).resolves.toBe('refund_pending')
  })

  it('marks paid for zero-price tasks with zero net', async () => {
    const { tasksRepository, paymentsRepository } = makeRepos({
      paidTotal: 0,
      refundedTotal: 0,
    })

    await expect(
      recomputeTaskPaymentStatus(tasksRepository, paymentsRepository, makeTask({ price: 0 })),
    ).resolves.toBe('paid')
  })

  it('marks refund_pending when a zero-price task holds money', async () => {
    const { tasksRepository, paymentsRepository } = makeRepos({ paidTotal: 25, refundedTotal: 0 })

    await expect(
      recomputeTaskPaymentStatus(tasksRepository, paymentsRepository, makeTask({ price: 0 })),
    ).resolves.toBe('refund_pending')
  })

  it('marks refund_pending when the price drops below the net paid', async () => {
    const { tasksRepository, paymentsRepository } = makeRepos({ paidTotal: 100, refundedTotal: 0 })

    await expect(
      recomputeTaskPaymentStatus(tasksRepository, paymentsRepository, makeTask({ price: 80 })),
    ).resolves.toBe('refund_pending')
  })

  it('marks paid when net equals price after paid refunds', async () => {
    const { tasksRepository, paymentsRepository } = makeRepos({ paidTotal: 120, refundedTotal: 20 })

    await expect(
      recomputeTaskPaymentStatus(tasksRepository, paymentsRepository, makeTask({ price: 100 })),
    ).resolves.toBe('paid')
  })

  it('compares in cents, so float sums still match the price', async () => {
    const { tasksRepository, paymentsRepository } = makeRepos({
      paidTotal: 0.1 + 0.2,
      refundedTotal: 0,
    })

    await expect(
      recomputeTaskPaymentStatus(tasksRepository, paymentsRepository, makeTask({ price: 0.3 })),
    ).resolves.toBe('paid')
  })

  it('keeps unpaid and reports when paid refunds exceed payments', async () => {
    const { tasksRepository, paymentsRepository } = makeRepos({ paidTotal: 10, refundedTotal: 30 })

    await expect(
      recomputeTaskPaymentStatus(tasksRepository, paymentsRepository, makeTask({ price: 0 })),
    ).resolves.toBe('unpaid')
    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ source: 'payments.recompute' }),
    )
  })
})
