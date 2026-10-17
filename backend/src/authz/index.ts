/**
 * Authorization helpers — role gates + resource ownership.
 * Not a permission-matrix RBAC system: no `resource:action` ACL strings.
 *
 * - Route: `authenticate` then `authorize(...roles)` for vertical (role) checks
 * - Service: `assertOwner` / `assertOwnerOrAdmin` / `assertSelfOrAdmin` for horizontal checks
 */

export {
  assertOwner,
  assertOwnerOrAdmin,
  assertSelfOrAdmin,
  assertSelfOrOps,
  assertTaskRelated,
  type AuthActor,
  isOps,
  type TaskParties,
} from './ownership.js'
export {
  ADMIN_ROLES,
  CLIENT_ROLES,
  hasAnyRole,
  isAdmin,
  isClient,
  isStaff,
  isSuper,
  isTutor,
  STAFF_ROLES,
  SUPER_ROLES,
  TUTOR_ROLES,
} from './roles.js'
