import type { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'

import type { AppConfig } from '../config/index.js'
import { unauthorized } from '../errors/app-error.js'
import { verifyAccessToken } from '../modules/auth/auth.tokens.js'
import { setRequestUserId } from './request-context.js'

/**
 * Require a valid Bearer access JWT. Attaches `req.user`.
 * Only token problems answer 401; missing secrets or other faults surface as server errors.
 */
export function createAuthenticate(config: AppConfig): RequestHandler {
  return (req, _res, next) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      next(unauthorized())
      return
    }

    const token = header.slice('Bearer '.length).trim()
    if (!token) {
      next(unauthorized())
      return
    }

    let payload
    try {
      payload = verifyAccessToken(config, token)
    } catch (error) {
      next(
        error instanceof jwt.JsonWebTokenError
          ? unauthorized('Invalid or expired access token')
          : error,
      )
      return
    }

    req.user = {
      id: payload.sub,
      roles: [payload.role],
      ...(payload.sid ? { sessionId: payload.sid } : {}),
    }
    setRequestUserId(payload.sub)
    next()
  }
}
