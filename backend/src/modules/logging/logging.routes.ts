import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { LoggingController } from './logging.controller.js'
import { listActivityQuerySchema, listErrorsQuerySchema } from './logging.schema.js'

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

  // Stacks and request metadata are sensitive: super only.
  router.get(
    '/error-logs',
    authenticate,
    authorize('super'),
    validate({ query: listErrorsQuerySchema }),
    controller.listErrors,
  )
  router.get('/error-logs/stats', authenticate, authorize('super'), controller.errorStats)

  return router
}
