import type { BackupDataFormat, BackupFormat, BackupType } from './backups.schema.js'
import type { BackupTable } from './backups.tables.js'

export type BackupStatus = 'running' | 'completed' | 'failed'

export type BackupHistoryDto = {
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

export type BackupHistoryPage = {
  data: BackupHistoryDto[]
  meta: { page: number; limit: number; total: number }
}

export type BackupMetaDto = {
  tables: BackupTable[]
  formats: BackupDataFormat[]
  storage: {
    configured: boolean
    folders: string[]
  }
}
