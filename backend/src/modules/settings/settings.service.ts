import type { AuthActor } from '../../authz/ownership.js'
import { reportError } from '../../errors/report-error.js'
import { getLoggingService } from '../logging/index.js'
import type { SettingsRepository } from './settings.repository.js'
import type { UpdateSettingsBody } from './settings.schema.js'
import type { MaintenanceStatus, PlatformSettings } from './settings.types.js'

/** Each serverless instance re-reads the row at most this often; updates on the same instance apply at once. */
export const SETTINGS_CACHE_TTL_MS = 10_000

export type SettingsService = {
  get: () => Promise<PlatformSettings>
  getStatus: () => Promise<MaintenanceStatus>
  update: (input: UpdateSettingsBody, actor: AuthActor) => Promise<PlatformSettings>
  isMaintenance: () => Promise<boolean>
  isEmailSendingEnabled: () => Promise<boolean>
}

export type SettingsServiceOptions = {
  ttlMs?: number
  now?: () => number
}

export function createSettingsService(
  repository: SettingsRepository,
  options: SettingsServiceOptions = {},
): SettingsService {
  const ttlMs = options.ttlMs ?? SETTINGS_CACHE_TTL_MS
  const now = options.now ?? Date.now
  let cached: { value: PlatformSettings; expiresAt: number } | null = null
  let lastKnown: PlatformSettings | null = null

  async function load(): Promise<PlatformSettings> {
    if (cached && cached.expiresAt > now()) return cached.value
    const value = await repository.get()
    cached = { value, expiresAt: now() + ttlMs }
    lastKnown = value
    return value
  }

  /** Gate checks must not take the whole API down when the settings read fails. */
  async function loadForGate(): Promise<Pick<PlatformSettings, 'maintenanceMode' | 'emailsSend'>> {
    try {
      return await load()
    } catch (error) {
      reportError(error, { source: 'settings.read' })
      return lastKnown ?? { maintenanceMode: false, emailsSend: true }
    }
  }

  return {
    get: load,

    async getStatus() {
      const { maintenanceMode } = await loadForGate()
      return { maintenanceMode }
    },

    async update(input, actor) {
      const before = await load()
      const updated = await repository.update({ ...input, updatedBy: actor.id })
      cached = { value: updated, expiresAt: now() + ttlMs }
      lastKnown = updated
      getLoggingService().recordActivitySafe({
        userId: actor.id,
        action: 'settings.update',
        entity: 'settings',
        meta: {
          before: { maintenanceMode: before.maintenanceMode, emailsSend: before.emailsSend },
          after: { maintenanceMode: updated.maintenanceMode, emailsSend: updated.emailsSend },
        },
      })
      return updated
    },

    async isMaintenance() {
      return (await loadForGate()).maintenanceMode
    },

    async isEmailSendingEnabled() {
      return (await loadForGate()).emailsSend
    },
  }
}
