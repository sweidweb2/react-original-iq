import { Router } from 'express'

import type { AppConfig } from '../../config/index.js'
import { createAuthRateLimiter } from '../../middleware/rate-limit.js'
import { validate } from '../../middleware/validate.js'
import type { AuthController } from './auth.controller.js'
import { loginBodySchema, refreshBodySchema, registerBodySchema } from './auth.schema.js'

export function createAuthRoutes(controller: AuthController, config: AppConfig): Router {
  const router = Router()
  const authLimiter = createAuthRateLimiter(config)

  router.post('/register', authLimiter, validate({ body: registerBodySchema }), controller.register)
  router.post('/login', authLimiter, validate({ body: loginBodySchema }), controller.login)
  router.post('/refresh', authLimiter, validate({ body: refreshBodySchema }), controller.refresh)
  router.post('/logout', authLimiter, validate({ body: refreshBodySchema }), controller.logout)

  return router
}
