import type { AuthActor } from '../../authz/index.js'
import { isAdmin, isOps, isSuper } from '../../authz/index.js'
import { forbidden, notFound, validationError } from '../../errors/app-error.js'
import type { UsersService } from '../users/users.service.js'
import type { CreateSpecializationBody, ListSpecializationsQuery } from './specializations.schema.js'
import type { SpecializationsRepository } from './specializations.repository.js'
import type { Specialization } from './specializations.types.js'

export type SpecializationsService = {
  list: (query: ListSpecializationsQuery, actor: AuthActor) => Promise<Specialization[]>
  create: (body: CreateSpecializationBody, actor: AuthActor) => Promise<Specialization>
  remove: (id: string, actor: AuthActor) => Promise<void>
}

function canManage(actor: AuthActor): boolean {
  return isOps(actor.roles) || isSuper(actor.roles) || isAdmin(actor.roles)
}

function canReadTutor(actor: AuthActor, tutorId: string): boolean {
  if (canManage(actor)) return true
  return actor.roles.includes('tutor') && actor.id === tutorId
}

export function createSpecializationsService(
  repository: SpecializationsRepository,
  users: UsersService,
): SpecializationsService {
  return {
    async list(query, actor) {
      if (!canReadTutor(actor, query.tutorId)) {
        throw forbidden('You cannot view these specializations')
      }
      return repository.listByTutorId(query.tutorId)
    },

    async create(body, actor) {
      if (!canManage(actor)) {
        throw forbidden('Only staff can manage specializations')
      }
      const tutor = await users.findById(body.tutorId)
      if (!tutor || tutor.role !== 'tutor') {
        throw validationError('tutorId must reference a tutor')
      }
      return repository.create({
        tutorId: body.tutorId,
        name: body.name,
        note: body.note,
      })
    },

    async remove(id, actor) {
      if (!canManage(actor)) {
        throw forbidden('Only staff can manage specializations')
      }
      const existing = await repository.findById(id)
      if (!existing) {
        throw notFound('Specialization not found')
      }
      await repository.deleteById(id)
    },
  }
}
