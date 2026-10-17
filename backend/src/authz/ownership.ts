import { forbidden } from '../errors/app-error.js'
import type { RoleName } from '../modules/auth/auth.schema.js'
import type { PermissionKey } from './permission-catalog.js'
import { hasPermission, type PermissionHolder } from './permissions.js'
import { hasAnyRole, isAdmin, isClient, isTutor } from './roles.js'

export type AuthActor = PermissionHolder & {
  id: string
}

/** Task party fields used for horizontal access checks. */
export type TaskParties = {
  clientId: string
  tutorId: string | null
  coordinatorId: string | null
}

/** Admin or coordinator — ops user management. */
const OPS_ROLES = ['admin', 'coordinator'] as const

export function isOps(roles: readonly string[] | undefined): boolean {
  return hasAnyRole(roles, OPS_ROLES)
}

/** Assigned coordinator, or anyone allowed to see every task (`view_all_tasks`). */
export function isTaskStaff(actor: AuthActor, task: TaskParties): boolean {
  if (hasPermission(actor, 'view_all_tasks')) return true
  return isOps(actor.roles) && task.coordinatorId === actor.id
}

export function isTaskTutor(actor: AuthActor, task: TaskParties): boolean {
  return isTutor(actor.roles) && task.tutorId === actor.id
}

export function isTaskClient(actor: AuthActor, task: TaskParties): boolean {
  return isClient(actor.roles) && task.clientId === actor.id
}

/**
 * Actor may access a task with `view_all_tasks`, or with `view_tasks` as a related party
 * (assigned coordinator, tutor, or client).
 */
export function assertTaskRelated(
  actor: AuthActor,
  task: TaskParties,
  message = 'You cannot access this task',
): void {
  if (hasPermission(actor, 'view_all_tasks')) return
  if (
    hasPermission(actor, 'view_tasks') &&
    (isTaskStaff(actor, task) || isTaskTutor(actor, task) || isTaskClient(actor, task))
  ) {
    return
  }
  throw forbidden(message)
}

/**
 * Horizontal access: actor must own the resource.
 * Call from services after loading the resource — never trust client-supplied owner ids.
 */
export function assertOwner(
  actorId: string,
  ownerId: string,
  message = 'You do not own this resource',
): void {
  if (actorId !== ownerId) {
    throw forbidden(message)
  }
}

/**
 * Owner may access; admin may bypass ownership.
 * Prefer this for user-owned domain resources.
 */
export function assertOwnerOrAdmin(
  actor: AuthActor,
  ownerId: string,
  message = 'You do not own this resource',
): void {
  if (isAdmin(actor.roles)) {
    return
  }
  assertOwner(actor.id, ownerId, message)
}

/**
 * Self or admin: profile / account reads-writes for the same user id.
 */
export function assertSelfOrAdmin(
  actor: AuthActor,
  resourceUserId: string,
  message = 'You cannot access this user',
): void {
  if (isAdmin(actor.roles)) {
    return
  }
  assertOwner(actor.id, resourceUserId, message)
}

/** Self, or anyone with `view_users`, may read a user record (manage-user profile). */
export function assertSelfOrUserViewer(
  actor: AuthActor,
  resourceUserId: string,
  message = 'You cannot access this user',
): void {
  if (hasPermission(actor, 'view_users')) {
    return
  }
  assertOwner(actor.id, resourceUserId, message)
}

const ROLE_MANAGE_PERMISSION: Record<RoleName, PermissionKey> = {
  super: 'manage_super_users',
  admin: 'manage_admins',
  coordinator: 'manage_coordinators',
  tutor: 'manage_tutors',
  client: 'manage_clients',
}

export function canManageRole(actor: AuthActor, role: string): boolean {
  const key = ROLE_MANAGE_PERMISSION[role as RoleName]
  return key !== undefined && hasPermission(actor, key)
}

/**
 * Account hierarchy: managing (create, edit, assign, deactivate, delete) an account of a
 * role needs that role's manage permission, e.g. `manage_super_users` for super accounts.
 * Call with the target's current role and with any role being assigned.
 */
export function assertCanManageRole(actor: AuthActor, role: string, message?: string): void {
  if (!canManageRole(actor, role)) {
    throw forbidden(message ?? `You cannot manage ${role} accounts`)
  }
}
