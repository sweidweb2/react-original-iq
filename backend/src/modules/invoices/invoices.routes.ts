import { Router } from 'express'

import type { AppConfig } from '../../config/index.js'
import { createAuthenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { InvoicesController } from './invoices.controller.js'
import { invoiceIdParamsSchema } from './invoices.schema.js'

export function createInvoicesRoutes(controller: InvoicesController, config: AppConfig): Router {
  const router = Router()

  router.use(createAuthenticate(config))
  router.get('/:id/download', validate({ params: invoiceIdParamsSchema }), controller.download)
  router.post(
    '/:id/resend',
    authorize('admin', 'super'),
    validate({ params: invoiceIdParamsSchema }),
    controller.resend,
  )

  return router
}
