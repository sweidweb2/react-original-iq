import { type Router as ExpressRouter, Router } from 'express'

import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import type { TasksController } from './tasks.controller.js'
import {
  addFileBodySchema,
  addSolutionBodySchema,
  allowViewBodySchema,
  assignTutorBodySchema,
  changeCoordinatorBodySchema,
  createTaskBodySchema,
  listTasksQuerySchema,
  taskFileParamsSchema,
  taskIdParamsSchema,
  taskSolutionParamsSchema,
  updatePriceBodySchema,
  updateTaskBodySchema,
} from './tasks.schema.js'

export type TasksRouteExtras = {
  revisions?: ExpressRouter
  payments?: ExpressRouter
  refunds?: ExpressRouter
}

export function createTasksRoutes(
  controller: TasksController,
  extras?: TasksRouteExtras,
): Router {
  const router = Router()

  router.use(authenticate)

  router.get('/', validate({ query: listTasksQuerySchema }), controller.list)
  router.get('/stats', controller.stats)
  router.get('/:id', validate({ params: taskIdParamsSchema }), controller.getById)
  router.post('/', validate({ body: createTaskBodySchema }), controller.create)
  router.patch(
    '/:id',
    validate({ params: taskIdParamsSchema, body: updateTaskBodySchema }),
    controller.update,
  )
  router.patch(
    '/:id/price',
    validate({ params: taskIdParamsSchema, body: updatePriceBodySchema }),
    controller.updatePrice,
  )
  router.post(
    '/:id/assign-tutor',
    validate({ params: taskIdParamsSchema, body: assignTutorBodySchema }),
    controller.assignTutor,
  )
  router.post('/:id/remove-tutor', validate({ params: taskIdParamsSchema }), controller.removeTutor)
  router.post(
    '/:id/change-coordinator',
    validate({ params: taskIdParamsSchema, body: changeCoordinatorBodySchema }),
    controller.changeCoordinator,
  )
  router.post('/:id/submit', validate({ params: taskIdParamsSchema }), controller.submit)
  router.post('/:id/cancel-submit', validate({ params: taskIdParamsSchema }), controller.cancelSubmit)
  router.post('/:id/approve', validate({ params: taskIdParamsSchema }), controller.approve)
  router.post('/:id/disapprove', validate({ params: taskIdParamsSchema }), controller.disapprove)
  router.post('/:id/cancel', validate({ params: taskIdParamsSchema }), controller.cancel)
  router.post('/:id/activate', validate({ params: taskIdParamsSchema }), controller.activate)
  router.post(
    '/:id/allow-view',
    validate({ params: taskIdParamsSchema, body: allowViewBodySchema }),
    controller.allowView,
  )
  router.delete('/:id', validate({ params: taskIdParamsSchema }), controller.remove)

  router.post(
    '/:id/files',
    validate({ params: taskIdParamsSchema, body: addFileBodySchema }),
    controller.addFile,
  )
  router.get('/:id/files', validate({ params: taskIdParamsSchema }), controller.listFiles)
  router.delete(
    '/:id/files/:fileId',
    validate({ params: taskFileParamsSchema }),
    controller.deleteFile,
  )

  router.post(
    '/:id/solutions',
    validate({ params: taskIdParamsSchema, body: addSolutionBodySchema }),
    controller.addSolution,
  )
  router.get('/:id/solutions', validate({ params: taskIdParamsSchema }), controller.listSolutions)
  router.delete(
    '/:id/solutions/:solutionId',
    validate({ params: taskSolutionParamsSchema }),
    controller.deleteSolution,
  )

  if (extras?.revisions) {
    router.use('/:id/revisions', extras.revisions)
  }
  if (extras?.payments) {
    router.use('/:id/payments', extras.payments)
  }
  if (extras?.refunds) {
    router.use('/:id/refunds', extras.refunds)
  }

  return router
}
