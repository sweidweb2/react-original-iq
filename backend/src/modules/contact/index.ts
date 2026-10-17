import type { AppConfig } from '../../config/index.js'
import { loadConfig } from '../../config/index.js'
import { createContactController } from './contact.controller.js'
import { type ContactRepository, createContactRepository } from './contact.repository.js'
import { createContactRoutes } from './contact.routes.js'
import { createContactService } from './contact.service.js'

export function createContactModule(
  config: AppConfig = loadConfig(),
  repository: ContactRepository = createContactRepository(config),
) {
  const service = createContactService(repository)
  const controller = createContactController(service)
  return createContactRoutes(controller, config)
}
