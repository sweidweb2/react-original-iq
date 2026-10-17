import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { createRbacController } from './rbac.controller.js'
import { createPermissionResolver } from './rbac.permissions.js'
import { createRbacRepository, type RbacRepository } from './rbac.repository.js'
import { createRbacRoutes } from './rbac.routes.js'
import { createRbacService } from './rbac.service.js'

export function createRbacModule(
  config: AppConfig = loadConfig(),
  repository: RbacRepository = createRbacRepository(config),
) {
  const permissions = createPermissionResolver(repository)
  const service = createRbacService(repository, { onChange: permissions.invalidate })
  const routes = createRbacRoutes(createRbacController(service), config)
  return { routes, service, permissions }
}

export type { PermissionResolver } from './rbac.permissions.js'
export type { RbacService } from './rbac.service.js'
export type { RbacPermission, RbacRole } from './rbac.types.js'
