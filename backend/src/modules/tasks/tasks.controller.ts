import type { RequestHandler } from 'express'

import { requireActor, respond, respondEmpty } from '../../middleware/respond.js'
import type {
  AddFileBody,
  AddSolutionBody,
  AllowViewBody,
  AssignTutorBody,
  ChangeCoordinatorBody,
  CreateTaskBody,
  ListTasksQuery,
  UpdatePriceBody,
  UpdateTaskBody,
} from './tasks.schema.js'
import type { TasksService } from './tasks.service.js'

export type TasksController = {
  list: RequestHandler
  stats: RequestHandler
  getById: RequestHandler
  create: RequestHandler
  update: RequestHandler
  updatePrice: RequestHandler
  assignTutor: RequestHandler
  removeTutor: RequestHandler
  changeCoordinator: RequestHandler
  submit: RequestHandler
  cancelSubmit: RequestHandler
  approve: RequestHandler
  disapprove: RequestHandler
  cancel: RequestHandler
  activate: RequestHandler
  allowView: RequestHandler
  remove: RequestHandler
  addFile: RequestHandler
  listFiles: RequestHandler
  deleteFile: RequestHandler
  addSolution: RequestHandler
  listSolutions: RequestHandler
  deleteSolution: RequestHandler
}

export function createTasksController(service: TasksService): TasksController {
  return {
    list: respond(200, (req) =>
      service.listTasks(req.query as unknown as ListTasksQuery, requireActor(req)),
    ),
    stats: respond(200, (req) => service.getStats(requireActor(req))),
    getById: respond(200, (req) => service.getTaskById(String(req.params.id), requireActor(req))),
    create: respond(201, (req) =>
      service.createTask(req.body as CreateTaskBody, requireActor(req)),
    ),
    update: respond(200, (req) =>
      service.updateTask(String(req.params.id), req.body as UpdateTaskBody, requireActor(req)),
    ),
    updatePrice: respond(200, (req) => {
      const { price } = req.body as UpdatePriceBody
      return service.updatePrice(String(req.params.id), price, requireActor(req))
    }),
    assignTutor: respond(200, (req) => {
      const { tutorId } = req.body as AssignTutorBody
      return service.assignTutor(String(req.params.id), tutorId, requireActor(req))
    }),
    removeTutor: respond(200, (req) =>
      service.removeTutor(String(req.params.id), requireActor(req)),
    ),
    changeCoordinator: respond(200, (req) => {
      const { coordinatorId } = req.body as ChangeCoordinatorBody
      return service.changeCoordinator(String(req.params.id), coordinatorId, requireActor(req))
    }),
    submit: respond(200, (req) => service.submitTask(String(req.params.id), requireActor(req))),
    cancelSubmit: respond(200, (req) =>
      service.cancelSubmit(String(req.params.id), requireActor(req)),
    ),
    approve: respond(200, (req) => service.approveTask(String(req.params.id), requireActor(req))),
    disapprove: respond(200, (req) =>
      service.disapproveTask(String(req.params.id), requireActor(req)),
    ),
    cancel: respond(200, (req) => service.cancelTask(String(req.params.id), requireActor(req))),
    activate: respond(200, (req) =>
      service.activateTask(String(req.params.id), requireActor(req)),
    ),
    allowView: respond(200, (req) => {
      const { allowView } = req.body as AllowViewBody
      return service.setAllowView(String(req.params.id), allowView, requireActor(req))
    }),
    remove: respondEmpty(204, (req) =>
      service.deleteTask(String(req.params.id), requireActor(req)),
    ),
    addFile: respond(201, (req) =>
      service.addFile(String(req.params.id), req.body as AddFileBody, requireActor(req)),
    ),
    listFiles: respond(200, async (req) => ({
      data: await service.listFiles(String(req.params.id), requireActor(req)),
    })),
    deleteFile: respondEmpty(204, (req) =>
      service.deleteFile(String(req.params.id), String(req.params.fileId), requireActor(req)),
    ),
    addSolution: respond(201, (req) =>
      service.addSolution(String(req.params.id), req.body as AddSolutionBody, requireActor(req)),
    ),
    listSolutions: respond(200, async (req) => ({
      data: await service.listSolutions(String(req.params.id), requireActor(req)),
    })),
    deleteSolution: respondEmpty(204, (req) =>
      service.deleteSolution(
        String(req.params.id),
        String(req.params.solutionId),
        requireActor(req),
      ),
    ),
  }
}
