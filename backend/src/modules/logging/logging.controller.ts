import type { NextFunction, Request, Response } from 'express'

import type { LoggingService } from './logging.service.js'

export type LoggingController = {
  listActivity: (req: Request, res: Response, next: NextFunction) => Promise<void>
  listErrors: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createLoggingController(service: LoggingService): LoggingController {
  return {
    async listActivity(req, res, next) {
      try {
        const query = req.query as { page?: number; limit?: number }
        const result = await service.listActivity({
          page: query.page ?? 1,
          limit: query.limit ?? 20,
        })
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },

    async listErrors(req, res, next) {
      try {
        const query = req.query as { page?: number; limit?: number }
        const result = await service.listErrors({
          page: query.page ?? 1,
          limit: query.limit ?? 20,
        })
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
  }
}
