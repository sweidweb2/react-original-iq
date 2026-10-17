import { Router } from 'express'

import type { AppConfig } from '../../config/index.js'
import { createAuthenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/authorize.js'
import type { AnalyticsController } from './analytics.controller.js'

export function createAnalyticsRoutes(controller: AnalyticsController, config: AppConfig): Router {
  const router = Router()

  router.use(createAuthenticate(config))
  router.use(requirePermission('view_reports'))

  router.get('/overview', controller.getOverview)

  return router
}
