import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { type AppConfig, isSupabaseConfigured, loadConfig } from '../config/index.js'

let adminClient: SupabaseClient | null = null

/**
 * Server-side Supabase client (service role).
 * Repositories only — never import from controllers or the web app.
 * Returns null until SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
 */
export function getSupabaseAdmin(config: AppConfig = loadConfig()): SupabaseClient | null {
  if (!isSupabaseConfigured(config)) {
    return null
  }

  if (!adminClient) {
    adminClient = createClient(config.supabaseUrl!, config.supabaseServiceRoleKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return adminClient
}

/**
 * Lightweight connectivity check using the Auth Admin API (service role).
 */
export async function pingSupabase(config: AppConfig = loadConfig()): Promise<boolean> {
  const client = getSupabaseAdmin(config)
  if (!client) {
    return false
  }

  const { error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 })
  if (error) {
    throw error
  }
  return true
}

/** Reset singleton (tests only). */
export function resetSupabaseAdminForTests(): void {
  adminClient = null
}
