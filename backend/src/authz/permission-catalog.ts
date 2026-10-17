import type { RoleName } from '../modules/auth/auth.schema.js'

/**
 * RBAC catalog: one permission per gated portal section or action, with the roles that
 * get it by default. Source: transfer docs 02 (capability matrix), 11, 13, 15.
 * Super gets every permission; the platform pages carved out of admin (RBAC, settings,
 * backups, error logs, exports) are listed as super-only.
 * "Limited" cells in doc 02 are granted here; business rules in the services scope them.
 * Seeded by `scripts/seed-rbac.ts`; also the fallback when a role has no row in `roles`.
 */

export type CatalogRole = {
  key: RoleName
  name: string
  description: string
  sortOrder: number
}

export type CatalogPermission = {
  key: string
  name: string
  category: string
  /** Portal page → section where this permission applies. */
  section: string
  description: string
  roles: readonly RoleName[]
}

export const RBAC_ROLES: readonly CatalogRole[] = [
  {
    key: 'super',
    name: 'Super',
    description: 'All permissions, plus platform oversight: logs, RBAC, backups, settings.',
    sortOrder: 5,
  },
  {
    key: 'admin',
    name: 'Admin',
    description: 'Global operations: users, tasks, payments, CRM intake.',
    sortOrder: 10,
  },
  {
    key: 'coordinator',
    name: 'Coordinator',
    description: 'Task ops: assign tutors, price, approve, revisions.',
    sortOrder: 20,
  },
  {
    key: 'tutor',
    name: 'Tutor',
    description: 'Works assigned tasks, uploads solutions, revisions.',
    sortOrder: 30,
  },
  {
    key: 'client',
    name: 'Client',
    description: 'Creates tasks, pays, downloads solutions, feedback.',
    sortOrder: 40,
  },
]

const PERMISSIONS = [
  // Users
  {
    key: 'view_users',
    name: 'View users',
    category: 'users',
    section: 'Users list; Manage user → User details, Related tasks',
    description: 'Browse accounts, see user counts, and open user profiles.',
    roles: ['super', 'admin', 'coordinator'],
  },
  {
    key: 'create_users',
    name: 'Create users',
    category: 'users',
    section: 'Users → Add user',
    description: 'Create accounts for any role the actor may manage.',
    roles: ['super', 'admin'],
  },
  {
    key: 'manage_users',
    name: 'Manage users',
    category: 'users',
    section: 'Users → Edit user; Manage user → User details',
    description:
      "Edit other users' details. Which accounts depends on the manage-role permissions.",
    roles: ['super', 'admin', 'coordinator'],
  },
  {
    key: 'reset_user_passwords',
    name: 'Reset user passwords',
    category: 'users',
    section: 'Users → Edit user; Manage user → User details (password)',
    description: "Set a new password for another user. Revokes that user's sessions.",
    roles: ['super', 'admin'],
  },
  {
    key: 'manage_super_users',
    name: 'Manage super users',
    category: 'users',
    section: 'Users; Manage user',
    description: 'Create, edit, deactivate, or delete super accounts.',
    roles: ['super'],
  },
  {
    key: 'manage_admins',
    name: 'Manage admins',
    category: 'users',
    section: 'Users; Manage user',
    description: 'Create, edit, deactivate, or delete admin accounts.',
    roles: ['super', 'admin'],
  },
  {
    key: 'manage_coordinators',
    name: 'Manage coordinators',
    category: 'users',
    section: 'Users; Manage user',
    description: 'Create, edit, deactivate, or delete coordinator accounts.',
    roles: ['super', 'admin'],
  },
  {
    key: 'manage_tutors',
    name: 'Manage tutors',
    category: 'users',
    section: 'Users; Manage user',
    description: 'Create, edit, deactivate, or delete tutor accounts.',
    roles: ['super', 'admin', 'coordinator'],
  },
  {
    key: 'manage_clients',
    name: 'Manage clients',
    category: 'users',
    section: 'Users; Manage user',
    description: 'Create, edit, deactivate, or delete client (student) accounts.',
    roles: ['super', 'admin', 'coordinator'],
  },
  {
    key: 'change_user_roles',
    name: 'Change user roles',
    category: 'users',
    section: 'Manage user → User details (role)',
    description: "Change a user's role.",
    roles: ['super', 'admin'],
  },
  {
    key: 'activate_users',
    name: 'Activate / deactivate users',
    category: 'users',
    section: 'Users list (status toggle); Manage user → User details (status)',
    description: 'Activate or deactivate accounts. Deactivation revokes sessions.',
    roles: ['super', 'admin'],
  },
  {
    key: 'delete_users',
    name: 'Delete users',
    category: 'users',
    section: 'Manage user → Danger zone',
    description: 'Safe-delete users without active tasks or money rows.',
    roles: ['super', 'admin', 'coordinator'],
  },
  {
    key: 'assign_user_permissions',
    name: 'Assign user permissions',
    category: 'users',
    section: 'Manage user → Permissions',
    description: 'Grant or revoke direct permissions on a user.',
    roles: ['super'],
  },
  {
    key: 'manage_specializations',
    name: 'Manage specializations',
    category: 'users',
    section: 'Manage user → Specializations',
    description: "Add or remove a tutor's subjects and skills.",
    roles: ['super', 'admin', 'coordinator'],
  },

  // System (super portal)
  {
    key: 'view_activity_logs',
    name: 'View activity logs',
    category: 'system',
    section: 'Activity log',
    description: 'Read the platform activity and audit trail.',
    roles: ['super', 'admin'],
  },
  {
    key: 'view_error_logs',
    name: 'View error logs',
    category: 'system',
    section: 'Error log',
    description: 'Read server and client error reports, including stacks.',
    roles: ['super'],
  },
  {
    key: 'manage_rbac',
    name: 'Manage RBAC',
    category: 'system',
    section: 'RBAC → Roles, Permissions',
    description: 'Edit roles, permissions, and role assignments.',
    roles: ['super'],
  },
  {
    key: 'manage_backups',
    name: 'Manage backups',
    category: 'system',
    section: 'Backup → Tables, Storage, Auth users, Backup history',
    description: 'Run, download, and re-run database and storage backups.',
    roles: ['super'],
  },
  {
    key: 'manage_system',
    name: 'Manage system settings',
    category: 'system',
    section: 'Settings → Platform',
    description: 'Toggle maintenance mode and outgoing email.',
    roles: ['super'],
  },

  // Reporting
  {
    key: 'view_dashboard',
    name: 'View dashboard',
    category: 'reporting',
    section: 'Coordinator / Tutor / Client dashboard',
    description: 'Role home KPIs and recent tasks, scoped to own or assigned work.',
    roles: ['coordinator', 'tutor', 'client'],
  },
  {
    key: 'view_reports',
    name: 'View reports',
    category: 'reporting',
    section: 'Admin home → Analytics',
    description: 'Global revenue, user, task, rating, and CRM analytics.',
    roles: ['admin'],
  },
  {
    key: 'export_data',
    name: 'Export data',
    category: 'reporting',
    section: 'Profile → Exports; Leads / Stay updated / Contact exports',
    description: 'CSV and PDF exports of platform data.',
    roles: ['super'],
  },
  {
    key: 'send_custom_emails',
    name: 'Send custom emails',
    category: 'reporting',
    section: 'Admin → Email',
    description: 'Send custom emails to users.',
    roles: ['admin'],
  },

  // Marketing / CRM intake
  {
    key: 'manage_leads',
    name: 'Manage leads',
    category: 'marketing',
    section: 'Leads',
    description: 'View, create, edit, and delete leads.',
    roles: ['admin'],
  },
  {
    key: 'manage_contact_messages',
    name: 'Manage contact messages',
    category: 'marketing',
    section: 'Contact',
    description: 'View, create, edit, and delete contact messages.',
    roles: ['admin'],
  },
  {
    key: 'manage_newsletter',
    name: 'Manage newsletter',
    category: 'marketing',
    section: 'Stay updated',
    description: 'View, add, edit, and remove newsletter subscribers.',
    roles: ['admin'],
  },

  // Tasks
  {
    key: 'view_tasks',
    name: 'View tasks',
    category: 'tasks',
    section: 'Tasks → Task list; Task details',
    description: 'List and open tasks in scope: own (client), assigned (tutor, coordinator).',
    roles: ['admin', 'coordinator', 'tutor', 'client'],
  },
  {
    key: 'view_all_tasks',
    name: 'View all tasks',
    category: 'tasks',
    section: 'Tasks → Task list',
    description: 'See every task on the platform, not just assigned ones.',
    roles: ['admin'],
  },
  {
    key: 'create_own_tasks',
    name: 'Create own tasks',
    category: 'tasks',
    section: 'Client dashboard → Request help; Tasks → Create task',
    description: 'Submit a task request as a client.',
    roles: ['client'],
  },
  {
    key: 'create_tasks',
    name: 'Create tasks',
    category: 'tasks',
    section: 'Coordinator dashboard → Create task; Tasks → Create task',
    description: 'Create a task on behalf of a client.',
    roles: ['admin', 'coordinator'],
  },
  {
    key: 'edit_own_tasks',
    name: 'Edit own tasks',
    category: 'tasks',
    section: 'Task details → Task information (Edit)',
    description: "Edit the allowed fields of the client's own unpaid task.",
    roles: ['client'],
  },
  {
    key: 'edit_tasks',
    name: 'Edit tasks',
    category: 'tasks',
    section: 'Task details → Task information (Edit)',
    description: 'Edit task topic, type, category, and description.',
    roles: ['admin', 'coordinator'],
  },
  {
    key: 'delete_own_tasks',
    name: 'Delete own tasks',
    category: 'tasks',
    section: 'Task details → Task information (Delete)',
    description: "Delete the client's own task while it has no payments or refunds.",
    roles: ['client'],
  },
  {
    key: 'delete_tasks',
    name: 'Delete tasks',
    category: 'tasks',
    section: 'Task details → Task information (Delete)',
    description: 'Delete a task that has no payments or refunds.',
    roles: ['admin', 'coordinator'],
  },
  {
    key: 'assign_tutors',
    name: 'Assign tutors',
    category: 'tasks',
    section: 'Task details → Tutor',
    description: 'Assign or remove the tutor on a task.',
    roles: ['admin', 'coordinator'],
  },
  {
    key: 'change_coordinator',
    name: 'Change coordinator',
    category: 'tasks',
    section: 'Task details → Coordinator',
    description: 'Reassign the coordinator responsible for a task.',
    roles: ['admin'],
  },
  {
    key: 'set_pricing',
    name: 'Set pricing',
    category: 'tasks',
    section: 'Task details → Payments (Edit price)',
    description: 'Set or edit the task price.',
    roles: ['admin', 'coordinator'],
  },
  {
    key: 'cancel_tasks',
    name: 'Cancel / reactivate tasks',
    category: 'tasks',
    section: 'Task details → Task controls',
    description: 'Cancel a task or reactivate a cancelled one.',
    roles: ['admin', 'coordinator'],
  },
  {
    key: 'toggle_allow_view',
    name: 'Toggle client solution access',
    category: 'tasks',
    section: 'Task details → Task controls (Client view)',
    description: 'Control whether the client can see and download solutions.',
    roles: ['admin'],
  },
  {
    key: 'approve_deliveries',
    name: 'Approve deliveries',
    category: 'tasks',
    section: 'Task details → Header actions (Approve / Return)',
    description: 'Approve or return a tutor submission.',
    roles: ['admin', 'coordinator'],
  },
  {
    key: 'submit_work',
    name: 'Submit work',
    category: 'tasks',
    section: 'Task details → Header actions (Submit / Withdraw)',
    description: 'Submit a task delivery for approval or withdraw it.',
    roles: ['tutor'],
  },

  // Files
  {
    key: 'download_task_documents',
    name: 'Download task documents',
    category: 'files',
    section: 'Task details → Documents',
    description: 'Open and download task documents.',
    roles: ['admin', 'coordinator', 'tutor', 'client'],
  },
  {
    key: 'upload_task_documents',
    name: 'Upload task documents',
    category: 'files',
    section: 'Task details → Documents (Upload)',
    description: 'Upload task documents. Clients only on their own tasks.',
    roles: ['admin', 'coordinator', 'client'],
  },
  {
    key: 'delete_task_documents',
    name: 'Delete task documents',
    category: 'files',
    section: 'Task details → Documents (Remove)',
    description: 'Remove task documents. Clients only on their own tasks.',
    roles: ['admin', 'coordinator', 'client'],
  },
  {
    key: 'download_solutions',
    name: 'Download solutions',
    category: 'files',
    section: 'Task details → Solutions',
    description: 'Open and download solutions. Clients only when client view is on.',
    roles: ['admin', 'coordinator', 'tutor', 'client'],
  },
  {
    key: 'upload_solutions',
    name: 'Upload solutions',
    category: 'files',
    section: 'Task details → Solutions (Upload)',
    description: 'Upload solution files. Tutors only on assigned tasks.',
    roles: ['admin', 'coordinator', 'tutor'],
  },
  {
    key: 'delete_solutions',
    name: 'Delete solutions',
    category: 'files',
    section: 'Task details → Solutions (Remove)',
    description: 'Remove solution files. Tutors only on assigned tasks.',
    roles: ['admin', 'coordinator', 'tutor'],
  },
  {
    key: 'bulk_download_files',
    name: 'Bulk download files',
    category: 'files',
    section: 'Task details → Documents / Solutions (Download ZIP)',
    description: 'Download selected documents or solutions as one ZIP.',
    roles: ['admin', 'coordinator', 'tutor', 'client'],
  },

  // Revisions
  {
    key: 'view_revisions',
    name: 'View revisions',
    category: 'revisions',
    section: 'Task details → Revision; Revision details',
    description: 'See revision sessions and their solutions.',
    roles: ['admin', 'coordinator', 'tutor'],
  },
  {
    key: 'create_revisions',
    name: 'Create revisions',
    category: 'revisions',
    section: 'Task details → Revision (Create revision)',
    description: 'Open a revision session on a task.',
    roles: ['admin', 'coordinator'],
  },
  {
    key: 'manage_revisions',
    name: 'Manage revisions',
    category: 'revisions',
    section: 'Revision details → Session (Edit / Approve / Reject / Cancel)',
    description: 'Edit, approve, reject, or cancel revision sessions.',
    roles: ['admin', 'coordinator'],
  },
  {
    key: 'submit_revisions',
    name: 'Submit revisions',
    category: 'revisions',
    section: 'Revision details → Revision solutions (Upload / Submit / Withdraw)',
    description: 'Upload revision solutions and submit or withdraw the revision.',
    roles: ['tutor'],
  },

  // Payments
  {
    key: 'view_payment_summary',
    name: 'View payment summary',
    category: 'payments',
    section: 'Task details → Payments',
    description: 'Price, paid, and due snapshot for a task.',
    roles: ['admin', 'coordinator', 'tutor', 'client'],
  },
  {
    key: 'view_payments',
    name: 'View payments',
    category: 'payments',
    section: 'Task payments → Insights, Payments, Refunds',
    description: 'Full payment and refund history. Clients only on their own tasks.',
    roles: ['admin', 'coordinator', 'client'],
  },
  {
    key: 'pay_own_tasks',
    name: 'Pay own tasks',
    category: 'payments',
    section: 'Task payments → Pay now',
    description: 'Pay the remaining balance through the gateway.',
    roles: ['client'],
  },
  {
    key: 'manage_payments',
    name: 'Manage payments',
    category: 'payments',
    section: 'Task payments → Payments (Record / Edit / Delete)',
    description: 'Record, edit, and delete manual payments.',
    roles: ['admin'],
  },
  {
    key: 'manage_refunds',
    name: 'Manage refunds',
    category: 'payments',
    section: 'Task payments → Refunds (Create / Mark paid / Cancel)',
    description: 'Create refunds and settle or cancel pending ones.',
    roles: ['admin', 'coordinator'],
  },
  {
    key: 'download_invoices',
    name: 'Download invoices',
    category: 'payments',
    section: 'Task payments → Payments (Invoice)',
    description: 'Download payment invoices. Clients only on their own tasks.',
    roles: ['admin', 'client'],
  },
  {
    key: 'manage_invoices',
    name: 'Manage invoices',
    category: 'payments',
    section: 'Task payments → Payments (Resend invoice)',
    description: 'Resend invoice emails.',
    roles: ['admin'],
  },

  // Feedback
  {
    key: 'view_feedback',
    name: 'View feedback',
    category: 'feedback',
    section: 'Feedback → List',
    description: 'Read feedback in scope: own (client), received (tutor), all (admin).',
    roles: ['admin', 'coordinator', 'tutor', 'client'],
  },
  {
    key: 'submit_feedback',
    name: 'Submit feedback',
    category: 'feedback',
    section: 'Feedback → Rate completed task',
    description: 'Rate and review completed work.',
    roles: ['client'],
  },
  {
    key: 'delete_feedback',
    name: 'Delete feedback',
    category: 'feedback',
    section: 'Feedback → List (Delete)',
    description: 'Delete feedback entries.',
    roles: ['admin'],
  },
  {
    key: 'evaluate_tutors',
    name: 'Evaluate tutors',
    category: 'feedback',
    section: 'Coordinator dashboard → Evaluate tutor',
    description: 'Score tutor punctuality, quality, perfection, and stars.',
    roles: ['admin', 'coordinator'],
  },

  // Profile
  {
    key: 'manage_own_profile',
    name: 'Manage own profile',
    category: 'profile',
    section: 'Profile → Personal information, Password',
    description: 'Update own name, email, and password.',
    roles: ['super', 'admin', 'coordinator', 'tutor', 'client'],
  },
  {
    key: 'delete_own_account',
    name: 'Delete own account',
    category: 'profile',
    section: 'Profile → Danger zone',
    description: 'Delete own account. Staff only when no work is assigned.',
    roles: ['admin', 'coordinator', 'tutor', 'client'],
  },
] as const satisfies readonly CatalogPermission[]

export type PermissionKey = (typeof PERMISSIONS)[number]['key']

export const RBAC_PERMISSIONS: readonly CatalogPermission[] = PERMISSIONS

/** Keys from earlier seeds that were split into the section-level permissions above. */
export const RETIRED_PERMISSION_KEYS: readonly string[] = [
  'manage_tasks',
  'manage_files',
  'manage_feedback',
]

/** Granted to super regardless of edits so the RBAC page can't be locked out. */
export const LOCKOUT_GUARD: Partial<Record<RoleName, readonly PermissionKey[]>> = {
  super: ['manage_rbac'],
}

/** Roles seeded with every permission. Super outranks admin (see `manage_super_users`). */
export const ALL_PERMISSIONS_ROLES: readonly RoleName[] = ['super']

export function permissionKeysForRole(role: string): string[] {
  if ((ALL_PERMISSIONS_ROLES as readonly string[]).includes(role)) {
    return RBAC_PERMISSIONS.map((permission) => permission.key)
  }
  return RBAC_PERMISSIONS.filter((permission) =>
    (permission.roles as readonly string[]).includes(role),
  ).map((permission) => permission.key)
}

export function permissionDescription(permission: CatalogPermission): string {
  return `${permission.section}: ${permission.description}`
}
