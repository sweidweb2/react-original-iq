import { type ReactNode, useEffect } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'

import { useLocaleStore } from '@/stores/localeStore'

import { DEFAULT_LOCALE, isLocale, type Locale, localeDir, LOCALES } from './config'
import { LocaleContext } from './context'
import { switchLocalePath } from './paths'

function useDocumentLocale(locale: Locale) {
  const setPreferredLocale = useLocaleStore((s) => s.setPreferredLocale)

  useEffect(() => {
    const root = document.documentElement
    root.lang = locale
    root.dir = localeDir(locale)
    setPreferredLocale(locale)
    return () => {
      root.lang = DEFAULT_LOCALE
      root.dir = localeDir(DEFAULT_LOCALE)
    }
  }, [locale, setPreferredLocale])
}

function useAlternateLinks() {
  const { pathname } = useLocation()

  useEffect(() => {
    const origin = window.location.origin
    const links = [...LOCALES, 'x-default' as const].map((hreflang) => {
      const link = document.createElement('link')
      link.rel = 'alternate'
      link.hreflang = hreflang
      link.href = `${origin}${switchLocalePath(hreflang === 'x-default' ? DEFAULT_LOCALE : hreflang, pathname)}`
      document.head.appendChild(link)
      return link
    })
    return () => {
      for (const link of links) link.remove()
    }
  }, [pathname])
}

function LocalizedOutlet({ locale }: { locale: Locale }) {
  useDocumentLocale(locale)
  useAlternateLinks()

  return (
    <LocaleContext.Provider value={locale}>
      <Outlet />
    </LocaleContext.Provider>
  )
}

/** Validates the `:lang` segment and applies `lang`/`dir` to `<html>` for its subtree. */
export function LocaleGate({ fallback }: { fallback: ReactNode }) {
  const { lang } = useParams()
  if (!isLocale(lang)) return fallback
  return <LocalizedOutlet locale={lang} />
}
