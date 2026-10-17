import type { AuthRole } from '@/services/auth'

import {
  permissionKeysForRole,
  RBAC_PERMISSIONS,
} from '../../../backend/src/authz/permission-catalog'

/** Default permissions the backend seeds for `role` (source: the backend catalog). */
export function permissionsFor(role: AuthRole): string[] {
  return permissionKeysForRole(role)
}

export const CATALOG_PERMISSION_KEYS: string[] = RBAC_PERMISSIONS.map(
  (permission) => permission.key,
)
