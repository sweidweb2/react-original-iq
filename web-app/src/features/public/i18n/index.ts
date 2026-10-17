import { type Localized, useI18n } from '@/i18n'

import { publicAr } from './ar'
import { type PublicDictionary, publicEn } from './en'

export type { PublicDictionary }

export const publicDictionaries: Localized<PublicDictionary> = {
  en: publicEn,
  ar: publicAr,
}

export function usePublicDictionary() {
  const { pick } = useI18n()
  return pick(publicDictionaries)
}
