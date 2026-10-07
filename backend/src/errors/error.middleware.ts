import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'

import { getLogger } from '../logging/index.js'
import { getLoggingService } from '../modules/logging/index.js'
import { AppError } from './app-error.js'
import { ErrorCodes } from './error-codes.js'

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError(ErrorCodes.NOT_FOUND, 'Route not found', 404))
}

function shouldPersistError(err: unknown, status: number): boolean {
  if (status >= 500) return true
  if (err instanceof AppError) return false
  if (err instanceof ZodError) return false
  return true
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const log = getLogger().child({ requestId: req.requestId })

  if (err instanceof AppError) {
    if (shouldPersistError(err, err.status)) {
      getLoggingService().recordErrorSafe({
        requestId: req.requestId ?? null,
        userId: req.user?.id ?? null,
        code: String(err.code),
        message: err.message,
        stack: err.stack ?? null,
        path: req.originalUrl,
        method: req.method,
        status: err.status,
      })
    }

    res.status(err.status).json({
      code: err.code,
      message: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    })
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Validation failed',
      details: err.flatten(),
    })
    return
  }

  // express.json / body-parser size limit
  if (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    (err as { type?: string }).type === 'entity.too.large'
  ) {
    res.status(413).json({
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Request body too large',
    })
    return
  }

  log.error({ err }, 'unhandled error')

  const message = err instanceof Error ? err.message : 'Internal server error'
  const stack = err instanceof Error ? err.stack : undefined

  getLoggingService().recordErrorSafe({
    requestId: req.requestId ?? null,
    userId: req.user?.id ?? null,
    code: ErrorCodes.INTERNAL_ERROR,
    message,
    stack: stack ?? null,
    path: req.originalUrl,
    method: req.method,
    status: 500,
  })

  res.status(500).json({
    code: ErrorCodes.INTERNAL_ERROR,
    message: 'Internal server error',
  })
}
