import type { BackupHistoryEntry, BackupType } from '@/services/backups'

export const BACKUP_TYPE_LABELS: Record<BackupType, string> = {
  table: 'Single table',
  all_tables: 'All tables',
  users: 'Auth users',
  storage_folder: 'Storage folder',
  storage_full: 'Full storage',
}

export { formatBytes } from '@/lib/formatBytes'

export function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatTarget(entry: BackupHistoryEntry): string {
  if (entry.type === 'all_tables') return 'All tables'
  if (entry.type === 'storage_full') return 'Whole bucket'
  return entry.target ?? '—'
}

export function formatVolume(entry: BackupHistoryEntry): string {
  if (entry.fileCount !== null) return `${entry.fileCount} file${entry.fileCount === 1 ? '' : 's'}`
  if (entry.rowCount !== null) return `${entry.rowCount} row${entry.rowCount === 1 ? '' : 's'}`
  return '—'
}
