import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'

export type RequestScope = {
  requestId: string
  method: string
  path: string
  userId?: string
}

const storage = new AsyncLocalStorage<RequestScope>()

/** Current request scope, or `undefined` outside an HTTP request (jobs, process hooks). */
export function getRequestScope(): RequestScope | undefined {
  return storage.getStore()
}

export function setRequestUserId(userId: string): void {
  const scope = storage.getStore()
  if (scope) scope.userId = userId
}

export const requestContext: RequestHandler = (req, res, next) => {
  const headerId = req.header('x-request-id')?.trim()
  const requestId = headerId && headerId.length > 0 ? headerId : randomUUID()

  req.requestId = requestId
  res.setHeader('x-request-id', requestId)
  storage.run({ requestId, method: req.method, path: req.originalUrl }, next)
}
