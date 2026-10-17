import { Router } from 'express'

import type { AppConfig } from '../../config/index.js'
import { createAuthenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
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
    authorize('client'),
    validate({ body: createFeedbackBodySchema }),
    controller.create,
  )
  router.get('/', validate({ query: listFeedbackQuerySchema }), controller.list)
  router.delete(
    '/:id',
    authorize('super', 'admin'),
    validate({ params: feedbackIdParamsSchema }),
    controller.remove,
  )

  return router
}
