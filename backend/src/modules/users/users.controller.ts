import type { RequestHandler } from 'express'

import { requireActor, respond, respondEmpty } from '../../middleware/respond.js'
import type { ListUsersQuery } from './users.schema.js'
import type { UsersService } from './users.service.js'

export type UsersController = {
  list: RequestHandler
  stats: RequestHandler
  getById: RequestHandler
  create: RequestHandler
  update: RequestHandler
  deactivate: RequestHandler
  remove: RequestHandler
}

export function createUsersController(service: UsersService): UsersController {
  return {
    list: respond(200, (req) => service.listUsers(req.query as unknown as ListUsersQuery)),
    stats: respond(200, () => service.getStats()),
    getById: respond(200, (req) =>
      service.assertAccessible(String(req.params.id), requireActor(req)),
    ),
    create: respond(201, (req) => service.createUser(req.body)),
    update: respond(200, (req) =>
      service.updateUser(String(req.params.id), req.body, requireActor(req)),
    ),
    deactivate: respond(200, (req) =>
      service.deactivateUser(String(req.params.id), requireActor(req)),
    ),
    remove: respondEmpty(204, (req) =>
      service.deleteUser(String(req.params.id), requireActor(req)),
    ),
  }
}
