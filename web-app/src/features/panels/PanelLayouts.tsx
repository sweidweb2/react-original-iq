import { useDocumentTitle } from '@/hooks/useDocumentTitle'

import { ADMIN_NAV, PanelShell, SUPER_NAV, TUTOR_NAV } from './PanelShell'

export function SuperPanelLayout() {
  useDocumentTitle('Super panel')
  return <PanelShell title="Super panel" nav={SUPER_NAV} />
}

export function AdminPanelLayout() {
  useDocumentTitle('Admin panel')
  return <PanelShell title="Admin panel" nav={ADMIN_NAV} />
}

export function TutorPanelLayout() {
  useDocumentTitle('Tutor panel')
  return <PanelShell title="Tutor panel" nav={TUTOR_NAV} />
}
