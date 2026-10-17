import { useLocation } from 'react-router-dom'

import type { BreadcrumbItem } from '@/components/ui/breadcrumbs'

import { type PortalDefinition, PORTALS } from './portalNav'

/** `path` is relative to the portal root, e.g. `tasks` or `tasks/123?tab=payments`. */
export type PortalCrumb = {
  label: string
  path?: string
}

export function findPortal(pathname: string): PortalDefinition | undefined {
  return PORTALS.find(
    (portal) => pathname === portal.path || pathname.startsWith(`${portal.path}/`),
  )
}

function portalHomeLabel(portal: PortalDefinition): string {
  return portal.nav.find((item) => item.to === portal.path)?.label ?? portal.homeTitle
}

/** Prepends the current portal's home crumb and resolves paths against the portal root. */
export function usePortalBreadcrumbs(trail: PortalCrumb[]): BreadcrumbItem[] {
  const { pathname } = useLocation()
  const portal = findPortal(pathname)
  if (!portal) return trail.map(({ label }) => ({ label }))

  return [
    { label: portalHomeLabel(portal), to: portal.path },
    ...trail.map(({ label, path }) => ({
      label,
      to: path ? `${portal.path}/${path}` : undefined,
    })),
  ]
}
