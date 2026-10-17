import type { RequestHandler } from 'express'

import { requireActor, respond, respondEmpty } from '../../middleware/respond.js'
import type {
  CreateSpecializationBody,
  ListSpecializationsQuery,
} from './specializations.schema.js'
import type { SpecializationsService } from './specializations.service.js'

export type SpecializationsController = {
  list: RequestHandler
  create: RequestHandler
  remove: RequestHandler
}

export function createSpecializationsController(
  service: SpecializationsService,
): SpecializationsController {
  return {
    list: respond(200, async (req) => ({
      data: await service.list(
        req.query as unknown as ListSpecializationsQuery,
        requireActor(req),
      ),
    })),
    create: respond(201, (req) =>
      service.create(req.body as CreateSpecializationBody, requireActor(req)),
    ),
    remove: respondEmpty(204, (req) => service.remove(String(req.params.id), requireActor(req))),
  }
}
