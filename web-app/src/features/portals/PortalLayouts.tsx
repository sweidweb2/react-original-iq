import { useDocumentTitle } from '@/hooks/useDocumentTitle'

import { ADMIN_NAV, CLIENT_NAV, COORDINATOR_NAV, TUTOR_NAV } from './portalNav'
import { PortalShell } from './PortalShell'

export function AdminPortalLayout() {
  useDocumentTitle('Admin portal')
  return <PortalShell title="Admin portal" nav={ADMIN_NAV} />
}

export function CoordinatorPortalLayout() {
  useDocumentTitle('Coordinator portal')
  return <PortalShell title="Coordinator portal" nav={COORDINATOR_NAV} />
}

export function TutorPortalLayout() {
  useDocumentTitle('Tutor portal')
  return <PortalShell title="Tutor portal" nav={TUTOR_NAV} />
}

export function ClientPortalLayout() {
  useDocumentTitle('Client portal')
  return <PortalShell title="Client portal" nav={CLIENT_NAV} />
}
