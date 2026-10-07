import { useDocumentTitle } from '@/hooks/useDocumentTitle'

import {
  ADMIN_NAV,
  CLIENT_NAV,
  COORDINATOR_NAV,
  PortalShell,
  TUTOR_NAV,
} from './PortalShell'

export function AdminPortalLayout() {
  useDocumentTitle('Admin portal')
  return <PortalShell brand="Original IQ" title="Admin portal" nav={ADMIN_NAV} />
}

export function CoordinatorPortalLayout() {
  useDocumentTitle('Coordinator portal')
  return <PortalShell brand="Original IQ" title="Coordinator portal" nav={COORDINATOR_NAV} />
}

export function TutorPortalLayout() {
  useDocumentTitle('Tutor portal')
  return <PortalShell brand="Original IQ" title="Tutor portal" nav={TUTOR_NAV} />
}

export function ClientPortalLayout() {
  useDocumentTitle('Client portal')
  return <PortalShell brand="Original IQ" title="Client portal" nav={CLIENT_NAV} />
}
