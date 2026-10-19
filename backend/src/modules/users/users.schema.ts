import { z } from 'zod'

import { paginationQuerySchema } from '../_shared/pagination.schema.js'
import { isPhone } from '../_shared/phone.js'

const roleSchema = z.enum(['super', 'admin', 'coordinator', 'tutor', 'client'])
const statusSchema = z.enum(['ACTIVE', 'INACTIVE'])

export const userIdParamsSchema = z.object({
  id: z.string().trim().uuid(),
})

export const listUsersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  role: roleSchema.optional(),
  status: statusSchema.optional(),
})

export const createUserBodySchema = z
  .object({
    email: z
      .string()
      .email()
      .transform((value) => value.trim().toLowerCase()),
    name: z.string().trim().min(1).max(120),
    password: z.string().min(8).max(128),
    role: roleSchema,
    phone: z.string().trim().max(20).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.phone && !isPhone(value.phone)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enter a phone number of 8 to 20 characters',
        path: ['phone'],
      })
    }
  })

export const updateUserBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    role: roleSchema.optional(),
    status: statusSchema.optional(),
    password: z.string().min(8).max(128).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>
export type CreateUserBody = z.infer<typeof createUserBodySchema>
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>
