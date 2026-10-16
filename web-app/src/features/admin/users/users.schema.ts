import { z } from 'zod'

const roleSchema = z.enum(['super', 'admin', 'coordinator', 'tutor', 'client'])

export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  role: roleSchema,
})

export const editUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  role: roleSchema,
  status: z.enum(['ACTIVE', 'INACTIVE']),
  password: z
    .string()
    .max(128)
    .refine((value) => value.length === 0 || value.length >= 8, {
      message: 'Password must be at least 8 characters',
    }),
})

export type CreateUserValues = z.infer<typeof createUserSchema>
export type EditUserValues = z.infer<typeof editUserSchema>
