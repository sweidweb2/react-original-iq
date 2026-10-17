import { type Localized, useI18n } from '@/i18n'

import { homeAr } from './ar'
import { type HomeDictionary, homeEn } from './en'

export type { HomeDictionary }

export const homeDictionaries: Localized<HomeDictionary> = {
  en: homeEn,
  ar: homeAr,
}

export function useHomeDictionary() {
  const { pick } = useI18n()
  return pick(homeDictionaries)
}
