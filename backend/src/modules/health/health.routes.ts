import { Router } from 'express'

import type { HealthController } from './health.controller.js'

export function createHealthRoutes(controller: HealthController): Router {
  const router = Router()

  router.get('/', controller.getHealth)
  router.get('/db', controller.getDbHealth)

  return router
}
