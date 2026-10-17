import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'

import { AppError } from './app-error.js'
import { ErrorCodes } from './error-codes.js'
import { reportError } from './report-error.js'

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError(ErrorCodes.NOT_FOUND, 'Route not found', 404))
}

type HttpClientError = { status: number; expose: boolean; type?: string; message: string }

/** body-parser / http-errors client failures (malformed JSON, too large, bad charset, …). */
function asHttpClientError(err: unknown): HttpClientError | null {
  if (typeof err !== 'object' || err === null) return null
  const candidate = err as Partial<HttpClientError>
  if (typeof candidate.status !== 'number' || candidate.expose !== true) return null
  if (candidate.status < 400 || candidate.status >= 500) return null
  return candidate as HttpClientError
}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const context = {
    requestId: req.requestId,
    userId: req.user?.id,
    path: req.originalUrl,
    method: req.method,
  }

  if (res.headersSent) {
    reportError(err, { source: 'http', status: res.statusCode, context })
    next(err)
    return
  }

  if (err instanceof AppError) {
    reportError(err, { source: 'http', status: err.status, context })
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

  const clientError = asHttpClientError(err)
  if (clientError) {
    const tooLarge = clientError.type === 'entity.too.large' || clientError.status === 413
    res.status(tooLarge ? 413 : 400).json({
      code: ErrorCodes.VALIDATION_ERROR,
      message: tooLarge
        ? 'Request body too large'
        : clientError.type === 'entity.parse.failed'
          ? 'Malformed request body'
          : clientError.message,
    })
    return
  }

  reportError(err, { source: 'http', status: 500, code: ErrorCodes.INTERNAL_ERROR, context })

  res.status(500).json({
    code: ErrorCodes.INTERNAL_ERROR,
    message: 'Internal server error',
  })
}
