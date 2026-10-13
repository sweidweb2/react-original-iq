import type { RequestHandler } from 'express'

import { respond } from '../../middleware/respond.js'
import type { ContactService } from './contact.service.js'

export type ContactController = {
  createMessage: RequestHandler
  subscribe: RequestHandler
  createLead: RequestHandler
}

export function createContactController(service: ContactService): ContactController {
  return {
    createMessage: respond(201, (req) => service.createMessage(req.body)),
    subscribe: respond(201, (req) => service.subscribe(req.body)),
    createLead: respond(201, (req) => service.createLead(req.body)),
  }
}
