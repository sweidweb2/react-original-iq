import { Router } from 'express'

import { USER_ADMIN_ROLES } from '../../authz/index.js'
import type { AppConfig } from '../../config/index.js'
import { createAuthenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { UsersController } from './users.controller.js'
import {
  createUserBodySchema,
  listUsersQuerySchema,
  updateUserBodySchema,
  userIdParamsSchema,
} from './users.schema.js'

export function createUsersRoutes(controller: UsersController, config: AppConfig): Router {
  const router = Router()

  router.use(createAuthenticate(config))

  router.get(
    '/',
    authorize(...USER_ADMIN_ROLES, 'coordinator'),
    validate({ query: listUsersQuerySchema }),
    controller.list,
  )
  router.get('/stats', authorize(...USER_ADMIN_ROLES), controller.stats)
  router.get('/:id', validate({ params: userIdParamsSchema }), controller.getById)
  router.post(
    '/',
    authorize(...USER_ADMIN_ROLES),
    validate({ body: createUserBodySchema }),
    controller.create,
  )
  router.patch(
    '/:id',
    validate({ params: userIdParamsSchema, body: updateUserBodySchema }),
    controller.update,
  )
  router.post(
    '/:id/deactivate',
    authorize(...USER_ADMIN_ROLES),
    validate({ params: userIdParamsSchema }),
    controller.deactivate,
  )
  router.delete(
    '/:id',
    authorize(...USER_ADMIN_ROLES, 'coordinator'),
    validate({ params: userIdParamsSchema }),
    controller.remove,
  )

  return router
}
