import type { Localized } from '@/i18n/config'

import { legalAr } from './legal.ar'
import { legalEn } from './legal.en'

export type LegalSection = {
  id: string
  title: string
  paragraphs: string[]
}

export type LegalDocument = {
  title: string
  description: string
  company: string[]
  sections: LegalSection[]
}

export type LegalDocumentKey = 'terms' | 'privacy' | 'refunds'

export type LegalDocuments = Record<LegalDocumentKey, LegalDocument>

export const legalContent: Localized<LegalDocuments> = {
  en: legalEn,
  ar: legalAr,
}
