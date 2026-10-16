/**
 * Seed RBAC roles + permissions + default role assignments.
 * Safe to re-run (upsert by key). Edit rows later via Admin → Roles & permissions.
 *
 * Usage: npx tsx scripts/seed-rbac.ts
 */
import 'dotenv/config'

import pg from 'pg'

const ROLES = [
  {
    key: 'super',
    name: 'Super',
    description: 'Platform oversight: activity logs and audit.',
    is_system: true,
    sort_order: 5,
  },
  {
    key: 'admin',
    name: 'Admin',
    description: 'Global oversight: users, payments, exports, system.',
    is_system: true,
    sort_order: 10,
  },
  {
    key: 'coordinator',
    name: 'Coordinator',
    description: 'Task ops: assign tutors, price, approve, revisions.',
    is_system: true,
    sort_order: 20,
  },
  {
    key: 'tutor',
    name: 'Tutor',
    description: 'Works assigned tasks, uploads solutions, revisions.',
    is_system: true,
    sort_order: 30,
  },
  {
    key: 'client',
    name: 'Client',
    description: 'Creates tasks, pays, downloads solutions, feedback.',
    is_system: true,
    sort_order: 40,
  },
] as const

const PERMISSIONS = [
  // From transfer doc 02 + expandable matrix keys (alter later)
  {
    key: 'manage_users',
    name: 'Manage users',
    description: 'Create, update, activate/deactivate any user.',
    category: 'users',
  },
  {
    key: 'manage_tutors',
    name: 'Manage tutors',
    description: 'Tutor-specific user administration.',
    category: 'users',
  },
  {
    key: 'manage_coordinators',
    name: 'Manage coordinators',
    description: 'Coordinator-specific user administration.',
    category: 'users',
  },
  {
    key: 'manage_rbac',
    name: 'Manage RBAC',
    description: 'Edit roles, permissions, and assignments.',
    category: 'system',
  },
  {
    key: 'manage_system',
    name: 'Manage system',
    description: 'System settings and privileged admin actions.',
    category: 'system',
  },
  {
    key: 'view_activity_logs',
    name: 'View activity logs',
    description: 'Read platform activity / audit trail.',
    category: 'system',
  },
  {
    key: 'view_reports',
    name: 'View reports',
    description: 'Access dashboards and reporting views.',
    category: 'reporting',
  },
  {
    key: 'export_data',
    name: 'Export data',
    description: 'CSV/PDF admin exports.',
    category: 'reporting',
  },
  {
    key: 'manage_leads',
    name: 'Manage leads',
    description: 'Leads, contact messages, newsletter.',
    category: 'marketing',
  },
  {
    key: 'manage_tasks',
    name: 'Manage tasks',
    description: 'Ops task create/edit/cancel/assign.',
    category: 'tasks',
  },
  {
    key: 'assign_tutors',
    name: 'Assign tutors',
    description: 'Assign or remove tutors on tasks.',
    category: 'tasks',
  },
  {
    key: 'set_pricing',
    name: 'Set pricing',
    description: 'Set or edit task price.',
    category: 'tasks',
  },
  {
    key: 'approve_deliveries',
    name: 'Approve deliveries',
    description: 'Approve or reject tutor submissions.',
    category: 'tasks',
  },
  {
    key: 'toggle_allow_view',
    name: 'Toggle allow view',
    description: 'Control client solution visibility.',
    category: 'tasks',
  },
  {
    key: 'manage_revisions',
    name: 'Manage revisions',
    description: 'Create/approve/reject revision sessions.',
    category: 'revisions',
  },
  {
    key: 'manage_payments',
    name: 'Manage payments',
    description: 'Manual payments and payment admin.',
    category: 'payments',
  },
  {
    key: 'manage_refunds',
    name: 'Manage refunds',
    description: 'Create and manage refunds.',
    category: 'payments',
  },
  {
    key: 'manage_files',
    name: 'Manage files',
    description: 'Upload/delete task docs and solutions (ops).',
    category: 'files',
  },
  {
    key: 'manage_feedback',
    name: 'Manage feedback',
    description: 'View and evaluate tutor metrics.',
    category: 'feedback',
  },
  {
    key: 'submit_work',
    name: 'Submit work',
    description: 'Tutor delivery and revision submission.',
    category: 'tasks',
  },
  {
    key: 'create_own_tasks',
    name: 'Create own tasks',
    description: 'Client task requests.',
    category: 'tasks',
  },
  {
    key: 'pay_own_tasks',
    name: 'Pay own tasks',
    description: 'Client gateway checkout on balance.',
    category: 'payments',
  },
  {
    key: 'submit_feedback',
    name: 'Submit feedback',
    description: 'Client feedback on completed work.',
    category: 'feedback',
  },
] as const

/** Default role → permission keys. Alter later in Admin UI or by re-editing this file. */
const ROLE_PERMISSION_KEYS: Record<(typeof ROLES)[number]['key'], readonly string[]> = {
  super: ['view_activity_logs', 'view_reports'],
  admin: PERMISSIONS.map((p) => p.key),
  coordinator: [
    'manage_tasks',
    'assign_tutors',
    'set_pricing',
    'approve_deliveries',
    'manage_revisions',
    'manage_refunds',
    'manage_files',
    'manage_feedback',
    'view_reports',
  ],
  tutor: ['submit_work', 'manage_files'],
  client: ['create_own_tasks', 'pay_own_tasks', 'submit_feedback'],
}

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
    for (const role of ROLES) {
      const result = await client.query(
        `
        INSERT INTO roles (key, name, description, is_system, sort_order)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (key) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          is_system = EXCLUDED.is_system,
          sort_order = EXCLUDED.sort_order,
          updated_at = now()
        RETURNING id, key
        `,
        [role.key, role.name, role.description, role.is_system, role.sort_order],
      )
      console.log(`✓ role  ${String(result.rows[0].key).padEnd(14)} ${result.rows[0].id}`)
    }

    for (const permission of PERMISSIONS) {
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
        [permission.key, permission.name, permission.description, permission.category],
      )
      console.log(`✓ perm  ${String(result.rows[0].key).padEnd(22)} ${result.rows[0].id}`)
    }

    const roleRows = await client.query<{ id: string; key: string }>('SELECT id, key FROM roles')
    const permRows = await client.query<{ id: string; key: string }>(
      'SELECT id, key FROM permissions',
    )
    const roleIdByKey = new Map(roleRows.rows.map((r) => [r.key, r.id]))
    const permIdByKey = new Map(permRows.rows.map((p) => [p.key, p.id]))

    for (const [roleKey, permissionKeys] of Object.entries(ROLE_PERMISSION_KEYS)) {
      const roleId = roleIdByKey.get(roleKey)
      if (!roleId) continue

      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId])

      for (const permissionKey of permissionKeys) {
        const permissionId = permIdByKey.get(permissionKey)
        if (!permissionId) {
          console.warn(`  skip missing permission: ${permissionKey}`)
          continue
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
      console.log(`✓ assign ${roleKey.padEnd(14)} ${permissionKeys.length} permissions`)
    }

    console.log('\nRBAC seed complete. Edit freely in Admin → Roles & permissions.')
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
