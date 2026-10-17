import { isLocale, type Locale } from './config'

function splitSuffix(path: string) {
  const index = path.search(/[?#]/)
  return index === -1 ? [path, ''] : [path.slice(0, index), path.slice(index)]
}

/** `/about#team` → `/ar/about#team`; `/` → `/ar`. */
export function localizePath(locale: Locale, path: string) {
  const [pathname, suffix] = splitSuffix(path)
  const clean = pathname === '/' || pathname === '' ? '' : pathname
  return `/${locale}${clean}${suffix}`
}

/** Removes a leading locale segment: `/ar/about` → `/about`. */
export function stripLocale(pathname: string) {
  const [, first, ...rest] = pathname.split('/')
  if (!isLocale(first)) return pathname
  return rest.length ? `/${rest.join('/')}` : '/'
}

export function switchLocalePath(locale: Locale, pathname: string, search = '', hash = '') {
  return localizePath(locale, `${stripLocale(pathname)}${search}${hash}`)
}
