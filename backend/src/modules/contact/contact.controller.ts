import type { NextFunction, Request, RequestHandler, Response } from 'express'

import { respond, respondEmpty } from '../../middleware/respond.js'
import type { ListContactQuery } from './contact.schema.js'
import type { ContactService } from './contact.service.js'

export type ContactController = {
  createMessage: RequestHandler
  subscribe: RequestHandler
  createLead: RequestHandler
  updateLead: RequestHandler
  listLeads: RequestHandler
  deleteLead: RequestHandler
  exportLeads: (req: Request, res: Response, next: NextFunction) => Promise<void>
  listNewsletter: RequestHandler
  updateNewsletter: RequestHandler
  deleteNewsletter: RequestHandler
  exportNewsletter: (req: Request, res: Response, next: NextFunction) => Promise<void>
  listMessages: RequestHandler
  getMessage: RequestHandler
  updateMessage: RequestHandler
  deleteMessage: RequestHandler
  exportMessages: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

function searchFromQuery(req: Request): string | undefined {
  const search = req.query.search
  return typeof search === 'string' && search.trim() ? search.trim() : undefined
}

async function sendCsv(
  res: Response,
  filename: string,
  csv: string,
): Promise<void> {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.status(200).send(csv)
}

export function createContactController(service: ContactService): ContactController {
  return {
    createMessage: respond(201, (req) => service.createMessage(req.body)),
    subscribe: respond(201, (req) => service.subscribe(req.body)),
    createLead: respond(201, (req) => service.createLead(req.body)),
    updateLead: respond(200, (req) => service.updateLead(String(req.params.id), req.body)),

    listLeads: respond(200, (req) =>
      service.listLeads(req.query as unknown as ListContactQuery),
    ),
    deleteLead: respondEmpty(204, (req) => service.deleteLead(String(req.params.id))),
    async exportLeads(req, res, next) {
      try {
        await sendCsv(res, 'leads.csv', await service.exportLeadsCsv(searchFromQuery(req)))
      } catch (error) {
        next(error)
      }
    },

    listNewsletter: respond(200, (req) =>
      service.listNewsletter(req.query as unknown as ListContactQuery),
    ),
    updateNewsletter: respond(200, (req) =>
      service.updateNewsletter(String(req.params.id), req.body),
    ),
    deleteNewsletter: respondEmpty(204, (req) =>
      service.deleteNewsletter(String(req.params.id)),
    ),
    async exportNewsletter(req, res, next) {
      try {
        await sendCsv(
          res,
          'stay-updated.csv',
          await service.exportNewsletterCsv(searchFromQuery(req)),
        )
      } catch (error) {
        next(error)
      }
    },

    listMessages: respond(200, (req) =>
      service.listMessages(req.query as unknown as ListContactQuery),
    ),
    getMessage: respond(200, (req) => service.getMessage(String(req.params.id))),
    updateMessage: respond(200, (req) => service.updateMessage(String(req.params.id), req.body)),
    deleteMessage: respondEmpty(204, (req) => service.deleteMessage(String(req.params.id))),
    async exportMessages(req, res, next) {
      try {
        await sendCsv(
          res,
          'contact-messages.csv',
          await service.exportMessagesCsv(searchFromQuery(req)),
        )
      } catch (error) {
        next(error)
      }
    },
  }
}
