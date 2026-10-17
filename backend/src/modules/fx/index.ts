import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { createFxController } from './fx.controller.js'
import { createFxRepository, type FxRepository } from './fx.repository.js'
import { createFxRoutes } from './fx.routes.js'
import { createFxService } from './fx.service.js'

export function createFxModule(
  config: AppConfig = loadConfig(),
  repository: FxRepository = createFxRepository(config),
) {
  const service = createFxService(repository)
  const controller = createFxController(service)
  return createFxRoutes(controller)
}
