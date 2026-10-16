import { z } from 'zod'

/** Domain roles — public register defaults to `client`. */
export const roleSchema = z.enum(['super', 'admin', 'coordinator', 'tutor', 'client'])

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

const emailField = z
  .string()
  .email()
  .transform((value) => value.trim().toLowerCase())

const resetCodeField = z
  .string()
  .trim()
  .length(6, 'Code must be 6 digits')
  .regex(/^\d{6}$/, 'Code must be 6 digits')

export const forgotPasswordBodySchema = z.object({
  email: emailField,
})

export const verifyResetCodeBodySchema = z.object({
  email: emailField,
  code: resetCodeField,
})

export const resendResetCodeBodySchema = z.object({
  email: emailField,
})

export const resetPasswordBodySchema = z
  .object({
    email: emailField,
    code: resetCodeField,
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const updateMeBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    currentPassword: z.string().min(1).max(128).optional(),
    newPassword: z.string().min(8).max(128).optional(),
    confirmPassword: z.string().min(8).max(128).optional(),
  })
  .refine((value) => value.name !== undefined || value.newPassword !== undefined, {
    message: 'At least one field is required',
  })
  .refine((value) => !value.newPassword || value.currentPassword, {
    message: 'Current password is required to change password',
    path: ['currentPassword'],
  })
  .refine((value) => !value.newPassword || value.newPassword === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type RegisterBody = z.infer<typeof registerBodySchema>
export type LoginBody = z.infer<typeof loginBodySchema>
export type RefreshBody = z.infer<typeof refreshBodySchema>
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>
export type VerifyResetCodeBody = z.infer<typeof verifyResetCodeBodySchema>
export type ResendResetCodeBody = z.infer<typeof resendResetCodeBodySchema>
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>
export type UpdateMeBody = z.infer<typeof updateMeBodySchema>
