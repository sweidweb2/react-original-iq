import type { RequestHandler } from 'express'

import { respond } from '../../middleware/respond.js'
import type { HealthService } from './health.service.js'

export type HealthController = {
  getHealth: RequestHandler
  getDbHealth: RequestHandler
}

export function createHealthController(service: HealthService): HealthController {
  return {
    getHealth: respond(200, () => service.getHealth()),
    getDbHealth: respond(200, () => service.getDbHealth()),
  }
}
