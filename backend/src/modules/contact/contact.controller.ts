import type { NextFunction, Request, Response } from 'express'

import type { ContactService } from './contact.service.js'

export type ContactController = {
  createMessage: (req: Request, res: Response, next: NextFunction) => Promise<void>
  subscribe: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createContactController(service: ContactService): ContactController {
  return {
    async createMessage(req, res, next) {
      try {
        const result = await service.createMessage(req.body)
        res.status(201).json(result)
      } catch (error) {
        next(error)
      }
    },
    async subscribe(req, res, next) {
      try {
        const result = await service.subscribe(req.body)
        res.status(201).json(result)
      } catch (error) {
        next(error)
      }
    },
  }
}
