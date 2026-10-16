import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { FeedbackController } from './feedback.controller.js'
import {
  createFeedbackBodySchema,
  feedbackIdParamsSchema,
  listFeedbackQuerySchema,
} from './feedback.schema.js'

export function createFeedbackRoutes(controller: FeedbackController): Router {
  const router = Router()

  router.use(authenticate)

  router.post('/', authorize('client'), validate({ body: createFeedbackBodySchema }), controller.create)
  router.get('/', validate({ query: listFeedbackQuerySchema }), controller.list)
  router.delete(
    '/:id',
    authorize('super', 'admin'),
    validate({ params: feedbackIdParamsSchema }),
    controller.remove,
  )

  return router
}
