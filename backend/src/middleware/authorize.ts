import type { RequestHandler } from 'express'

import { hasAnyRole } from '../authz/roles.js'
import { forbidden, unauthorized } from '../errors/app-error.js'
import type { RoleName } from '../modules/auth/auth.schema.js'

/**
 * Role gate (vertical authz). Default deny when authenticated but role mismatches.
 * Not permission-matrix RBAC — pass explicit roles only (e.g. `authorize('SUPER')`).
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
