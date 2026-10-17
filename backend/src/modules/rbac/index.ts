import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { createRbacController } from './rbac.controller.js'
import { createRbacRepository } from './rbac.repository.js'
import { createRbacRoutes } from './rbac.routes.js'
import { createRbacService, type RbacService } from './rbac.service.js'

export function createRbacModule(config: AppConfig = loadConfig(), service?: RbacService) {
  const rbac = service ?? createRbacService(createRbacRepository(config))
  const controller = createRbacController(rbac)
  return createRbacRoutes(controller, config)
}

export type { RbacService } from './rbac.service.js'
export type { RbacPermission, RbacRole } from './rbac.types.js'
