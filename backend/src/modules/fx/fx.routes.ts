import { Router } from 'express'

import { validate } from '../../middleware/validate.js'
import type { FxController } from './fx.controller.js'
import { convertQuerySchema, ratesQuerySchema } from './fx.schema.js'

export function createFxRoutes(controller: FxController): Router {
  const router = Router()

  router.get('/rates', validate({ query: ratesQuerySchema }), controller.getRates)
  router.get('/convert', validate({ query: convertQuerySchema }), controller.convert)

  return router
}
