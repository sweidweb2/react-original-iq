import type { AuthActor } from '../../authz/index.js'
import { isAdmin, isOps, isSuper } from '../../authz/index.js'
import { conflict, forbidden, notFound, validationError } from '../../errors/app-error.js'
import { hasAnyRole } from '../../authz/roles.js'
import { getLoggingService } from '../logging/index.js'
import type { UsersRepository } from '../users/users.repository.js'
import type { UsersService } from '../users/users.service.js'
import type { CreateTaskBody, ListTasksQuery, UpdateTaskBody } from './tasks.schema.js'
import type { TasksRepository } from './tasks.repository.js'
import type {
  AddFileInput,
  AddSolutionInput,
  Task,
  TaskDetail,
  TaskListFilter,
  TaskStats,
  TaskStatus,
} from './tasks.types.js'

export type TaskListResult = {
  data: Task[]
  meta: {
    page: number
    limit: number
    total: number
  }
}

export type TasksService = {
  listTasks: (query: ListTasksQuery, actor: AuthActor) => Promise<TaskListResult>
  getStats: (actor: AuthActor) => Promise<TaskStats>
  getTaskById: (id: string, actor: AuthActor) => Promise<TaskDetail>
  createTask: (body: CreateTaskBody, actor: AuthActor) => Promise<Task>
  updateTask: (id: string, body: UpdateTaskBody, actor: AuthActor) => Promise<Task>
  updatePrice: (id: string, price: number, actor: AuthActor) => Promise<Task>
  assignTutor: (id: string, tutorId: string, actor: AuthActor) => Promise<Task>
  removeTutor: (id: string, actor: AuthActor) => Promise<Task>
  changeCoordinator: (id: string, coordinatorId: string, actor: AuthActor) => Promise<Task>
  submitTask: (id: string, actor: AuthActor) => Promise<Task>
  cancelSubmit: (id: string, actor: AuthActor) => Promise<Task>
  approveTask: (id: string, actor: AuthActor) => Promise<Task>
  disapproveTask: (id: string, actor: AuthActor) => Promise<Task>
  cancelTask: (id: string, actor: AuthActor) => Promise<Task>
  activateTask: (id: string, actor: AuthActor) => Promise<Task>
  setAllowView: (id: string, allowView: boolean, actor: AuthActor) => Promise<Task>
  deleteTask: (id: string, actor: AuthActor) => Promise<void>
  addFile: (id: string, input: AddFileInput, actor: AuthActor) => Promise<TaskDetail['files'][number]>
  listFiles: (id: string, actor: AuthActor) => Promise<TaskDetail['files']>
  deleteFile: (id: string, fileId: string, actor: AuthActor) => Promise<void>
  addSolution: (
    id: string,
    input: AddSolutionInput,
    actor: AuthActor,
  ) => Promise<TaskDetail['solutions'][number]>
  listSolutions: (id: string, actor: AuthActor) => Promise<TaskDetail['solutions']>
  deleteSolution: (id: string, solutionId: string, actor: AuthActor) => Promise<void>
}

function isClient(roles: readonly string[]): boolean {
  return hasAnyRole(roles, ['client'])
}

function isTutor(roles: readonly string[]): boolean {
  return hasAnyRole(roles, ['tutor'])
}

function scopeForActor(actor: AuthActor): TaskListFilter['scope'] {
  if (isSuper(actor.roles) || isAdmin(actor.roles)) {
    return { kind: 'all' }
  }
  if (isOps(actor.roles)) {
    return { kind: 'coordinator', coordinatorId: actor.id }
  }
  if (isTutor(actor.roles)) {
    return { kind: 'tutor', tutorId: actor.id }
  }
  if (isClient(actor.roles)) {
    return { kind: 'client', clientId: actor.id }
  }
  throw forbidden('Your role cannot access tasks')
}

function assertTaskRelated(actor: AuthActor, task: Task): void {
  if (isSuper(actor.roles) || isAdmin(actor.roles)) return
  if (isOps(actor.roles) && task.coordinatorId === actor.id) return
  if (isTutor(actor.roles) && task.tutorId === actor.id) return
  if (isClient(actor.roles) && task.clientId === actor.id) return
  throw forbidden('You cannot access this task')
}

function assertOps(actor: AuthActor): void {
  if (!isOps(actor.roles) && !isSuper(actor.roles)) {
    throw forbidden('Only coordinators or admins can perform this action')
  }
}

function assertAdmin(actor: AuthActor): void {
  if (!isAdmin(actor.roles)) {
    throw forbidden('Only admins can perform this action')
  }
}

function canManageTask(actor: AuthActor, task: Task): boolean {
  if (isAdmin(actor.roles) || isSuper(actor.roles)) return true
  return isOps(actor.roles) && task.coordinatorId === actor.id
}

function canViewSolutions(actor: AuthActor, task: Task): boolean {
  if (isAdmin(actor.roles) || isSuper(actor.roles)) return true
  if (isOps(actor.roles) && task.coordinatorId === actor.id) return true
  if (isTutor(actor.roles) && task.tutorId === actor.id) return true
  if (isClient(actor.roles) && task.clientId === actor.id) {
    return task.allowView
  }
  return false
}

function filterSolutionsForActor(task: TaskDetail, actor: AuthActor): TaskDetail {
  if (canViewSolutions(actor, task)) {
    return task
  }
  return { ...task, solutions: [] }
}

async function pickLeastLoadedCoordinator(
  usersRepo: UsersRepository,
  tasksRepo: TasksRepository,
): Promise<string | null> {
  const users = await usersRepo.findMany()
  const coordinators = users.filter((u) => u.role === 'coordinator' && u.status === 'ACTIVE')
  if (coordinators.length === 0) return null

  let bestId: string | null = null
  let bestCount = Number.POSITIVE_INFINITY
  for (const coordinator of coordinators) {
    const count = await tasksRepo.countActiveByCoordinator(coordinator.id)
    if (count < bestCount) {
      bestCount = count
      bestId = coordinator.id
    }
  }
  return bestId
}

export function createTasksService(
  repository: TasksRepository,
  users: UsersService,
  usersRepository: UsersRepository,
): TasksService {
  async function loadOrThrow(id: string): Promise<Task> {
    const task = await repository.findById(id)
    if (!task) {
      throw notFound('Task not found', 'TASK_NOT_FOUND')
    }
    return task
  }

  async function loadDetailOrThrow(id: string, actor: AuthActor): Promise<TaskDetail> {
    const detail = await repository.findDetailById(id)
    if (!detail) {
      throw notFound('Task not found', 'TASK_NOT_FOUND')
    }
    assertTaskRelated(actor, detail)
    return filterSolutionsForActor(detail, actor)
  }

  return {
    async listTasks(query, actor) {
      const filter: TaskListFilter = {
        page: query.page,
        limit: query.limit,
        search: query.search,
        status: query.status,
        scope: scopeForActor(actor),
      }
      const { items, total } = await repository.findPage(filter)
      return {
        data: items,
        meta: { page: query.page, limit: query.limit, total },
      }
    },

    async getStats(actor) {
      const filter: TaskListFilter = {
        page: 1,
        limit: 1,
        scope: scopeForActor(actor),
      }
      return repository.countStats(filter)
    },

    async getTaskById(id, actor) {
      return loadDetailOrThrow(id, actor)
    },

    async createTask(body, actor) {
      const privileged = isOps(actor.roles) || isAdmin(actor.roles) || isSuper(actor.roles)

      let clientId = actor.id
      if (body.clientId !== undefined) {
        if (!privileged) {
          throw forbidden('Only staff can set clientId')
        }
        clientId = body.clientId
      } else if (privileged && !isClient(actor.roles)) {
        throw validationError('clientId is required when staff creates a task')
      } else if (!isClient(actor.roles) && !privileged) {
        throw forbidden('Clients create their own tasks')
      }

      const clientUser = await users.findById(clientId)
      if (!clientUser || clientUser.role !== 'client') {
        throw validationError('clientId must reference an active client user')
      }

      const actorIsCoordinator =
        isOps(actor.roles) && !isAdmin(actor.roles) && !isSuper(actor.roles)
      const coordinatorId = actorIsCoordinator
        ? actor.id
        : await pickLeastLoadedCoordinator(usersRepository, repository)
      if ((isClient(actor.roles) || privileged) && !coordinatorId && !actorIsCoordinator) {
        throw validationError('No active coordinator is available to assign')
      }

      if (body.tutorId && !privileged) {
        throw forbidden('Only staff can assign a tutor on create')
      }
      if (body.tutorId) {
        const tutor = await users.findById(body.tutorId)
        if (!tutor || tutor.role !== 'tutor') {
          throw validationError('tutorId must reference a tutor')
        }
      }

      const task = await repository.create({
        clientId,
        tutorId: privileged ? (body.tutorId ?? null) : null,
        coordinatorId,
        topic: body.topic,
        type: body.type,
        category: body.category,
        description: body.description,
        deadline: body.deadline,
        price: privileged ? body.price : 0,
        status: privileged ? body.status : 'pending',
      })

      getLoggingService().recordActivitySafe({
        action: 'tasks.create',
        entity: 'task',
        entityId: task.id,
        meta: { clientId: task.clientId, status: task.status },
      })

      return task
    },

    async updateTask(id, body, actor) {
      const task = await loadOrThrow(id)
      assertTaskRelated(actor, task)

      const staff = canManageTask(actor, task)
      const ownClient = isClient(actor.roles) && task.clientId === actor.id

      if (!staff && !ownClient) {
        throw forbidden('You cannot edit this task')
      }

      const patch: UpdateTaskBody = {}
      if (staff) {
        Object.assign(patch, body)
      } else {
        if (body.topic !== undefined) patch.topic = body.topic
        if (body.type !== undefined) patch.type = body.type
        if (body.category !== undefined) patch.category = body.category
        if (body.description !== undefined) patch.description = body.description
        if (body.deadline !== undefined) patch.deadline = body.deadline
        if (
          body.status !== undefined ||
          body.price !== undefined ||
          body.tutorId !== undefined ||
          body.paymentStatus !== undefined
        ) {
          throw forbidden('Clients cannot change status, price, or assignment')
        }
      }

      if (Object.keys(patch).length === 0) {
        throw validationError('No editable fields provided')
      }

      const updated = await repository.update(id, patch)
      if (!updated) {
        throw notFound('Task not found', 'TASK_NOT_FOUND')
      }
      return updated
    },

    async updatePrice(id, price, actor) {
      assertOps(actor)
      const task = await loadOrThrow(id)
      if (!canManageTask(actor, task)) {
        throw forbidden('You cannot edit this task')
      }
      const hasMoney = await repository.hasPayments(id)
      const updated = await repository.update(id, {
        price,
        // Full net-recompute lands with payments module; until then mark unpaid when no money rows.
        ...(hasMoney ? {} : { paymentStatus: 'unpaid' as const }),
      })
      if (!updated) throw notFound('Task not found', 'TASK_NOT_FOUND')
      return updated
    },

    async assignTutor(id, tutorId, actor) {
      assertOps(actor)
      const task = await loadOrThrow(id)
      if (!canManageTask(actor, task)) {
        throw forbidden('You cannot manage this task')
      }
      if (task.tutorId) {
        throw conflict('Task already has a tutor assigned')
      }
      const tutor = await users.findById(tutorId)
      if (!tutor || tutor.role !== 'tutor') {
        throw validationError('tutorId must reference a tutor')
      }

      const nextStatus: TaskStatus =
        task.status === 'pending' || task.status === 'waiting_coordinator_approval'
          ? 'in-progress'
          : task.status

      const updated = await repository.update(id, {
        tutorId,
        status: nextStatus,
      })
      if (!updated) throw notFound('Task not found', 'TASK_NOT_FOUND')
      return updated
    },

    async removeTutor(id, actor) {
      assertOps(actor)
      const task = await loadOrThrow(id)
      if (!canManageTask(actor, task)) {
        throw forbidden('You cannot manage this task')
      }

      const nextStatus: TaskStatus =
        task.status === 'in-progress' || task.status === 'waiting_coordinator_approval'
          ? 'pending'
          : task.status

      const updated = await repository.update(id, {
        tutorId: null,
        status: nextStatus,
      })
      if (!updated) throw notFound('Task not found', 'TASK_NOT_FOUND')
      return updated
    },

    async changeCoordinator(id, coordinatorId, actor) {
      assertAdmin(actor)
      await loadOrThrow(id)
      const coordinator = await users.findById(coordinatorId)
      if (!coordinator || coordinator.role !== 'coordinator') {
        throw validationError('coordinatorId must reference a coordinator')
      }
      const updated = await repository.update(id, { coordinatorId })
      if (!updated) throw notFound('Task not found', 'TASK_NOT_FOUND')
      return updated
    },

    async submitTask(id, actor) {
      if (!isTutor(actor.roles)) {
        throw forbidden('Only tutors can submit tasks')
      }
      const task = await loadOrThrow(id)
      if (task.tutorId !== actor.id) {
        throw forbidden('You are not assigned to this task')
      }
      if (task.status !== 'in-progress') {
        throw validationError('Task must be in progress to submit')
      }
      const updated = await repository.update(id, { status: 'waiting_coordinator_approval' })
      if (!updated) throw notFound('Task not found', 'TASK_NOT_FOUND')
      return updated
    },

    async cancelSubmit(id, actor) {
      if (!isTutor(actor.roles)) {
        throw forbidden('Only tutors can cancel submission')
      }
      const task = await loadOrThrow(id)
      if (task.tutorId !== actor.id) {
        throw forbidden('You are not assigned to this task')
      }
      if (task.status !== 'waiting_coordinator_approval') {
        throw validationError('Task is not awaiting approval')
      }
      const updated = await repository.update(id, { status: 'in-progress' })
      if (!updated) throw notFound('Task not found', 'TASK_NOT_FOUND')
      return updated
    },

    async approveTask(id, actor) {
      assertOps(actor)
      const task = await loadOrThrow(id)
      if (!canManageTask(actor, task)) {
        throw forbidden('You cannot manage this task')
      }
      if (task.status !== 'waiting_coordinator_approval') {
        throw validationError('Task must be waiting for coordinator approval')
      }
      if (!task.tutorId) {
        throw validationError('Task has no assigned tutor')
      }
      const updated = await repository.update(id, { status: 'completed' })
      if (!updated) throw notFound('Task not found', 'TASK_NOT_FOUND')
      await usersRepository.incrementNbDone(task.tutorId)
      return updated
    },

    async disapproveTask(id, actor) {
      assertOps(actor)
      const task = await loadOrThrow(id)
      if (!canManageTask(actor, task)) {
        throw forbidden('You cannot manage this task')
      }
      if (task.status !== 'waiting_coordinator_approval') {
        throw validationError('Task must be waiting for coordinator approval')
      }
      const updated = await repository.update(id, { status: 'in-progress' })
      if (!updated) throw notFound('Task not found', 'TASK_NOT_FOUND')
      return updated
    },

    async cancelTask(id, actor) {
      assertOps(actor)
      const task = await loadOrThrow(id)
      if (!canManageTask(actor, task)) {
        throw forbidden('You cannot manage this task')
      }
      const updated = await repository.update(id, { status: 'cancelled' })
      if (!updated) throw notFound('Task not found', 'TASK_NOT_FOUND')
      return updated
    },

    async activateTask(id, actor) {
      assertOps(actor)
      const task = await loadOrThrow(id)
      if (!canManageTask(actor, task)) {
        throw forbidden('You cannot manage this task')
      }
      if (task.status !== 'cancelled') {
        throw validationError('Only cancelled tasks can be activated')
      }
      const nextStatus: TaskStatus = task.tutorId ? 'in-progress' : 'pending'
      const updated = await repository.update(id, { status: nextStatus })
      if (!updated) throw notFound('Task not found', 'TASK_NOT_FOUND')
      return updated
    },

    async setAllowView(id, allowView, actor) {
      assertAdmin(actor)
      const updated = await repository.update(id, { allowView })
      if (!updated) throw notFound('Task not found', 'TASK_NOT_FOUND')
      return updated
    },

    async deleteTask(id, actor) {
      const task = await loadOrThrow(id)
      const staff = canManageTask(actor, task)
      const ownClient = isClient(actor.roles) && task.clientId === actor.id
      if (!staff && !ownClient) {
        throw forbidden('You cannot delete this task')
      }
      if (await repository.hasPayments(id)) {
        throw conflict('Task cannot be deleted while payments or refunds exist')
      }
      const deleted = await repository.delete(id)
      if (!deleted) {
        throw notFound('Task not found', 'TASK_NOT_FOUND')
      }
      getLoggingService().recordActivitySafe({
        action: 'tasks.delete',
        entity: 'task',
        entityId: id,
      })
    },

    async addFile(id, input, actor) {
      const task = await loadOrThrow(id)
      assertTaskRelated(actor, task)
      const staff = canManageTask(actor, task)
      const ownClient = isClient(actor.roles) && task.clientId === actor.id
      if (!staff && !ownClient) {
        throw forbidden('You cannot upload files for this task')
      }
      return repository.addFile(id, input)
    },

    async listFiles(id, actor) {
      await loadDetailOrThrow(id, actor)
      return repository.listFiles(id)
    },

    async deleteFile(id, fileId, actor) {
      const task = await loadOrThrow(id)
      assertTaskRelated(actor, task)
      const staff = canManageTask(actor, task)
      const ownClient = isClient(actor.roles) && task.clientId === actor.id
      if (!staff && !ownClient) {
        throw forbidden('You cannot delete files for this task')
      }
      const deleted = await repository.deleteFile(id, fileId)
      if (!deleted) {
        throw notFound('File not found', 'FILE_NOT_FOUND')
      }
    },

    async addSolution(id, input, actor) {
      const task = await loadOrThrow(id)
      assertTaskRelated(actor, task)
      const staff = canManageTask(actor, task)
      const assignedTutor = isTutor(actor.roles) && task.tutorId === actor.id
      if (!staff && !assignedTutor) {
        throw forbidden('You cannot upload solutions for this task')
      }
      return repository.addSolution(id, input)
    },

    async listSolutions(id, actor) {
      const detail = await loadDetailOrThrow(id, actor)
      return detail.solutions
    },

    async deleteSolution(id, solutionId, actor) {
      const task = await loadOrThrow(id)
      assertTaskRelated(actor, task)
      const staff = canManageTask(actor, task)
      const assignedTutor = isTutor(actor.roles) && task.tutorId === actor.id
      if (!staff && !assignedTutor) {
        throw forbidden('You cannot delete solutions for this task')
      }
      const deleted = await repository.deleteSolution(id, solutionId)
      if (!deleted) {
        throw notFound('Solution not found', 'SOLUTION_NOT_FOUND')
      }
    },
  }
}
