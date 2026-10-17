import { conflict, forbidden, notFound, validationError } from '../../errors/app-error.js'
import { isUniqueViolation } from '../_shared/query.js'
import { getLoggingService } from '../logging/index.js'
import type { RbacRepository } from './rbac.repository.js'
import type {
  AssignRolePermissionsBody,
  AssignUserPermissionsBody,
  CreatePermissionBody,
  CreateRoleBody,
  UpdatePermissionBody,
  UpdateRoleBody,
} from './rbac.schema.js'
import type { RbacPermission, RbacRole } from './rbac.types.js'

export type RbacService = {
  listRoles: () => Promise<RbacRole[]>
  getRole: (id: string) => Promise<RbacRole>
  createRole: (input: CreateRoleBody) => Promise<RbacRole>
  updateRole: (id: string, input: UpdateRoleBody) => Promise<RbacRole>
  deleteRole: (id: string) => Promise<void>
  assignRolePermissions: (id: string, input: AssignRolePermissionsBody) => Promise<RbacRole>
  listPermissions: () => Promise<RbacPermission[]>
  createPermission: (input: CreatePermissionBody) => Promise<RbacPermission>
  updatePermission: (id: string, input: UpdatePermissionBody) => Promise<RbacPermission>
  deletePermission: (id: string) => Promise<void>
  getUserPermissions: (userId: string) => Promise<{ permissionIds: string[] }>
  assignUserPermissions: (
    userId: string,
    input: AssignUserPermissionsBody,
  ) => Promise<{ permissionIds: string[] }>
}

export type RbacServiceDeps = {
  /** Called after any write that can change someone's effective permissions. */
  onChange?: () => void
}

export function createRbacService(
  repository: RbacRepository,
  deps: RbacServiceDeps = {},
): RbacService {
  const changed = () => deps.onChange?.()

  async function assertPermissionIds(ids: string[]) {
    const unique = [...new Set(ids)]
    if (unique.length !== ids.length) {
      throw validationError('Duplicate permission ids')
    }
    const ok = await repository.permissionIdsExist(unique)
    if (!ok) {
      throw validationError('One or more permission ids are invalid')
    }
  }

  return {
    listRoles() {
      return repository.listRoles()
    },

    async getRole(id) {
      const role = await repository.findRoleById(id)
      if (!role) throw notFound('Role not found', 'ROLE_NOT_FOUND')
      return role
    },

    async createRole(input) {
      try {
        const role = await repository.createRole({
          key: input.key,
          name: input.name,
          description: input.description,
          sortOrder: input.sortOrder,
        })
        changed()
        getLoggingService().recordActivitySafe({
          action: 'rbac.role.create',
          entity: 'role',
          entityId: role.id,
          meta: { key: role.key },
        })
        return role
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw conflict('Role key already exists', 'ROLE_KEY_EXISTS')
        }
        throw error
      }
    },

    async updateRole(id, input) {
      const updated = await repository.updateRole(id, input)
      if (!updated) throw notFound('Role not found', 'ROLE_NOT_FOUND')
      getLoggingService().recordActivitySafe({
        action: 'rbac.role.update',
        entity: 'role',
        entityId: id,
      })
      return updated
    },

    async deleteRole(id) {
      const role = await repository.findRoleById(id)
      if (!role) throw notFound('Role not found', 'ROLE_NOT_FOUND')
      if (role.isSystem) {
        throw forbidden('System roles cannot be deleted')
      }
      const deleted = await repository.deleteRole(id)
      if (!deleted) throw notFound('Role not found', 'ROLE_NOT_FOUND')
      changed()
      getLoggingService().recordActivitySafe({
        action: 'rbac.role.delete',
        entity: 'role',
        entityId: id,
        meta: { key: role.key },
      })
    },

    async assignRolePermissions(id, input) {
      await assertPermissionIds(input.permissionIds)
      const updated = await repository.setRolePermissions(id, input.permissionIds)
      if (!updated) throw notFound('Role not found', 'ROLE_NOT_FOUND')
      changed()
      getLoggingService().recordActivitySafe({
        action: 'rbac.role.assign_permissions',
        entity: 'role',
        entityId: id,
        meta: { count: input.permissionIds.length },
      })
      return updated
    },

    listPermissions() {
      return repository.listPermissions()
    },

    async createPermission(input) {
      try {
        const permission = await repository.createPermission({
          key: input.key,
          name: input.name,
          description: input.description,
          category: input.category,
        })
        getLoggingService().recordActivitySafe({
          action: 'rbac.permission.create',
          entity: 'permission',
          entityId: permission.id,
          meta: { key: permission.key },
        })
        return permission
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw conflict('Permission key already exists', 'PERMISSION_KEY_EXISTS')
        }
        throw error
      }
    },

    async updatePermission(id, input) {
      const updated = await repository.updatePermission(id, input)
      if (!updated) throw notFound('Permission not found', 'PERMISSION_NOT_FOUND')
      getLoggingService().recordActivitySafe({
        action: 'rbac.permission.update',
        entity: 'permission',
        entityId: id,
      })
      return updated
    },

    async deletePermission(id) {
      const deleted = await repository.deletePermission(id)
      if (!deleted) throw notFound('Permission not found', 'PERMISSION_NOT_FOUND')
      changed()
      getLoggingService().recordActivitySafe({
        action: 'rbac.permission.delete',
        entity: 'permission',
        entityId: id,
      })
    },

    async getUserPermissions(userId) {
      const permissionIds = await repository.listUserPermissionIds(userId)
      return { permissionIds }
    },

    async assignUserPermissions(userId, input) {
      await assertPermissionIds(input.permissionIds)
      const permissionIds = await repository.setUserPermissions(userId, input.permissionIds)
      changed()
      getLoggingService().recordActivitySafe({
        action: 'rbac.user.assign_permissions',
        entity: 'user',
        entityId: userId,
        meta: { count: permissionIds.length },
      })
      return { permissionIds }
    },
  }
}
