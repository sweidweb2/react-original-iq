import { ZipArchive } from 'archiver'

import type { AuthActor } from '../../authz/index.js'
import { assertTaskRelated, isAdmin, isClient, isOps, isSuper, isTutor } from '../../authz/index.js'
import {
  AppError,
  conflict,
  forbidden,
  notFound,
  serviceUnavailable,
  validationError,
} from '../../errors/app-error.js'
import { reportError } from '../../errors/report-error.js'
import {
  DEFAULT_MAX_TASK_BYTES,
  isManagedObjectKey,
  STORAGE_PREFIX,
  type StorageService,
} from '../../storage/index.js'
import { exportFilename } from '../_shared/export-file.js'
import { getLoggingService } from '../logging/index.js'
import type { UsersRepository } from '../users/users.repository.js'
import type { UsersService } from '../users/users.service.js'
import type { TasksRepository } from './tasks.repository.js'
import type {
  AddFileBody,
  AddSolutionBody,
  CreateTaskBody,
  ListTasksQuery,
  UpdateTaskBody,
} from './tasks.schema.js'
import type {
  DownloadUrlResult,
  Task,
  TaskDetail,
  TaskFileKind,
  TaskListFilter,
  TaskStats,
  TaskStatus,
  TaskZip,
  UploadUrlInput,
  UploadUrlResult,
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
  createFileUploadUrl: (
    id: string,
    input: UploadUrlInput,
    actor: AuthActor,
  ) => Promise<UploadUrlResult>
  addFile: (
    id: string,
    input: AddFileBody,
    actor: AuthActor,
  ) => Promise<TaskDetail['files'][number]>
  listFiles: (id: string, actor: AuthActor) => Promise<TaskDetail['files']>
  getFileDownloadUrl: (id: string, fileId: string, actor: AuthActor) => Promise<DownloadUrlResult>
  deleteFile: (id: string, fileId: string, actor: AuthActor) => Promise<void>
  createSolutionUploadUrl: (
    id: string,
    input: UploadUrlInput,
    actor: AuthActor,
  ) => Promise<UploadUrlResult>
  addSolution: (
    id: string,
    input: AddSolutionBody,
    actor: AuthActor,
  ) => Promise<TaskDetail['solutions'][number]>
  listSolutions: (id: string, actor: AuthActor) => Promise<TaskDetail['solutions']>
  getSolutionDownloadUrl: (
    id: string,
    solutionId: string,
    actor: AuthActor,
  ) => Promise<DownloadUrlResult>
  deleteSolution: (id: string, solutionId: string, actor: AuthActor) => Promise<void>
  /** Authorize and prepare a zip of all (or the selected) documents or solutions. */
  buildZip: (
    id: string,
    kind: TaskFileKind,
    ids: string[] | undefined,
    actor: AuthActor,
  ) => Promise<TaskZip>
}

type UploadCategory = 'documents' | 'solutions'

type ZipEntry = { name: string; location: string }

/** Zip-safe entry name, unique (case-insensitive) within the archive: `name (2).ext`. */
function uniqueEntryName(raw: string, used: Set<string>): string {
  const safe =
    raw
      // eslint-disable-next-line no-control-regex
      .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_')
      .trim()
      .slice(0, 200) || 'file'
  const dot = safe.lastIndexOf('.')
  const stem = dot > 0 ? safe.slice(0, dot) : safe
  const ext = dot > 0 ? safe.slice(dot) : ''
  let candidate = safe
  for (let n = 2; used.has(candidate.toLowerCase()); n += 1) {
    candidate = `${stem} (${n})${ext}`
  }
  used.add(candidate.toLowerCase())
  return candidate
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

function assertCanManageDocuments(actor: AuthActor, task: Task, action: string): void {
  const ownClient = isClient(actor.roles) && task.clientId === actor.id
  if (!canManageTask(actor, task) && !ownClient) {
    throw forbidden(`You cannot ${action} files for this task`)
  }
}

function assertCanManageSolutions(actor: AuthActor, task: Task, action: string): void {
  const assignedTutor = isTutor(actor.roles) && task.tutorId === actor.id
  if (!canManageTask(actor, task) && !assignedTutor) {
    throw forbidden(`You cannot ${action} solutions for this task`)
  }
}

function displayFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop()?.trim() ?? ''
  return base.slice(0, 255) || 'file'
}

function isUploadKeyForTask(key: string, category: UploadCategory, taskId: string): boolean {
  const prefix = `${STORAGE_PREFIX[category]}/${taskId}/`
  if (!key.startsWith(prefix)) return false
  const name = key.slice(prefix.length)
  return name.length > 0 && !name.includes('/') && !name.includes('..')
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

export type TasksServiceDeps = {
  hasOpenRevision?: (taskId: string) => Promise<boolean>
  recomputePaymentStatus?: (taskId: string) => Promise<unknown>
  storage?: StorageService
  /** Upper bound on the summed size of files in one zip (defaults to the task storage cap). */
  maxZipBytes?: number
}

export function createTasksService(
  repository: TasksRepository,
  users: UsersService,
  usersRepository: UsersRepository,
  deps: TasksServiceDeps = {},
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

  function requireStorage(): StorageService {
    if (!deps.storage?.isConfigured()) {
      throw serviceUnavailable('STORAGE_NOT_CONFIGURED', 'File storage is not configured')
    }
    return deps.storage
  }

  async function taskBytesUsed(taskId: string): Promise<number> {
    const [files, solutions] = await Promise.all([
      repository.listFiles(taskId),
      repository.listSolutions(taskId),
    ])
    return [...files, ...solutions].reduce((sum, item) => sum + (item.sizeBytes ?? 0), 0)
  }

  async function createUploadUrl(
    category: UploadCategory,
    taskId: string,
    input: UploadUrlInput,
  ): Promise<UploadUrlResult> {
    const storage = requireStorage()
    const signed = await storage.getSignedUploadUrl({
      category,
      taskId,
      originalFilename: input.filename,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      taskBytesUsed: await taskBytesUsed(taskId),
    })
    return {
      uploadUrl: signed.url,
      key: signed.key,
      contentType: signed.contentType,
      expiresInSec: signed.expiresInSec,
    }
  }

  async function resolveUploadedObject(
    category: UploadCategory,
    taskId: string,
    input: { key: string; filename: string },
  ) {
    const storage = requireStorage()
    if (!isUploadKeyForTask(input.key, category, taskId)) {
      throw validationError('Upload key does not belong to this task')
    }
    const validated = await storage.validateStoredObject({
      key: input.key,
      originalFilename: input.key.slice(input.key.lastIndexOf('/') + 1),
      taskBytesUsed: await taskBytesUsed(taskId),
    })
    return {
      fileLocation: input.key,
      originalName: displayFilename(input.filename),
      contentType: validated.contentType,
      sizeBytes: validated.sizeBytes,
    }
  }

  async function downloadUrlFor(
    location: string,
    originalName: string | null,
    fallbackName: string,
  ): Promise<DownloadUrlResult> {
    const filename = originalName ?? fallbackName
    if (isManagedObjectKey(location)) {
      const signed = await requireStorage().getSignedDownloadUrl(location)
      return { url: signed.url, filename, expiresInSec: signed.expiresInSec }
    }
    if (/^https?:\/\//i.test(location)) {
      return { url: location, filename, expiresInSec: null }
    }
    throw notFound('File is not available for download', 'FILE_NOT_FOUND')
  }

  async function purgeStoredObject(location: string): Promise<void> {
    if (!deps.storage?.isConfigured() || !isManagedObjectKey(location)) return
    try {
      await deps.storage.deleteObject(location)
    } catch (error) {
      reportError(error, {
        source: 'tasks.storage_delete',
        level: 'warning',
        meta: { key: location },
      })
    }
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
        status: privileged && body.tutorId ? 'in-progress' : 'pending',
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
      const updated = await repository.update(id, { price })
      if (!updated) throw notFound('Task not found', 'TASK_NOT_FOUND')
      if (deps.recomputePaymentStatus) {
        await deps.recomputePaymentStatus(id)
        const refreshed = await repository.findById(id)
        return refreshed ?? updated
      }
      const hasMoney = await repository.hasPayments(id)
      if (!hasMoney) {
        return (await repository.update(id, { paymentStatus: 'unpaid' })) ?? updated
      }
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
      if (deps.hasOpenRevision && (await deps.hasOpenRevision(id))) {
        throw validationError('Cannot complete task while an open revision exists')
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

    async createFileUploadUrl(id, input, actor) {
      const task = await loadOrThrow(id)
      assertTaskRelated(actor, task)
      assertCanManageDocuments(actor, task, 'upload')
      return createUploadUrl('documents', id, input)
    },

    async addFile(id, input, actor) {
      const task = await loadOrThrow(id)
      assertTaskRelated(actor, task)
      assertCanManageDocuments(actor, task, 'upload')
      const stored = await resolveUploadedObject('documents', id, input)
      return repository.addFile(id, { ...stored, note: input.note || undefined })
    },

    async listFiles(id, actor) {
      await loadDetailOrThrow(id, actor)
      return repository.listFiles(id)
    },

    async getFileDownloadUrl(id, fileId, actor) {
      const detail = await loadDetailOrThrow(id, actor)
      const file = detail.files.find((item) => item.id === fileId)
      if (!file) {
        throw notFound('File not found', 'FILE_NOT_FOUND')
      }
      return downloadUrlFor(file.fileLocation, file.originalName, 'document')
    },

    async deleteFile(id, fileId, actor) {
      const task = await loadOrThrow(id)
      assertTaskRelated(actor, task)
      assertCanManageDocuments(actor, task, 'delete')
      const deleted = await repository.deleteFile(id, fileId)
      if (!deleted) {
        throw notFound('File not found', 'FILE_NOT_FOUND')
      }
      await purgeStoredObject(deleted.fileLocation)
    },

    async createSolutionUploadUrl(id, input, actor) {
      const task = await loadOrThrow(id)
      assertTaskRelated(actor, task)
      assertCanManageSolutions(actor, task, 'upload')
      return createUploadUrl('solutions', id, input)
    },

    async addSolution(id, input, actor) {
      const task = await loadOrThrow(id)
      assertTaskRelated(actor, task)
      assertCanManageSolutions(actor, task, 'upload')
      const stored = await resolveUploadedObject('solutions', id, input)
      return repository.addSolution(id, stored)
    },

    async listSolutions(id, actor) {
      const detail = await loadDetailOrThrow(id, actor)
      return detail.solutions
    },

    async getSolutionDownloadUrl(id, solutionId, actor) {
      const detail = await loadDetailOrThrow(id, actor)
      const solution = detail.solutions.find((item) => item.id === solutionId)
      if (!solution) {
        throw notFound('Solution not found', 'SOLUTION_NOT_FOUND')
      }
      return downloadUrlFor(solution.fileLocation, solution.originalName, 'solution')
    },

    async deleteSolution(id, solutionId, actor) {
      const task = await loadOrThrow(id)
      assertTaskRelated(actor, task)
      assertCanManageSolutions(actor, task, 'delete')
      const deleted = await repository.deleteSolution(id, solutionId)
      if (!deleted) {
        throw notFound('Solution not found', 'SOLUTION_NOT_FOUND')
      }
      await purgeStoredObject(deleted.fileLocation)
    },

    async buildZip(id, kind, ids, actor) {
      const detail = await loadDetailOrThrow(id, actor)
      if (kind === 'solutions' && !canViewSolutions(actor, detail)) {
        throw forbidden('You cannot download solutions for this task')
      }

      const available = kind === 'documents' ? detail.files : detail.solutions
      let items = available
      if (ids && ids.length > 0) {
        const wanted = new Set(ids)
        items = available.filter((item) => wanted.has(item.id))
        if (items.length !== wanted.size) {
          throw notFound('One or more selected files were not found', 'FILE_NOT_FOUND')
        }
      }
      if (items.length === 0) {
        throw notFound('There are no files to download', 'NO_FILES')
      }

      const maxBytes = deps.maxZipBytes ?? DEFAULT_MAX_TASK_BYTES
      const totalBytes = items.reduce((sum, item) => sum + (item.sizeBytes ?? 0), 0)
      if (totalBytes > maxBytes) {
        throw new AppError(
          'ZIP_TOO_LARGE',
          `Selected files exceed the ${Math.round(maxBytes / (1024 * 1024))} MB zip limit`,
          413,
          { totalBytes, maxBytes },
        )
      }

      const storage = requireStorage()
      const used = new Set<string>()
      const fallback = kind === 'documents' ? 'document' : 'solution'
      const entries: ZipEntry[] = items.map((item) => ({
        name: uniqueEntryName(
          item.originalName ?? item.fileLocation.split('/').pop() ?? fallback,
          used,
        ),
        location: item.fileLocation,
      }))

      getLoggingService().recordActivitySafe({
        userId: actor.id,
        action: 'tasks.files.zip',
        entity: 'task',
        entityId: id,
        meta: { taskId: id, kind, count: entries.length, selected: Boolean(ids?.length) },
      })

      return {
        filename: exportFilename(`task-${id.slice(0, 8)}_${kind}`, 'zip'),
        entryCount: entries.length,
        async write(out) {
          const archive = new ZipArchive({ zlib: { level: 6 } })
          const finished = new Promise<void>((resolve, reject) => {
            out.on('finish', () => resolve())
            out.on('close', () => resolve())
            out.on('error', reject)
            archive.on('error', reject)
          })
          archive.pipe(out)

          const missing: string[] = []
          for (const entry of entries) {
            if (!isManagedObjectKey(entry.location)) {
              missing.push(`${entry.name}: stored outside managed storage (${entry.location})`)
              continue
            }
            try {
              const body = await storage.downloadObject(entry.location)
              // Wait until archiver has consumed this entry so only one file is buffered.
              const consumed = new Promise<void>((resolve) =>
                archive.once('entry', () => resolve()),
              )
              archive.append(body, { name: entry.name })
              await consumed
            } catch (error) {
              reportError(error, {
                source: 'tasks.zip_entry',
                level: 'warning',
                meta: { key: entry.location },
              })
              missing.push(`${entry.name}: file could not be read from storage`)
            }
          }
          if (missing.length > 0) {
            archive.append(`These files could not be included:\n\n${missing.join('\n')}\n`, {
              name: 'MISSING_FILES.txt',
            })
          }

          await archive.finalize()
          await finished
        },
      }
    },
  }
}
