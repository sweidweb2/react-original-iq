import { Router } from 'express'

import { ADMIN_ROLES } from '../../authz/index.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { UsersController } from './users.controller.js'
import {
  createUserBodySchema,
  listUsersQuerySchema,
  updateUserBodySchema,
  userIdParamsSchema,
} from './users.schema.js'

export function createUsersRoutes(controller: UsersController): Router {
  const router = Router()

  router.use(authenticate)

  router.get(
    '/',
    authorize(...ADMIN_ROLES),
    validate({ query: listUsersQuerySchema }),
    controller.list,
  )
  router.get('/:id', validate({ params: userIdParamsSchema }), controller.getById)
  router.post('/', authorize(...ADMIN_ROLES), validate({ body: createUserBodySchema }), controller.create)
  router.patch(
    '/:id',
    validate({ params: userIdParamsSchema, body: updateUserBodySchema }),
    controller.update,
  )
  router.post(
    '/:id/deactivate',
    authorize(...ADMIN_ROLES),
    validate({ params: userIdParamsSchema }),
    controller.deactivate,
  )

  return router
}
