import type { NextFunction, Request, Response } from 'express'

import { respond } from '../../middleware/respond.js'
import type { ListContactQuery } from './contact.schema.js'
import type { ContactService } from './contact.service.js'

export type ContactController = {
  createMessage: ReturnType<typeof respond>
  subscribe: ReturnType<typeof respond>
  createLead: ReturnType<typeof respond>
  listLeads: (req: Request, res: Response, next: NextFunction) => Promise<void>
  deleteLead: (req: Request, res: Response, next: NextFunction) => Promise<void>
  exportLeads: (req: Request, res: Response, next: NextFunction) => Promise<void>
  listNewsletter: (req: Request, res: Response, next: NextFunction) => Promise<void>
  deleteNewsletter: (req: Request, res: Response, next: NextFunction) => Promise<void>
  exportNewsletter: (req: Request, res: Response, next: NextFunction) => Promise<void>
  listMessages: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getMessage: (req: Request, res: Response, next: NextFunction) => Promise<void>
  deleteMessage: (req: Request, res: Response, next: NextFunction) => Promise<void>
  exportMessages: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

function searchFromQuery(req: Request): string | undefined {
  const search = req.query.search
  return typeof search === 'string' && search.trim() ? search.trim() : undefined
}

export function createContactController(service: ContactService): ContactController {
  return {
    createMessage: respond(201, (req) => service.createMessage(req.body)),
    subscribe: respond(201, (req) => service.subscribe(req.body)),
    createLead: respond(201, (req) => service.createLead(req.body)),

    async listLeads(req, res, next) {
      try {
        const result = await service.listLeads(req.query as unknown as ListContactQuery)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async deleteLead(req, res, next) {
      try {
        await service.deleteLead(String(req.params.id))
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
    async exportLeads(req, res, next) {
      try {
        const csv = await service.exportLeadsCsv(searchFromQuery(req))
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"')
        res.status(200).send(csv)
      } catch (error) {
        next(error)
      }
    },
    async listNewsletter(req, res, next) {
      try {
        const result = await service.listNewsletter(req.query as unknown as ListContactQuery)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async deleteNewsletter(req, res, next) {
      try {
        await service.deleteNewsletter(String(req.params.id))
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
    async exportNewsletter(req, res, next) {
      try {
        const csv = await service.exportNewsletterCsv(searchFromQuery(req))
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', 'attachment; filename="stay-updated.csv"')
        res.status(200).send(csv)
      } catch (error) {
        next(error)
      }
    },
    async listMessages(req, res, next) {
      try {
        const result = await service.listMessages(req.query as unknown as ListContactQuery)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async getMessage(req, res, next) {
      try {
        const message = await service.getMessage(String(req.params.id))
        res.status(200).json(message)
      } catch (error) {
        next(error)
      }
    },
    async deleteMessage(req, res, next) {
      try {
        await service.deleteMessage(String(req.params.id))
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
    async exportMessages(req, res, next) {
      try {
        const csv = await service.exportMessagesCsv(searchFromQuery(req))
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', 'attachment; filename="contact-messages.csv"')
        res.status(200).send(csv)
      } catch (error) {
        next(error)
      }
    },
  }
}
