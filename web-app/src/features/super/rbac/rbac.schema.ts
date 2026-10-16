import { z } from 'zod'

const keySchema = z
  .string()
  .trim()
  .min(2, 'Key is required')
  .max(80)
  .regex(/^[a-z][a-z0-9_]*$/, 'Use lowercase snake_case')

export const roleFormSchema = z.object({
  key: keySchema.max(64),
  name: z.string().trim().min(1, 'Name is required').max(120),
  description: z.string().trim().max(2000).optional(),
  sortOrder: z.coerce.number().int().min(0).max(10_000),
})

export const editRoleFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  description: z.string().trim().max(2000).optional(),
  sortOrder: z.coerce.number().int().min(0).max(10_000),
})

export const permissionFormSchema = z.object({
  key: keySchema,
  name: z.string().trim().min(1, 'Name is required').max(120),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().min(1, 'Category is required').max(64),
})

export const editPermissionFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().min(1, 'Category is required').max(64),
})
