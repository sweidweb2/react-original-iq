import { serviceUnavailable } from '../../errors/app-error.js'
import { ErrorCodes } from '../../errors/error-codes.js'
import type { HealthRepository } from './health.repository.js'
import type { HealthDbStatus, HealthStatus } from './health.types.js'

export type HealthService = {
  getHealth: () => HealthStatus
  getDbHealth: () => Promise<HealthDbStatus>
}

export function createHealthService(repository: HealthRepository): HealthService {
  return {
    getHealth() {
      return { ok: true }
    },

    async getDbHealth() {
      const result = await repository.ping()
      if (result === 'not_configured') {
        throw serviceUnavailable(ErrorCodes.DB_NOT_CONFIGURED, 'Supabase is not configured')
      }
      if (result !== 'ok') {
        throw serviceUnavailable(ErrorCodes.DB_UNAVAILABLE, 'Database is unavailable')
      }
      return { ok: true, db: true }
    },
  }
}
