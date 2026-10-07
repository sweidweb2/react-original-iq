import { createLoggingController } from './logging.controller.js'
import { createLoggingRepository } from './logging.repository.js'
import { createLoggingRoutes } from './logging.routes.js'
import { createLoggingService, type LoggingService } from './logging.service.js'

let sharedService: LoggingService | null = null

export function getLoggingService(): LoggingService {
  if (!sharedService) {
    sharedService = createLoggingService(createLoggingRepository())
  }
  return sharedService
}

export function createLoggingModule() {
  const service = getLoggingService()
  const controller = createLoggingController(service)
  return createLoggingRoutes(controller)
}

export type { LoggingService }
export { createLoggingRepository, createLoggingService }
