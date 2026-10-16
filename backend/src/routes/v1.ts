import { Router } from 'express'

import type { AppConfig } from '../config/index.js'
import { loadConfig } from '../config/index.js'
import { createAuthModule } from '../modules/auth/index.js'
import { createContactModule } from '../modules/contact/index.js'
import { createHealthController } from '../modules/health/health.controller.js'
import { createHealthRepository } from '../modules/health/health.repository.js'
import { createHealthRoutes } from '../modules/health/health.routes.js'
import { createHealthService } from '../modules/health/health.service.js'
import { createLoggingModule } from '../modules/logging/index.js'
import { createRbacModule } from '../modules/rbac/index.js'
import { createUsersModule } from '../modules/users/index.js'
import { createUsersRepository } from '../modules/users/users.repository.js'
import { createUsersService } from '../modules/users/users.service.js'

export type V1Deps = {
  config?: AppConfig
}

export function createV1Router(deps: V1Deps = {}): Router {
  const router = Router()
  const config = deps.config ?? loadConfig()

  const healthRepository = createHealthRepository(config)
  const healthService = createHealthService(healthRepository)
  const healthController = createHealthController(healthService)

  const users = createUsersService(createUsersRepository(config))

  router.use('/health', createHealthRoutes(healthController))
  router.use('/contact', createContactModule(config))
  router.use('/auth', createAuthModule(config, users))
  router.use(createLoggingModule())
  router.use('/users', createUsersModule(config, users))
  router.use('/rbac', createRbacModule(config))

  return router
}
