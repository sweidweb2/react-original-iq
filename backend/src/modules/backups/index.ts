import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { getStorageService, type StorageService } from '../../storage/index.js'
import { createBackupsController } from './backups.controller.js'
import { type BackupsRepository, createBackupsRepository } from './backups.repository.js'
import { createBackupsRoutes } from './backups.routes.js'
import { createBackupsService } from './backups.service.js'

export function createBackupsModule(
  config: AppConfig = loadConfig(),
  deps: { repository?: BackupsRepository; storage?: StorageService } = {},
) {
  const service = createBackupsService({
    repository: deps.repository ?? createBackupsRepository(config),
    storage: deps.storage ?? getStorageService(config),
  })
  return createBackupsRoutes(createBackupsController(service))
}
