import { Router } from 'express'

import { USER_ADMIN_ROLES } from '../../authz/index.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import type { AnalyticsController } from './analytics.controller.js'

export function createAnalyticsRoutes(controller: AnalyticsController): Router {
  const router = Router()

  router.use(authenticate)
  router.use(authorize(...USER_ADMIN_ROLES))

  router.get('/overview', controller.getOverview)

  return router
}
