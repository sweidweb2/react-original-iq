import { apiDownload, apiRequest } from './api'

export type BackupType = 'table' | 'all_tables' | 'storage_folder' | 'storage_full' | 'users'
export type BackupDataFormat = 'csv' | 'json' | 'xlsx' | 'sql'
export type BackupFormat = BackupDataFormat | 'zip'
export type BackupStatus = 'running' | 'completed' | 'failed'

export type BackupHistoryEntry = {
  id: string
  type: BackupType
  target: string | null
  format: BackupFormat
  status: BackupStatus
  filename: string | null
  sizeBytes: number | null
  rowCount: number | null
  fileCount: number | null
  durationMs: number | null
  error: string | null
  rerunOf: string | null
  requestedBy: { id: string; name: string | null; email: string } | null
  createdAt: string
  updatedAt: string
}

export type BackupHistoryMeta = {
  page: number
  limit: number
  total: number
}

export type BackupMeta = {
  tables: string[]
  formats: BackupDataFormat[]
  storage: {
    configured: boolean
    folders: string[]
  }
}

export type RunBackupInput =
  | { type: 'table'; table: string; format: BackupDataFormat }
  | { type: 'all_tables'; format: BackupDataFormat }
  | { type: 'users'; format: BackupDataFormat }
  | { type: 'storage_folder'; folder: string }
  | { type: 'storage_full' }

export const BACKUP_FORMAT_OPTIONS: { value: BackupDataFormat; label: string }[] = [
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
  { value: 'xlsx', label: 'Excel (XLSX)' },
  { value: 'sql', label: 'SQL inserts' },
]

export function getBackupMeta() {
  return apiRequest<BackupMeta>('/backups/meta')
}

export function listBackupHistory(page: number, limit: number) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  return apiRequest<{ data: BackupHistoryEntry[]; meta: BackupHistoryMeta }>(
    `/backups/history?${params.toString()}`,
  )
}

function backupLabel(input: RunBackupInput): string {
  switch (input.type) {
    case 'table':
      return `Backup · ${input.table} (${input.format.toUpperCase()})`
    case 'all_tables':
      return `Backup · all tables (${input.format.toUpperCase()})`
    case 'users':
      return `Backup · auth users (${input.format.toUpperCase()})`
    case 'storage_folder':
      return `Backup · ${input.folder} folder (zip)`
    case 'storage_full':
      return 'Backup · full storage (zip)'
  }
}

export function runBackup(input: RunBackupInput) {
  return apiDownload('/backups', 'backup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    label: backupLabel(input),
  })
}

export function rerunBackup(id: string, label = 'Re-exporting backup') {
  return apiDownload(`/backups/history/${id}/rerun`, 'backup', { method: 'POST', label })
}
