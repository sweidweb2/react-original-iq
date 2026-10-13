import { z } from 'zod'

const emailField = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(100, 'Email must be 100 characters or fewer')
  .email('Enter a valid email')
  .transform((value) => value.toLowerCase())

export const contactMessageSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Your name is required')
    .max(20, 'Name must be 20 characters or fewer'),
  email: emailField,
  subject: z
    .string()
    .trim()
    .max(120, 'Subject must be 120 characters or fewer')
    .transform((value) => value || undefined),
  message: z
    .string()
    .trim()
    .min(1, 'Message is required')
    .max(245, 'Message must be 245 characters or fewer'),
})

export const newsletterSchema = z.object({
  email: emailField,
})

export type ContactMessageValues = z.input<typeof contactMessageSchema>
export type NewsletterValues = z.input<typeof newsletterSchema>
