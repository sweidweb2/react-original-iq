/**
 * Apply backend/migrations/001_*.sql … in order via DATABASE_URL.
 *
 * Usage: npx tsx scripts/apply-migrations.ts
 *
 * If you see getaddrinfo ENOENT on db.<ref>.supabase.co: that host is IPv6-only.
 * Use the Session pooler URI (Dashboard → Database → Connect → Session mode):
 *   postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
 */
import 'dotenv/config'

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.resolve(__dirname, '../migrations')

function formatConnectError(error: unknown): string {
  const err = error as NodeJS.ErrnoException & { hostname?: string }
  if (err.code === 'ENOENT' || err.code === 'ENOTFOUND') {
    return [
      `Cannot resolve database host (${err.hostname ?? 'unknown'}).`,
      'Direct db.<project>.supabase.co is often IPv6-only.',
      'Fix: Supabase Dashboard → Database → Connect → Session pooler URI',
      'Set that as DATABASE_URL in backend/.env, then re-run this script.',
    ].join('\n')
  }
  return error instanceof Error ? error.message : String(error)
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required in backend/.env (use Session pooler URI from Supabase)',
    )
  }

  const files = (await readdir(migrationsDir))
    .filter((name) => /^\d{3}_.+\.sql$/i.test(name))
    .sort()

  if (files.length === 0) {
    throw new Error(`No numbered .sql files in ${migrationsDir}`)
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
  } catch (error) {
    console.error(formatConnectError(error))
    process.exit(1)
  }

  console.log('Connected. Applying', files.length, 'migrations…')

  try {
    for (const file of files) {
      const fullPath = path.join(migrationsDir, file)
      const sql = await readFile(fullPath, 'utf8')
      process.stdout.write(`→ ${file} … `)
      await client.query(sql)
      console.log('ok')
    }
    console.log('All migrations applied.')
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
