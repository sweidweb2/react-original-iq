import type { NextFunction, Request, Response } from 'express'

import { requireActor } from '../../middleware/respond.js'
import type { ExportResourceParams } from './exports.schema.js'
import type { ExportsService } from './exports.service.js'

export type ExportsController = {
  exportResource: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

export function createExportsController(service: ExportsService): ExportsController {
  return {
    async exportResource(req, res, next) {
      try {
        const actor = requireActor(req)
        const resource = req.params.resource as ExportResourceParams['resource']
        const csv = await service.exportCsv(resource, actor)
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="${resource}.csv"`)
        res.status(200).send(csv)
      } catch (error) {
        next(error)
      }
    },
  }
}
