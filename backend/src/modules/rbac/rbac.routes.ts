import { Router } from 'express'

import { ADMIN_ROLES } from '../../authz/index.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { RbacController } from './rbac.controller.js'
import {
  assignRolePermissionsBodySchema,
  assignUserPermissionsBodySchema,
  createPermissionBodySchema,
  createRoleBodySchema,
  permissionIdParamsSchema,
  roleIdParamsSchema,
  updatePermissionBodySchema,
  updateRoleBodySchema,
  userIdParamsSchema,
} from './rbac.schema.js'

export function createRbacRoutes(controller: RbacController): Router {
  const router = Router()

  router.use(authenticate)
  router.use(authorize(...ADMIN_ROLES))

  router.get('/roles', controller.listRoles)
  router.post('/roles', validate({ body: createRoleBodySchema }), controller.createRole)
  router.get('/roles/:id', validate({ params: roleIdParamsSchema }), controller.getRole)
  router.patch(
    '/roles/:id',
    validate({ params: roleIdParamsSchema, body: updateRoleBodySchema }),
    controller.updateRole,
  )
  router.delete('/roles/:id', validate({ params: roleIdParamsSchema }), controller.deleteRole)
  router.put(
    '/roles/:id/permissions',
    validate({ params: roleIdParamsSchema, body: assignRolePermissionsBodySchema }),
    controller.assignRolePermissions,
  )

  router.get('/permissions', controller.listPermissions)
  router.post(
    '/permissions',
    validate({ body: createPermissionBodySchema }),
    controller.createPermission,
  )
  router.patch(
    '/permissions/:id',
    validate({ params: permissionIdParamsSchema, body: updatePermissionBodySchema }),
    controller.updatePermission,
  )
  router.delete(
    '/permissions/:id',
    validate({ params: permissionIdParamsSchema }),
    controller.deletePermission,
  )

  router.get(
    '/users/:userId/permissions',
    validate({ params: userIdParamsSchema }),
    controller.getUserPermissions,
  )
  router.put(
    '/users/:userId/permissions',
    validate({ params: userIdParamsSchema, body: assignUserPermissionsBodySchema }),
    controller.assignUserPermissions,
  )

  return router
}
