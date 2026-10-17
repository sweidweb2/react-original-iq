import type { RequestHandler } from 'express'

import { requireActor, respond, respondEmpty } from '../../middleware/respond.js'
import type { AuthService } from './auth.service.js'

export type AuthController = {
  register: RequestHandler
  login: RequestHandler
  refresh: RequestHandler
  logout: RequestHandler
  forgotPassword: RequestHandler
  verifyResetCode: RequestHandler
  resetPassword: RequestHandler
  resendResetCode: RequestHandler
  getMe: RequestHandler
  updateMe: RequestHandler
}

export function createAuthController(service: AuthService): AuthController {
  return {
    register: respond(201, (req) => service.register(req.body)),
    login: respond(200, (req) => service.login(req.body)),
    refresh: respond(200, (req) => service.refreshTokens(req.body)),
    logout: respondEmpty(204, (req) => service.logout(req.body)),
    forgotPassword: respond(200, (req) => service.forgotPassword(req.body)),
    verifyResetCode: respond(200, (req) => service.verifyResetCode(req.body)),
    resetPassword: respond(200, (req) => service.resetPassword(req.body)),
    resendResetCode: respond(200, (req) => service.resendResetCode(req.body)),
    getMe: respond(200, async (req) => ({
      user: await service.getMe(requireActor(req).id),
    })),
    updateMe: respond(200, async (req) => ({
      user: await service.updateMe(requireActor(req).id, req.body, req.user?.sessionId),
    })),
  }
}
