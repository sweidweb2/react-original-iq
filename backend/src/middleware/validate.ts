import type { RequestHandler } from 'express'
import type { ZodType } from 'zod'

type ValidateTarget = {
  body?: ZodType
  query?: ZodType
  params?: ZodType
}

function replaceRequestProperty(req: object, key: 'query' | 'params' | 'body', value: unknown) {
  Object.defineProperty(req, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  })
}

/**
 * Zod validation at the HTTP edge. Assigns parsed values back onto the request.
 * Uses defineProperty because Express 5 exposes read-only `query` / `params` getters.
 */
export function validate(schemas: ValidateTarget): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.body) {
        replaceRequestProperty(req, 'body', schemas.body.parse(req.body))
      }
      if (schemas.query) {
        replaceRequestProperty(req, 'query', schemas.query.parse(req.query))
      }
      if (schemas.params) {
        replaceRequestProperty(req, 'params', schemas.params.parse(req.params))
      }
      next()
    } catch (error) {
      next(error)
    }
  }
}
