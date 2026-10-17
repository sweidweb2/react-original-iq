import { Router } from 'express'

import { SUPER_ROLES } from '../../authz/index.js'
import type { AppConfig } from '../../config/index.js'
import { createAuthenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { ExportsController } from './exports.controller.js'
import { exportResourceParamsSchema } from './exports.schema.js'

export function createExportsRoutes(controller: ExportsController, config: AppConfig): Router {
  const router = Router()

  router.use(createAuthenticate(config))
  router.get(
    '/:resource',
    authorize(...SUPER_ROLES),
    validate({ params: exportResourceParamsSchema }),
    controller.exportResource,
  )

  return router
}
