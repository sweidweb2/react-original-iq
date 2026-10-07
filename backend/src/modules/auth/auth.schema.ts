import { z } from 'zod'

/** Tutoring roles — public register defaults to STUDENT. */
export const roleSchema = z.enum(['SUPER', 'ADMIN', 'TUTOR', 'STUDENT'])

export type RoleName = z.infer<typeof roleSchema>

export const registerBodySchema = z.object({
  email: z
    .string()
    .email()
    .transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
})

export const loginBodySchema = z.object({
  email: z
    .string()
    .email()
    .transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(128),
})

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
})

export type RegisterBody = z.infer<typeof registerBodySchema>
export type LoginBody = z.infer<typeof loginBodySchema>
export type RefreshBody = z.infer<typeof refreshBodySchema>
