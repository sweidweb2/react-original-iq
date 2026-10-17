import type { AuthActor } from '../../authz/index.js'
import { assertTaskRelated, hasPermission, isTaskStaff, isTaskTutor } from '../../authz/index.js'
import { conflict, forbidden, notFound, validationError } from '../../errors/app-error.js'
import type { TasksRepository } from '../tasks/tasks.repository.js'
import type { Task } from '../tasks/tasks.types.js'
import { OPEN_REVISION_STATUSES, type RevisionsRepository } from './revisions.repository.js'
import {
  type CreateRevisionBody,
  isDeadlineAfterStart,
  type TutorSubmitRevisionBody,
  type UpdateRevisionBody,
} from './revisions.schema.js'
import type { RevisionDetail, RevisionSession } from './revisions.types.js'

export type RevisionsService = {
  createForTask: (
    taskId: string,
    body: CreateRevisionBody,
    actor: AuthActor,
  ) => Promise<RevisionSession>
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

function canManageRevisions(
  actor: AuthActor,
  task: Task,
  key: 'create_revisions' | 'manage_revisions' = 'manage_revisions',
): boolean {
  return hasPermission(actor, key) && isTaskStaff(actor, task)
}

function assertCanView(actor: AuthActor, task: Task): void {
  if (!hasPermission(actor, 'view_revisions')) {
    throw forbidden('You cannot view revisions')
  }
  assertTaskRelated(actor, task)
}

function assertCanSubmit(actor: AuthActor, task: Task, action: string): void {
  if (!hasPermission(actor, 'submit_revisions')) {
    throw forbidden(`You cannot ${action} revisions`)
  }
  if (!isTaskTutor(actor, task)) {
    throw forbidden('You are not assigned to this task')
  }
}

function isOpen(revision: RevisionSession): boolean {
  return OPEN_REVISION_STATUSES.includes(revision.status)
}

/** A guarded write matched no row: another request moved the revision first. */
function statusChanged(): never {
  throw conflict('Revision status changed; reload and try again')
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
      const task = await loadTask(taskId)
      if (!canManageRevisions(actor, task, 'create_revisions')) {
        throw forbidden('You cannot create revisions for this task')
      }
      if (task.status === 'cancelled') {
        throw validationError('Cannot open a revision on a cancelled task')
      }
      if (await repository.hasOpenForTask(taskId)) {
        throw conflict('This task already has an open revision')
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
      assertCanView(actor, task)
      return repository.listByTaskId(taskId)
    },

    async getById(id, actor) {
      const revision = await loadRevision(id)
      const task = await loadTask(revision.taskId)
      assertCanView(actor, task)
      return revision
    },

    async update(id, body, actor) {
      const revision = await loadRevision(id)
      const task = await loadTask(revision.taskId)
      if (!canManageRevisions(actor, task)) {
        throw forbidden('You cannot edit this revision')
      }
      if (!isOpen(revision)) {
        throw validationError('Only open revisions can be edited')
      }
      const startDate = body.startDate === undefined ? revision.startDate : body.startDate
      const deadline = body.deadline === undefined ? revision.deadline : body.deadline
      if (!isDeadlineAfterStart(startDate, deadline)) {
        throw validationError('Deadline must be after the start date')
      }
      const updated = await repository.update(id, body, OPEN_REVISION_STATUSES)
      return updated ?? statusChanged()
    },

    async cancel(id, actor) {
      const revision = await loadRevision(id)
      const task = await loadTask(revision.taskId)
      if (!canManageRevisions(actor, task)) {
        throw forbidden('You cannot cancel this revision')
      }
      if (!isOpen(revision)) {
        throw validationError('Only open revisions can be cancelled')
      }
      const updated = await repository.setStatus(id, 'cancelled', {
        expectedFrom: OPEN_REVISION_STATUSES,
      })
      return updated ?? statusChanged()
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
      const updated = await repository.setStatus(id, 'completed', {
        expectedFrom: ['waiting_coordinator_approval'],
      })
      return updated ?? statusChanged()
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
      const updated = await repository.setStatus(id, 'in-revision', {
        expectedFrom: ['waiting_coordinator_approval'],
        submitDate: null,
      })
      return updated ?? statusChanged()
    },

    async tutorSubmit(id, body, actor) {
      const revision = await loadRevision(id)
      const task = await loadTask(revision.taskId)
      assertCanSubmit(actor, task, 'submit')
      if (revision.status !== 'in-revision') {
        throw validationError('Revision is not open for submission')
      }
      if (body.solutionIds?.length) {
        const own = new Set(
          (await tasksRepository.listSolutions(task.id)).map((solution) => solution.id),
        )
        if (body.solutionIds.some((solutionId) => !own.has(solutionId))) {
          throw forbidden('Solutions must belong to this task')
        }
        await repository.linkSolutions(id, body.solutionIds)
      }
      const submitDate = new Date().toISOString()
      const updated = await repository.setStatus(id, 'waiting_coordinator_approval', {
        expectedFrom: ['in-revision'],
        submitDate,
      })
      if (!updated) statusChanged()
      return loadRevision(id)
    },

    async tutorCancelSubmit(id, actor) {
      const revision = await loadRevision(id)
      const task = await loadTask(revision.taskId)
      assertCanSubmit(actor, task, 'withdraw')
      if (revision.status !== 'waiting_coordinator_approval') {
        throw validationError('Revision is not awaiting approval')
      }
      const updated = await repository.setStatus(id, 'in-revision', {
        expectedFrom: ['waiting_coordinator_approval'],
        submitDate: null,
      })
      return updated ?? statusChanged()
    },
  }
}
