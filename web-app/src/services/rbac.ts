import { apiRequest } from './api'

export type RbacPermission = {
  id: string
  key: string
  name: string
  description: string | null
  category: string
  createdAt: string
  updatedAt: string
}

export type RbacRole = {
  id: string
  key: string
  name: string
  description: string | null
  isSystem: boolean
  sortOrder: number
  permissionIds: string[]
  createdAt: string
  updatedAt: string
}

export type CreateRoleInput = {
  key: string
  name: string
  description?: string | null
  sortOrder?: number
}

export type UpdateRoleInput = {
  name?: string
  description?: string | null
  sortOrder?: number
}

export type CreatePermissionInput = {
  key: string
  name: string
  description?: string | null
  category?: string
}

export type UpdatePermissionInput = {
  name?: string
  description?: string | null
  category?: string
}

export function listRoles() {
  return apiRequest<{ data: RbacRole[] }>('/rbac/roles')
}

export function createRole(input: CreateRoleInput) {
  return apiRequest<RbacRole>('/rbac/roles', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateRole(id: string, input: UpdateRoleInput) {
  return apiRequest<RbacRole>(`/rbac/roles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteRole(id: string) {
  return apiRequest<void>(`/rbac/roles/${id}`, { method: 'DELETE' })
}

export function assignRolePermissions(id: string, permissionIds: string[]) {
  return apiRequest<RbacRole>(`/rbac/roles/${id}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissionIds }),
  })
}

export function listPermissions() {
  return apiRequest<{ data: RbacPermission[] }>('/rbac/permissions')
}

export function createPermission(input: CreatePermissionInput) {
  return apiRequest<RbacPermission>('/rbac/permissions', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updatePermission(id: string, input: UpdatePermissionInput) {
  return apiRequest<RbacPermission>(`/rbac/permissions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deletePermission(id: string) {
  return apiRequest<void>(`/rbac/permissions/${id}`, { method: 'DELETE' })
}

export function getUserPermissions(userId: string) {
  return apiRequest<{ permissionIds: string[] }>(`/rbac/users/${userId}/permissions`)
}

export function assignUserPermissions(userId: string, permissionIds: string[]) {
  return apiRequest<{ permissionIds: string[] }>(`/rbac/users/${userId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissionIds }),
  })
}
