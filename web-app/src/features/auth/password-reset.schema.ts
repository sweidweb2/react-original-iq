import { z } from 'zod'

const emailField = z.string().trim().min(1, 'Email is required').email('Enter a valid email')

const codeField = z
  .string()
  .trim()
  .length(6, 'Enter the 6-digit code')
  .regex(/^\d{6}$/, 'Enter the 6-digit code')

export const forgotPasswordSchema = z.object({
  email: emailField,
})

export const verifyResetCodeSchema = z.object({
  email: emailField,
  code: codeField,
})

export const resetPasswordSchema = z
  .object({
    email: emailField,
    code: codeField,
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type VerifyResetCodeValues = z.infer<typeof verifyResetCodeSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
