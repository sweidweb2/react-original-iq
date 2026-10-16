import { forbidden } from '../errors/app-error.js'
import { hasAnyRole, isAdmin } from './roles.js'

export type AuthActor = {
  id: string
  roles: readonly string[]
}

/** Admin or coordinator — ops user management. */
const OPS_ROLES = ['admin', 'coordinator'] as const

export function isOps(roles: readonly string[] | undefined): boolean {
  return hasAnyRole(roles, OPS_ROLES)
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
 * Self, admin, or coordinator may access a user record (manage-user profile).
 */
export function assertSelfOrOps(
  actor: AuthActor,
  resourceUserId: string,
  message = 'You cannot access this user',
): void {
  if (isOps(actor.roles)) {
    return
  }
  assertOwner(actor.id, resourceUserId, message)
}
