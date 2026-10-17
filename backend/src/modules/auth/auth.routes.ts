import { Router } from 'express'

import type { AppConfig } from '../../config/index.js'
import { createAuthenticate } from '../../middleware/authenticate.js'
import { createAuthEmailRateLimiter, createAuthRateLimiter } from '../../middleware/rate-limit.js'
import { validate } from '../../middleware/validate.js'
import type { AuthController } from './auth.controller.js'
import {
  forgotPasswordBodySchema,
  loginBodySchema,
  refreshBodySchema,
  registerBodySchema,
  resendResetCodeBodySchema,
  resetPasswordBodySchema,
  updateMeBodySchema,
  verifyResetCodeBodySchema,
} from './auth.schema.js'

export function createAuthRoutes(controller: AuthController, config: AppConfig): Router {
  const router = Router()
  const authLimiter = createAuthRateLimiter(config)
  const emailLimiter = createAuthEmailRateLimiter(config)
  const authenticate = createAuthenticate(config)

  router.post('/register', authLimiter, validate({ body: registerBodySchema }), controller.register)
  router.post(
    '/login',
    authLimiter,
    emailLimiter,
    validate({ body: loginBodySchema }),
    controller.login,
  )
  router.post('/refresh', authLimiter, validate({ body: refreshBodySchema }), controller.refresh)
  router.post('/logout', authLimiter, validate({ body: refreshBodySchema }), controller.logout)

  router.post(
    '/password/forgot',
    authLimiter,
    emailLimiter,
    validate({ body: forgotPasswordBodySchema }),
    controller.forgotPassword,
  )
  router.post(
    '/password/verify',
    authLimiter,
    emailLimiter,
    validate({ body: verifyResetCodeBodySchema }),
    controller.verifyResetCode,
  )
  router.post(
    '/password/reset',
    authLimiter,
    emailLimiter,
    validate({ body: resetPasswordBodySchema }),
    controller.resetPassword,
  )
  router.post(
    '/password/resend',
    authLimiter,
    emailLimiter,
    validate({ body: resendResetCodeBodySchema }),
    controller.resendResetCode,
  )

  router.get('/me', authenticate, controller.getMe)
  router.patch('/me', authenticate, validate({ body: updateMeBodySchema }), controller.updateMe)

  return router
}
