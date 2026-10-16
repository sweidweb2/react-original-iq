import { z } from 'zod'

const keySchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z][a-z0-9_]*$/, 'Use lowercase snake_case keys')

export const roleIdParamsSchema = z.object({
  id: z.string().uuid(),
})

export const permissionIdParamsSchema = z.object({
  id: z.string().uuid(),
})

export const userIdParamsSchema = z.object({
  userId: z.string().uuid(),
})

export const createRoleBodySchema = z.object({
  key: keySchema.max(64),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
})

export const updateRoleBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    sortOrder: z.number().int().min(0).max(10_000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'No fields to update' })

export const assignRolePermissionsBodySchema = z.object({
  permissionIds: z.array(z.string().uuid()).max(500),
})

export const createPermissionBodySchema = z.object({
  key: keySchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  category: z.string().trim().min(1).max(64).optional(),
})

export const updatePermissionBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    category: z.string().trim().min(1).max(64).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'No fields to update' })

export const assignUserPermissionsBodySchema = z.object({
  permissionIds: z.array(z.string().uuid()).max(500),
})

export type CreateRoleBody = z.infer<typeof createRoleBodySchema>
export type UpdateRoleBody = z.infer<typeof updateRoleBodySchema>
export type AssignRolePermissionsBody = z.infer<typeof assignRolePermissionsBodySchema>
export type CreatePermissionBody = z.infer<typeof createPermissionBodySchema>
export type UpdatePermissionBody = z.infer<typeof updatePermissionBodySchema>
export type AssignUserPermissionsBody = z.infer<typeof assignUserPermissionsBodySchema>
