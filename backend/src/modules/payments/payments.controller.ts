import type { RequestHandler } from 'express'

import { requireActor, respond, respondEmpty } from '../../middleware/respond.js'
import type {
  CheckoutPaymentBody,
  CreateManualPaymentBody,
  CreateRefundBody,
  UpdatePaymentBody,
  UpdateRefundStatusBody,
} from './payments.schema.js'
import type { PaymentsService } from './payments.service.js'

export type PaymentsController = {
  getTaskPayments: RequestHandler
  getPayment: RequestHandler
  createManualPayment: RequestHandler
  updatePayment: RequestHandler
  checkout: RequestHandler
  montyPayCallback: RequestHandler
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
    getPayment: respond(200, (req) =>
      service.getPayment(String(req.params.id), String(req.params.paymentId), requireActor(req)),
    ),
    createManualPayment: respond(201, (req) =>
      service.createManualPayment(
        String(req.params.id),
        req.body as CreateManualPaymentBody,
        requireActor(req),
      ),
    ),
    updatePayment: respond(200, (req) =>
      service.updatePayment(
        String(req.params.id),
        String(req.params.paymentId),
        req.body as UpdatePaymentBody,
        requireActor(req),
      ),
    ),
    checkout: respond(201, (req) =>
      service.checkout(String(req.params.id), req.body as CheckoutPaymentBody, requireActor(req)),
    ),
    montyPayCallback: (req, res, next) => {
      const token = req.query.token
      const provided = Array.isArray(token) ? token[0] : token
      Promise.resolve()
        .then(() =>
          service.handleMontyPayCallback({
            token: typeof provided === 'string' ? provided : undefined,
            body: req.body,
          }),
        )
        .then((result) => {
          if (result.status === 200) {
            res.status(200).type('text/plain').send('OK')
            return
          }
          res.status(result.status).json({
            code: result.status === 401 ? 'UNAUTHORIZED' : 'VALIDATION_ERROR',
            message: 'Invalid callback',
          })
        })
        .catch(next)
    },
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
