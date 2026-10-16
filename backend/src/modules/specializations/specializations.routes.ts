import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import type { SpecializationsController } from './specializations.controller.js'
import {
  createSpecializationBodySchema,
  listSpecializationsQuerySchema,
  specializationIdParamsSchema,
} from './specializations.schema.js'

export function createSpecializationsRoutes(controller: SpecializationsController): Router {
  const router = Router()
  router.use(authenticate)
  router.get('/', validate({ query: listSpecializationsQuerySchema }), controller.list)
  router.post('/', validate({ body: createSpecializationBodySchema }), controller.create)
  router.delete('/:id', validate({ params: specializationIdParamsSchema }), controller.remove)
  return router
}
