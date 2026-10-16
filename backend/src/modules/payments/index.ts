import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import type { TasksRepository } from '../tasks/tasks.repository.js'
import { createPaymentsController } from './payments.controller.js'
import { createPaymentsRepository } from './payments.repository.js'
import { createTaskPaymentsRoutes, createTaskRefundsRoutes } from './payments.routes.js'
import { createPaymentsService } from './payments.service.js'

export type PaymentsModule = {
  paymentRoutes: ReturnType<typeof createTaskPaymentsRoutes>
  refundRoutes: ReturnType<typeof createTaskRefundsRoutes>
  repository: ReturnType<typeof createPaymentsRepository>
}

export function createPaymentsModule(
  config: AppConfig = loadConfig(),
  tasksRepository: TasksRepository,
): PaymentsModule {
  const repository = createPaymentsRepository(config)
  const service = createPaymentsService(repository, tasksRepository)
  const controller = createPaymentsController(service)
  return {
    repository,
    paymentRoutes: createTaskPaymentsRoutes(controller),
    refundRoutes: createTaskRefundsRoutes(controller),
  }
}
