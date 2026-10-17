import { apiDownload } from './api'

export type ExportResource =
  | 'users'
  | 'tasks'
  | 'files'
  | 'solutions'
  | 'revision-sessions'
  | 'revision-session-solutions'
  | 'payments'
  | 'payment-logs'
  | 'refunds'
  | 'feedback'
  | 'specializations'
  | 'leads'
  | 'login-attempts'
  | 'login-verifications'

export type ExportGroup = {
  label: string
  items: { resource: ExportResource; label: string }[]
}

/** Super-only CSV exports (doc 13), grouped for the Profile page. */
export const EXPORT_GROUPS: ExportGroup[] = [
  {
    label: 'Accounts',
    items: [
      { resource: 'users', label: 'Users' },
      { resource: 'specializations', label: 'Specializations' },
    ],
  },
  {
    label: 'Tasks and files',
    items: [
      { resource: 'tasks', label: 'Tasks' },
      { resource: 'files', label: 'Files' },
      { resource: 'solutions', label: 'Solutions' },
      { resource: 'revision-sessions', label: 'Revision sessions' },
      { resource: 'revision-session-solutions', label: 'Revision solutions' },
      { resource: 'feedback', label: 'Feedback' },
    ],
  },
  {
    label: 'Billing',
    items: [
      { resource: 'payments', label: 'Payments' },
      { resource: 'payment-logs', label: 'Payment logs' },
      { resource: 'refunds', label: 'Refunds' },
    ],
  },
  {
    label: 'CRM',
    items: [{ resource: 'leads', label: 'Leads' }],
  },
  {
    label: 'Security',
    items: [
      { resource: 'login-attempts', label: 'Login attempts' },
      { resource: 'login-verifications', label: 'Login verifications' },
    ],
  },
]

export function downloadExport(resource: ExportResource, label: string = resource) {
  return apiDownload(`/exports/${resource}`, `${resource}.csv`, {
    label: `Export · ${label} (CSV)`,
  })
}
