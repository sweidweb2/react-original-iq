import { z } from 'zod'

import { paginationQuerySchema } from '../_shared/pagination.schema.js'
import { BACKUP_TABLES } from './backups.tables.js'

export const BACKUP_TYPES = [
  'table',
  'all_tables',
  'storage_folder',
  'storage_full',
  'users',
] as const
export const BACKUP_DATA_FORMATS = ['csv', 'json', 'xlsx', 'sql'] as const

export type BackupType = (typeof BACKUP_TYPES)[number]
export type BackupDataFormat = (typeof BACKUP_DATA_FORMATS)[number]
export type BackupFormat = BackupDataFormat | 'zip'

const formatSchema = z.enum(BACKUP_DATA_FORMATS)

/** A single top-level bucket folder name; never a path. */
const folderSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^[A-Za-z0-9._-]+$/, 'Folder must be a top-level folder name')
  .refine((value) => value !== '.' && value !== '..', 'Invalid folder')

export const runBackupBodySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('table'), table: z.enum(BACKUP_TABLES), format: formatSchema }),
  z.object({ type: z.literal('all_tables'), format: formatSchema }),
  z.object({ type: z.literal('users'), format: formatSchema }),
  z.object({ type: z.literal('storage_folder'), folder: folderSchema }),
  z.object({ type: z.literal('storage_full') }),
])

export type RunBackupInput = z.infer<typeof runBackupBodySchema>

export const backupHistoryQuerySchema = paginationQuerySchema

export const backupIdParamsSchema = z.object({
  id: z.string().trim().uuid(),
})

export type BackupIdParams = z.infer<typeof backupIdParamsSchema>
