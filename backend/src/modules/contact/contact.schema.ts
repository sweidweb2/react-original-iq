import { z } from 'zod'

const emailSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .email()
  .transform((value) => value.toLowerCase())

export const contactMessageBodySchema = z.object({
  name: z.string().trim().min(1).max(20),
  email: emailSchema,
  subject: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || undefined),
  message: z.string().trim().min(1).max(245),
})

export const newsletterBodySchema = z.object({
  email: emailSchema,
})

export const leadBodySchema = z.object({
  country: z.string().trim().min(1).max(80),
  dialCode: z.string().trim().min(1).max(8),
  phone: z
    .string()
    .trim()
    .min(6)
    .max(20)
    .regex(/^[0-9\s()-]+$/),
})

export type ContactMessageBody = z.infer<typeof contactMessageBodySchema>
export type NewsletterBody = z.infer<typeof newsletterBodySchema>
export type LeadBody = z.infer<typeof leadBodySchema>
