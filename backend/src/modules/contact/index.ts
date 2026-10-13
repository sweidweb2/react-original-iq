import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { createContactController } from './contact.controller.js'
import { createContactRepository } from './contact.repository.js'
import { createContactRoutes } from './contact.routes.js'
import { createContactService } from './contact.service.js'

export function createContactModule(config: AppConfig = loadConfig()) {
  const repository = createContactRepository(config)
  const service = createContactService(repository)
  const controller = createContactController(service)
  return createContactRoutes(controller, config)
}
