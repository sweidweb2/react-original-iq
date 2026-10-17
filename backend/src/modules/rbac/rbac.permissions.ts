import {
  permissionKeysForRole,
  type PermissionSubject,
  withLockoutGuard,
} from '../../authz/index.js'
import type { RbacRepository } from './rbac.repository.js'

/** Per-instance cache; edits on another instance show up after at most this long. */
const DEFAULT_TTL_MS = 30_000

export type PermissionResolver = {
  /** Role grants (catalog defaults when the role has no row) plus direct user grants. */
  resolve: (subject: PermissionSubject) => Promise<readonly string[]>
  invalidate: () => void
}

type Entry<T> = { value: Promise<T>; expiresAt: number }

export function createPermissionResolver(
  repository: Pick<RbacRepository, 'findRolePermissionKeys' | 'listUserPermissionKeys'>,
  options: { ttlMs?: number; now?: () => number } = {},
): PermissionResolver {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
  const now = options.now ?? Date.now
  const roles = new Map<string, Entry<string[]>>()
  const users = new Map<string, Entry<string[]>>()

  function cached(cache: Map<string, Entry<string[]>>, key: string, load: () => Promise<string[]>) {
    const hit = cache.get(key)
    if (hit && hit.expiresAt > now()) return hit.value
    const value = load()
    cache.set(key, { value, expiresAt: now() + ttlMs })
    value.catch(() => cache.delete(key))
    return value
  }

  return {
    async resolve({ id, role }) {
      const [roleKeys, userKeys] = await Promise.all([
        cached(roles, role, async () => {
          const keys = await repository.findRolePermissionKeys(role)
          return keys ?? permissionKeysForRole(role)
        }),
        cached(users, id, () => repository.listUserPermissionKeys(id)),
      ])
      return withLockoutGuard(role, [...roleKeys, ...userKeys])
    },

    invalidate() {
      roles.clear()
      users.clear()
    },
  }
}
