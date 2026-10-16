/**
 * Seed one active user per role into Supabase `users`.
 *
 * Usage: npx tsx scripts/seed-users.ts
 *
 * Default password for all seeds: password
 */
import 'dotenv/config'

import bcrypt from 'bcrypt'
import pg from 'pg'

const DEFAULT_PASSWORD = 'password'

const SEED_USERS = [
  {
    name: 'Super User',
    email: 'super@original-iq.com',
    role: 'super',
  },
  {
    name: 'Admin User',
    email: 'admin@original-iq.com',
    role: 'admin',
  },
  {
    name: 'Coordinator User',
    email: 'coordinator@original-iq.com',
    role: 'coordinator',
  },
  {
    name: 'Tutor User',
    email: 'tutor@original-iq.com',
    role: 'tutor',
  },
  {
    name: 'Client User',
    email: 'client@original-iq.com',
    role: 'client',
  },
] as const

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required in backend/.env')
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12)
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  })

  await client.connect()
  console.log('Connected. Seeding users…')

  try {
    for (const user of SEED_USERS) {
      const result = await client.query(
        `
        INSERT INTO users (name, email, password_hash, role, email_verified, is_active)
        VALUES ($1, $2, $3, $4::user_role, true, true)
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          email_verified = true,
          is_active = true,
          updated_at = now()
        RETURNING id, email, role
        `,
        [user.name, user.email, passwordHash, user.role],
      )
      const row = result.rows[0] as { id: string; email: string; role: string }
      console.log(`✓ ${row.role.padEnd(12)} ${row.email}  (${row.id})`)
    }

    console.log('\nLogin password for all seeds:', DEFAULT_PASSWORD)
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
