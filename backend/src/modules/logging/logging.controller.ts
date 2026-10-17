import type { RequestHandler } from 'express'

import { requireActor, respond, respondEmpty } from '../../middleware/respond.js'
import type { DeleteErrorLogsBody, ListActivityQuery, ListErrorsQuery } from './logging.schema.js'
import type { LoggingService } from './logging.service.js'

export type LoggingController = {
  listActivity: RequestHandler
  activityStats: RequestHandler
  listErrors: RequestHandler
  errorStats: RequestHandler
  deleteError: RequestHandler
  deleteErrors: RequestHandler
  clearErrors: RequestHandler
}

export function createLoggingController(service: LoggingService): LoggingController {
  return {
    listActivity: respond(200, (req) =>
      service.listActivity(req.query as unknown as ListActivityQuery),
    ),
    activityStats: respond(200, () => service.getActivityStats()),
    listErrors: respond(200, (req) => service.listErrors(req.query as unknown as ListErrorsQuery)),
    errorStats: respond(200, () => service.getErrorStats()),
    deleteError: respondEmpty(204, (req) =>
      service.deleteError(String(req.params.id), requireActor(req)),
    ),
    deleteErrors: respond(200, (req) =>
      service.deleteErrors((req.body as DeleteErrorLogsBody).ids, requireActor(req)),
    ),
    clearErrors: respond(200, (req) => service.clearErrors(requireActor(req))),
  }
}
