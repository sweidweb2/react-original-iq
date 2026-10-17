import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { createUsersController } from './users.controller.js'
import { createUsersRepository } from './users.repository.js'
import { createUsersRoutes } from './users.routes.js'
import { createUsersService, type UsersService } from './users.service.js'

export function createUsersModule(config: AppConfig = loadConfig(), service?: UsersService) {
  const users = service ?? createUsersService(createUsersRepository(config))
  const controller = createUsersController(users)
  return createUsersRoutes(controller, config)
}
