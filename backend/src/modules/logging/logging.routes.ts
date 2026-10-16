import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { LoggingController } from './logging.controller.js'
import { listActivityQuerySchema, listLogsQuerySchema } from './logging.schema.js'

export function createLoggingRoutes(controller: LoggingController): Router {
  const router = Router()

  router.get(
    '/activity-logs',
    authenticate,
    authorize('super', 'admin'),
    validate({ query: listActivityQuerySchema }),
    controller.listActivity,
  )
  router.get(
    '/activity-logs/stats',
    authenticate,
    authorize('super', 'admin'),
    controller.activityStats,
  )

  router.get(
    '/error-logs',
    authenticate,
    authorize('super', 'admin'),
    validate({ query: listLogsQuerySchema }),
    controller.listErrors,
  )

  return router
}
