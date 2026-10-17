import { Router } from 'express'

import type { AppConfig } from '../../config/index.js'
import { createAuthenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/authorize.js'
import { createAuthRateLimiter } from '../../middleware/rate-limit.js'
import { validate } from '../../middleware/validate.js'
import type { ContactController } from './contact.controller.js'
import {
  contactIdParamsSchema,
  contactMessageBodySchema,
  exportContactQuerySchema,
  leadBodySchema,
  listContactQuerySchema,
  newsletterBodySchema,
  updateLeadBodySchema,
  updateMessageBodySchema,
  updateNewsletterBodySchema,
} from './contact.schema.js'

export function createContactRoutes(controller: ContactController, config: AppConfig): Router {
  const router = Router()
  const limiter = createAuthRateLimiter(config)
  const authenticate = createAuthenticate(config)
  const exportGuard = [
    authenticate,
    requirePermission('export_data'),
    validate({ query: exportContactQuerySchema }),
  ]

  router.post(
    '/messages',
    limiter,
    validate({ body: contactMessageBodySchema }),
    controller.createMessage,
  )
  router.get('/messages/export', ...exportGuard, controller.exportMessages)
  router.get(
    '/messages',
    authenticate,
    requirePermission('manage_contact_messages'),
    validate({ query: listContactQuerySchema }),
    controller.listMessages,
  )
  router.get(
    '/messages/:id',
    authenticate,
    requirePermission('manage_contact_messages'),
    validate({ params: contactIdParamsSchema }),
    controller.getMessage,
  )
  router.patch(
    '/messages/:id',
    authenticate,
    requirePermission('manage_contact_messages'),
    validate({ params: contactIdParamsSchema, body: updateMessageBodySchema }),
    controller.updateMessage,
  )
  router.delete(
    '/messages/:id',
    authenticate,
    requirePermission('manage_contact_messages'),
    validate({ params: contactIdParamsSchema }),
    controller.deleteMessage,
  )

  router.post(
    '/newsletter',
    limiter,
    validate({ body: newsletterBodySchema }),
    controller.subscribe,
  )
  router.get('/newsletter/export', ...exportGuard, controller.exportNewsletter)
  router.get('/newsletter/export.pdf', ...exportGuard, controller.exportNewsletterPdf)
  router.get(
    '/newsletter',
    authenticate,
    requirePermission('manage_newsletter'),
    validate({ query: listContactQuerySchema }),
    controller.listNewsletter,
  )
  router.patch(
    '/newsletter/:id',
    authenticate,
    requirePermission('manage_newsletter'),
    validate({ params: contactIdParamsSchema, body: updateNewsletterBodySchema }),
    controller.updateNewsletter,
  )
  router.delete(
    '/newsletter/:id',
    authenticate,
    requirePermission('manage_newsletter'),
    validate({ params: contactIdParamsSchema }),
    controller.deleteNewsletter,
  )

  router.post('/leads', limiter, validate({ body: leadBodySchema }), controller.createLead)
  router.get('/leads/export', ...exportGuard, controller.exportLeads)
  router.get('/leads/export.pdf', ...exportGuard, controller.exportLeadsPdf)
  router.get(
    '/leads',
    authenticate,
    requirePermission('manage_leads'),
    validate({ query: listContactQuerySchema }),
    controller.listLeads,
  )
  router.patch(
    '/leads/:id',
    authenticate,
    requirePermission('manage_leads'),
    validate({ params: contactIdParamsSchema, body: updateLeadBodySchema }),
    controller.updateLead,
  )
  router.delete(
    '/leads/:id',
    authenticate,
    requirePermission('manage_leads'),
    validate({ params: contactIdParamsSchema }),
    controller.deleteLead,
  )

  return router
}
