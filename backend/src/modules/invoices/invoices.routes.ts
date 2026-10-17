import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { InvoicesController } from './invoices.controller.js'
import { invoiceIdParamsSchema } from './invoices.schema.js'

export function createInvoicesRoutes(controller: InvoicesController): Router {
  const router = Router()

  router.use(authenticate)
  router.get('/:id/download', validate({ params: invoiceIdParamsSchema }), controller.download)
  router.post(
    '/:id/resend',
    authorize('admin', 'super'),
    validate({ params: invoiceIdParamsSchema }),
    controller.resend,
  )

  return router
}
