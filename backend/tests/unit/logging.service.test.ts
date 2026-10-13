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
    requestId: 'req-1',
    userId: null,
    code: 'INTERNAL_ERROR',
    message: 'boom',
    stack: 'stack',
    path: '/api/v1/health',
    method: 'GET',
    status: 500,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('logging.service', () => {
  let repository: LoggingRepository

  beforeEach(() => {
    repository = {
      createActivity: vi.fn(),
      createError: vi.fn(),
      listActivity: vi.fn(),
      listErrors: vi.fn(),
    }
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

    expect(repository.listActivity).toHaveBeenCalledWith(2, 10)
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
      data: [{ id: 'err-1', message: 'boom', createdAt: '2026-01-01T00:00:00.000Z' }],
      meta: { page: 1, limit: 20, total: 4 },
    })
  })
})
