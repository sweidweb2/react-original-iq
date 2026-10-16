import { Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import type { RevisionsController } from './revisions.controller.js'
import {
  createRevisionBodySchema,
  revisionIdParamsSchema,
  taskRevisionsParamsSchema,
  tutorSubmitRevisionBodySchema,
  updateRevisionBodySchema,
} from './revisions.schema.js'

export function createTaskRevisionsRoutes(controller: RevisionsController): Router {
  const router = Router({ mergeParams: true })

  router.use(authenticate)

  router.post(
    '/',
    validate({ params: taskRevisionsParamsSchema, body: createRevisionBodySchema }),
    controller.createForTask,
  )
  router.get('/', validate({ params: taskRevisionsParamsSchema }), controller.listForTask)

  return router
}

export function createRevisionDetailRoutes(controller: RevisionsController): Router {
  const router = Router()

  router.use(authenticate)

  router.get('/:id', validate({ params: revisionIdParamsSchema }), controller.getById)
  router.patch(
    '/:id',
    validate({ params: revisionIdParamsSchema, body: updateRevisionBodySchema }),
    controller.update,
  )
  router.post('/:id/cancel', validate({ params: revisionIdParamsSchema }), controller.cancel)
  router.post('/:id/approve', validate({ params: revisionIdParamsSchema }), controller.approve)
  router.post('/:id/reject', validate({ params: revisionIdParamsSchema }), controller.reject)
  router.post(
    '/:id/submit',
    validate({ params: revisionIdParamsSchema, body: tutorSubmitRevisionBodySchema }),
    controller.tutorSubmit,
  )
  router.post(
    '/:id/cancel-submit',
    validate({ params: revisionIdParamsSchema }),
    controller.tutorCancelSubmit,
  )

  return router
}
