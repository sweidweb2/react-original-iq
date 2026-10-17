import { z } from 'zod'

import type { PublicDictionary } from '../i18n/en'
import { publicEn } from '../i18n/en'

type ContactMessages = PublicDictionary['contact']['validation']

export const CONTACT_NAME_MAX = 120
export const CONTACT_MESSAGE_MAX = 5000

export function createContactSchemas(messages: ContactMessages) {
  const emailField = z
    .string()
    .trim()
    .min(1, messages.emailRequired)
    .max(100, messages.emailTooLong)
    .email(messages.emailInvalid)
    .transform((value) => value.toLowerCase())

  return {
    contactMessageSchema: z.object({
      name: z
        .string()
        .trim()
        .min(1, messages.nameRequired)
        .max(CONTACT_NAME_MAX, messages.nameTooLong),
      email: emailField,
      subject: z
        .string()
        .trim()
        .max(120, messages.subjectTooLong)
        .transform((value) => value || undefined),
      message: z
        .string()
        .trim()
        .min(1, messages.messageRequired)
        .max(CONTACT_MESSAGE_MAX, messages.messageTooLong),
    }),
    newsletterSchema: z.object({
      email: emailField,
    }),
  }
}

export const { contactMessageSchema, newsletterSchema } = createContactSchemas(
  publicEn.contact.validation,
)

export type ContactMessageValues = z.input<typeof contactMessageSchema>
export type NewsletterValues = z.input<typeof newsletterSchema>
