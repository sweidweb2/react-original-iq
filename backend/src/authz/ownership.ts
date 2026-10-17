import { forbidden } from '../errors/app-error.js'
import { hasAnyRole, isAdmin, isClient, isSuper, isTutor } from './roles.js'

export type AuthActor = {
  id: string
  roles: readonly string[]
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

/**
 * Actor may access a task if they are super/admin, or a related party
 * (assigned coordinator, tutor, or client).
 */
export function assertTaskRelated(
  actor: AuthActor,
  task: TaskParties,
  message = 'You cannot access this task',
): void {
  if (isSuper(actor.roles) || isAdmin(actor.roles)) return
  if (isOps(actor.roles) && task.coordinatorId === actor.id) return
  if (isTutor(actor.roles) && task.tutorId === actor.id) return
  if (isClient(actor.roles) && task.clientId === actor.id) return
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

/**
 * Self, super, admin, or coordinator may access a user record (manage-user profile).
 */
export function assertSelfOrOps(
  actor: AuthActor,
  resourceUserId: string,
  message = 'You cannot access this user',
): void {
  if (isOps(actor.roles) || isSuper(actor.roles)) {
    return
  }
  assertOwner(actor.id, resourceUserId, message)
}

/**
 * Role hierarchy for account management: only super may create, assign, or modify
 * `super` accounts; admins manage every role below super.
 * Call with the target's current role and with any role being assigned.
 */
export function assertCanManageRole(
  actor: AuthActor,
  role: string,
  message = 'Only a super user can manage super accounts',
): void {
  if (role === 'super' && !isSuper(actor.roles)) {
    throw forbidden(message)
  }
}
