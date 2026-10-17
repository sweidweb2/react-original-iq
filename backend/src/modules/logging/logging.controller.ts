import type { RequestHandler } from 'express'

import { respond } from '../../middleware/respond.js'
import type { ListActivityQuery, ListErrorsQuery } from './logging.schema.js'
import type { LoggingService } from './logging.service.js'

export type LoggingController = {
  listActivity: RequestHandler
  activityStats: RequestHandler
  listErrors: RequestHandler
  errorStats: RequestHandler
}

export function createLoggingController(service: LoggingService): LoggingController {
  return {
    listActivity: respond(200, (req) =>
      service.listActivity(req.query as unknown as ListActivityQuery),
    ),
    activityStats: respond(200, () => service.getActivityStats()),
    listErrors: respond(200, (req) => service.listErrors(req.query as unknown as ListErrorsQuery)),
    errorStats: respond(200, () => service.getErrorStats()),
  }
}
