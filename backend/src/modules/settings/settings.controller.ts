import type { RequestHandler } from 'express'

import { requireActor, respond } from '../../middleware/respond.js'
import type { UpdateSettingsBody } from './settings.schema.js'
import type { SettingsService } from './settings.service.js'

export type SettingsController = {
  getStatus: RequestHandler
  get: RequestHandler
  update: RequestHandler
}

export function createSettingsController(service: SettingsService): SettingsController {
  return {
    getStatus: respond(200, () => service.getStatus()),
    get: respond(200, () => service.get()),
    update: respond(200, (req) =>
      service.update(req.body as UpdateSettingsBody, requireActor(req)),
    ),
  }
}
