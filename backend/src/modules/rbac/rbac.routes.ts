import { Router } from 'express'

import type { AppConfig } from '../../config/index.js'
import { createAuthenticate } from '../../middleware/authenticate.js'
import { requirePermission } from '../../middleware/authorize.js'
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

export function createRbacRoutes(controller: RbacController, config: AppConfig): Router {
  const router = Router()
  const manageRbac = requirePermission('manage_rbac')
  const assignUsers = requirePermission('assign_user_permissions')

  router.use(createAuthenticate(config))

  router.get('/roles', manageRbac, controller.listRoles)
  router.post('/roles', manageRbac, validate({ body: createRoleBodySchema }), controller.createRole)
  router.get('/roles/:id', manageRbac, validate({ params: roleIdParamsSchema }), controller.getRole)
  router.patch(
    '/roles/:id',
    manageRbac,
    validate({ params: roleIdParamsSchema, body: updateRoleBodySchema }),
    controller.updateRole,
  )
  router.delete(
    '/roles/:id',
    manageRbac,
    validate({ params: roleIdParamsSchema }),
    controller.deleteRole,
  )
  router.put(
    '/roles/:id/permissions',
    manageRbac,
    validate({ params: roleIdParamsSchema, body: assignRolePermissionsBodySchema }),
    controller.assignRolePermissions,
  )

  router.get(
    '/permissions',
    requirePermission('manage_rbac', 'assign_user_permissions'),
    controller.listPermissions,
  )
  router.post(
    '/permissions',
    manageRbac,
    validate({ body: createPermissionBodySchema }),
    controller.createPermission,
  )
  router.patch(
    '/permissions/:id',
    manageRbac,
    validate({ params: permissionIdParamsSchema, body: updatePermissionBodySchema }),
    controller.updatePermission,
  )
  router.delete(
    '/permissions/:id',
    manageRbac,
    validate({ params: permissionIdParamsSchema }),
    controller.deletePermission,
  )

  router.get(
    '/users/:userId/permissions',
    assignUsers,
    validate({ params: userIdParamsSchema }),
    controller.getUserPermissions,
  )
  router.put(
    '/users/:userId/permissions',
    assignUsers,
    validate({ params: userIdParamsSchema, body: assignUserPermissionsBodySchema }),
    controller.assignUserPermissions,
  )

  return router
}
