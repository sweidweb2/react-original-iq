import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { getLoggingService } from '../logging/index.js'
import { createAuthController } from './auth.controller.js'
import { createAuthRepository } from './auth.repository.js'
import { createAuthRoutes } from './auth.routes.js'
import { createAuthService } from './auth.service.js'

export function createAuthModule(config: AppConfig = loadConfig()) {
  const repository = createAuthRepository(config)
  const service = createAuthService(repository, config, getLoggingService())
  const controller = createAuthController(service)
  return createAuthRoutes(controller, config)
}

export { authDomain } from './auth.domain.js'
