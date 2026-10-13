import { useDocumentTitle } from '@/hooks/useDocumentTitle'

import type { PortalDefinition } from './portalNav'
import { PortalShell } from './PortalShell'

export function PortalLayout({ portal }: { portal: PortalDefinition }) {
  useDocumentTitle(portal.title)
  return <PortalShell title={portal.title} nav={portal.nav} />
}
