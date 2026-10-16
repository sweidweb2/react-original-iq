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
