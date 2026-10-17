import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin } from '../../database/index.js'
import type { PlatformSettings } from './settings.types.js'

export type UpdateSettingsInput = {
  maintenanceMode?: boolean
  emailsSend?: boolean
  updatedBy: string
}

export type SettingsRepository = {
  get: () => Promise<PlatformSettings>
  update: (input: UpdateSettingsInput) => Promise<PlatformSettings>
}

const SETTINGS_ID = 1

const COLUMNS = 'maintenance_mode, emails_send, updated_at, updater:updated_by (id, name, email)'

type SettingsRow = {
  maintenance_mode: boolean
  emails_send: boolean
  updated_at: string
  updater: { id: string; name: string | null; email: string } | null
}

function toSettings(row: SettingsRow): PlatformSettings {
  return {
    maintenanceMode: row.maintenance_mode,
    emailsSend: row.emails_send,
    updatedBy: row.updater,
    updatedAt: new Date(row.updated_at),
  }
}

function defaultSettings(): PlatformSettings {
  return { maintenanceMode: false, emailsSend: true, updatedBy: null, updatedAt: new Date() }
}

let memorySettings: PlatformSettings = defaultSettings()

/** Reset in-memory settings (tests only). */
export function resetSettingsRepositoryForTests(): void {
  memorySettings = defaultSettings()
}

function createMemorySettingsRepository(): SettingsRepository {
  return {
    async get() {
      return { ...memorySettings }
    },

    async update(input) {
      memorySettings = {
        maintenanceMode: input.maintenanceMode ?? memorySettings.maintenanceMode,
        emailsSend: input.emailsSend ?? memorySettings.emailsSend,
        updatedBy: { id: input.updatedBy, name: null, email: '' },
        updatedAt: new Date(),
      }
      return { ...memorySettings }
    },
  }
}

function createSupabaseSettingsRepository(config: AppConfig): SettingsRepository {
  const supabase = getSupabaseAdmin(config)
  if (!supabase) {
    throw new Error('Supabase admin client is not available')
  }
  const client = supabase

  return {
    async get() {
      const { data, error } = await client
        .from('settings')
        .select(COLUMNS)
        .eq('id', SETTINGS_ID)
        .maybeSingle()
      if (error) throw error
      return data ? toSettings(data as unknown as SettingsRow) : defaultSettings()
    },

    async update(input) {
      const patch: Record<string, unknown> = { updated_by: input.updatedBy }
      if (input.maintenanceMode !== undefined) patch.maintenance_mode = input.maintenanceMode
      if (input.emailsSend !== undefined) patch.emails_send = input.emailsSend

      const { data, error } = await client
        .from('settings')
        .upsert({ id: SETTINGS_ID, ...patch })
        .select(COLUMNS)
        .single()
      if (error) throw error
      return toSettings(data as unknown as SettingsRow)
    },
  }
}

export function createSettingsRepository(config: AppConfig = loadConfig()): SettingsRepository {
  if (isSupabaseConfigured(config)) {
    return createSupabaseSettingsRepository(config)
  }
  return createMemorySettingsRepository()
}
