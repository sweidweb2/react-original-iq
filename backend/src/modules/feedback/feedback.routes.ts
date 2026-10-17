import { Router } from 'express'

import type { AppConfig } from '../../config/index.js'
import { createAuthenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { FeedbackController } from './feedback.controller.js'
import {
  createFeedbackBodySchema,
  feedbackIdParamsSchema,
  listFeedbackQuerySchema,
} from './feedback.schema.js'

export function createFeedbackRoutes(controller: FeedbackController, config: AppConfig): Router {
  const router = Router()

  router.use(createAuthenticate(config))

  router.post(
    '/',
    requirePermission('submit_feedback'),
    validate({ body: createFeedbackBodySchema }),
    controller.create,
  )
  router.get(
    '/',
    requirePermission('view_feedback'),
    validate({ query: listFeedbackQuerySchema }),
    controller.list,
  )
  router.delete(
    '/:id',
    requirePermission('delete_feedback'),
    validate({ params: feedbackIdParamsSchema }),
    controller.remove,
  )

  return router
}
