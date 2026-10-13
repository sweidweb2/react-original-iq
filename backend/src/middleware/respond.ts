import type { Request, RequestHandler } from 'express'

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
