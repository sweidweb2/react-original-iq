export const LOCALES = ['en', 'ar'] as const

export type Locale = (typeof LOCALES)[number]

export type Direction = 'ltr' | 'rtl'

export type Localized<T> = Record<Locale, T>

export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALE_LABELS: Localized<string> = {
  en: 'English',
  ar: 'العربية',
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

export function localeDir(locale: Locale): Direction {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

export function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE
  return navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : DEFAULT_LOCALE
}

/** Wraps a left-to-right run (email, phone, URL) in Unicode isolates for use inside RTL text. */
export function ltr(text: string) {
  return `\u2066${text}\u2069`
}
