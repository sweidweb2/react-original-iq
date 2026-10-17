import type { Localized } from '@/i18n/config'

import { faqAr } from './faq.ar'
import { faqEn } from './faq.en'

export type FaqItem = {
  question: string
  answer: string
}

export type FaqCategory = {
  id: string
  title: string
  items: FaqItem[]
}

export const faqContent: Localized<FaqCategory[]> = {
  en: faqEn,
  ar: faqAr,
}
