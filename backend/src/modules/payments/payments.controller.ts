import type { NextFunction, Request, Response } from 'express'

import { unauthorized } from '../../errors/app-error.js'
import type {
  CheckoutPaymentBody,
  CreateManualPaymentBody,
  CreateRefundBody,
} from './payments.schema.js'
import type { PaymentsService } from './payments.service.js'

export type PaymentsController = {
  getTaskPayments: (req: Request, res: Response, next: NextFunction) => Promise<void>
  createManualPayment: (req: Request, res: Response, next: NextFunction) => Promise<void>
  checkout: (req: Request, res: Response, next: NextFunction) => Promise<void>
  deletePayment: (req: Request, res: Response, next: NextFunction) => Promise<void>
  createRefund: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

function requireActor(req: Request) {
  if (!req.user) {
    throw unauthorized()
  }
  return { id: req.user.id, roles: req.user.roles }
}

export function createPaymentsController(service: PaymentsService): PaymentsController {
  return {
    async getTaskPayments(req, res, next) {
      try {
        const actor = requireActor(req)
        const view = await service.getTaskPayments(String(req.params.id), actor)
        res.status(200).json(view)
      } catch (error) {
        next(error)
      }
    },
    async createManualPayment(req, res, next) {
      try {
        const actor = requireActor(req)
        const payment = await service.createManualPayment(
          String(req.params.id),
          req.body as CreateManualPaymentBody,
          actor,
        )
        res.status(201).json(payment)
      } catch (error) {
        next(error)
      }
    },
    async checkout(req, res, next) {
      try {
        const actor = requireActor(req)
        const payment = await service.checkout(
          String(req.params.id),
          req.body as CheckoutPaymentBody,
          actor,
        )
        res.status(201).json(payment)
      } catch (error) {
        next(error)
      }
    },
    async deletePayment(req, res, next) {
      try {
        const actor = requireActor(req)
        await service.deletePayment(String(req.params.id), String(req.params.paymentId), actor)
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
    async createRefund(req, res, next) {
      try {
        const actor = requireActor(req)
        const refund = await service.createRefund(
          String(req.params.id),
          req.body as CreateRefundBody,
          actor,
        )
        res.status(201).json(refund)
      } catch (error) {
        next(error)
      }
    },
  }
}
