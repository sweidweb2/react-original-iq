import { forbidden } from '../errors/app-error.js'
import { LOCKOUT_GUARD, type PermissionKey, permissionKeysForRole } from './permission-catalog.js'

export type PermissionSubject = {
  id: string
  role: string
}

/** Effective permission keys for a user: role grants plus direct user grants. */
export type PermissionSource = (subject: PermissionSubject) => Promise<readonly string[]>

export type PermissionHolder = {
  roles: readonly string[]
  /** Resolved at authentication. When absent, the catalog defaults for `roles` apply. */
  permissions?: readonly string[]
}

function catalogDefaults(role: string): string[] {
  return withLockoutGuard(role, permissionKeysForRole(role))
}

let source: PermissionSource = async ({ role }) => catalogDefaults(role)

/** Swap the permission source (wired to the RBAC tables in `createV1Router`). */
export function setPermissionSource(next: PermissionSource): void {
  source = next
}

export function resolvePermissions(subject: PermissionSubject): Promise<readonly string[]> {
  return source(subject)
}

export function withLockoutGuard(role: string, keys: readonly string[]): string[] {
  const guarded = LOCKOUT_GUARD[role as keyof typeof LOCKOUT_GUARD] ?? []
  return [...new Set([...keys, ...guarded])]
}

function permissionsOf(holder: PermissionHolder): readonly string[] {
  return holder.permissions ?? holder.roles.flatMap(catalogDefaults)
}

/** True when the holder has at least one of `keys`. */
export function hasPermission(holder: PermissionHolder, ...keys: PermissionKey[]): boolean {
  const granted = permissionsOf(holder)
  return keys.some((key) => granted.includes(key))
}

export function assertPermission(
  holder: PermissionHolder,
  key: PermissionKey,
  message = 'You do not have permission to perform this action',
): void {
  if (!hasPermission(holder, key)) {
    throw forbidden(message)
  }
}
