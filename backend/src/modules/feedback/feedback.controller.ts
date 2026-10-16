import type { NextFunction, Request, Response } from 'express'

import { unauthorized } from '../../errors/app-error.js'
import type { CreateFeedbackBody, ListFeedbackQuery } from './feedback.schema.js'
import type { FeedbackService } from './feedback.service.js'

export type FeedbackController = {
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>
  list: (req: Request, res: Response, next: NextFunction) => Promise<void>
  remove: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

function requireActor(req: Request) {
  if (!req.user) {
    throw unauthorized()
  }
  return { id: req.user.id, roles: req.user.roles }
}

export function createFeedbackController(service: FeedbackService): FeedbackController {
  return {
    async create(req, res, next) {
      try {
        const actor = requireActor(req)
        const feedback = await service.createFeedback(req.body as CreateFeedbackBody, actor)
        res.status(201).json(feedback)
      } catch (error) {
        next(error)
      }
    },
    async list(req, res, next) {
      try {
        const actor = requireActor(req)
        const result = await service.listFeedback(req.query as unknown as ListFeedbackQuery, actor)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async remove(req, res, next) {
      try {
        const actor = requireActor(req)
        await service.deleteFeedback(String(req.params.id), actor)
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
  }
}
