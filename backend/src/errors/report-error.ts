import { ZodError } from 'zod'

import { getLogger } from '../logging/index.js'
import { getRequestScope, type RequestScope } from '../middleware/request-context.js'
import { getLoggingService } from '../modules/logging/index.js'
import type { ErrorLevel } from '../modules/logging/logging.types.js'
import { AppError } from './app-error.js'
import { ErrorCodes } from './error-codes.js'

export type ReportErrorOptions = {
  /** Where it failed, e.g. `http`, `invoices.issue`, `process.unhandledRejection`. */
  source: string
  level?: ErrorLevel
  status?: number
  /** Fallback code when the error itself carries none. */
  code?: string
  meta?: Record<string, unknown>
  /** Overrides the async request scope (the error middleware passes `req` values). */
  context?: Partial<RequestScope>
}

const REDACTED = '[redacted]'
const SENSITIVE_KEY = /pass(word)?|secret|token|authorization|cookie|api[-_]?key|private[-_]?key/i
const MAX_META_DEPTH = 4
const MAX_META_STRING = 2000
const MAX_META_ARRAY = 50

/** Handled business failures (4xx `AppError`, validation, maintenance rejections) are not incidents. */
export function isExpectedError(error: unknown): boolean {
  if (error instanceof ZodError) return true
  if (error instanceof AppError) {
    return error.status < 500 || error.code === ErrorCodes.MAINTENANCE_MODE
  }
  return false
}

type DescribedError = {
  name: string | null
  message: string
  stack: string | null
  code: string | null
  extra: Record<string, unknown>
}

function stringField(value: unknown, key: string): string | null {
  if (!value || typeof value !== 'object' || !(key in value)) return null
  const field = (value as Record<string, unknown>)[key]
  if (typeof field === 'string' && field.length > 0) return field
  if (typeof field === 'number') return String(field)
  return null
}

function describeError(error: unknown): DescribedError {
  if (error === null || error === undefined || typeof error !== 'object') {
    return { name: null, message: String(error), stack: null, code: null, extra: {} }
  }

  const extra: Record<string, unknown> = {}
  const details = stringField(error, 'details')
  const hint = stringField(error, 'hint')
  if (details) extra.details = details
  if (hint) extra.hint = hint
  if (error instanceof AppError && error.details !== undefined) extra.details = error.details

  const cause = (error as { cause?: unknown }).cause
  if (cause !== undefined) {
    extra.cause =
      cause instanceof Error
        ? { name: cause.name, message: cause.message }
        : String(stringField(cause, 'message') ?? cause)
  }

  const message =
    stringField(error, 'message') ?? (error instanceof Error ? error.name : 'Unknown error')

  return {
    name: error instanceof Error ? error.name : stringField(error, 'name'),
    message,
    stack: error instanceof Error ? (error.stack ?? null) : null,
    code: stringField(error, 'code'),
    extra,
  }
}

function sanitize(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return value ?? null
  if (typeof value === 'string') {
    return value.length > MAX_META_STRING ? `${value.slice(0, MAX_META_STRING)}…` : value
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (value instanceof Error) return { name: value.name, message: value.message }
  if (Buffer.isBuffer(value)) return `[Buffer ${value.length} bytes]`
  if (depth >= MAX_META_DEPTH) return '[truncated]'
  if (Array.isArray(value)) {
    return value.slice(0, MAX_META_ARRAY).map((item) => sanitize(item, depth + 1))
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      out[key] = SENSITIVE_KEY.test(key) ? REDACTED : sanitize(item, depth + 1)
    }
    return out
  }
  return String(value)
}

/**
 * Record an unexpected failure (stdout + `error_logs`, visible in the super portal).
 * Safe to call from any catch block: expected errors are ignored and it never throws.
 */
export function reportError(error: unknown, options: ReportErrorOptions): void {
  try {
    if (isExpectedError(error)) return

    const scope: Partial<RequestScope> = { ...getRequestScope() }
    for (const [key, value] of Object.entries(options.context ?? {})) {
      if (value !== undefined) Object.assign(scope, { [key]: value })
    }
    const described = describeError(error)
    const level = options.level ?? 'error'
    const meta = sanitize(
      {
        ...(described.name && described.name !== 'Error' ? { errorName: described.name } : {}),
        ...described.extra,
        ...options.meta,
      },
      0,
    ) as Record<string, unknown>
    const hasMeta = Object.keys(meta).length > 0

    const logPayload = {
      err: error,
      source: options.source,
      requestId: scope.requestId,
      userId: scope.userId,
      ...(hasMeta ? { meta } : {}),
    }
    if (level === 'warning') {
      getLogger().warn(logPayload, `[${options.source}] ${described.message}`)
    } else {
      getLogger().error(logPayload, `[${options.source}] ${described.message}`)
    }

    getLoggingService().recordErrorSafe({
      source: options.source,
      level,
      requestId: scope.requestId ?? null,
      userId: scope.userId ?? null,
      code: described.code ?? options.code ?? null,
      message: described.message,
      stack: described.stack,
      path: scope.path ?? null,
      method: scope.method ?? null,
      status: options.status ?? null,
      meta: hasMeta ? meta : null,
    })
  } catch (failure) {
    try {
      getLogger().error({ err: failure, source: options.source }, 'reportError failed')
    } catch {
      // Logging itself is broken; nothing left to report to.
    }
  }
}
