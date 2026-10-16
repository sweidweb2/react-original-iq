import { Router } from 'express'

import type { AppConfig } from '../config/index.js'
import { loadConfig } from '../config/index.js'
import { createAuthModule } from '../modules/auth/index.js'
import { createContactModule } from '../modules/contact/index.js'
import { createExportsModule } from '../modules/exports/index.js'
import { createFeedbackModule } from '../modules/feedback/index.js'
import { createHealthController } from '../modules/health/health.controller.js'
import { createHealthRepository } from '../modules/health/health.repository.js'
import { createHealthRoutes } from '../modules/health/health.routes.js'
import { createHealthService } from '../modules/health/health.service.js'
import { createLoggingModule } from '../modules/logging/index.js'
import { createPaymentsModule } from '../modules/payments/index.js'
import type { PaymentsRepository } from '../modules/payments/payments.repository.js'
import { createRbacModule } from '../modules/rbac/index.js'
import { createRevisionsModule } from '../modules/revisions/index.js'
import { createTasksModule } from '../modules/tasks/index.js'
import { createTasksRepository } from '../modules/tasks/tasks.repository.js'
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

  const usersRepository = createUsersRepository(config)
  const users = createUsersService(usersRepository)

  const paymentsRepositoryRef: { current?: PaymentsRepository } = {}
  const tasksRepository = createTasksRepository(config, {
    hasPayments: (taskId) => {
      const repo = paymentsRepositoryRef.current
      return repo ? repo.hasAnyForTask(taskId) : Promise.resolve(false)
    },
  })

  const paymentsModule = createPaymentsModule(config, tasksRepository)
  paymentsRepositoryRef.current = paymentsModule.repository
  const revisionsModule = createRevisionsModule(config, tasksRepository)

  router.use('/health', createHealthRoutes(healthController))
  router.use('/contact', createContactModule(config))
  router.use('/feedback', createFeedbackModule(config))
  router.use('/auth', createAuthModule(config, users))
  router.use(createLoggingModule())
  router.use('/users', createUsersModule(config, users))
  router.use(
    '/tasks',
    createTasksModule(config, users, {
      tasksRepository,
      revisionsModule,
      paymentsModule,
    }),
  )
  router.use('/revisions', revisionsModule.detailRoutes)
  router.use(
    '/exports',
    createExportsModule(config, {
      tasksRepository,
      paymentsRepository: paymentsModule.repository,
    }),
  )
  router.use('/rbac', createRbacModule(config))

  return router
}
