import { type AppConfig, loadConfig } from '../../config/index.js'
import { reportError } from '../../errors/report-error.js'
import { createLoggingController } from './logging.controller.js'
import { createLoggingRepository } from './logging.repository.js'
import { createLoggingRoutes } from './logging.routes.js'
import { createLoggingService, type LoggingService } from './logging.service.js'

let sharedService: LoggingService | null = null

export function getLoggingService(): LoggingService {
  if (!sharedService) {
    sharedService = createLoggingService(createLoggingRepository(loadConfig()), {
      onActivityWriteFailure: (error, input) =>
        reportError(error, {
          source: 'logging.activity',
          meta: { action: input.action, entity: input.entity, entityId: input.entityId },
        }),
    })
  }
  return sharedService
}

/** Reset shared service (tests only). */
export function resetLoggingServiceForTests(): void {
  sharedService = null
}

export function createLoggingModule(config: AppConfig = loadConfig()) {
  const service = getLoggingService()
  const controller = createLoggingController(service)
  return createLoggingRoutes(controller, config)
}

export type { LoggingService }
export { createLoggingRepository, createLoggingService }
