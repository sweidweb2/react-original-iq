import { requireActor, respond } from '../../middleware/respond.js'
import type { AnalyticsService } from './analytics.service.js'

export type AnalyticsController = {
  getOverview: ReturnType<typeof respond>
}

export function createAnalyticsController(service: AnalyticsService): AnalyticsController {
  return {
    getOverview: respond(200, (req) => service.getOverview(requireActor(req))),
  }
}
