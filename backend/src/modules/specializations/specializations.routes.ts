import { Router } from 'express'

import type { AppConfig } from '../../config/index.js'
import { createAuthenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import type { SpecializationsController } from './specializations.controller.js'
import {
  createSpecializationBodySchema,
  listSpecializationsQuerySchema,
  specializationIdParamsSchema,
} from './specializations.schema.js'

export function createSpecializationsRoutes(
  controller: SpecializationsController,
  config: AppConfig,
): Router {
  const router = Router()
  router.use(createAuthenticate(config))
  router.get('/', validate({ query: listSpecializationsQuerySchema }), controller.list)
  router.post('/', validate({ body: createSpecializationBodySchema }), controller.create)
  router.delete('/:id', validate({ params: specializationIdParamsSchema }), controller.remove)
  return router
}
