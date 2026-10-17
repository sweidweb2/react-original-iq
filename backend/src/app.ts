import cors from 'cors'
import express from 'express'
import helmet from 'helmet'

import { type AppConfig, loadConfig } from './config/index.js'
import { errorHandler, notFoundHandler } from './errors/error.middleware.js'
import { createApiRateLimiter } from './middleware/rate-limit.js'
import { requestContext } from './middleware/request-context.js'
import { createRequestLogger } from './middleware/request-logger.js'
import { createV1Router } from './routes/v1.js'

export type AppDeps = {
  config?: AppConfig
}

export function createApp(deps: AppDeps = {}) {
  const config = deps.config ?? loadConfig()
  const app = express()

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

  app.use('/api/v1', createV1Router({ config }))

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
