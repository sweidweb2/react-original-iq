import type { NextFunction, Request, Response } from 'express'

import { reportError } from '../../errors/report-error.js'
import { requireActor, respond } from '../../middleware/respond.js'
import type { PaginationQuery } from '../_shared/pagination.schema.js'
import type { BackupIdParams, RunBackupInput } from './backups.schema.js'
import type { BackupOutput, BackupsService } from './backups.service.js'

type StreamHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>

export type BackupsController = {
  getMeta: ReturnType<typeof respond>
  listHistory: ReturnType<typeof respond>
  run: StreamHandler
  rerun: StreamHandler
}

function responseOutput(res: Response): BackupOutput {
  return {
    open({ filename, contentType, sizeBytes, estimatedBytes }) {
      res.status(200)
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.setHeader('Cache-Control', 'no-store')
      if (sizeBytes !== undefined) res.setHeader('Content-Length', String(sizeBytes))
      if (estimatedBytes !== undefined) res.setHeader('X-Estimated-Size', String(estimatedBytes))
      return res
    },
  }
}

/** Once bytes are on the wire a JSON error can't be sent; drop the connection instead. */
function failStream(res: Response, next: NextFunction, error: unknown): void {
  if (res.headersSent) {
    reportError(error, { source: 'backups.stream' })
    res.destroy()
    return
  }
  next(error)
}

export function createBackupsController(service: BackupsService): BackupsController {
  return {
    getMeta: respond(200, (req) => service.getMeta(requireActor(req))),

    listHistory: respond(200, (req) =>
      service.listHistory(req.query as unknown as PaginationQuery, requireActor(req)),
    ),

    async run(req, res, next) {
      try {
        await service.run(req.body as RunBackupInput, requireActor(req), responseOutput(res))
      } catch (error) {
        failStream(res, next, error)
      }
    },

    async rerun(req, res, next) {
      try {
        const { id } = req.params as unknown as BackupIdParams
        await service.rerun(id, requireActor(req), responseOutput(res))
      } catch (error) {
        failStream(res, next, error)
      }
    },
  }
}
