import { z } from 'zod'

import { optionalPhoneField, requiredPhoneField } from '@/lib/phone'

export function createProfileUpdateSchema(phoneRequired: boolean) {
  return z
    .object({
      name: z.string().trim().min(1, 'Display name is required').max(120),
      phone: phoneRequired ? requiredPhoneField : optionalPhoneField,
      currentPassword: z.string().max(128),
      newPassword: z
        .string()
        .max(128)
        .refine((v) => v.length === 0 || v.length >= 8, 'Password must be at least 8 characters'),
      confirmPassword: z.string().max(128),
    })
    .refine(
      (value) =>
        value.newPassword.length === 0 ||
        (value.currentPassword.length > 0 && value.newPassword === value.confirmPassword),
      {
        message: 'Confirm your new password',
        path: ['confirmPassword'],
      },
    )
    .refine((value) => value.newPassword.length === 0 || value.currentPassword.length > 0, {
      message: 'Current password is required',
      path: ['currentPassword'],
    })
}

export const profileUpdateSchema = createProfileUpdateSchema(false)

export type ProfileUpdateValues = z.infer<typeof profileUpdateSchema>
