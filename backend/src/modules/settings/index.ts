import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { createSettingsController } from './settings.controller.js'
import { createSettingsRepository } from './settings.repository.js'
import { createSettingsRoutes } from './settings.routes.js'
import { createSettingsService, type SettingsService } from './settings.service.js'

export function createSettingsModule(
  config: AppConfig = loadConfig(),
  service: SettingsService = createSettingsService(createSettingsRepository(config)),
) {
  return { service, routes: createSettingsRoutes(createSettingsController(service), config) }
}

export type { SettingsService }
export { createSettingsRepository, resetSettingsRepositoryForTests } from './settings.repository.js'
export { createSettingsService }
export type { MaintenanceStatus, PlatformSettings } from './settings.types.js'
