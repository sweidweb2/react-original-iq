import type { NextFunction, Request, Response } from 'express'

import { unauthorized } from '../../errors/app-error.js'
import type {
  CreateRevisionBody,
  TutorSubmitRevisionBody,
  UpdateRevisionBody,
} from './revisions.schema.js'
import type { RevisionsService } from './revisions.service.js'

export type RevisionsController = {
  createForTask: (req: Request, res: Response, next: NextFunction) => Promise<void>
  listForTask: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getById: (req: Request, res: Response, next: NextFunction) => Promise<void>
  update: (req: Request, res: Response, next: NextFunction) => Promise<void>
  cancel: (req: Request, res: Response, next: NextFunction) => Promise<void>
  approve: (req: Request, res: Response, next: NextFunction) => Promise<void>
  reject: (req: Request, res: Response, next: NextFunction) => Promise<void>
  tutorSubmit: (req: Request, res: Response, next: NextFunction) => Promise<void>
  tutorCancelSubmit: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

function requireActor(req: Request) {
  if (!req.user) {
    throw unauthorized()
  }
  return { id: req.user.id, roles: req.user.roles }
}

export function createRevisionsController(service: RevisionsService): RevisionsController {
  return {
    async createForTask(req, res, next) {
      try {
        const actor = requireActor(req)
        const revision = await service.createForTask(
          String(req.params.id),
          req.body as CreateRevisionBody,
          actor,
        )
        res.status(201).json(revision)
      } catch (error) {
        next(error)
      }
    },
    async listForTask(req, res, next) {
      try {
        const actor = requireActor(req)
        const rows = await service.listForTask(String(req.params.id), actor)
        res.status(200).json({ data: rows })
      } catch (error) {
        next(error)
      }
    },
    async getById(req, res, next) {
      try {
        const actor = requireActor(req)
        const revision = await service.getById(String(req.params.id), actor)
        res.status(200).json(revision)
      } catch (error) {
        next(error)
      }
    },
    async update(req, res, next) {
      try {
        const actor = requireActor(req)
        const revision = await service.update(
          String(req.params.id),
          req.body as UpdateRevisionBody,
          actor,
        )
        res.status(200).json(revision)
      } catch (error) {
        next(error)
      }
    },
    async cancel(req, res, next) {
      try {
        const actor = requireActor(req)
        const revision = await service.cancel(String(req.params.id), actor)
        res.status(200).json(revision)
      } catch (error) {
        next(error)
      }
    },
    async approve(req, res, next) {
      try {
        const actor = requireActor(req)
        const revision = await service.approve(String(req.params.id), actor)
        res.status(200).json(revision)
      } catch (error) {
        next(error)
      }
    },
    async reject(req, res, next) {
      try {
        const actor = requireActor(req)
        const revision = await service.reject(String(req.params.id), actor)
        res.status(200).json(revision)
      } catch (error) {
        next(error)
      }
    },
    async tutorSubmit(req, res, next) {
      try {
        const actor = requireActor(req)
        const revision = await service.tutorSubmit(
          String(req.params.id),
          req.body as TutorSubmitRevisionBody,
          actor,
        )
        res.status(200).json(revision)
      } catch (error) {
        next(error)
      }
    },
    async tutorCancelSubmit(req, res, next) {
      try {
        const actor = requireActor(req)
        const revision = await service.tutorCancelSubmit(String(req.params.id), actor)
        res.status(200).json(revision)
      } catch (error) {
        next(error)
      }
    },
  }
}
