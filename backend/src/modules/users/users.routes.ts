import { Router } from 'express'

import type { AppConfig } from '../../config/index.js'
import { createAuthenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/authorize.js'
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
    requirePermission('view_users'),
    validate({ query: listUsersQuerySchema }),
    controller.list,
  )
  router.get('/stats', requirePermission('view_users'), controller.stats)
  router.get('/:id', validate({ params: userIdParamsSchema }), controller.getById)
  router.post(
    '/',
    requirePermission('create_users'),
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
    requirePermission('activate_users'),
    validate({ params: userIdParamsSchema }),
    controller.deactivate,
  )
  router.delete(
    '/:id',
    requirePermission('delete_users'),
    validate({ params: userIdParamsSchema }),
    controller.remove,
  )

  return router
}
