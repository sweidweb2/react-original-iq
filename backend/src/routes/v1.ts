import { Router } from 'express'

import { setPermissionSource } from '../authz/index.js'
import type { AppConfig } from '../config/index.js'
import { loadConfig } from '../config/index.js'
import { getMailer, withSendGate } from '../mail/index.js'
import { createMaintenanceGuard } from '../middleware/maintenance.js'
import { createAnalyticsModule } from '../modules/analytics/index.js'
import { createAuthModule, createAuthSessionsRepository } from '../modules/auth/index.js'
import { createBackupsModule } from '../modules/backups/index.js'
import { createContactRepository } from '../modules/contact/contact.repository.js'
import { createContactModule } from '../modules/contact/index.js'
import { createExportsModule } from '../modules/exports/index.js'
import { createFeedbackRepository } from '../modules/feedback/feedback.repository.js'
import { createFeedbackModule } from '../modules/feedback/index.js'
import { createFxModule } from '../modules/fx/index.js'
import { createHealthController } from '../modules/health/health.controller.js'
import { createHealthRepository } from '../modules/health/health.repository.js'
import { createHealthRoutes } from '../modules/health/health.routes.js'
import { createHealthService } from '../modules/health/health.service.js'
import { createInvoicesModule } from '../modules/invoices/index.js'
import { createLoggingModule } from '../modules/logging/index.js'
import { createPaymentsModule } from '../modules/payments/index.js'
import { createPaymentsRepository } from '../modules/payments/payments.repository.js'
import { createRbacModule } from '../modules/rbac/index.js'
import { createRevisionsModule } from '../modules/revisions/index.js'
import { createSettingsModule, type SettingsService } from '../modules/settings/index.js'
import { createSpecializationsModule } from '../modules/specializations/index.js'
import { createTasksModule } from '../modules/tasks/index.js'
import { createTasksRepository } from '../modules/tasks/tasks.repository.js'
import { createUsersModule } from '../modules/users/index.js'
import { createUsersRepository } from '../modules/users/users.repository.js'
import { createUsersService } from '../modules/users/users.service.js'

export type V1Deps = {
  config?: AppConfig
  settings?: SettingsService
}

export function createV1Router(deps: V1Deps = {}): Router {
  const router = Router()
  const config = deps.config ?? loadConfig()

  const rbacModule = createRbacModule(config)
  setPermissionSource(rbacModule.permissions.resolve)

  const settingsModule = createSettingsModule(config, deps.settings)
  const settings = settingsModule.service
  router.use(createMaintenanceGuard({ isMaintenance: settings.isMaintenance, config }))

  const healthRepository = createHealthRepository(config)
  const healthService = createHealthService(healthRepository)
  const healthController = createHealthController(healthService)

  const usersRepository = createUsersRepository(config)
  const authSessions = createAuthSessionsRepository(config)
  const paymentsRepository = createPaymentsRepository(config)
  const feedbackRepository = createFeedbackRepository(config)
  const contactRepository = createContactRepository(config)
  const tasksRepository = createTasksRepository(config, {
    hasPayments: (taskId) => paymentsRepository.hasAnyForTask(taskId),
  })

  const invoicesModule = createInvoicesModule(config, {
    paymentsRepository,
    tasksRepository,
    usersRepository,
    mailer: withSendGate(getMailer(), settings.isEmailSendingEnabled),
  })
  const paymentsModule = createPaymentsModule(config, {
    tasksRepository,
    invoices: invoicesModule.service,
    repository: paymentsRepository,
  })
  const revisionsModule = createRevisionsModule(config, tasksRepository)

  const users = createUsersService(usersRepository, {
    tasks: tasksRepository,
    revokeSessions: (userId) => authSessions.revokeAllForUser(userId),
  })

  router.use('/health', createHealthRoutes(healthController))
  router.use('/settings', settingsModule.routes)
  router.use('/contact', createContactModule(config, contactRepository))
  router.use(
    '/feedback',
    createFeedbackModule(config, feedbackRepository, {
      findTask: (taskId) => tasksRepository.findById(taskId),
    }),
  )
  router.use('/fx', createFxModule(config))
  router.use('/auth', createAuthModule(config, users, authSessions, settings))
  router.use(createLoggingModule(config))
  router.use('/users', createUsersModule(config, users))
  router.use('/specializations', createSpecializationsModule(config, users))
  router.use(
    '/tasks',
    createTasksModule(config, users, {
      tasksRepository,
      revisionsModule,
      paymentsModule,
    }),
  )
  router.use('/revisions', revisionsModule.detailRoutes)
  router.use('/invoices', invoicesModule.routes)
  router.use(
    '/exports',
    createExportsModule(config, {
      usersRepository,
      tasksRepository,
      paymentsRepository,
      feedbackRepository,
      contactRepository,
    }),
  )
  router.use('/rbac', rbacModule.routes)
  router.use('/backups', createBackupsModule(config))
  router.use('/analytics', createAnalyticsModule(config))

  return router
}
