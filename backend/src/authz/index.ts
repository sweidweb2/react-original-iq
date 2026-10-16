/**
 * Authorization helpers — role gates + resource ownership.
 * Not a permission-matrix RBAC system: no `resource:action` ACL strings.
 *
 * - Route: `authenticate` then `authorize(...roles)` for vertical (role) checks
 * - Service: `assertOwner` / `assertOwnerOrAdmin` / `assertSelfOrAdmin` for horizontal checks
 */

export { assertOwner, assertOwnerOrAdmin, assertSelfOrAdmin, type AuthActor } from './ownership.js'
export {
  ADMIN_ROLES,
  hasAnyRole,
  isAdmin,
  isStaff,
  isSuper,
  STAFF_ROLES,
  SUPER_ROLES,
} from './roles.js'
