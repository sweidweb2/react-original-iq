import type { RequestHandler } from 'express'

import type { PermissionKey } from '../authz/permission-catalog.js'
import { hasPermission } from '../authz/permissions.js'
import { hasAnyRole } from '../authz/roles.js'
import { forbidden, unauthorized } from '../errors/app-error.js'
import type { RoleName } from '../modules/auth/auth.schema.js'

/**
 * Role gate. Prefer `requirePermission`; keep this for checks that are about identity
 * rather than capability (e.g. maintenance bypass).
 */
export function authorize(...allowedRoles: RoleName[]): RequestHandler {
  return (req, _res, next) => {
    if (allowedRoles.length === 0) {
      next()
      return
    }

    if (!req.user) {
      next(unauthorized())
      return
    }

    if (!hasAnyRole(req.user.roles, allowedRoles)) {
      next(forbidden())
      return
    }

    next()
  }
}

/** Permission gate (vertical authz): passes when the user has any of `keys`. Default deny. */
export function requirePermission(...keys: [PermissionKey, ...PermissionKey[]]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(unauthorized())
      return
    }

    if (!hasPermission(req.user, ...keys)) {
      next(forbidden())
      return
    }

    next()
  }
}
