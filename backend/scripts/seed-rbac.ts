/**
 * Seed RBAC roles + permissions + default role assignments.
 * Catalog lives in `src/authz/permission-catalog.ts` (one permission per portal section/action).
 * Safe to re-run (upsert by key). Resets seeded roles' assignments to the catalog defaults
 * and removes retired permission keys. Edit later via Super → RBAC.
 *
 * Usage: npx tsx scripts/seed-rbac.ts
 */
import 'dotenv/config'

import pg from 'pg'

import {
  permissionDescription,
  permissionKeysForRole,
  RBAC_PERMISSIONS,
  RBAC_ROLES,
  RETIRED_PERMISSION_KEYS,
} from '../src/authz/permission-catalog.js'

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required in backend/.env')
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  })

  await client.connect()
  console.log('Connected. Seeding RBAC…')

  try {
    await client.query('BEGIN')

    for (const role of RBAC_ROLES) {
      const result = await client.query(
        `
        INSERT INTO roles (key, name, description, is_system, sort_order)
        VALUES ($1, $2, $3, true, $4)
        ON CONFLICT (key) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          is_system = EXCLUDED.is_system,
          sort_order = EXCLUDED.sort_order,
          updated_at = now()
        RETURNING id, key
        `,
        [role.key, role.name, role.description, role.sortOrder],
      )
      console.log(`✓ role  ${String(result.rows[0].key).padEnd(14)} ${result.rows[0].id}`)
    }

    for (const permission of RBAC_PERMISSIONS) {
      const result = await client.query(
        `
        INSERT INTO permissions (key, name, description, category)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (key) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          updated_at = now()
        RETURNING id, key
        `,
        [permission.key, permission.name, permissionDescription(permission), permission.category],
      )
      console.log(`✓ perm  ${String(result.rows[0].key).padEnd(26)} ${result.rows[0].id}`)
    }

    const retired = await client.query<{ key: string }>(
      'DELETE FROM permissions WHERE key = ANY($1::text[]) RETURNING key',
      [RETIRED_PERMISSION_KEYS],
    )
    for (const row of retired.rows) {
      console.log(`✗ retired ${row.key}`)
    }

    const roleRows = await client.query<{ id: string; key: string }>('SELECT id, key FROM roles')
    const permRows = await client.query<{ id: string; key: string }>(
      'SELECT id, key FROM permissions',
    )
    const roleIdByKey = new Map(roleRows.rows.map((r) => [r.key, r.id]))
    const permIdByKey = new Map(permRows.rows.map((p) => [p.key, p.id]))

    for (const role of RBAC_ROLES) {
      const roleId = roleIdByKey.get(role.key)
      if (!roleId) continue

      const permissionKeys = permissionKeysForRole(role.key)
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId])

      for (const permissionKey of permissionKeys) {
        const permissionId = permIdByKey.get(permissionKey)
        if (!permissionId) {
          throw new Error(`Permission missing after upsert: ${permissionKey}`)
        }
        await client.query(
          `
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
          `,
          [roleId, permissionId],
        )
      }
      console.log(`✓ assign ${role.key.padEnd(14)} ${permissionKeys.length} permissions`)
    }

    await client.query('COMMIT')
    console.log('\nRBAC seed complete. Edit freely in Super → RBAC.')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
