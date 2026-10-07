import pino, { type Logger } from 'pino'

import { loadConfig } from '../config/index.js'

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'password',
  'refreshToken',
  'accessToken',
  'token',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'MAIL_PASSWORD',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_ACCESS_KEY_ID',
  'MONTYPAY_MERCHANT_PASSWORD',
  'MONTYPAY_CALLBACK_SECRET',
  'GEMINI_API_KEY',
  'HUGGINGFACE_API_KEY',
  '*.password',
  '*.refreshToken',
  '*.accessToken',
  '*.token',
]

let rootLogger: Logger | null = null

/**
 * Shared Pino logger — stdout JSON. Never log secrets (see redact paths).
 */
export function getLogger(): Logger {
  if (!rootLogger) {
    const config = loadConfig()
    rootLogger = pino({
      level: config.logLevel,
      base: { service: 'original-iq-api' },
      redact: {
        paths: REDACT_PATHS,
        remove: true,
      },
    })
  }
  return rootLogger
}

export function createChildLogger(bindings: Record<string, unknown>): Logger {
  return getLogger().child(bindings)
}

/** Test helper — reset singleton between suites if needed. */
export function resetLoggerForTests(): void {
  rootLogger = null
}
