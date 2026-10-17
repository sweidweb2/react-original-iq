import { describe, expect, it, vi } from 'vitest'

import { permissionKeysForRole } from '../../src/authz/index.js'
import { createPermissionResolver } from '../../src/modules/rbac/rbac.permissions.js'

function fakeRepository(roles: Record<string, string[]>, users: Record<string, string[]> = {}) {
  return {
    findRolePermissionKeys: vi.fn(async (role: string) => roles[role] ?? null),
    listUserPermissionKeys: vi.fn(async (userId: string) => users[userId] ?? []),
  }
}

describe('permission resolver', () => {
  it('merges role and direct user grants', async () => {
    const resolver = createPermissionResolver(
      fakeRepository({ tutor: ['submit_work'] }, { u1: ['manage_leads'] }),
    )
    expect(await resolver.resolve({ id: 'u1', role: 'tutor' })).toEqual([
      'submit_work',
      'manage_leads',
    ])
  })

  it('falls back to catalog defaults when the role has no row', async () => {
    const resolver = createPermissionResolver(fakeRepository({}))
    expect(await resolver.resolve({ id: 'u1', role: 'client' })).toEqual(
      permissionKeysForRole('client'),
    )
  })

  it('treats an existing empty role as no permissions, but never locks super out of RBAC', async () => {
    const resolver = createPermissionResolver(fakeRepository({ admin: [], super: [] }))
    expect(await resolver.resolve({ id: 'a', role: 'admin' })).toEqual([])
    expect(await resolver.resolve({ id: 's', role: 'super' })).toEqual(['manage_rbac'])
  })

  it('caches lookups until the TTL passes or the cache is invalidated', async () => {
    let now = 0
    const repository = fakeRepository({ tutor: ['submit_work'] })
    const resolver = createPermissionResolver(repository, { ttlMs: 1000, now: () => now })

    await resolver.resolve({ id: 'u1', role: 'tutor' })
    await resolver.resolve({ id: 'u1', role: 'tutor' })
    expect(repository.findRolePermissionKeys).toHaveBeenCalledTimes(1)

    now = 1500
    await resolver.resolve({ id: 'u1', role: 'tutor' })
    expect(repository.findRolePermissionKeys).toHaveBeenCalledTimes(2)

    resolver.invalidate()
    await resolver.resolve({ id: 'u1', role: 'tutor' })
    expect(repository.findRolePermissionKeys).toHaveBeenCalledTimes(3)
  })

  it('does not cache failed lookups', async () => {
    const repository = fakeRepository({ tutor: ['submit_work'] })
    repository.findRolePermissionKeys.mockRejectedValueOnce(new Error('db down'))
    const resolver = createPermissionResolver(repository)

    await expect(resolver.resolve({ id: 'u1', role: 'tutor' })).rejects.toThrow('db down')
    expect(await resolver.resolve({ id: 'u1', role: 'tutor' })).toEqual(['submit_work'])
  })
})
