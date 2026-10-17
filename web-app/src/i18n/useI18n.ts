import { useCallback, useContext } from 'react'

import { useLocaleStore } from '@/stores/localeStore'

import { DEFAULT_LOCALE, detectBrowserLocale, localeDir, type Localized } from './config'
import { LocaleContext } from './context'
import { localizePath } from './paths'

export function useI18n() {
  const routeLocale = useContext(LocaleContext)
  const storedLocale = useLocaleStore((s) => s.preferredLocale)
  const locale = routeLocale ?? DEFAULT_LOCALE
  const linkLocale = routeLocale ?? storedLocale ?? detectBrowserLocale()

  const lp = useCallback((path: string) => localizePath(linkLocale, path), [linkLocale])
  const pick = useCallback(<T>(map: Localized<T>): T => map[locale], [locale])

  return {
    locale,
    dir: localeDir(locale),
    localized: routeLocale !== null,
    lp,
    pick,
  }
}
