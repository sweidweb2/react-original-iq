import 'dotenv/config'

import { isSupabaseConfigured, loadConfig } from '../src/config/index.js'
import { pingSupabase } from '../src/database/index.js'

async function main() {
  const config = loadConfig()
  console.log('configured=', isSupabaseConfigured(config))
  console.log('url=', config.supabaseUrl)

  const ok = await pingSupabase(config)
  console.log('ping=', ok)
}

main().catch((error: unknown) => {
  console.error('ping failed:', error)
  process.exit(1)
})
