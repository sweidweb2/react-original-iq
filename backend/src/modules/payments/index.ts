import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import type { InvoicesService } from '../invoices/invoices.service.js'
import type { TasksRepository } from '../tasks/tasks.repository.js'
import { createPaymentsController } from './payments.controller.js'
import { createPaymentsRepository, type PaymentsRepository } from './payments.repository.js'
import { createTaskPaymentsRoutes, createTaskRefundsRoutes } from './payments.routes.js'
import { createPaymentsService } from './payments.service.js'

export type PaymentsModule = {
  paymentRoutes: ReturnType<typeof createTaskPaymentsRoutes>
  refundRoutes: ReturnType<typeof createTaskRefundsRoutes>
  repository: PaymentsRepository
  recomputeForTask: (taskId: string) => Promise<string>
}

export type PaymentsModuleDeps = {
  tasksRepository: TasksRepository
  invoices: InvoicesService
  repository?: PaymentsRepository
}

export function createPaymentsModule(
  config: AppConfig = loadConfig(),
  deps: PaymentsModuleDeps,
): PaymentsModule {
  const repository = deps.repository ?? createPaymentsRepository(config)
  const service = createPaymentsService(repository, deps.tasksRepository, deps.invoices, {
    gatewayMode: config.paymentGatewayMode,
  })
  const controller = createPaymentsController(service)
  return {
    repository,
    paymentRoutes: createTaskPaymentsRoutes(controller),
    refundRoutes: createTaskRefundsRoutes(controller),
    recomputeForTask: (taskId) => service.recomputeForTask(taskId),
  }
}
