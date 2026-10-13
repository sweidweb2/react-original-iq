import { Router } from 'express'

import type { AppConfig } from '../../config/index.js'
import { createAuthRateLimiter } from '../../middleware/rate-limit.js'
import { validate } from '../../middleware/validate.js'
import type { ContactController } from './contact.controller.js'
import { contactMessageBodySchema, leadBodySchema, newsletterBodySchema } from './contact.schema.js'

export function createContactRoutes(controller: ContactController, config: AppConfig): Router {
  const router = Router()
  const limiter = createAuthRateLimiter(config)

  router.post(
    '/messages',
    limiter,
    validate({ body: contactMessageBodySchema }),
    controller.createMessage,
  )
  router.post(
    '/newsletter',
    limiter,
    validate({ body: newsletterBodySchema }),
    controller.subscribe,
  )
  router.post('/leads', limiter, validate({ body: leadBodySchema }), controller.createLead)

  return router
}
