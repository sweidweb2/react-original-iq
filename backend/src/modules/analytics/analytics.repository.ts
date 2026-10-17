import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin, selectAllRows } from '../../database/index.js'

export type AnalyticsUserRow = {
  id: string
  name: string | null
  role: string
  is_active: boolean
  created_at: string
}

export type AnalyticsTaskRow = {
  tutor_id: string | null
  type: string | null
  status: string
  price: number | string | null
  deadline: string | null
  created_at: string
}

export type AnalyticsMoneyRow = {
  amount: number | string
  currency: string
  status: string
  created_at: string
}

export type AnalyticsFeedbackRow = {
  tutor_id: string
  rating: number | null
}

export type AnalyticsSnapshot = {
  users: AnalyticsUserRow[]
  tasks: AnalyticsTaskRow[]
  payments: AnalyticsMoneyRow[]
  refunds: AnalyticsMoneyRow[]
  feedbacks: AnalyticsFeedbackRow[]
  counts: {
    leads: number
    leadsSince: number
    contactMessages: number
    subscribers: number
  }
}

export type AnalyticsRepository = {
  /** Minimal columns for aggregation; `since` bounds the "recent leads" count. */
  loadSnapshot: (since: Date) => Promise<AnalyticsSnapshot>
}

/** Memory mode has no shared stores for these tables; analytics are all zero. */
function createMemoryAnalyticsRepository(): AnalyticsRepository {
  return {
    async loadSnapshot() {
      return {
        users: [],
        tasks: [],
        payments: [],
        refunds: [],
        feedbacks: [],
        counts: { leads: 0, leadsSince: 0, contactMessages: 0, subscribers: 0 },
      }
    },
  }
}

function createSupabaseAnalyticsRepository(config: AppConfig): AnalyticsRepository {
  const supabase = getSupabaseAdmin(config)
  if (!supabase) {
    throw new Error('Supabase admin client is not available')
  }
  const client = supabase

  async function count(table: string, since?: Date): Promise<number> {
    let query = client.from(table).select('id', { count: 'exact', head: true })
    if (since) query = query.gte('created_at', since.toISOString())
    const { count: total, error } = await query
    if (error) throw error
    return total ?? 0
  }

  return {
    async loadSnapshot(since) {
      const [
        users,
        tasks,
        payments,
        refunds,
        feedbacks,
        leads,
        leadsSince,
        contactMessages,
        subscribers,
      ] = await Promise.all([
        selectAllRows<AnalyticsUserRow>(client, 'users', 'id, name, role, is_active, created_at'),
        selectAllRows<AnalyticsTaskRow>(
          client,
          'tasks',
          'id, tutor_id, type, status, price, deadline, created_at',
        ),
        selectAllRows<AnalyticsMoneyRow>(
          client,
          'payments',
          'id, amount, currency, status, created_at',
        ),
        selectAllRows<AnalyticsMoneyRow>(
          client,
          'refunds',
          'id, amount, currency, status, created_at',
        ),
        selectAllRows<AnalyticsFeedbackRow>(client, 'feedbacks', 'id, tutor_id, rating'),
        count('leads'),
        count('leads', since),
        count('contact_messages'),
        count('stay_updated'),
      ])
      return {
        users,
        tasks,
        payments,
        refunds,
        feedbacks,
        counts: { leads, leadsSince, contactMessages, subscribers },
      }
    },
  }
}

export function createAnalyticsRepository(config: AppConfig = loadConfig()): AnalyticsRepository {
  if (isSupabaseConfigured(config)) {
    return createSupabaseAnalyticsRepository(config)
  }
  return createMemoryAnalyticsRepository()
}
