import type { NextFunction, Request, Response } from 'express'

import type { RbacService } from './rbac.service.js'

export type RbacController = {
  listRoles: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getRole: (req: Request, res: Response, next: NextFunction) => Promise<void>
  createRole: (req: Request, res: Response, next: NextFunction) => Promise<void>
  updateRole: (req: Request, res: Response, next: NextFunction) => Promise<void>
  deleteRole: (req: Request, res: Response, next: NextFunction) => Promise<void>
  assignRolePermissions: (req: Request, res: Response, next: NextFunction) => Promise<void>
  listPermissions: (req: Request, res: Response, next: NextFunction) => Promise<void>
  createPermission: (req: Request, res: Response, next: NextFunction) => Promise<void>
  updatePermission: (req: Request, res: Response, next: NextFunction) => Promise<void>
  deletePermission: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getUserPermissions: (req: Request, res: Response, next: NextFunction) => Promise<void>
  assignUserPermissions: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createRbacController(service: RbacService): RbacController {
  return {
    async listRoles(_req, res, next) {
      try {
        const data = await service.listRoles()
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },

    async getRole(req, res, next) {
      try {
        const role = await service.getRole(String(req.params.id))
        res.status(200).json(role)
      } catch (error) {
        next(error)
      }
    },

    async createRole(req, res, next) {
      try {
        const role = await service.createRole(req.body)
        res.status(201).json(role)
      } catch (error) {
        next(error)
      }
    },

    async updateRole(req, res, next) {
      try {
        const role = await service.updateRole(String(req.params.id), req.body)
        res.status(200).json(role)
      } catch (error) {
        next(error)
      }
    },

    async deleteRole(req, res, next) {
      try {
        await service.deleteRole(String(req.params.id))
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },

    async assignRolePermissions(req, res, next) {
      try {
        const role = await service.assignRolePermissions(String(req.params.id), req.body)
        res.status(200).json(role)
      } catch (error) {
        next(error)
      }
    },

    async listPermissions(_req, res, next) {
      try {
        const data = await service.listPermissions()
        res.status(200).json({ data })
      } catch (error) {
        next(error)
      }
    },

    async createPermission(req, res, next) {
      try {
        const permission = await service.createPermission(req.body)
        res.status(201).json(permission)
      } catch (error) {
        next(error)
      }
    },

    async updatePermission(req, res, next) {
      try {
        const permission = await service.updatePermission(String(req.params.id), req.body)
        res.status(200).json(permission)
      } catch (error) {
        next(error)
      }
    },

    async deletePermission(req, res, next) {
      try {
        await service.deletePermission(String(req.params.id))
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },

    async getUserPermissions(req, res, next) {
      try {
        const result = await service.getUserPermissions(String(req.params.userId))
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },

    async assignUserPermissions(req, res, next) {
      try {
        const result = await service.assignUserPermissions(String(req.params.userId), req.body)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
  }
}
