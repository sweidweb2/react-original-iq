import { Router } from 'express'

import type { AppConfig } from '../../config/index.js'
import { createAuthenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { LoggingController } from './logging.controller.js'
import { listActivityQuerySchema, listErrorsQuerySchema } from './logging.schema.js'

export function createLoggingRoutes(controller: LoggingController, config: AppConfig): Router {
  const router = Router()
  const authenticate = createAuthenticate(config)

  router.get(
    '/activity-logs',
    authenticate,
    requirePermission('view_activity_logs'),
    validate({ query: listActivityQuerySchema }),
    controller.listActivity,
  )
  router.get(
    '/activity-logs/stats',
    authenticate,
    requirePermission('view_activity_logs'),
    controller.activityStats,
  )

  // Stacks and request metadata are sensitive: super only.
  router.get(
    '/error-logs',
    authenticate,
    requirePermission('view_error_logs'),
    validate({ query: listErrorsQuerySchema }),
    controller.listErrors,
  )
  router.get(
    '/error-logs/stats',
    authenticate,
    requirePermission('view_error_logs'),
    controller.errorStats,
  )

  return router
}
