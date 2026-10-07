import type { RequestHandler } from 'express'

import { loadConfig } from '../config/index.js'
import { unauthorized } from '../errors/app-error.js'
import { verifyAccessToken } from '../modules/auth/auth.tokens.js'

/**
 * Require a valid Bearer access JWT. Attaches `req.user`.
 */
export const authenticate: RequestHandler = (req, _res, next) => {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      throw unauthorized()
    }

    const token = header.slice('Bearer '.length).trim()
    if (!token) {
      throw unauthorized()
    }

    const config = loadConfig()
    const payload = verifyAccessToken(config, token)
    req.user = {
      id: payload.sub,
      roles: [payload.role],
    }
    next()
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) {
      next(error)
      return
    }
    next(unauthorized('Invalid or expired access token'))
  }
}
