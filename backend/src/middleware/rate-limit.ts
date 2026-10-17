import type { Request, RequestHandler } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

import type { AppConfig } from '../config/index.js'
import { createSupabaseRateLimitStore } from '../database/index.js'
import { ErrorCodes } from '../errors/error-codes.js'

const rateLimitHandler: RequestHandler = (_req, res) => {
  res.status(429).json({
    code: ErrorCodes.RATE_LIMITED,
    message: 'Too many requests',
  })
}

/**
 * General API limiter. In-memory per instance (a shared store would add a DB round-trip to every
 * request); the auth limiters below are the ones that must hold across instances.
 * Skipped in test so suites stay stable.
 */
export function createApiRateLimiter(config: AppConfig) {
  return rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) =>
      config.env === 'test' ||
      req.path === '/api/v1/health' ||
      req.path.startsWith('/api/v1/health/'),
    handler: rateLimitHandler,
  })
}

/** Stricter per-IP limiter for auth endpoints, shared across instances via Supabase. */
export function createAuthRateLimiter(config: AppConfig) {
  return rateLimit({
    windowMs: config.authRateLimitWindowMs,
    limit: config.authRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    store: createSupabaseRateLimitStore(config, 'auth-ip:'),
    passOnStoreError: true,
    skip: () => config.env === 'test',
    handler: rateLimitHandler,
  })
}

function emailKey(req: Request): string {
  const body: unknown = req.body
  const email =
    body && typeof body === 'object' && 'email' in body && typeof body.email === 'string'
      ? body.email.trim().toLowerCase()
      : ''
  return email ? `email:${email}` : `ip:${ipKeyGenerator(req.ip ?? '')}`
}

/**
 * Per-account limiter for login and password-reset endpoints, so guesses against one email are
 * capped no matter how many IPs they come from. Mount after body parsing.
 */
export function createAuthEmailRateLimiter(config: AppConfig) {
  return rateLimit({
    windowMs: config.authRateLimitWindowMs,
    limit: config.authEmailRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: emailKey,
    store: createSupabaseRateLimitStore(config, 'auth-email:'),
    passOnStoreError: true,
    skip: () => config.env === 'test',
    handler: rateLimitHandler,
  })
}
