import { apiDownload } from './api'

export type ExportResource =
  | 'users'
  | 'tasks'
  | 'payments'
  | 'refunds'
  | 'leads'
  | 'feedback'

export function downloadExport(resource: ExportResource) {
  return apiDownload(`/exports/${resource}`, `${resource}.csv`)
}
