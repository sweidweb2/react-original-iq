import type { NextFunction, Request, Response } from 'express'

import { unauthorized } from '../../errors/app-error.js'
import type {
  CreateSpecializationBody,
  ListSpecializationsQuery,
} from './specializations.schema.js'
import type { SpecializationsService } from './specializations.service.js'

export type SpecializationsController = {
  list: (req: Request, res: Response, next: NextFunction) => Promise<void>
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>
  remove: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

function requireActor(req: Request) {
  if (!req.user) throw unauthorized()
  return { id: req.user.id, roles: req.user.roles }
}

export function createSpecializationsController(
  service: SpecializationsService,
): SpecializationsController {
  return {
    async list(req, res, next) {
      try {
        const data = await service.list(
          req.query as unknown as ListSpecializationsQuery,
          requireActor(req),
        )
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },
    async create(req, res, next) {
      try {
        const row = await service.create(req.body as CreateSpecializationBody, requireActor(req))
        res.status(201).json(row)
      } catch (error) {
        next(error)
      }
    },
    async remove(req, res, next) {
      try {
        await service.remove(String(req.params.id), requireActor(req))
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
  }
}
