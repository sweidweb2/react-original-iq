import type { RequestHandler } from 'express'

import { requireActor } from '../../middleware/respond.js'
import { respondExport } from '../_shared/export-file.js'
import type { ExportResourceParams } from './exports.schema.js'
import type { ExportsService } from './exports.service.js'

export type ExportsController = {
  exportResource: RequestHandler
}

export function createExportsController(service: ExportsService): ExportsController {
  return {
    exportResource: respondExport((req) => {
      const { resource } = req.params as unknown as ExportResourceParams
      return service.exportCsv(resource, requireActor(req))
    }),
  }
}
