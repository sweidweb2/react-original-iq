import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { getStorageService, type StorageService } from '../../storage/index.js'
import type { PaymentsModule } from '../payments/index.js'
import type { RevisionsModule } from '../revisions/index.js'
import { createUsersRepository } from '../users/users.repository.js'
import type { UsersService } from '../users/users.service.js'
import { createTasksController } from './tasks.controller.js'
import { createTasksRepository, type TasksRepository } from './tasks.repository.js'
import { createTasksRoutes } from './tasks.routes.js'
import { createTasksService } from './tasks.service.js'

export type TasksModuleDeps = {
  tasksRepository?: TasksRepository
  revisionsModule?: RevisionsModule
  paymentsModule?: PaymentsModule
  storage?: StorageService
}

export function createTasksModule(
  config: AppConfig = loadConfig(),
  users?: UsersService,
  deps: TasksModuleDeps = {},
) {
  if (!users) {
    throw new Error('createTasksModule requires a UsersService instance')
  }
  const usersRepository = createUsersRepository(config)
  const repository = deps.tasksRepository ?? createTasksRepository(config)
  const service = createTasksService(repository, users, usersRepository, {
    hasOpenRevision: deps.revisionsModule
      ? (taskId) => deps.revisionsModule!.hasOpenForTask(taskId)
      : undefined,
    recomputePaymentStatus: deps.paymentsModule
      ? (taskId) => deps.paymentsModule!.recomputeForTask(taskId)
      : undefined,
    storage: deps.storage ?? getStorageService(config),
  })
  const controller = createTasksController(service)
  return createTasksRoutes(controller, {
    revisions: deps.revisionsModule?.taskRoutes,
    payments: deps.paymentsModule?.paymentRoutes,
    refunds: deps.paymentsModule?.refundRoutes,
  })
}
