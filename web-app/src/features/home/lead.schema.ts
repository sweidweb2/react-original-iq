import { z } from 'zod'

export const leadSchema = z.object({
  country: z.string().trim().min(1, 'Select your country'),
  dialCode: z.string().trim().min(1, 'Select your country'),
  phone: z
    .string()
    .trim()
    .min(6, 'Enter a valid phone number')
    .max(20, 'Enter a valid phone number')
    .regex(/^[0-9\s()-]+$/, 'Enter a valid phone number'),
})

export type LeadValues = z.infer<typeof leadSchema>
