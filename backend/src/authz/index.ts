/**
 * Authorization helpers — permission checks + resource ownership.
 *
 * - Route: `authenticate` then `requirePermission(...keys)` for vertical checks
 * - Service: `assertPermission` / `hasPermission` for action checks, plus
 *   `assertTaskRelated` / `isTaskStaff` / `assertCanManageRole` / `assertOwner` for scope
 * - Roles still decide scope (own / assigned tasks) and which portal a user lands in.
 */

export {
  assertCanManageRole,
  assertOwner,
  assertOwnerOrAdmin,
  assertSelfOrAdmin,
  assertSelfOrUserViewer,
  assertTaskRelated,
  type AuthActor,
  canManageRole,
  isOps,
  isTaskClient,
  isTaskStaff,
  isTaskTutor,
  type TaskParties,
} from './ownership.js'
export {
  LOCKOUT_GUARD,
  type PermissionKey,
  permissionKeysForRole,
  RBAC_PERMISSIONS,
  RBAC_ROLES,
} from './permission-catalog.js'
export {
  assertPermission,
  hasPermission,
  type PermissionHolder,
  type PermissionSource,
  type PermissionSubject,
  resolvePermissions,
  setPermissionSource,
  withLockoutGuard,
} from './permissions.js'
export {
  ADMIN_ROLES,
  CLIENT_ROLES,
  hasAnyRole,
  isAdmin,
  isClient,
  isStaff,
  isSuper,
  isTutor,
  isUserAdmin,
  STAFF_ROLES,
  SUPER_ROLES,
  TUTOR_ROLES,
  USER_ADMIN_ROLES,
} from './roles.js'
