/**
 * Database access surface (Supabase).
 *
 * - Repositories import clients from here only.
 * - Controllers/services must not import Supabase.
 */
export { createSupabaseRateLimitStore } from './rate-limit-store.js'
export { selectAllRows } from './select-all.js'
export { getSupabaseAdmin, pingSupabase, resetSupabaseAdminForTests } from './supabase.js'
