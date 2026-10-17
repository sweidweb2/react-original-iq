import type { RequestHandler } from 'express'

import { requireActor, respond } from '../../middleware/respond.js'
import type {
  CreateRevisionBody,
  TutorSubmitRevisionBody,
  UpdateRevisionBody,
} from './revisions.schema.js'
import type { RevisionsService } from './revisions.service.js'

export type RevisionsController = {
  createForTask: RequestHandler
  listForTask: RequestHandler
  getById: RequestHandler
  update: RequestHandler
  cancel: RequestHandler
  approve: RequestHandler
  reject: RequestHandler
  tutorSubmit: RequestHandler
  tutorCancelSubmit: RequestHandler
}

export function createRevisionsController(service: RevisionsService): RevisionsController {
  return {
    createForTask: respond(201, (req) =>
      service.createForTask(
        String(req.params.id),
        req.body as CreateRevisionBody,
        requireActor(req),
      ),
    ),
    listForTask: respond(200, async (req) => ({
      data: await service.listForTask(String(req.params.id), requireActor(req)),
    })),
    getById: respond(200, (req) => service.getById(String(req.params.id), requireActor(req))),
    update: respond(200, (req) =>
      service.update(String(req.params.id), req.body as UpdateRevisionBody, requireActor(req)),
    ),
    cancel: respond(200, (req) => service.cancel(String(req.params.id), requireActor(req))),
    approve: respond(200, (req) => service.approve(String(req.params.id), requireActor(req))),
    reject: respond(200, (req) => service.reject(String(req.params.id), requireActor(req))),
    tutorSubmit: respond(200, (req) =>
      service.tutorSubmit(
        String(req.params.id),
        req.body as TutorSubmitRevisionBody,
        requireActor(req),
      ),
    ),
    tutorCancelSubmit: respond(200, (req) =>
      service.tutorCancelSubmit(String(req.params.id), requireActor(req)),
    ),
  }
}
