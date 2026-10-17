import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import type { TasksRepository } from '../tasks/tasks.repository.js'
import { createRevisionsController } from './revisions.controller.js'
import { createRevisionsRepository } from './revisions.repository.js'
import { createRevisionDetailRoutes, createTaskRevisionsRoutes } from './revisions.routes.js'
import { createRevisionsService } from './revisions.service.js'

export type RevisionsModule = {
  taskRoutes: ReturnType<typeof createTaskRevisionsRoutes>
  detailRoutes: ReturnType<typeof createRevisionDetailRoutes>
  hasOpenForTask: (taskId: string) => Promise<boolean>
  cancelOpenForTask: (taskId: string) => Promise<number>
}

export function createRevisionsModule(
  config: AppConfig = loadConfig(),
  tasksRepository: TasksRepository,
): RevisionsModule {
  const repository = createRevisionsRepository(config)
  const service = createRevisionsService(repository, tasksRepository)
  const controller = createRevisionsController(service)
  return {
    taskRoutes: createTaskRevisionsRoutes(controller, config),
    detailRoutes: createRevisionDetailRoutes(controller, config),
    hasOpenForTask: (taskId) => repository.hasOpenForTask(taskId),
    cancelOpenForTask: (taskId) => repository.cancelOpenForTask(taskId),
  }
}
