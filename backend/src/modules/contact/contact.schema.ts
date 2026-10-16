import { z } from 'zod'

import { paginationQuerySchema } from '../_shared/pagination.schema.js'

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

export const listContactQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
})

export const contactIdParamsSchema = z.object({
  id: z.string().trim().uuid(),
})

export const updateLeadBodySchema = z
  .object({
    country: z.string().trim().min(1).max(80).optional(),
    phone: z.string().trim().min(6).max(40).optional(),
    firstName: z.string().trim().max(80).nullable().optional(),
    lastName: z.string().trim().max(80).nullable().optional(),
    email: emailSchema.nullable().optional(),
    zip: z.string().trim().max(20).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' })

export const updateMessageBodySchema = z
  .object({
    name: z.string().trim().min(1).max(20).optional(),
    email: emailSchema.optional(),
    subject: z.string().trim().max(120).nullable().optional(),
    message: z.string().trim().min(1).max(245).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' })

export const updateNewsletterBodySchema = z.object({
  email: emailSchema,
})

export type ContactMessageBody = z.infer<typeof contactMessageBodySchema>
export type NewsletterBody = z.infer<typeof newsletterBodySchema>
export type LeadBody = z.infer<typeof leadBodySchema>
export type ListContactQuery = z.infer<typeof listContactQuerySchema>
export type UpdateLeadBody = z.infer<typeof updateLeadBodySchema>
export type UpdateMessageBody = z.infer<typeof updateMessageBodySchema>
export type UpdateNewsletterBody = z.infer<typeof updateNewsletterBodySchema>
