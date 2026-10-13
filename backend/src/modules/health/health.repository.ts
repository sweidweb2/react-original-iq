import type { AppConfig } from '../../config/index.js'
import { isSupabaseConfigured } from '../../config/index.js'
import { pingSupabase } from '../../database/index.js'

export type DbPingResult = 'ok' | 'not_configured' | 'unavailable'

export type HealthRepository = {
  ping: () => Promise<DbPingResult>
}

export function createHealthRepository(config: AppConfig): HealthRepository {
  return {
    async ping() {
      if (!isSupabaseConfigured(config)) {
        return 'not_configured'
      }

      try {
        const ok = await pingSupabase(config)
        return ok ? 'ok' : 'unavailable'
      } catch {
        return 'unavailable'
      }
    },
  }
}
