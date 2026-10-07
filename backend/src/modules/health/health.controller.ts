import type { NextFunction, Request, Response } from 'express'

import type { HealthService } from './health.service.js'

export type HealthController = {
  getHealth: (req: Request, res: Response, next: NextFunction) => void
  getDbHealth: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createHealthController(service: HealthService): HealthController {
  return {
    getHealth(_req, res) {
      res.status(200).json(service.getHealth())
    },

    async getDbHealth(_req, res, next) {
      try {
        const result = await service.getDbHealth()
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
  }
}
