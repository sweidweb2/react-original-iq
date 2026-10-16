import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { ExportsController } from './exports.controller.js'
import { exportResourceParamsSchema } from './exports.schema.js'

export function createExportsRoutes(controller: ExportsController): Router {
  const router = Router()

  router.use(authenticate)
  router.get(
    '/:resource',
    authorize('super', 'admin'),
    validate({ params: exportResourceParamsSchema }),
    controller.exportResource,
  )

  return router
}
