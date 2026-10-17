import { Router } from 'express'

import { SUPER_ROLES } from '../../authz/index.js'
import type { AppConfig } from '../../config/index.js'
import { createAuthenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import type { BackupsController } from './backups.controller.js'
import {
  backupHistoryQuerySchema,
  backupIdParamsSchema,
  runBackupBodySchema,
} from './backups.schema.js'

export function createBackupsRoutes(controller: BackupsController, config: AppConfig): Router {
  const router = Router()

  router.use(createAuthenticate(config))
  router.use(authorize(...SUPER_ROLES))

  router.get('/meta', controller.getMeta)
  router.get('/history', validate({ query: backupHistoryQuerySchema }), controller.listHistory)
  router.post('/', validate({ body: runBackupBodySchema }), controller.run)
  router.post('/history/:id/rerun', validate({ params: backupIdParamsSchema }), controller.rerun)

  return router
}
