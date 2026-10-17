import { z } from 'zod'

import type { HomeDictionary } from './i18n/en'
import { homeEn } from './i18n/en'

type LeadMessages = HomeDictionary['lead']['validation']

export function createLeadSchema(messages: LeadMessages) {
  return z.object({
    country: z.string().trim().min(1, messages.selectCountry).max(80, messages.selectCountry),
    dialCode: z.string().trim().min(1, messages.selectCountry).max(8, messages.selectCountry),
    phone: z
      .string()
      .trim()
      .min(6, messages.invalidPhone)
      .max(20, messages.invalidPhone)
      .regex(/^[0-9\s()-]+$/, messages.invalidPhone),
  })
}

export const leadSchema = createLeadSchema(homeEn.lead.validation)

export type LeadValues = z.infer<typeof leadSchema>
