import type { RequestHandler } from 'express'

import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import type { InvoicesService } from '../invoices/invoices.service.js'
import type { TasksRepository } from '../tasks/tasks.repository.js'
import type { UsersRepository } from '../users/users.repository.js'
import { payerDisplayName } from './montypay.js'
import { createPaymentsController } from './payments.controller.js'
import { createPaymentsRepository, type PaymentsRepository } from './payments.repository.js'
import {
  createMontyPayCallbackRoutes,
  createTaskPaymentsRoutes,
  createTaskRefundsRoutes,
} from './payments.routes.js'
import { createPaymentsService } from './payments.service.js'

export type PaymentsModule = {
  paymentRoutes: ReturnType<typeof createTaskPaymentsRoutes>
  refundRoutes: ReturnType<typeof createTaskRefundsRoutes>
  callbackRoutes: ReturnType<typeof createMontyPayCallbackRoutes>
  montyPayCallback: RequestHandler
  repository: PaymentsRepository
  recomputeForTask: (taskId: string) => Promise<string>
}

export type PaymentsModuleDeps = {
  tasksRepository: TasksRepository
  invoices: InvoicesService
  repository?: PaymentsRepository
  usersRepository?: UsersRepository
}

export function createPaymentsModule(
  config: AppConfig = loadConfig(),
  deps: PaymentsModuleDeps,
): PaymentsModule {
  const repository = deps.repository ?? createPaymentsRepository(config)
  const usersRepository = deps.usersRepository
  const service = createPaymentsService(repository, deps.tasksRepository, deps.invoices, {
    gatewayMode: config.paymentGatewayMode,
    montypay: config.montypay,
    webOrigin: config.corsOrigins[0],
    findPayer: usersRepository
      ? async (userId) => {
          const user = await usersRepository.findById(userId)
          if (!user) return null
          return { name: payerDisplayName(user.profile), email: user.email }
        }
      : undefined,
  })
  const controller = createPaymentsController(service)
  return {
    repository,
    paymentRoutes: createTaskPaymentsRoutes(controller, config),
    refundRoutes: createTaskRefundsRoutes(controller, config),
    callbackRoutes: createMontyPayCallbackRoutes(controller),
    montyPayCallback: controller.montyPayCallback,
    recomputeForTask: (taskId) => service.recomputeForTask(taskId),
  }
}
