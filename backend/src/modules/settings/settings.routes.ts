import { Router } from 'express'

import { SUPER_ROLES } from '../../authz/index.js'
import type { AppConfig } from '../../config/index.js'
import { createAuthenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { SettingsController } from './settings.controller.js'
import { updateSettingsBodySchema } from './settings.schema.js'

export function createSettingsRoutes(controller: SettingsController, config: AppConfig): Router {
  const router = Router()
  const authenticate = createAuthenticate(config)

  router.get('/status', controller.getStatus)

  router.get('/', authenticate, authorize(...SUPER_ROLES), controller.get)
  router.patch(
    '/',
    authenticate,
    authorize(...SUPER_ROLES),
    validate({ body: updateSettingsBodySchema }),
    controller.update,
  )

  return router
}
