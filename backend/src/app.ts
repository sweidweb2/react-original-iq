import cors from 'cors'
import express from 'express'
import helmet from 'helmet'

import { type AppConfig, loadConfig } from './config/index.js'
import { errorHandler, notFoundHandler } from './errors/error.middleware.js'
import { setErrorSink } from './errors/report-error.js'
import { createApiRateLimiter } from './middleware/rate-limit.js'
import { requestContext } from './middleware/request-context.js'
import { createRequestLogger } from './middleware/request-logger.js'
import { getLoggingService } from './modules/logging/index.js'
import type { SettingsService } from './modules/settings/index.js'
import { createV1Router } from './routes/v1.js'

export type AppDeps = {
  config?: AppConfig
  settings?: SettingsService
}

export function createApp(deps: AppDeps = {}) {
  const config = deps.config ?? loadConfig()
  const app = express()

  const logging = getLoggingService()
  setErrorSink((record) => logging.recordErrorSafe(record))

  if (config.trustProxy) {
    app.set('trust proxy', 1)
  }

  app.use(requestContext)
  app.use(createRequestLogger())
  app.use(helmet())
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      exposedHeaders: ['Content-Disposition', 'X-Estimated-Size'],
    }),
  )
  app.use(express.json({ limit: config.jsonBodyLimit }))
  app.use(createApiRateLimiter(config))

  app.use('/api/v1', createV1Router({ config, settings: deps.settings }))

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
