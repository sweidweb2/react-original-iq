import type { IncomingMessage, ServerResponse } from 'node:http'
import type { RequestHandler } from 'express'
import type { Options } from 'pino-http'
import pinoHttpImport from 'pino-http'

import { getLogger } from '../logging/index.js'

type PinoHttpFn = (
  opts?: Options<IncomingMessage, ServerResponse>,
) => RequestHandler

const pinoHttp = resolvePinoHttp(pinoHttpImport)

function resolvePinoHttp(mod: unknown): PinoHttpFn {
  if (typeof mod === 'function') {
    return mod as PinoHttpFn
  }
  if (mod && typeof mod === 'object') {
    const record = mod as { default?: unknown; pinoHttp?: unknown }
    if (typeof record.default === 'function') {
      return record.default as PinoHttpFn
    }
    if (typeof record.pinoHttp === 'function') {
      return record.pinoHttp as PinoHttpFn
    }
  }
  throw new Error('Unable to load pino-http')
}

const HEALTH_PATH_PREFIX = '/api/v1/health'

function isHealthPath(url: string | undefined): boolean {
  if (!url) return false
  const path = url.split('?')[0] ?? url
  return path === HEALTH_PATH_PREFIX || path.startsWith(`${HEALTH_PATH_PREFIX}/`)
}

/**
 * HTTP access logs → same Pino stdout stream. Skips health probes.
 */
export function createRequestLogger(): RequestHandler {
  return pinoHttp({
    logger: getLogger(),
    autoLogging: {
      ignore: (req) => isHealthPath(req.url) || isHealthPath((req as { originalUrl?: string }).originalUrl),
    },
    customProps: (req) => ({
      requestId: (req as { requestId?: string }).requestId,
      userId: (req as { user?: { id?: string } }).user?.id,
    }),
    customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
    customErrorMessage: (req, res, err) =>
      `${req.method} ${req.url} ${res.statusCode} — ${err.message}`,
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url,
        }
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        }
      },
    },
  })
}
