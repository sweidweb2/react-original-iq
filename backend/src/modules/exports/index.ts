import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import type { ContactRepository } from '../contact/contact.repository.js'
import type { FeedbackRepository } from '../feedback/feedback.repository.js'
import type { PaymentsRepository } from '../payments/payments.repository.js'
import type { TasksRepository } from '../tasks/tasks.repository.js'
import type { UsersRepository } from '../users/users.repository.js'
import { createExportsController } from './exports.controller.js'
import { createExportsRoutes } from './exports.routes.js'
import { createExportsService } from './exports.service.js'

export function createExportsModule(
  _config: AppConfig = loadConfig(),
  deps: {
    usersRepository: UsersRepository
    tasksRepository: TasksRepository
    paymentsRepository: PaymentsRepository
    feedbackRepository: FeedbackRepository
    contactRepository: ContactRepository
  },
) {
  const service = createExportsService(deps)
  const controller = createExportsController(service)
  return createExportsRoutes(controller)
}
