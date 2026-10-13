import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { getLoggingService } from '../logging/index.js'
import { createUsersRepository } from '../users/users.repository.js'
import { createUsersService, type UsersService } from '../users/users.service.js'
import { createAuthController } from './auth.controller.js'
import { createAuthRoutes } from './auth.routes.js'
import { createAuthService } from './auth.service.js'

export function createAuthModule(config: AppConfig = loadConfig(), users?: UsersService) {
  const accounts = users ?? createUsersService(createUsersRepository(config))
  const service = createAuthService(accounts, config, getLoggingService())
  const controller = createAuthController(service)
  return createAuthRoutes(controller, config)
}
