import { Navigate, useLocation } from 'react-router-dom'

import { getPreferredLocale } from '@/stores/localeStore'

import { localizePath } from './paths'

/** Sends unprefixed public URLs (`/`, `/about#x`) to the preferred locale. */
export function LocaleRedirect() {
  const { pathname, search, hash } = useLocation()
  return <Navigate to={localizePath(getPreferredLocale(), `${pathname}${search}${hash}`)} replace />
}
