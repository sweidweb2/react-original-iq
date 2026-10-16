import type { NextFunction, Request, Response } from 'express'

import { unauthorized } from '../../errors/app-error.js'
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
  list: (req: Request, res: Response, next: NextFunction) => Promise<void>
  stats: (req: Request, res: Response, next: NextFunction) => Promise<void>
  getById: (req: Request, res: Response, next: NextFunction) => Promise<void>
  create: (req: Request, res: Response, next: NextFunction) => Promise<void>
  update: (req: Request, res: Response, next: NextFunction) => Promise<void>
  updatePrice: (req: Request, res: Response, next: NextFunction) => Promise<void>
  assignTutor: (req: Request, res: Response, next: NextFunction) => Promise<void>
  removeTutor: (req: Request, res: Response, next: NextFunction) => Promise<void>
  changeCoordinator: (req: Request, res: Response, next: NextFunction) => Promise<void>
  submit: (req: Request, res: Response, next: NextFunction) => Promise<void>
  cancelSubmit: (req: Request, res: Response, next: NextFunction) => Promise<void>
  approve: (req: Request, res: Response, next: NextFunction) => Promise<void>
  disapprove: (req: Request, res: Response, next: NextFunction) => Promise<void>
  cancel: (req: Request, res: Response, next: NextFunction) => Promise<void>
  activate: (req: Request, res: Response, next: NextFunction) => Promise<void>
  allowView: (req: Request, res: Response, next: NextFunction) => Promise<void>
  remove: (req: Request, res: Response, next: NextFunction) => Promise<void>
  addFile: (req: Request, res: Response, next: NextFunction) => Promise<void>
  listFiles: (req: Request, res: Response, next: NextFunction) => Promise<void>
  deleteFile: (req: Request, res: Response, next: NextFunction) => Promise<void>
  addSolution: (req: Request, res: Response, next: NextFunction) => Promise<void>
  listSolutions: (req: Request, res: Response, next: NextFunction) => Promise<void>
  deleteSolution: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

function requireActor(req: Request) {
  if (!req.user) {
    throw unauthorized()
  }
  return { id: req.user.id, roles: req.user.roles }
}

export function createTasksController(service: TasksService): TasksController {
  return {
    async list(req, res, next) {
      try {
        const actor = requireActor(req)
        const result = await service.listTasks(req.query as unknown as ListTasksQuery, actor)
        res.status(200).json(result)
      } catch (error) {
        next(error)
      }
    },
    async stats(req, res, next) {
      try {
        const actor = requireActor(req)
        const stats = await service.getStats(actor)
        res.status(200).json(stats)
      } catch (error) {
        next(error)
      }
    },
    async getById(req, res, next) {
      try {
        const actor = requireActor(req)
        const task = await service.getTaskById(String(req.params.id), actor)
        res.status(200).json(task)
      } catch (error) {
        next(error)
      }
    },
    async create(req, res, next) {
      try {
        const actor = requireActor(req)
        const task = await service.createTask(req.body as CreateTaskBody, actor)
        res.status(201).json(task)
      } catch (error) {
        next(error)
      }
    },
    async update(req, res, next) {
      try {
        const actor = requireActor(req)
        const task = await service.updateTask(String(req.params.id), req.body as UpdateTaskBody, actor)
        res.status(200).json(task)
      } catch (error) {
        next(error)
      }
    },
    async updatePrice(req, res, next) {
      try {
        const actor = requireActor(req)
        const { price } = req.body as UpdatePriceBody
        const task = await service.updatePrice(String(req.params.id), price, actor)
        res.status(200).json(task)
      } catch (error) {
        next(error)
      }
    },
    async assignTutor(req, res, next) {
      try {
        const actor = requireActor(req)
        const { tutorId } = req.body as AssignTutorBody
        const task = await service.assignTutor(String(req.params.id), tutorId, actor)
        res.status(200).json(task)
      } catch (error) {
        next(error)
      }
    },
    async removeTutor(req, res, next) {
      try {
        const actor = requireActor(req)
        const task = await service.removeTutor(String(req.params.id), actor)
        res.status(200).json(task)
      } catch (error) {
        next(error)
      }
    },
    async changeCoordinator(req, res, next) {
      try {
        const actor = requireActor(req)
        const { coordinatorId } = req.body as ChangeCoordinatorBody
        const task = await service.changeCoordinator(String(req.params.id), coordinatorId, actor)
        res.status(200).json(task)
      } catch (error) {
        next(error)
      }
    },
    async submit(req, res, next) {
      try {
        const actor = requireActor(req)
        const task = await service.submitTask(String(req.params.id), actor)
        res.status(200).json(task)
      } catch (error) {
        next(error)
      }
    },
    async cancelSubmit(req, res, next) {
      try {
        const actor = requireActor(req)
        const task = await service.cancelSubmit(String(req.params.id), actor)
        res.status(200).json(task)
      } catch (error) {
        next(error)
      }
    },
    async approve(req, res, next) {
      try {
        const actor = requireActor(req)
        const task = await service.approveTask(String(req.params.id), actor)
        res.status(200).json(task)
      } catch (error) {
        next(error)
      }
    },
    async disapprove(req, res, next) {
      try {
        const actor = requireActor(req)
        const task = await service.disapproveTask(String(req.params.id), actor)
        res.status(200).json(task)
      } catch (error) {
        next(error)
      }
    },
    async cancel(req, res, next) {
      try {
        const actor = requireActor(req)
        const task = await service.cancelTask(String(req.params.id), actor)
        res.status(200).json(task)
      } catch (error) {
        next(error)
      }
    },
    async activate(req, res, next) {
      try {
        const actor = requireActor(req)
        const task = await service.activateTask(String(req.params.id), actor)
        res.status(200).json(task)
      } catch (error) {
        next(error)
      }
    },
    async allowView(req, res, next) {
      try {
        const actor = requireActor(req)
        const { allowView } = req.body as AllowViewBody
        const task = await service.setAllowView(String(req.params.id), allowView, actor)
        res.status(200).json(task)
      } catch (error) {
        next(error)
      }
    },
    async remove(req, res, next) {
      try {
        const actor = requireActor(req)
        await service.deleteTask(String(req.params.id), actor)
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
    async addFile(req, res, next) {
      try {
        const actor = requireActor(req)
        const body = req.body as AddFileBody
        const file = await service.addFile(String(req.params.id), body, actor)
        res.status(201).json(file)
      } catch (error) {
        next(error)
      }
    },
    async listFiles(req, res, next) {
      try {
        const actor = requireActor(req)
        const files = await service.listFiles(String(req.params.id), actor)
        res.status(200).json({ data: files })
      } catch (error) {
        next(error)
      }
    },
    async deleteFile(req, res, next) {
      try {
        const actor = requireActor(req)
        await service.deleteFile(String(req.params.id), String(req.params.fileId), actor)
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
    async addSolution(req, res, next) {
      try {
        const actor = requireActor(req)
        const body = req.body as AddSolutionBody
        const solution = await service.addSolution(String(req.params.id), body, actor)
        res.status(201).json(solution)
      } catch (error) {
        next(error)
      }
    },
    async listSolutions(req, res, next) {
      try {
        const actor = requireActor(req)
        const solutions = await service.listSolutions(String(req.params.id), actor)
        res.status(200).json({ data: solutions })
      } catch (error) {
        next(error)
      }
    },
    async deleteSolution(req, res, next) {
      try {
        const actor = requireActor(req)
        await service.deleteSolution(String(req.params.id), String(req.params.solutionId), actor)
        res.status(204).send()
      } catch (error) {
        next(error)
      }
    },
  }
}
