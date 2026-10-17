import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { getMailer, type Mailer } from '../../mail/index.js'
import { getStorageService, type StorageService } from '../../storage/index.js'
import type { PaymentsRepository } from '../payments/payments.repository.js'
import type { TasksRepository } from '../tasks/tasks.repository.js'
import type { UsersRepository } from '../users/users.repository.js'
import { createInvoicesController } from './invoices.controller.js'
import { createInvoicesRepository, type InvoicesRepository } from './invoices.repository.js'
import { createInvoicesRoutes } from './invoices.routes.js'
import { createInvoicesService, type InvoicesService } from './invoices.service.js'

export type InvoicesModuleDeps = {
  paymentsRepository: PaymentsRepository
  tasksRepository: TasksRepository
  usersRepository: UsersRepository
  repository?: InvoicesRepository
  storage?: StorageService
  mailer?: Mailer
}

export type InvoicesModule = {
  service: InvoicesService
  routes: ReturnType<typeof createInvoicesRoutes>
}

export function createInvoicesModule(
  config: AppConfig = loadConfig(),
  deps: InvoicesModuleDeps,
): InvoicesModule {
  const service = createInvoicesService({
    repository: deps.repository ?? createInvoicesRepository(config),
    paymentsRepository: deps.paymentsRepository,
    tasksRepository: deps.tasksRepository,
    usersRepository: deps.usersRepository,
    storage: deps.storage ?? getStorageService(config),
    mailer: deps.mailer ?? getMailer(),
    companyName: config.appName,
  })
  return {
    service,
    routes: createInvoicesRoutes(createInvoicesController(service), config),
  }
}

export type { InvoicesService } from './invoices.service.js'
export type { InvoiceSummary } from './invoices.types.js'
