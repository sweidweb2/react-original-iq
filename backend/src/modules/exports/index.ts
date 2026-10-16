import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { createContactRepository } from '../contact/contact.repository.js'
import { createFeedbackRepository } from '../feedback/feedback.repository.js'
import type { PaymentsRepository } from '../payments/payments.repository.js'
import type { TasksRepository } from '../tasks/tasks.repository.js'
import { createUsersRepository } from '../users/users.repository.js'
import { createExportsController } from './exports.controller.js'
import { createExportsRoutes } from './exports.routes.js'
import { createExportsService } from './exports.service.js'

export function createExportsModule(
  config: AppConfig = loadConfig(),
  deps: {
    tasksRepository: TasksRepository
    paymentsRepository: PaymentsRepository
  },
) {
  const service = createExportsService({
    usersRepository: createUsersRepository(config),
    tasksRepository: deps.tasksRepository,
    paymentsRepository: deps.paymentsRepository,
    feedbackRepository: createFeedbackRepository(config),
    contactRepository: createContactRepository(config),
  })
  const controller = createExportsController(service)
  return createExportsRoutes(controller)
}
