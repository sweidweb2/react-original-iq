import type { Request, RequestHandler } from 'express'

import type { AuthActor } from '../authz/ownership.js'
import { unauthorized } from '../errors/app-error.js'

/** Require authenticated user; returns a service-ready actor. */
export function requireActor(req: Request): AuthActor {
  if (!req.user) {
    throw unauthorized()
  }
  return { id: req.user.id, roles: req.user.roles }
}

/** Send a JSON body. Errors go to the shared error middleware. */
export function respond(status: number, handle: (req: Request) => unknown): RequestHandler {
  return (req, res, next) => {
    Promise.resolve()
      .then(() => handle(req))
      .then((body) => {
        res.status(status).json(body)
      })
      .catch(next)
  }
}

/** Send an empty body (e.g. 204). Errors go to the shared error middleware. */
export function respondEmpty(status: number, handle: (req: Request) => unknown): RequestHandler {
  return (req, res, next) => {
    Promise.resolve()
      .then(() => handle(req))
      .then(() => {
        res.status(status).send()
      })
      .catch(next)
  }
}
