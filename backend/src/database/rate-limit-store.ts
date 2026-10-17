import type { Options, Store } from 'express-rate-limit'

import type { AppConfig } from '../config/index.js'
import { getSupabaseAdmin } from './supabase.js'

type HitRow = { hits: number; reset_at: string }

/**
 * express-rate-limit store backed by `rate_limit_hits` (migration 019), so limits are shared by
 * every serverless instance. Returns `undefined` without Supabase, which makes the limiter fall
 * back to its in-memory store.
 */
export function createSupabaseRateLimitStore(config: AppConfig, prefix: string): Store | undefined {
  const client = getSupabaseAdmin(config)
  if (!client) return undefined

  let windowMs = 60_000

  return {
    prefix,
    localKeys: false,

    init(options: Options) {
      windowMs = options.windowMs
    },

    async increment(key) {
      const { data, error } = await client
        .rpc('rate_limit_hit', { p_key: `${prefix}${key}`, p_window_ms: windowMs })
        .single()
      if (error) throw error
      const row = data as HitRow
      return { totalHits: row.hits, resetTime: new Date(row.reset_at) }
    },

    async decrement(key) {
      const { error } = await client.rpc('rate_limit_decrement', { p_key: `${prefix}${key}` })
      if (error) throw error
    },

    async resetKey(key) {
      const { error } = await client.from('rate_limit_hits').delete().eq('key', `${prefix}${key}`)
      if (error) throw error
    },
  }
}
