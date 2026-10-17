import type { NextFunction, Request, Response } from 'express'

import type { ListActivityQuery, ListErrorsQuery } from './logging.schema.js'
import type { LoggingService } from './logging.service.js'

export type LoggingController = {
  listActivity: (req: Request, res: Response, next: NextFunction) => Promise<void>
  activityStats: (req: Request, res: Response, next: NextFunction) => Promise<void>
  listErrors: (req: Request, res: Response, next: NextFunction) => Promise<void>
  errorStats: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createLoggingController(service: LoggingService): LoggingController {
  return {
    async listActivity(req, res, next) {
      try {
        const query = req.query as unknown as ListActivityQuery
        const result = await service.listActivity({
          page: query.page ?? 1,
          limit: query.limit ?? 20,
          search: query.search,
          actionPrefix: query.actionPrefix,
          entity: query.entity,
          since: query.since,
        })
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },

    async activityStats(_req, res, next) {
      try {
        const stats = await service.getActivityStats()
        res.status(200).json(stats)
      } catch (error) {
        next(error)
      }
    },

    async listErrors(req, res, next) {
      try {
        const query = req.query as unknown as ListErrorsQuery
        const result = await service.listErrors({
          page: query.page ?? 1,
          limit: query.limit ?? 20,
          search: query.search,
          source: query.source,
          level: query.level,
          since: query.since,
        })
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },

    async errorStats(_req, res, next) {
      try {
        const stats = await service.getErrorStats()
        res.status(200).json(stats)
      } catch (error) {
        next(error)
      }
    },
  }
}
