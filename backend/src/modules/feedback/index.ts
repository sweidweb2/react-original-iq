import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { createFeedbackController } from './feedback.controller.js'
import {
  createFeedbackRepository,
  type FeedbackRepository,
} from './feedback.repository.js'
import { createFeedbackRoutes } from './feedback.routes.js'
import { createFeedbackService } from './feedback.service.js'

export function createFeedbackModule(
  config: AppConfig = loadConfig(),
  repository: FeedbackRepository = createFeedbackRepository(config),
) {
  const service = createFeedbackService(repository)
  const controller = createFeedbackController(service)
  return createFeedbackRoutes(controller)
}
