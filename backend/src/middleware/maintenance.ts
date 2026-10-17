import type { RequestHandler } from 'express'

import { isSuper } from '../authz/roles.js'
import { type AppConfig, loadConfig } from '../config/index.js'
import { maintenanceError } from '../errors/app-error.js'
import { verifyAccessToken } from '../modules/auth/auth.tokens.js'

const RETRY_AFTER_SECONDS = 300

/**
 * Reachable while maintenance is on. Login and refresh stay open so SUPER can get in;
 * the auth service rejects everyone else.
 */
const ALLOWED: ReadonlyArray<{ method: string; path: RegExp }> = [
  { method: 'GET', path: /^\/health(\/.*)?$/ },
  { method: 'GET', path: /^\/settings\/status\/?$/ },
  { method: 'POST', path: /^\/auth\/(login|refresh|logout)\/?$/ },
]

function isAllowed(method: string, path: string): boolean {
  return ALLOWED.some((rule) => rule.method === method && rule.path.test(path))
}

function bearerIsSuper(config: AppConfig, header: string | undefined): boolean {
  if (!header?.startsWith('Bearer ')) return false
  const token = header.slice('Bearer '.length).trim()
  if (!token) return false
  try {
    return isSuper([verifyAccessToken(config, token).role])
  } catch {
    return false
  }
}

export type MaintenanceGuardDeps = {
  isMaintenance: () => Promise<boolean>
  config?: AppConfig
}

/** While maintenance is on, every API call except the allowlist needs a SUPER access token. */
export function createMaintenanceGuard(deps: MaintenanceGuardDeps): RequestHandler {
  return (req, res, next) => {
    deps
      .isMaintenance()
      .then((enabled) => {
        if (!enabled || isAllowed(req.method, req.path)) {
          next()
          return
        }
        if (bearerIsSuper(deps.config ?? loadConfig(), req.headers.authorization)) {
          next()
          return
        }
        res.setHeader('Retry-After', String(RETRY_AFTER_SECONDS))
        next(maintenanceError())
      })
      .catch(next)
  }
}
