import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import type { PaymentsController } from './payments.controller.js'
import {
  checkoutPaymentBodySchema,
  createManualPaymentBodySchema,
  createRefundBodySchema,
  taskPaymentParamsSchema,
  taskPaymentsParamsSchema,
  taskRefundParamsSchema,
  updatePaymentBodySchema,
  updateRefundStatusBodySchema,
} from './payments.schema.js'

export function createTaskPaymentsRoutes(controller: PaymentsController): Router {
  const router = Router({ mergeParams: true })

  router.use(authenticate)

  router.get('/', validate({ params: taskPaymentsParamsSchema }), controller.getTaskPayments)
  router.post(
    '/',
    validate({ params: taskPaymentsParamsSchema, body: createManualPaymentBodySchema }),
    controller.createManualPayment,
  )
  router.post(
    '/checkout',
    validate({ params: taskPaymentsParamsSchema, body: checkoutPaymentBodySchema }),
    controller.checkout,
  )
  router.get('/:paymentId', validate({ params: taskPaymentParamsSchema }), controller.getPayment)
  router.patch(
    '/:paymentId',
    validate({ params: taskPaymentParamsSchema, body: updatePaymentBodySchema }),
    controller.updatePayment,
  )
  router.delete(
    '/:paymentId',
    validate({ params: taskPaymentParamsSchema }),
    controller.deletePayment,
  )

  return router
}

export function createTaskRefundsRoutes(controller: PaymentsController): Router {
  const router = Router({ mergeParams: true })

  router.use(authenticate)
  router.post(
    '/',
    validate({ params: taskPaymentsParamsSchema, body: createRefundBodySchema }),
    controller.createRefund,
  )
  router.patch(
    '/:refundId',
    validate({ params: taskRefundParamsSchema, body: updateRefundStatusBodySchema }),
    controller.updateRefundStatus,
  )
  router.delete('/:refundId', validate({ params: taskRefundParamsSchema }), controller.deleteRefund)

  return router
}
