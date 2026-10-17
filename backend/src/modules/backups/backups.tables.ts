/**
 * Public tables a SUPER may back up, in restore-safe order (parents before children),
 * so an all-tables SQL dump can be replayed top to bottom.
 */
export const BACKUP_TABLES = [
  'users',
  'roles',
  'permissions',
  'role_permissions',
  'user_permissions',
  'tasks',
  'files',
  'solutions',
  'revision_sessions',
  'revision_session_solutions',
  'payments',
  'payment_logs',
  'refunds',
  'invoices',
  'feedbacks',
  'specializations',
  'leads',
  'stay_updated',
  'contact_messages',
  'login_attempts',
  'login_verifications',
  'auth_sessions',
  'messages',
  'assignment_transactions',
  'activity_logs',
  'error_logs',
  'backup_history',
] as const

export type BackupTable = (typeof BACKUP_TABLES)[number]

/** Stable key order for chunked reads; tables without an `id` use their composite key. */
const ORDER_BY: Partial<Record<BackupTable, readonly string[]>> = {
  role_permissions: ['role_id', 'permission_id'],
  user_permissions: ['user_id', 'permission_id'],
}

export function tableOrderBy(table: BackupTable): readonly string[] {
  return ORDER_BY[table] ?? ['id']
}

/** `GENERATED ALWAYS` columns: Postgres rejects explicit values for them on INSERT. */
const GENERATED_COLUMNS: Partial<Record<string, readonly string[]>> = {
  invoices: ['invoice_number'],
}

export function generatedColumns(table: string): readonly string[] {
  return GENERATED_COLUMNS[table] ?? []
}

/** Table behind the "auth users" export (login is custom: bcrypt + JWT on public.users). */
export const AUTH_USERS_TABLE: BackupTable = 'users'
