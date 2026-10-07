import type { AppConfig } from '../../config/index.js'
import { isSupabaseConfigured } from '../../config/index.js'
import { pingSupabase } from '../../database/index.js'
import { serviceUnavailable } from '../../errors/app-error.js'
import { ErrorCodes } from '../../errors/error-codes.js'

export type HealthRepository = {
  ping: () => Promise<boolean>
}

export function createHealthRepository(config: AppConfig): HealthRepository {
  return {
    async ping() {
      if (!isSupabaseConfigured(config)) {
        throw serviceUnavailable(ErrorCodes.DB_NOT_CONFIGURED, 'Supabase is not configured')
      }

      try {
        return await pingSupabase(config)
      } catch {
        throw serviceUnavailable(ErrorCodes.DB_UNAVAILABLE, 'Supabase is unavailable')
      }
    },
  }
}
