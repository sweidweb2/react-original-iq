import type { RequestHandler } from 'express'

import { respond, respondEmpty } from '../../middleware/respond.js'
import type { RbacService } from './rbac.service.js'

export type RbacController = {
  listRoles: RequestHandler
  getRole: RequestHandler
  createRole: RequestHandler
  updateRole: RequestHandler
  deleteRole: RequestHandler
  assignRolePermissions: RequestHandler
  listPermissions: RequestHandler
  createPermission: RequestHandler
  updatePermission: RequestHandler
  deletePermission: RequestHandler
  getUserPermissions: RequestHandler
  assignUserPermissions: RequestHandler
}

export function createRbacController(service: RbacService): RbacController {
  return {
    listRoles: respond(200, async () => ({ data: await service.listRoles() })),
    getRole: respond(200, (req) => service.getRole(String(req.params.id))),
    createRole: respond(201, (req) => service.createRole(req.body)),
    updateRole: respond(200, (req) => service.updateRole(String(req.params.id), req.body)),
    deleteRole: respondEmpty(204, (req) => service.deleteRole(String(req.params.id))),
    assignRolePermissions: respond(200, (req) =>
      service.assignRolePermissions(String(req.params.id), req.body),
    ),

    listPermissions: respond(200, async () => ({ data: await service.listPermissions() })),
    createPermission: respond(201, (req) => service.createPermission(req.body)),
    updatePermission: respond(200, (req) =>
      service.updatePermission(String(req.params.id), req.body),
    ),
    deletePermission: respondEmpty(204, (req) => service.deletePermission(String(req.params.id))),

    getUserPermissions: respond(200, (req) =>
      service.getUserPermissions(String(req.params.userId)),
    ),
    assignUserPermissions: respond(200, (req) =>
      service.assignUserPermissions(String(req.params.userId), req.body),
    ),
  }
}
