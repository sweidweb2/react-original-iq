import type { RequestHandler } from 'express'

import { requireActor, respond, respondEmpty } from '../../middleware/respond.js'
import type { CreateFeedbackBody, ListFeedbackQuery } from './feedback.schema.js'
import type { FeedbackService } from './feedback.service.js'

export type FeedbackController = {
  create: RequestHandler
  list: RequestHandler
  remove: RequestHandler
}

export function createFeedbackController(service: FeedbackService): FeedbackController {
  return {
    create: respond(201, (req) =>
      service.createFeedback(req.body as CreateFeedbackBody, requireActor(req)),
    ),
    list: respond(200, (req) =>
      service.listFeedback(req.query as unknown as ListFeedbackQuery, requireActor(req)),
    ),
    remove: respondEmpty(204, (req) =>
      service.deleteFeedback(String(req.params.id), requireActor(req)),
    ),
  }
}
