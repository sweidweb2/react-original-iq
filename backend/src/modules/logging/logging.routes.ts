import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { LoggingController } from './logging.controller.js'
import { listLogsQuerySchema } from './logging.schema.js'

export function createLoggingRoutes(controller: LoggingController): Router {
  const router = Router()

  router.get(
    '/activity-logs',
    authenticate,
    authorize('admin'),
    validate({ query: listLogsQuerySchema }),
    controller.listActivity,
  )

  router.get(
    '/error-logs',
    authenticate,
    authorize('admin'),
    validate({ query: listLogsQuerySchema }),
    controller.listErrors,
  )

  return router
}
