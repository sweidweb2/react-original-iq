import type { NextFunction, Request, Response } from 'express'

import { unauthorized } from '../../errors/app-error.js'
import type { AuthService } from './auth.service.js'

export type AuthController = {
  register: (req: Request, res: Response, next: NextFunction) => Promise<void>
  login: (req: Request, res: Response, next: NextFunction) => Promise<void>
  refresh: (req: Request, res: Response, next: NextFunction) => Promise<void>
  logout: (req: Request, res: Response, next: NextFunction) => Promise<void>
  forgotPassword: (req: Request, res: Response, next: NextFunction) => Promise<void>
  verifyResetCode: (req: Request, res: Response, next: NextFunction) => Promise<void>
  resetPassword: (req: Request, res: Response, next: NextFunction) => Promise<void>
  resendResetCode: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getMe: (req: Request, res: Response, next: NextFunction) => Promise<void>
  updateMe: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createAuthController(service: AuthService): AuthController {
  return {
    async register(req, res, next) {
      try {
        const result = await service.register(req.body)
        res.status(201).json(result)
      } catch (error) {
        next(error)
      }
    },
    async login(req, res, next) {
      try {
        const result = await service.login(req.body)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async refresh(req, res, next) {
      try {
        const result = await service.refreshTokens(req.body)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async logout(req, res, next) {
      try {
        await service.logout(req.body)
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
    async forgotPassword(req, res, next) {
      try {
        const result = await service.forgotPassword(req.body)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async verifyResetCode(req, res, next) {
      try {
        const result = await service.verifyResetCode(req.body)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async resetPassword(req, res, next) {
      try {
        const result = await service.resetPassword(req.body)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async resendResetCode(req, res, next) {
      try {
        const result = await service.resendResetCode(req.body)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async getMe(req, res, next) {
      try {
        const userId = req.user?.id
        if (!userId) {
          throw unauthorized()
        }
        const user = await service.getMe(userId)
        res.status(200).json({ user })
      } catch (error) {
        next(error)
      }
    },
    async updateMe(req, res, next) {
      try {
        const userId = req.user?.id
        if (!userId) {
          throw unauthorized()
        }
        const user = await service.updateMe(userId, req.body)
        res.status(200).json({ user })
      } catch (error) {
        next(error)
      }
    },
  }
}
