import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin } from '../../database/index.js'

/** Read-only bulk rows for admin exports of tables without a dedicated listing API. */

export type FileExportRow = {
  id: string
  task_id: string
  file_location: string
  original_name: string | null
  content_type: string | null
  size_bytes: number | null
  note: string | null
  created_at: string
}

export type SolutionExportRow = Omit<FileExportRow, 'note'>

export type RevisionSessionExportRow = {
  id: string
  task_id: string
  title: string | null
  status: string
  start_date: string | null
  deadline: string | null
  submit_date: string | null
  created_at: string
}

export type RevisionSessionSolutionExportRow = {
  id: string
  revision_session_id: string
  solution_id: string
  date: string | null
  created_at: string
}

export type PaymentLogExportRow = {
  id: string
  payment_id: string
  event: string
  payload: Record<string, unknown> | null
  created_at: string
}

export type SpecializationExportRow = {
  id: string
  tutor_id: string
  name: string
  note: string | null
  created_at: string
}

export type LoginAttemptExportRow = {
  id: string
  email: string
  ip_address: string
  user_agent: string | null
  success: boolean
  failed_attempts: number
  locked_until: string | null
  last_attempt_at: string | null
  created_at: string
}

/** Never includes the verification `code`. */
export type LoginVerificationExportRow = {
  id: string
  user_id: string
  type: string
  expires_at: string
  used: boolean
  used_at: string | null
  created_at: string
}

export type ExportsRepository = {
  listFiles: () => Promise<FileExportRow[]>
  listSolutions: () => Promise<SolutionExportRow[]>
  listRevisionSessions: () => Promise<RevisionSessionExportRow[]>
  listRevisionSessionSolutions: () => Promise<RevisionSessionSolutionExportRow[]>
  listPaymentLogs: () => Promise<PaymentLogExportRow[]>
  listSpecializations: () => Promise<SpecializationExportRow[]>
  listLoginAttempts: () => Promise<LoginAttemptExportRow[]>
  listLoginVerifications: () => Promise<LoginVerificationExportRow[]>
}

/** Memory mode has no shared stores for these tables; exports are header-only. */
function createMemoryExportsRepository(): ExportsRepository {
  const empty = async () => []
  return {
    listFiles: empty,
    listSolutions: empty,
    listRevisionSessions: empty,
    listRevisionSessionSolutions: empty,
    listPaymentLogs: empty,
    listSpecializations: empty,
    listLoginAttempts: empty,
    listLoginVerifications: empty,
  }
}

function createSupabaseExportsRepository(config: AppConfig): ExportsRepository {
  const supabase = getSupabaseAdmin(config)
  if (!supabase) {
    throw new Error('Supabase admin client is not available')
  }
  const client = supabase

  async function selectAll<T>(table: string, columns: string): Promise<T[]> {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .order('created_at', { ascending: false })
      .limit(50000)
    if (error) throw error
    return (data ?? []) as unknown as T[]
  }

  return {
    listFiles: () =>
      selectAll(
        'files',
        'id, task_id, file_location, original_name, content_type, size_bytes, note, created_at',
      ),
    listSolutions: () =>
      selectAll(
        'solutions',
        'id, task_id, file_location, original_name, content_type, size_bytes, created_at',
      ),
    listRevisionSessions: () =>
      selectAll(
        'revision_sessions',
        'id, task_id, title, status, start_date, deadline, submit_date, created_at',
      ),
    listRevisionSessionSolutions: () =>
      selectAll(
        'revision_session_solutions',
        'id, revision_session_id, solution_id, date, created_at',
      ),
    listPaymentLogs: () => selectAll('payment_logs', 'id, payment_id, event, payload, created_at'),
    listSpecializations: () => selectAll('specializations', 'id, tutor_id, name, note, created_at'),
    listLoginAttempts: () =>
      selectAll(
        'login_attempts',
        'id, email, ip_address, user_agent, success, failed_attempts, locked_until, last_attempt_at, created_at',
      ),
    listLoginVerifications: () =>
      selectAll('login_verifications', 'id, user_id, type, expires_at, used, used_at, created_at'),
  }
}

export function createExportsRepository(config: AppConfig = loadConfig()): ExportsRepository {
  if (isSupabaseConfigured(config)) {
    return createSupabaseExportsRepository(config)
  }
  return createMemoryExportsRepository()
}
