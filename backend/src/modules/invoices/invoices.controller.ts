import type { RequestHandler } from 'express'

import { requireActor, respond } from '../../middleware/respond.js'
import type { InvoicesService } from './invoices.service.js'

export type InvoicesController = {
  download: RequestHandler
  resend: RequestHandler
}

export function createInvoicesController(service: InvoicesService): InvoicesController {
  return {
    download: respond(200, (req) =>
      service.getDownloadUrl(String(req.params.id), requireActor(req)),
    ),
    resend: respond(200, (req) => service.resend(String(req.params.id), requireActor(req))),
  }
}
