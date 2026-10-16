import type { AuthActor } from '../../authz/index.js'
import { assertTaskRelated, isAdmin, isOps, isSuper, isTutor } from '../../authz/index.js'
import { forbidden, notFound, validationError } from '../../errors/app-error.js'
import type { TasksRepository } from '../tasks/tasks.repository.js'
import type { Task } from '../tasks/tasks.types.js'
import type { RevisionsRepository } from './revisions.repository.js'
import type {
  CreateRevisionBody,
  TutorSubmitRevisionBody,
  UpdateRevisionBody,
} from './revisions.schema.js'
import type { RevisionDetail, RevisionSession } from './revisions.types.js'

export type RevisionsService = {
  createForTask: (taskId: string, body: CreateRevisionBody, actor: AuthActor) => Promise<RevisionSession>
  listForTask: (taskId: string, actor: AuthActor) => Promise<RevisionSession[]>
  getById: (id: string, actor: AuthActor) => Promise<RevisionDetail>
  update: (id: string, body: UpdateRevisionBody, actor: AuthActor) => Promise<RevisionSession>
  cancel: (id: string, actor: AuthActor) => Promise<RevisionSession>
  approve: (id: string, actor: AuthActor) => Promise<RevisionSession>
  reject: (id: string, actor: AuthActor) => Promise<RevisionSession>
  tutorSubmit: (
    id: string,
    body: TutorSubmitRevisionBody,
    actor: AuthActor,
  ) => Promise<RevisionDetail>
  tutorCancelSubmit: (id: string, actor: AuthActor) => Promise<RevisionSession>
}

function canManageRevisions(actor: AuthActor, task: Task): boolean {
  if (isAdmin(actor.roles) || isSuper(actor.roles)) return true
  return isOps(actor.roles) && task.coordinatorId === actor.id
}

export function createRevisionsService(
  repository: RevisionsRepository,
  tasksRepository: TasksRepository,
): RevisionsService {
  async function loadTask(taskId: string): Promise<Task> {
    const task = await tasksRepository.findById(taskId)
    if (!task) {
      throw notFound('Task not found', 'TASK_NOT_FOUND')
    }
    return task
  }

  async function loadRevision(id: string): Promise<RevisionDetail> {
    const revision = await repository.findById(id)
    if (!revision) {
      throw notFound('Revision not found', 'REVISION_NOT_FOUND')
    }
    return revision
  }

  return {
    async createForTask(taskId, body, actor) {
      if (!canManageRevisions(actor, await loadTask(taskId))) {
        throw forbidden('Only coordinators or admins can create revisions')
      }
      return repository.create({
        taskId,
        title: body.title,
        description: body.description,
        startDate: body.startDate,
        deadline: body.deadline,
      })
    },

    async listForTask(taskId, actor) {
      const task = await loadTask(taskId)
      assertTaskRelated(actor, task)
      return repository.listByTaskId(taskId)
    },

    async getById(id, actor) {
      const revision = await loadRevision(id)
      const task = await loadTask(revision.taskId)
      assertTaskRelated(actor, task)
      return revision
    },

    async update(id, body, actor) {
      const revision = await loadRevision(id)
      const task = await loadTask(revision.taskId)
      if (!canManageRevisions(actor, task)) {
        throw forbidden('You cannot edit this revision')
      }
      const updated = await repository.update(id, body)
      if (!updated) throw notFound('Revision not found', 'REVISION_NOT_FOUND')
      return updated
    },

    async cancel(id, actor) {
      const revision = await loadRevision(id)
      const task = await loadTask(revision.taskId)
      if (!canManageRevisions(actor, task)) {
        throw forbidden('You cannot cancel this revision')
      }
      const updated = await repository.setStatus(id, 'cancelled')
      if (!updated) throw notFound('Revision not found', 'REVISION_NOT_FOUND')
      return updated
    },

    async approve(id, actor) {
      const revision = await loadRevision(id)
      const task = await loadTask(revision.taskId)
      if (!canManageRevisions(actor, task)) {
        throw forbidden('You cannot approve this revision')
      }
      if (revision.status !== 'waiting_coordinator_approval') {
        throw validationError('Revision must be waiting for coordinator approval')
      }
      const updated = await repository.setStatus(id, 'completed')
      if (!updated) throw notFound('Revision not found', 'REVISION_NOT_FOUND')
      return updated
    },

    async reject(id, actor) {
      const revision = await loadRevision(id)
      const task = await loadTask(revision.taskId)
      if (!canManageRevisions(actor, task)) {
        throw forbidden('You cannot reject this revision')
      }
      if (revision.status !== 'waiting_coordinator_approval') {
        throw validationError('Revision must be waiting for coordinator approval')
      }
      const updated = await repository.setStatus(id, 'in-revision', { submitDate: null })
      if (!updated) throw notFound('Revision not found', 'REVISION_NOT_FOUND')
      return updated
    },

    async tutorSubmit(id, body, actor) {
      if (!isTutor(actor.roles)) {
        throw forbidden('Only tutors can submit revisions')
      }
      const revision = await loadRevision(id)
      const task = await loadTask(revision.taskId)
      if (task.tutorId !== actor.id) {
        throw forbidden('You are not assigned to this task')
      }
      if (revision.status !== 'in-revision') {
        throw validationError('Revision is not open for submission')
      }
      const submitDate = new Date().toISOString()
      const updated = await repository.setStatus(id, 'waiting_coordinator_approval', {
        submitDate,
      })
      if (!updated) throw notFound('Revision not found', 'REVISION_NOT_FOUND')
      if (body.solutionIds?.length) {
        await repository.linkSolutions(id, body.solutionIds)
      }
      return loadRevision(id)
    },

    async tutorCancelSubmit(id, actor) {
      if (!isTutor(actor.roles)) {
        throw forbidden('Only tutors can cancel revision submission')
      }
      const revision = await loadRevision(id)
      const task = await loadTask(revision.taskId)
      if (task.tutorId !== actor.id) {
        throw forbidden('You are not assigned to this task')
      }
      if (revision.status !== 'waiting_coordinator_approval') {
        throw validationError('Revision is not awaiting approval')
      }
      const updated = await repository.setStatus(id, 'in-revision', { submitDate: null })
      if (!updated) throw notFound('Revision not found', 'REVISION_NOT_FOUND')
      return updated
    },
  }
}
