import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  ActivityLogRecord,
  ErrorLogRecord,
  LoggingRepository,
} from '../../src/modules/logging/logging.repository.js'
import { createLoggingService } from '../../src/modules/logging/logging.service.js'

vi.mock('../../src/logging/index.js', () => ({
  getLogger: () => ({ error: vi.fn() }),
}))

function activity(overrides: Partial<ActivityLogRecord> = {}): ActivityLogRecord {
  return {
    id: 'act-1',
    userId: 'user-1',
    action: 'auth.login',
    entity: 'user',
    entityId: 'user-1',
    meta: { source: 'test' },
    ip: '127.0.0.1',
    requestId: 'req-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    user: { id: 'user-1', email: 'ada@example.com', role: 'client' },
    ...overrides,
  }
}

function errorRow(overrides: Partial<ErrorLogRecord> = {}): ErrorLogRecord {
  return {
    id: 'err-1',
    source: 'http',
    level: 'error',
    requestId: 'req-1',
    userId: null,
    code: 'INTERNAL_ERROR',
    message: 'boom',
    stack: 'stack',
    path: '/api/v1/health',
    method: 'GET',
    status: 500,
    meta: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    user: null,
    ...overrides,
  }
}

const actor = { id: 'super-1', roles: ['super'], permissions: ['delete_error_logs'] }

describe('logging.service', () => {
  let repository: LoggingRepository

  beforeEach(() => {
    repository = {
      createActivity: vi.fn(),
      createError: vi.fn(),
      listActivity: vi.fn(),
      countActivityStats: vi.fn(),
      listErrors: vi.fn(),
      countErrorStats: vi.fn(),
      deleteErrors: vi.fn(),
      deleteAllErrors: vi.fn(),
    }
    vi.mocked(repository.createActivity).mockResolvedValue()
  })

  it('writes activity and error rows', async () => {
    const service = createLoggingService(repository)

    await service.recordActivity({ action: 'auth.login', userId: 'user-1' })
    await service.recordError({ message: 'boom', stack: 'short' })

    expect(repository.createActivity).toHaveBeenCalledWith({
      action: 'auth.login',
      userId: 'user-1',
    })
    expect(repository.createError).toHaveBeenCalledWith({ message: 'boom', stack: 'short' })
  })

  it('truncates long error stacks', async () => {
    const service = createLoggingService(repository)
    const stack = 'x'.repeat(4001)

    await service.recordError({ message: 'boom', stack })

    expect(repository.createError).toHaveBeenCalledWith({
      message: 'boom',
      stack: `${'x'.repeat(4000)}…`,
    })
  })

  it('swallows write failures on the safe helpers', async () => {
    vi.mocked(repository.createActivity).mockRejectedValue(new Error('db down'))
    vi.mocked(repository.createError).mockRejectedValue(new Error('db down'))
    const service = createLoggingService(repository)

    expect(() => service.recordActivitySafe({ action: 'auth.login' })).not.toThrow()
    expect(() =>
      service.recordErrorSafe({ message: 'boom', stack: 'x'.repeat(4001) }),
    ).not.toThrow()

    await vi.waitFor(() => {
      expect(repository.createActivity).toHaveBeenCalled()
      expect(repository.createError).toHaveBeenCalledWith(
        expect.objectContaining({ stack: `${'x'.repeat(4000)}…` }),
      )
    })
  })

  it('maps activity pages', async () => {
    vi.mocked(repository.listActivity).mockResolvedValue({ items: [activity()], total: 1 })
    const service = createLoggingService(repository)

    const page = await service.listActivity({ page: 2, limit: 10 })

    expect(repository.listActivity).toHaveBeenCalledWith({ page: 2, limit: 10 })
    expect(page).toEqual({
      data: [
        {
          id: 'act-1',
          userId: 'user-1',
          action: 'auth.login',
          entity: 'user',
          entityId: 'user-1',
          meta: { source: 'test' },
          ip: '127.0.0.1',
          requestId: 'req-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          user: { id: 'user-1', email: 'ada@example.com', role: 'client' },
        },
      ],
      meta: { page: 2, limit: 10, total: 1 },
    })
  })

  it('maps error pages and null activity users', async () => {
    vi.mocked(repository.listActivity).mockResolvedValue({
      items: [activity({ user: null, userId: null })],
      total: 1,
    })
    vi.mocked(repository.listErrors).mockResolvedValue({ items: [errorRow()], total: 4 })
    const service = createLoggingService(repository)

    const activityPage = await service.listActivity({ page: 1, limit: 20 })
    const errorPage = await service.listErrors({ page: 1, limit: 20 })

    expect(activityPage.data[0]?.user).toBeNull()
    expect(errorPage).toMatchObject({
      data: [
        {
          id: 'err-1',
          source: 'http',
          level: 'error',
          message: 'boom',
          meta: null,
          user: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      meta: { page: 1, limit: 20, total: 4 },
    })
  })

  it('passes error filters through and maps the reporting user', async () => {
    vi.mocked(repository.listErrors).mockResolvedValue({
      items: [
        errorRow({
          level: 'warning',
          source: 'invoices.email',
          userId: 'user-1',
          meta: { invoiceId: 'inv-1' },
          user: { id: 'user-1', email: 'ada@example.com', role: 'admin' },
        }),
      ],
      total: 1,
    })
    const service = createLoggingService(repository)

    const page = await service.listErrors({
      page: 1,
      limit: 10,
      search: 'smtp',
      source: 'invoices.email',
      level: 'warning',
      since: '2026-01-01T00:00:00.000Z',
    })

    expect(repository.listErrors).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: 'smtp',
      source: 'invoices.email',
      level: 'warning',
      since: '2026-01-01T00:00:00.000Z',
    })
    expect(page.data[0]).toMatchObject({
      level: 'warning',
      meta: { invoiceId: 'inv-1' },
      user: { email: 'ada@example.com' },
    })
  })

  it('returns error stats from the repository', async () => {
    const stats = { total: 5, today: 2, lastWeek: 4, errors: 3, warnings: 2 }
    vi.mocked(repository.countErrorStats).mockResolvedValue(stats)

    await expect(createLoggingService(repository).getErrorStats()).resolves.toEqual(stats)
  })

  it('deletes one error log and audits it', async () => {
    vi.mocked(repository.deleteErrors).mockResolvedValue(1)
    const service = createLoggingService(repository)

    await service.deleteError('err-1', actor)

    expect(repository.deleteErrors).toHaveBeenCalledWith(['err-1'])
    expect(repository.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'super-1', action: 'error_logs.delete', entityId: 'err-1' }),
    )
  })

  it('throws not found when the error log is missing', async () => {
    vi.mocked(repository.deleteErrors).mockResolvedValue(0)

    await expect(createLoggingService(repository).deleteError('err-x', actor)).rejects.toMatchObject(
      { status: 404 },
    )
    expect(repository.createActivity).not.toHaveBeenCalled()
  })

  it('deletes selected error logs once per id', async () => {
    vi.mocked(repository.deleteErrors).mockResolvedValue(2)
    const service = createLoggingService(repository)

    const result = await service.deleteErrors(['err-1', 'err-2', 'err-1'], actor)

    expect(result).toEqual({ deleted: 2 })
    expect(repository.deleteErrors).toHaveBeenCalledWith(['err-1', 'err-2'])
    expect(repository.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'error_logs.delete_many',
        meta: { requested: 2, deleted: 2 },
      }),
    )
  })

  it('clears every error log', async () => {
    vi.mocked(repository.deleteAllErrors).mockResolvedValue(7)

    await expect(createLoggingService(repository).clearErrors(actor)).resolves.toEqual({
      deleted: 7,
    })
    expect(repository.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'error_logs.clear', meta: { deleted: 7 } }),
    )
  })

  it('routes activity write failures to the injected reporter', async () => {
    const failure = new Error('db down')
    vi.mocked(repository.createActivity).mockRejectedValue(failure)
    const onActivityWriteFailure = vi.fn()
    const service = createLoggingService(repository, { onActivityWriteFailure })

    service.recordActivitySafe({ action: 'auth.login' })

    await vi.waitFor(() => {
      expect(onActivityWriteFailure).toHaveBeenCalledWith(failure, { action: 'auth.login' })
    })
  })
})
