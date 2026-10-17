import type { NextFunction, Request, RequestHandler, Response } from 'express'

import { respond, respondEmpty } from '../../middleware/respond.js'
import { type ExportFile, sendExport } from '../_shared/export-file.js'
import type { ListContactQuery } from './contact.schema.js'
import type { ContactService, ExportOptions } from './contact.service.js'

type ExportHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>

export type ContactController = {
  createMessage: RequestHandler
  subscribe: RequestHandler
  createLead: RequestHandler
  updateLead: RequestHandler
  listLeads: RequestHandler
  deleteLead: RequestHandler
  exportLeads: ExportHandler
  exportLeadsPdf: ExportHandler
  listNewsletter: RequestHandler
  updateNewsletter: RequestHandler
  deleteNewsletter: RequestHandler
  exportNewsletter: ExportHandler
  exportNewsletterPdf: ExportHandler
  listMessages: RequestHandler
  getMessage: RequestHandler
  updateMessage: RequestHandler
  deleteMessage: RequestHandler
  exportMessages: ExportHandler
}

function exportOptions(req: Request): ExportOptions {
  const search = req.query.search
  return {
    search: typeof search === 'string' && search.trim() ? search.trim() : undefined,
    actorId: req.user?.id ?? null,
  }
}

function exportHandler(build: (options: ExportOptions) => Promise<ExportFile>): ExportHandler {
  return async (req, res, next) => {
    try {
      sendExport(res, await build(exportOptions(req)))
    } catch (error) {
      next(error)
    }
  }
}

export function createContactController(service: ContactService): ContactController {
  return {
    createMessage: respond(201, (req) => service.createMessage(req.body)),
    subscribe: respond(201, (req) => service.subscribe(req.body)),
    createLead: respond(201, (req) => service.createLead(req.body)),
    updateLead: respond(200, (req) => service.updateLead(String(req.params.id), req.body)),

    listLeads: respond(200, (req) => service.listLeads(req.query as unknown as ListContactQuery)),
    deleteLead: respondEmpty(204, (req) => service.deleteLead(String(req.params.id))),
    exportLeads: exportHandler((options) => service.exportLeads('csv', options)),
    exportLeadsPdf: exportHandler((options) => service.exportLeads('pdf', options)),

    listNewsletter: respond(200, (req) =>
      service.listNewsletter(req.query as unknown as ListContactQuery),
    ),
    updateNewsletter: respond(200, (req) =>
      service.updateNewsletter(String(req.params.id), req.body),
    ),
    deleteNewsletter: respondEmpty(204, (req) => service.deleteNewsletter(String(req.params.id))),
    exportNewsletter: exportHandler((options) => service.exportNewsletter('csv', options)),
    exportNewsletterPdf: exportHandler((options) => service.exportNewsletter('pdf', options)),

    listMessages: respond(200, (req) =>
      service.listMessages(req.query as unknown as ListContactQuery),
    ),
    getMessage: respond(200, (req) => service.getMessage(String(req.params.id))),
    updateMessage: respond(200, (req) => service.updateMessage(String(req.params.id), req.body)),
    deleteMessage: respondEmpty(204, (req) => service.deleteMessage(String(req.params.id))),
    exportMessages: exportHandler((options) => service.exportMessages(options)),
  }
}
