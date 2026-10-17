import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import type { UsersService } from '../users/users.service.js'
import { createSpecializationsController } from './specializations.controller.js'
import { createSpecializationsRepository } from './specializations.repository.js'
import { createSpecializationsRoutes } from './specializations.routes.js'
import { createSpecializationsService } from './specializations.service.js'

export function createSpecializationsModule(
  config: AppConfig = loadConfig(),
  users?: UsersService,
) {
  if (!users) {
    throw new Error('createSpecializationsModule requires a UsersService instance')
  }
  const repository = createSpecializationsRepository(config)
  const service = createSpecializationsService(repository, users)
  const controller = createSpecializationsController(service)
  return createSpecializationsRoutes(controller, config)
}
