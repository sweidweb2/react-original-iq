import type { RequestHandler } from 'express'

import { requireActor, respond, respondEmpty } from '../../middleware/respond.js'
import type {
  CheckoutPaymentBody,
  CreateManualPaymentBody,
  CreateRefundBody,
  UpdateRefundStatusBody,
} from './payments.schema.js'
import type { PaymentsService } from './payments.service.js'

export type PaymentsController = {
  getTaskPayments: RequestHandler
  createManualPayment: RequestHandler
  checkout: RequestHandler
  deletePayment: RequestHandler
  createRefund: RequestHandler
  updateRefundStatus: RequestHandler
  deleteRefund: RequestHandler
}

export function createPaymentsController(service: PaymentsService): PaymentsController {
  return {
    getTaskPayments: respond(200, (req) =>
      service.getTaskPayments(String(req.params.id), requireActor(req)),
    ),
    createManualPayment: respond(201, (req) =>
      service.createManualPayment(
        String(req.params.id),
        req.body as CreateManualPaymentBody,
        requireActor(req),
      ),
    ),
    checkout: respond(201, (req) =>
      service.checkout(String(req.params.id), req.body as CheckoutPaymentBody, requireActor(req)),
    ),
    deletePayment: respondEmpty(204, (req) =>
      service.deletePayment(String(req.params.id), String(req.params.paymentId), requireActor(req)),
    ),
    createRefund: respond(201, (req) =>
      service.createRefund(String(req.params.id), req.body as CreateRefundBody, requireActor(req)),
    ),
    updateRefundStatus: respond(200, (req) => {
      const body = req.body as UpdateRefundStatusBody
      return service.updateRefundStatus(
        String(req.params.id),
        String(req.params.refundId),
        body.status,
        requireActor(req),
      )
    }),
    deleteRefund: respondEmpty(204, (req) =>
      service.deleteRefund(String(req.params.id), String(req.params.refundId), requireActor(req)),
    ),
  }
}
