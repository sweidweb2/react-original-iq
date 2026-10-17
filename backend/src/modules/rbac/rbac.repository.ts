import { randomUUID } from 'node:crypto'

import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin } from '../../database/index.js'
import type {
  CreatePermissionInput,
  CreateRoleInput,
  RbacPermission,
  RbacRole,
  UpdatePermissionInput,
  UpdateRoleInput,
} from './rbac.types.js'

export type RbacRepository = {
  listRoles: () => Promise<RbacRole[]>
  findRoleById: (id: string) => Promise<RbacRole | null>
  createRole: (input: CreateRoleInput) => Promise<RbacRole>
  updateRole: (id: string, input: UpdateRoleInput) => Promise<RbacRole | null>
  deleteRole: (id: string) => Promise<boolean>
  setRolePermissions: (roleId: string, permissionIds: string[]) => Promise<RbacRole | null>
  listPermissions: () => Promise<RbacPermission[]>
  findPermissionById: (id: string) => Promise<RbacPermission | null>
  createPermission: (input: CreatePermissionInput) => Promise<RbacPermission>
  updatePermission: (id: string, input: UpdatePermissionInput) => Promise<RbacPermission | null>
  deletePermission: (id: string) => Promise<boolean>
  listUserPermissionIds: (userId: string) => Promise<string[]>
  setUserPermissions: (userId: string, permissionIds: string[]) => Promise<string[]>
  permissionIdsExist: (ids: string[]) => Promise<boolean>
  /** Permission keys granted to a role, or `null` when no role row has that key. */
  findRolePermissionKeys: (roleKey: string) => Promise<string[] | null>
  listUserPermissionKeys: (userId: string) => Promise<string[]>
}

type RoleRow = {
  id: string
  key: string
  name: string
  description: string | null
  is_system: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

type PermissionRow = {
  id: string
  key: string
  name: string
  description: string | null
  category: string
  created_at: string
  updated_at: string
}

const ROLE_COLUMNS = 'id, key, name, description, is_system, sort_order, created_at, updated_at'
const PERMISSION_COLUMNS = 'id, key, name, description, category, created_at, updated_at'

function toPermission(row: PermissionRow): RbacPermission {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toRole(row: RoleRow, permissionIds: string[]): RbacRole {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    isSystem: row.is_system,
    sortOrder: row.sort_order,
    permissionIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

type MemoryState = {
  roles: Map<string, RoleRow>
  permissions: Map<string, PermissionRow>
  rolePermissions: Map<string, Set<string>>
  userPermissions: Map<string, Set<string>>
}

const memory: MemoryState = {
  roles: new Map(),
  permissions: new Map(),
  rolePermissions: new Map(),
  userPermissions: new Map(),
}

/** Clear in-memory RBAC store (tests only). */
export function resetRbacRepositoryForTests(): void {
  memory.roles.clear()
  memory.permissions.clear()
  memory.rolePermissions.clear()
  memory.userPermissions.clear()
}

function createMemoryRbacRepository(): RbacRepository {
  function roleFrom(id: string): RbacRole | null {
    const row = memory.roles.get(id)
    if (!row) return null
    return toRole(row, [...(memory.rolePermissions.get(id) ?? [])])
  }

  return {
    async listRoles() {
      return [...memory.roles.values()]
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
        .map((row) => toRole(row, [...(memory.rolePermissions.get(row.id) ?? [])]))
    },

    async findRoleById(id) {
      return roleFrom(id)
    },

    async createRole(input) {
      for (const existing of memory.roles.values()) {
        if (existing.key === input.key) {
          throw Object.assign(new Error('duplicate key'), { code: '23505' })
        }
      }
      const now = new Date().toISOString()
      const row: RoleRow = {
        id: randomUUID(),
        key: input.key,
        name: input.name,
        description: input.description ?? null,
        is_system: false,
        sort_order: input.sortOrder ?? 100,
        created_at: now,
        updated_at: now,
      }
      memory.roles.set(row.id, row)
      memory.rolePermissions.set(row.id, new Set())
      return toRole(row, [])
    },

    async updateRole(id, input) {
      const current = memory.roles.get(id)
      if (!current) return null
      const updated: RoleRow = {
        ...current,
        name: input.name ?? current.name,
        description: input.description !== undefined ? input.description : current.description,
        sort_order: input.sortOrder ?? current.sort_order,
        updated_at: new Date().toISOString(),
      }
      memory.roles.set(id, updated)
      return roleFrom(id)
    },

    async deleteRole(id) {
      const role = memory.roles.get(id)
      if (!role || role.is_system) return false
      memory.roles.delete(id)
      memory.rolePermissions.delete(id)
      return true
    },

    async setRolePermissions(roleId, permissionIds) {
      if (!memory.roles.has(roleId)) return null
      memory.rolePermissions.set(roleId, new Set(permissionIds))
      return roleFrom(roleId)
    },

    async listPermissions() {
      return [...memory.permissions.values()]
        .sort((a, b) => a.category.localeCompare(b.category) || a.key.localeCompare(b.key))
        .map(toPermission)
    },

    async findPermissionById(id) {
      const row = memory.permissions.get(id)
      return row ? toPermission(row) : null
    },

    async createPermission(input) {
      for (const existing of memory.permissions.values()) {
        if (existing.key === input.key) {
          throw Object.assign(new Error('duplicate key'), { code: '23505' })
        }
      }
      const now = new Date().toISOString()
      const row: PermissionRow = {
        id: randomUUID(),
        key: input.key,
        name: input.name,
        description: input.description ?? null,
        category: input.category ?? 'general',
        created_at: now,
        updated_at: now,
      }
      memory.permissions.set(row.id, row)
      return toPermission(row)
    },

    async updatePermission(id, input) {
      const current = memory.permissions.get(id)
      if (!current) return null
      const updated: PermissionRow = {
        ...current,
        name: input.name ?? current.name,
        description: input.description !== undefined ? input.description : current.description,
        category: input.category ?? current.category,
        updated_at: new Date().toISOString(),
      }
      memory.permissions.set(id, updated)
      return toPermission(updated)
    },

    async deletePermission(id) {
      if (!memory.permissions.has(id)) return false
      memory.permissions.delete(id)
      for (const set of memory.rolePermissions.values()) set.delete(id)
      for (const set of memory.userPermissions.values()) set.delete(id)
      return true
    },

    async listUserPermissionIds(userId) {
      return [...(memory.userPermissions.get(userId) ?? [])]
    },

    async setUserPermissions(userId, permissionIds) {
      memory.userPermissions.set(userId, new Set(permissionIds))
      return [...permissionIds]
    },

    async permissionIdsExist(ids) {
      return ids.every((id) => memory.permissions.has(id))
    },

    async findRolePermissionKeys(roleKey) {
      const role = [...memory.roles.values()].find((row) => row.key === roleKey)
      if (!role) return null
      return keysFor(memory.rolePermissions.get(role.id))
    },

    async listUserPermissionKeys(userId) {
      return keysFor(memory.userPermissions.get(userId))
    },
  }
}

function keysFor(permissionIds: Set<string> | undefined): string[] {
  return [...(permissionIds ?? [])].flatMap((id) => {
    const row = memory.permissions.get(id)
    return row ? [row.key] : []
  })
}

function createSupabaseRbacRepository(config: AppConfig): RbacRepository {
  const supabase = getSupabaseAdmin(config)
  if (!supabase) {
    throw new Error('Supabase admin client is not available')
  }
  // Local const keeps a non-null type inside nested helpers.
  const client = supabase

  async function loadRolePermissionMap(roleIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>()
    for (const id of roleIds) map.set(id, [])
    if (roleIds.length === 0) return map

    const { data, error } = await client
      .from('role_permissions')
      .select('role_id, permission_id')
      .in('role_id', roleIds)

    if (error) throw error
    for (const row of data as { role_id: string; permission_id: string }[]) {
      map.get(row.role_id)?.push(row.permission_id)
    }
    return map
  }

  async function findRoleById(id: string): Promise<RbacRole | null> {
    const { data, error } = await client
      .from('roles')
      .select(ROLE_COLUMNS)
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!data) return null
    const map = await loadRolePermissionMap([id])
    return toRole(data as RoleRow, map.get(id) ?? [])
  }

  return {
    async listRoles() {
      const { data, error } = await client
        .from('roles')
        .select(ROLE_COLUMNS)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      const rows = data as RoleRow[]
      const map = await loadRolePermissionMap(rows.map((r) => r.id))
      return rows.map((row) => toRole(row, map.get(row.id) ?? []))
    },

    findRoleById,

    async createRole(input) {
      const { data, error } = await client
        .from('roles')
        .insert({
          key: input.key,
          name: input.name,
          description: input.description ?? null,
          is_system: false,
          sort_order: input.sortOrder ?? 100,
        })
        .select(ROLE_COLUMNS)
        .single()

      if (error) throw error
      return toRole(data as RoleRow, [])
    },

    async updateRole(id, input) {
      const patch: Record<string, unknown> = {}
      if (input.name !== undefined) patch.name = input.name
      if (input.description !== undefined) patch.description = input.description
      if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder

      const { data, error } = await client
        .from('roles')
        .update(patch)
        .eq('id', id)
        .select(ROLE_COLUMNS)
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      const map = await loadRolePermissionMap([id])
      return toRole(data as RoleRow, map.get(id) ?? [])
    },

    async deleteRole(id) {
      const existing = await findRoleById(id)
      if (!existing || existing.isSystem) return false

      const { error } = await client.from('roles').delete().eq('id', id)
      if (error) throw error
      return true
    },

    async setRolePermissions(roleId, permissionIds) {
      const existing = await findRoleById(roleId)
      if (!existing) return null

      const { error: delError } = await client
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)
      if (delError) throw delError

      if (permissionIds.length > 0) {
        const { error: insError } = await client.from('role_permissions').insert(
          permissionIds.map((permissionId) => ({
            role_id: roleId,
            permission_id: permissionId,
          })),
        )
        if (insError) throw insError
      }

      return findRoleById(roleId)
    },

    async listPermissions() {
      const { data, error } = await client
        .from('permissions')
        .select(PERMISSION_COLUMNS)
        .order('category', { ascending: true })
        .order('key', { ascending: true })

      if (error) throw error
      return (data as PermissionRow[]).map(toPermission)
    },

    async findPermissionById(id) {
      const { data, error } = await client
        .from('permissions')
        .select(PERMISSION_COLUMNS)
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      return data ? toPermission(data as PermissionRow) : null
    },

    async createPermission(input) {
      const { data, error } = await client
        .from('permissions')
        .insert({
          key: input.key,
          name: input.name,
          description: input.description ?? null,
          category: input.category ?? 'general',
        })
        .select(PERMISSION_COLUMNS)
        .single()

      if (error) throw error
      return toPermission(data as PermissionRow)
    },

    async updatePermission(id, input) {
      const patch: Record<string, unknown> = {}
      if (input.name !== undefined) patch.name = input.name
      if (input.description !== undefined) patch.description = input.description
      if (input.category !== undefined) patch.category = input.category

      const { data, error } = await client
        .from('permissions')
        .update(patch)
        .eq('id', id)
        .select(PERMISSION_COLUMNS)
        .maybeSingle()

      if (error) throw error
      return data ? toPermission(data as PermissionRow) : null
    },

    async deletePermission(id) {
      const { data, error } = await client
        .from('permissions')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle()

      if (error) throw error
      return Boolean(data)
    },

    async listUserPermissionIds(userId) {
      const { data, error } = await client
        .from('user_permissions')
        .select('permission_id')
        .eq('user_id', userId)

      if (error) throw error
      return (data as { permission_id: string }[]).map((row) => row.permission_id)
    },

    async setUserPermissions(userId, permissionIds) {
      const { error: delError } = await client
        .from('user_permissions')
        .delete()
        .eq('user_id', userId)
      if (delError) throw delError

      if (permissionIds.length > 0) {
        const { error: insError } = await client.from('user_permissions').insert(
          permissionIds.map((permissionId) => ({
            user_id: userId,
            permission_id: permissionId,
          })),
        )
        if (insError) throw insError
      }

      return permissionIds
    },

    async permissionIdsExist(ids) {
      if (ids.length === 0) return true
      const unique = [...new Set(ids)]
      const { data, error } = await client.from('permissions').select('id').in('id', unique)
      if (error) throw error
      return (data?.length ?? 0) === unique.length
    },

    async findRolePermissionKeys(roleKey) {
      const { data: role, error: roleError } = await client
        .from('roles')
        .select('id')
        .eq('key', roleKey)
        .maybeSingle()
      if (roleError) throw roleError
      if (!role) return null

      const { data, error } = await client
        .from('role_permissions')
        .select('permissions(key)')
        .eq('role_id', (role as { id: string }).id)
      if (error) throw error
      return embeddedKeys(data)
    },

    async listUserPermissionKeys(userId) {
      const { data, error } = await client
        .from('user_permissions')
        .select('permissions(key)')
        .eq('user_id', userId)
      if (error) throw error
      return embeddedKeys(data)
    },
  }
}

type EmbeddedPermission = { permissions: { key: string } | { key: string }[] | null }

function embeddedKeys(rows: unknown): string[] {
  return (rows as EmbeddedPermission[]).flatMap((row) => {
    const embedded = row.permissions
    if (!embedded) return []
    return Array.isArray(embedded) ? embedded.map((item) => item.key) : [embedded.key]
  })
}

export function createRbacRepository(config: AppConfig = loadConfig()): RbacRepository {
  if (isSupabaseConfigured(config)) {
    return createSupabaseRbacRepository(config)
  }
  return createMemoryRbacRepository()
}
