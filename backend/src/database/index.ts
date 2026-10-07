/**
 * Database access surface (Supabase).
 *
 * - Repositories import clients from here only.
 * - Controllers/services must not import Supabase.
 */
export {
  getSupabaseAdmin,
  pingSupabase,
  resetSupabaseAdminForTests,
} from './supabase.js'
