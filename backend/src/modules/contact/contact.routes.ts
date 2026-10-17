import { Router } from 'express'

import type { AppConfig } from '../../config/index.js'
import { createAuthenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { createAuthRateLimiter } from '../../middleware/rate-limit.js'
import { validate } from '../../middleware/validate.js'
import type { ContactController } from './contact.controller.js'
import {
  contactIdParamsSchema,
  contactMessageBodySchema,
  leadBodySchema,
  listContactQuerySchema,
  newsletterBodySchema,
  updateLeadBodySchema,
  updateMessageBodySchema,
  updateNewsletterBodySchema,
} from './contact.schema.js'

const ADMIN_GATE = ['super', 'admin'] as const
const EXPORT_GATE = ['super'] as const

export function createContactRoutes(controller: ContactController, config: AppConfig): Router {
  const router = Router()
  const limiter = createAuthRateLimiter(config)
  const authenticate = createAuthenticate(config)

  router.post(
    '/messages',
    limiter,
    validate({ body: contactMessageBodySchema }),
    controller.createMessage,
  )
  router.get('/messages/export', authenticate, authorize(...EXPORT_GATE), controller.exportMessages)
  router.get(
    '/messages',
    authenticate,
    authorize(...ADMIN_GATE),
    validate({ query: listContactQuerySchema }),
    controller.listMessages,
  )
  router.get(
    '/messages/:id',
    authenticate,
    authorize(...ADMIN_GATE),
    validate({ params: contactIdParamsSchema }),
    controller.getMessage,
  )
  router.patch(
    '/messages/:id',
    authenticate,
    authorize(...ADMIN_GATE),
    validate({ params: contactIdParamsSchema, body: updateMessageBodySchema }),
    controller.updateMessage,
  )
  router.delete(
    '/messages/:id',
    authenticate,
    authorize(...ADMIN_GATE),
    validate({ params: contactIdParamsSchema }),
    controller.deleteMessage,
  )

  router.post(
    '/newsletter',
    limiter,
    validate({ body: newsletterBodySchema }),
    controller.subscribe,
  )
  router.get(
    '/newsletter/export',
    authenticate,
    authorize(...EXPORT_GATE),
    controller.exportNewsletter,
  )
  router.get(
    '/newsletter/export.pdf',
    authenticate,
    authorize(...EXPORT_GATE),
    controller.exportNewsletterPdf,
  )
  router.get(
    '/newsletter',
    authenticate,
    authorize(...ADMIN_GATE),
    validate({ query: listContactQuerySchema }),
    controller.listNewsletter,
  )
  router.patch(
    '/newsletter/:id',
    authenticate,
    authorize(...ADMIN_GATE),
    validate({ params: contactIdParamsSchema, body: updateNewsletterBodySchema }),
    controller.updateNewsletter,
  )
  router.delete(
    '/newsletter/:id',
    authenticate,
    authorize(...ADMIN_GATE),
    validate({ params: contactIdParamsSchema }),
    controller.deleteNewsletter,
  )

  router.post('/leads', limiter, validate({ body: leadBodySchema }), controller.createLead)
  router.get('/leads/export', authenticate, authorize(...EXPORT_GATE), controller.exportLeads)
  router.get(
    '/leads/export.pdf',
    authenticate,
    authorize(...EXPORT_GATE),
    controller.exportLeadsPdf,
  )
  router.get(
    '/leads',
    authenticate,
    authorize(...ADMIN_GATE),
    validate({ query: listContactQuerySchema }),
    controller.listLeads,
  )
  router.patch(
    '/leads/:id',
    authenticate,
    authorize(...ADMIN_GATE),
    validate({ params: contactIdParamsSchema, body: updateLeadBodySchema }),
    controller.updateLead,
  )
  router.delete(
    '/leads/:id',
    authenticate,
    authorize(...ADMIN_GATE),
    validate({ params: contactIdParamsSchema }),
    controller.deleteLead,
  )

  return router
}
