import 'dotenv/config'

import { createApp } from './app.js'
import { isSupabaseConfigured, loadConfig } from './config/index.js'
import { pingSupabase } from './database/index.js'
import { getLogger } from './logging/index.js'

const config = loadConfig()
const logger = getLogger()
const app = createApp({ config })

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, 'Original IQ API listening')

  if (!isSupabaseConfigured(config)) {
    logger.warn('Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
    return
  }

  void pingSupabase(config)
    .then(() => {
      logger.info({ url: config.supabaseUrl }, 'Supabase connected')
    })
    .catch((error: unknown) => {
      logger.error({ err: error }, 'Supabase connection failed')
    })
})

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down')
  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
