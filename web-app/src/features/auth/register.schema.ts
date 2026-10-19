import { z } from 'zod'

import { requiredPhoneField } from '@/lib/phone'

export const registerSchema = z.object({
  firstName: z.string().trim().max(80),
  lastName: z.string().trim().max(80),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  phone: requiredPhoneField,
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
})

export type RegisterValues = z.infer<typeof registerSchema>
