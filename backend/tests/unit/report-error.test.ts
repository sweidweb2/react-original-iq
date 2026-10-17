import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { AppError, internalError, notFound, validationError } from '../../src/errors/app-error.js'
import { isExpectedError, reportError } from '../../src/errors/report-error.js'
import { requestContext, setRequestUserId } from '../../src/middleware/request-context.js'

const { recordErrorSafe, logError, logWarn } = vi.hoisted(() => ({
  recordErrorSafe: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}))

vi.mock('../../src/modules/logging/index.js', () => ({
  getLoggingService: () => ({ recordErrorSafe }),
}))

vi.mock('../../src/logging/index.js', () => ({
  getLogger: () => ({ error: logError, warn: logWarn }),
}))

describe('reportError', () => {
  beforeEach(() => {
    recordErrorSafe.mockReset()
    logError.mockReset()
    logWarn.mockReset()
  })

  it('ignores handled business failures', () => {
    const zodError = z.object({ name: z.string() }).safeParse({}).error

    reportError(notFound('Task not found'), { source: 'test' })
    reportError(validationError('bad'), { source: 'test' })
    reportError(zodError, { source: 'test' })

    expect(recordErrorSafe).not.toHaveBeenCalled()
    expect(logError).not.toHaveBeenCalled()
    expect(isExpectedError(new AppError('X', 'x', 409))).toBe(true)
    expect(isExpectedError(internalError())).toBe(false)
  })

  it('records unexpected errors with source, level, code, and stack', () => {
    const error = Object.assign(new Error('relation "x" does not exist'), {
      code: '42P01',
      hint: 'check migrations',
    })

    reportError(error, { source: 'tasks.list', meta: { taskId: 't-1' } })

    expect(recordErrorSafe).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'tasks.list',
        level: 'error',
        code: '42P01',
        message: 'relation "x" does not exist',
        stack: expect.stringContaining('relation "x" does not exist'),
        meta: { hint: 'check migrations', taskId: 't-1' },
        requestId: null,
        userId: null,
      }),
    )
    expect(logError).toHaveBeenCalledTimes(1)
  })

  it('records 5xx AppErrors and non-Error values', () => {
    reportError(internalError('db down'), { source: 'http', status: 500 })
    reportError('plain string', { source: 'process.unhandledRejection' })

    expect(recordErrorSafe).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ code: 'INTERNAL_ERROR', message: 'db down', status: 500 }),
    )
    expect(recordErrorSafe).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ message: 'plain string', stack: null, code: null }),
    )
  })

  it('logs warnings at warn level and redacts secret-looking meta keys', () => {
    reportError(new Error('cleanup failed'), {
      source: 'storage.delete',
      level: 'warning',
      meta: { key: 'tasks/a.pdf', accessToken: 'abc', nested: { password: 'p', ok: 1 } },
    })

    expect(logWarn).toHaveBeenCalledTimes(1)
    expect(logError).not.toHaveBeenCalled()
    expect(recordErrorSafe).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warning',
        meta: {
          key: 'tasks/a.pdf',
          accessToken: '[redacted]',
          nested: { password: '[redacted]', ok: 1 },
        },
      }),
    )
  })

  it('picks up the request scope from deep inside a handler', async () => {
    const app = express()
    app.use(requestContext)
    app.get('/boom', async (_req, res) => {
      setRequestUserId('user-9')
      await new Promise((resolve) => setTimeout(resolve, 1))
      reportError(new Error('deep failure'), { source: 'deep.service' })
      res.status(204).end()
    })

    await request(app).get('/boom?x=1').set('x-request-id', 'req-42').expect(204)

    expect(recordErrorSafe).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-42',
        userId: 'user-9',
        method: 'GET',
        path: '/boom?x=1',
      }),
    )
  })

  it('never throws, even when recording fails', () => {
    recordErrorSafe.mockImplementation(() => {
      throw new Error('logging broken')
    })

    expect(() => reportError(new Error('boom'), { source: 'test' })).not.toThrow()
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'test' }),
      'reportError failed',
    )
  })
})
