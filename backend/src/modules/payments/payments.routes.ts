import { Router } from 'express'

import type { AppConfig } from '../../config/index.js'
import { createAuthenticate } from '../../middleware/authenticate.js'
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

export function createMontyPayCallbackRoutes(controller: PaymentsController): Router {
  const router = Router()
  router.post('/montypay/callback', controller.montyPayCallback)
  return router
}

export function createTaskPaymentsRoutes(
  controller: PaymentsController,
  config: AppConfig,
): Router {
  const router = Router({ mergeParams: true })

  router.use(createAuthenticate(config))

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

export function createTaskRefundsRoutes(controller: PaymentsController, config: AppConfig): Router {
  const router = Router({ mergeParams: true })

  router.use(createAuthenticate(config))
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
