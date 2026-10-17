import { Router } from 'express'

import type { AppConfig } from '../../config/index.js'
import { createAuthenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { ExportsController } from './exports.controller.js'
import { exportResourceParamsSchema } from './exports.schema.js'

export function createExportsRoutes(controller: ExportsController, config: AppConfig): Router {
  const router = Router()

  router.use(createAuthenticate(config))
  router.get(
    '/:resource',
    requirePermission('export_data'),
    validate({ params: exportResourceParamsSchema }),
    controller.exportResource,
  )

  return router
}
