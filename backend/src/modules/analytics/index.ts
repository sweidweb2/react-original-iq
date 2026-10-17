import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { createAnalyticsController } from './analytics.controller.js'
import { type AnalyticsRepository, createAnalyticsRepository } from './analytics.repository.js'
import { createAnalyticsRoutes } from './analytics.routes.js'
import { createAnalyticsService } from './analytics.service.js'

export function createAnalyticsModule(
  config: AppConfig = loadConfig(),
  deps: { repository?: AnalyticsRepository } = {},
) {
  const service = createAnalyticsService(deps.repository ?? createAnalyticsRepository(config))
  return createAnalyticsRoutes(createAnalyticsController(service))
}
