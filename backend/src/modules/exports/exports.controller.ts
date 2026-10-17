import type { NextFunction, Request, Response } from 'express'

import { requireActor } from '../../middleware/respond.js'
import { sendExport } from '../_shared/export-file.js'
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
        sendExport(res, await service.exportCsv(resource, actor))
      } catch (error) {
        next(error)
      }
    },
  }
}
