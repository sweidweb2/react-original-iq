import { randomUUID } from 'node:crypto'

import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin } from '../../database/index.js'
import type {
  AddFileInput,
  AddSolutionInput,
  CreateTaskInput,
  Task,
  TaskDetail,
  TaskFile,
  TaskListFilter,
  TaskSolution,
  TaskStats,
  TaskStatus,
  UpdateTaskInput,
} from './tasks.types.js'
import { emptyTaskStats, TASK_STATUSES } from './tasks.types.js'

export type TasksRepository = {
  findPage: (filter: TaskListFilter) => Promise<{ items: Task[]; total: number }>
  countStats: (filter: TaskListFilter) => Promise<TaskStats>
  findById: (id: string) => Promise<Task | null>
  findDetailById: (id: string) => Promise<TaskDetail | null>
  countActiveByCoordinator: (coordinatorId: string) => Promise<number>
  create: (input: CreateTaskInput) => Promise<Task>
  update: (id: string, input: UpdateTaskInput) => Promise<Task | null>
  delete: (id: string) => Promise<boolean>
  addFile: (taskId: string, input: AddFileInput) => Promise<TaskFile>
  listFiles: (taskId: string) => Promise<TaskFile[]>
  deleteFile: (taskId: string, fileId: string) => Promise<TaskFile | null>
  addSolution: (taskId: string, input: AddSolutionInput) => Promise<TaskSolution>
  listSolutions: (taskId: string) => Promise<TaskSolution[]>
  deleteSolution: (taskId: string, solutionId: string) => Promise<TaskSolution | null>
  hasPayments: (taskId: string) => Promise<boolean>
  countActiveInvolvingUser: (userId: string) => Promise<number>
  listTaskIdsForClient: (clientId: string) => Promise<string[]>
}

export type TasksRepositoryDeps = {
  hasPayments?: (taskId: string) => Promise<boolean>
}

type TaskRow = {
  id: string
  client_id: string
  tutor_id: string | null
  coordinator_id: string | null
  topic: string | null
  type: Task['type']
  description: string | null
  is_assigned: boolean
  status: TaskStatus
  deadline: string | null
  price: number | string
  payment_status: Task['paymentStatus']
  category: string | null
  feedback: string | null
  allow_view: boolean
  created_at: string
  updated_at: string
}

type StoredFileRow = {
  original_name: string | null
  content_type: string | null
  size_bytes: number | string | null
}

type FileRow = StoredFileRow & {
  id: string
  task_id: string
  file_location: string
  note: string | null
  created_at: string
  updated_at: string
}

type SolutionRow = StoredFileRow & {
  id: string
  task_id: string
  file_location: string
  created_at: string
  updated_at: string
}

const FILE_COLUMNS =
  'id, task_id, file_location, note, original_name, content_type, size_bytes, created_at, updated_at'
const SOLUTION_COLUMNS =
  'id, task_id, file_location, original_name, content_type, size_bytes, created_at, updated_at'

const TASK_COLUMNS =
  'id, client_id, tutor_id, coordinator_id, topic, type, description, is_assigned, status, deadline, price, payment_status, category, feedback, allow_view, created_at, updated_at'

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    clientId: row.client_id,
    tutorId: row.tutor_id,
    coordinatorId: row.coordinator_id,
    topic: row.topic,
    type: row.type,
    description: row.description,
    isAssigned: row.is_assigned,
    status: row.status,
    deadline: row.deadline,
    price: toNumber(row.price),
    paymentStatus: row.payment_status,
    category: row.category,
    feedback: row.feedback,
    allowView: row.allow_view,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toStoredMeta(row: StoredFileRow) {
  return {
    originalName: row.original_name,
    contentType: row.content_type,
    sizeBytes: row.size_bytes === null ? null : toNumber(row.size_bytes),
  }
}

function toFile(row: FileRow): TaskFile {
  return {
    id: row.id,
    taskId: row.task_id,
    fileLocation: row.file_location,
    note: row.note,
    ...toStoredMeta(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toSolution(row: SolutionRow): TaskSolution {
  return {
    id: row.id,
    taskId: row.task_id,
    fileLocation: row.file_location,
    ...toStoredMeta(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function matchesScope(task: Task, filter: TaskListFilter): boolean {
  const { scope } = filter
  if (scope.kind === 'all') return true
  if (scope.kind === 'client') return task.clientId === scope.clientId
  if (scope.kind === 'tutor') return task.tutorId === scope.tutorId
  return task.coordinatorId === scope.coordinatorId
}

function matchesFilter(task: Task, filter: TaskListFilter): boolean {
  if (!matchesScope(task, filter)) return false
  if (filter.status && task.status !== filter.status) return false
  if (filter.search) {
    const needle = filter.search.toLowerCase()
    const hay = [task.topic, task.description, task.category]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (!hay.includes(needle)) return false
  }
  return true
}

function pageOf(tasks: Task[], filter: TaskListFilter) {
  const sorted = tasks
    .filter((task) => matchesFilter(task, filter))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const start = (filter.page - 1) * filter.limit
  return {
    items: sorted.slice(start, start + filter.limit),
    total: sorted.length,
  }
}

function statsOf(tasks: Task[], filter: TaskListFilter): TaskStats {
  const stats = emptyTaskStats()
  for (const task of tasks) {
    if (!matchesScope(task, filter)) continue
    stats[task.status] += 1
    stats.total += 1
  }
  return stats
}

function applyTaskUpdate(task: Task, input: UpdateTaskInput): Task {
  const tutorId = input.tutorId !== undefined ? input.tutorId : task.tutorId
  return {
    ...task,
    topic: input.topic ?? task.topic,
    type: input.type ?? task.type,
    category: input.category ?? task.category,
    description: input.description ?? task.description,
    deadline: input.deadline ?? task.deadline,
    status: input.status ?? task.status,
    tutorId,
    isAssigned: Boolean(tutorId),
    price: input.price ?? task.price,
    paymentStatus: input.paymentStatus ?? task.paymentStatus,
    feedback: input.feedback ?? task.feedback,
    coordinatorId: input.coordinatorId !== undefined ? input.coordinatorId : task.coordinatorId,
    allowView: input.allowView ?? task.allowView,
    updatedAt: new Date().toISOString(),
  }
}

const memoryTasksById = new Map<string, Task>()
const memoryFilesByTaskId = new Map<string, TaskFile[]>()
const memorySolutionsByTaskId = new Map<string, TaskSolution[]>()
/** TODO: replace with payments repository when payments module exists. */
const memoryPaymentsByTaskId = new Map<string, unknown[]>()

function createMemoryTasksRepository(deps: TasksRepositoryDeps = {}): TasksRepository {
  const externalHasPayments = deps.hasPayments
  return {
    async findPage(filter) {
      return pageOf([...memoryTasksById.values()], filter)
    },

    async countStats(filter) {
      return statsOf([...memoryTasksById.values()], filter)
    },

    async findById(id) {
      return memoryTasksById.get(id) ?? null
    },

    async findDetailById(id) {
      const task = memoryTasksById.get(id)
      if (!task) return null
      return {
        ...task,
        files: memoryFilesByTaskId.get(id) ?? [],
        solutions: memorySolutionsByTaskId.get(id) ?? [],
      }
    },

    async countActiveByCoordinator(coordinatorId) {
      let count = 0
      for (const task of memoryTasksById.values()) {
        if (task.coordinatorId === coordinatorId && task.status !== 'cancelled') {
          count += 1
        }
      }
      return count
    },

    async create(input) {
      const now = new Date().toISOString()
      const tutorId = input.tutorId ?? null
      const task: Task = {
        id: randomUUID(),
        clientId: input.clientId,
        tutorId,
        coordinatorId: input.coordinatorId ?? null,
        topic: input.topic,
        type: input.type,
        description: input.description,
        isAssigned: Boolean(tutorId),
        status: input.status ?? 'pending',
        deadline: input.deadline,
        price: input.price ?? 0,
        paymentStatus: 'unpaid',
        category: input.category,
        feedback: null,
        allowView: false,
        createdAt: now,
        updatedAt: now,
      }
      memoryTasksById.set(task.id, task)
      memoryFilesByTaskId.set(task.id, [])
      memorySolutionsByTaskId.set(task.id, [])
      memoryPaymentsByTaskId.set(task.id, [])
      return task
    },

    async update(id, input) {
      const current = memoryTasksById.get(id)
      if (!current) return null
      const updated = applyTaskUpdate(current, input)
      memoryTasksById.set(id, updated)
      return updated
    },

    async delete(id) {
      const existed = memoryTasksById.delete(id)
      memoryFilesByTaskId.delete(id)
      memorySolutionsByTaskId.delete(id)
      memoryPaymentsByTaskId.delete(id)
      return existed
    },

    async addFile(taskId, input) {
      const now = new Date().toISOString()
      const file: TaskFile = {
        id: randomUUID(),
        taskId,
        fileLocation: input.fileLocation,
        note: input.note ?? null,
        originalName: input.originalName,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        createdAt: now,
        updatedAt: now,
      }
      const list = memoryFilesByTaskId.get(taskId) ?? []
      list.push(file)
      memoryFilesByTaskId.set(taskId, list)
      return file
    },

    async listFiles(taskId) {
      return memoryFilesByTaskId.get(taskId) ?? []
    },

    async deleteFile(taskId, fileId) {
      const list = memoryFilesByTaskId.get(taskId)
      const removed = list?.find((file) => file.id === fileId)
      if (!list || !removed) return null
      memoryFilesByTaskId.set(
        taskId,
        list.filter((file) => file.id !== fileId),
      )
      return removed
    },

    async addSolution(taskId, input) {
      const now = new Date().toISOString()
      const solution: TaskSolution = {
        id: randomUUID(),
        taskId,
        fileLocation: input.fileLocation,
        originalName: input.originalName,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        createdAt: now,
        updatedAt: now,
      }
      const list = memorySolutionsByTaskId.get(taskId) ?? []
      list.push(solution)
      memorySolutionsByTaskId.set(taskId, list)
      return solution
    },

    async listSolutions(taskId) {
      return memorySolutionsByTaskId.get(taskId) ?? []
    },

    async deleteSolution(taskId, solutionId) {
      const list = memorySolutionsByTaskId.get(taskId)
      const removed = list?.find((solution) => solution.id === solutionId)
      if (!list || !removed) return null
      memorySolutionsByTaskId.set(
        taskId,
        list.filter((solution) => solution.id !== solutionId),
      )
      return removed
    },

    async hasPayments(taskId) {
      if (externalHasPayments) {
        return externalHasPayments(taskId)
      }
      const payments = memoryPaymentsByTaskId.get(taskId) ?? []
      return payments.length > 0
    },

    async countActiveInvolvingUser(userId) {
      const active: TaskStatus[] = ['pending', 'in-progress', 'waiting_coordinator_approval']
      let count = 0
      for (const task of memoryTasksById.values()) {
        if (!active.includes(task.status)) continue
        if (task.clientId === userId || task.tutorId === userId || task.coordinatorId === userId) {
          count += 1
        }
      }
      return count
    },

    async listTaskIdsForClient(clientId) {
      return [...memoryTasksById.values()]
        .filter((task) => task.clientId === clientId)
        .map((task) => task.id)
    },
  }
}

export function resetTasksRepositoryForTests(): void {
  memoryTasksById.clear()
  memoryFilesByTaskId.clear()
  memorySolutionsByTaskId.clear()
  memoryPaymentsByTaskId.clear()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scopeQuery(query: any, filter: TaskListFilter) {
  let q = query
  const { scope } = filter
  if (scope.kind === 'client') q = q.eq('client_id', scope.clientId)
  else if (scope.kind === 'tutor') q = q.eq('tutor_id', scope.tutorId)
  else if (scope.kind === 'coordinator') q = q.eq('coordinator_id', scope.coordinatorId)
  if (filter.status) q = q.eq('status', filter.status)
  if (filter.search) {
    const safe = filter.search.replace(/[%_\\,()]/g, '').trim()
    if (safe) {
      q = q.or(`topic.ilike.%${safe}%,description.ilike.%${safe}%,category.ilike.%${safe}%`)
    }
  }
  return q
}

function createSupabaseTasksRepository(
  config: AppConfig,
  deps: TasksRepositoryDeps = {},
): TasksRepository {
  const externalHasPayments = deps.hasPayments
  const client = getSupabaseAdmin(config)
  if (!client) {
    throw new Error('Supabase admin client is not available')
  }

  return {
    async findPage(filter) {
      const from = (filter.page - 1) * filter.limit
      const to = from + filter.limit - 1
      let query = client
        .from('tasks')
        .select(TASK_COLUMNS, { count: 'exact' })
        .order('created_at', { ascending: false })
      query = scopeQuery(query, filter)
      const { data, error, count } = await query.range(from, to)
      if (error) throw error
      return {
        items: (data as TaskRow[]).map(toTask),
        total: count ?? 0,
      }
    },

    async countStats(filter) {
      let query = client.from('tasks').select('status')
      query = scopeQuery(query, filter)
      const { data, error } = await query
      if (error) throw error
      const stats = emptyTaskStats()
      for (const row of data as { status: TaskStatus }[]) {
        if (TASK_STATUSES.includes(row.status)) {
          stats[row.status] += 1
          stats.total += 1
        }
      }
      return stats
    },

    async findById(id) {
      const { data, error } = await client
        .from('tasks')
        .select(TASK_COLUMNS)
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data ? toTask(data as TaskRow) : null
    },

    async findDetailById(id) {
      const task = await this.findById(id)
      if (!task) return null
      const [files, solutions] = await Promise.all([this.listFiles(id), this.listSolutions(id)])
      return { ...task, files, solutions }
    },

    async countActiveByCoordinator(coordinatorId) {
      const { count, error } = await client
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('coordinator_id', coordinatorId)
        .neq('status', 'cancelled')
      if (error) throw error
      return count ?? 0
    },

    async create(input) {
      const tutorId = input.tutorId ?? null
      const { data, error } = await client
        .from('tasks')
        .insert({
          client_id: input.clientId,
          tutor_id: tutorId,
          coordinator_id: input.coordinatorId ?? null,
          topic: input.topic,
          type: input.type,
          description: input.description,
          is_assigned: Boolean(tutorId),
          status: input.status ?? 'pending',
          deadline: input.deadline,
          price: input.price ?? 0,
          payment_status: 'unpaid',
          category: input.category,
        })
        .select(TASK_COLUMNS)
        .single()
      if (error) throw error
      return toTask(data as TaskRow)
    },

    async update(id, input) {
      const patch: Record<string, unknown> = {}
      if (input.topic !== undefined) patch.topic = input.topic
      if (input.type !== undefined) patch.type = input.type
      if (input.category !== undefined) patch.category = input.category
      if (input.description !== undefined) patch.description = input.description
      if (input.deadline !== undefined) patch.deadline = input.deadline
      if (input.status !== undefined) patch.status = input.status
      if (input.tutorId !== undefined) {
        patch.tutor_id = input.tutorId
        patch.is_assigned = Boolean(input.tutorId)
      }
      if (input.price !== undefined) patch.price = input.price
      if (input.paymentStatus !== undefined) patch.payment_status = input.paymentStatus
      if (input.feedback !== undefined) patch.feedback = input.feedback
      if (input.coordinatorId !== undefined) patch.coordinator_id = input.coordinatorId
      if (input.allowView !== undefined) patch.allow_view = input.allowView

      const { data, error } = await client
        .from('tasks')
        .update(patch)
        .eq('id', id)
        .select(TASK_COLUMNS)
        .maybeSingle()
      if (error) throw error
      return data ? toTask(data as TaskRow) : null
    },

    async delete(id) {
      const { error, count } = await client.from('tasks').delete({ count: 'exact' }).eq('id', id)
      if (error) throw error
      return (count ?? 0) > 0
    },

    async addFile(taskId, input) {
      const { data, error } = await client
        .from('files')
        .insert({
          task_id: taskId,
          file_location: input.fileLocation,
          note: input.note ?? null,
          original_name: input.originalName,
          content_type: input.contentType,
          size_bytes: input.sizeBytes,
        })
        .select(FILE_COLUMNS)
        .single()
      if (error) throw error
      return toFile(data as FileRow)
    },

    async listFiles(taskId) {
      const { data, error } = await client
        .from('files')
        .select(FILE_COLUMNS)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data as FileRow[]).map(toFile)
    },

    async deleteFile(taskId, fileId) {
      const { data, error } = await client
        .from('files')
        .delete()
        .eq('task_id', taskId)
        .eq('id', fileId)
        .select(FILE_COLUMNS)
        .maybeSingle()
      if (error) throw error
      return data ? toFile(data as FileRow) : null
    },

    async addSolution(taskId, input) {
      const { data, error } = await client
        .from('solutions')
        .insert({
          task_id: taskId,
          file_location: input.fileLocation,
          original_name: input.originalName,
          content_type: input.contentType,
          size_bytes: input.sizeBytes,
        })
        .select(SOLUTION_COLUMNS)
        .single()
      if (error) throw error
      return toSolution(data as SolutionRow)
    },

    async listSolutions(taskId) {
      const { data, error } = await client
        .from('solutions')
        .select(SOLUTION_COLUMNS)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data as SolutionRow[]).map(toSolution)
    },

    async deleteSolution(taskId, solutionId) {
      const { data, error } = await client
        .from('solutions')
        .delete()
        .eq('task_id', taskId)
        .eq('id', solutionId)
        .select(SOLUTION_COLUMNS)
        .maybeSingle()
      if (error) throw error
      return data ? toSolution(data as SolutionRow) : null
    },

    async hasPayments(taskId) {
      if (externalHasPayments) {
        return externalHasPayments(taskId)
      }
      const { count, error } = await client
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('task_id', taskId)
      if (error) throw error
      return (count ?? 0) > 0
    },

    async countActiveInvolvingUser(userId) {
      const active = ['pending', 'in-progress', 'waiting_coordinator_approval']
      const { count, error } = await client
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .in('status', active)
        .or(`client_id.eq.${userId},tutor_id.eq.${userId},coordinator_id.eq.${userId}`)
      if (error) throw error
      return count ?? 0
    },

    async listTaskIdsForClient(clientId) {
      const { data, error } = await client.from('tasks').select('id').eq('client_id', clientId)
      if (error) throw error
      return ((data as { id: string }[]) ?? []).map((row) => row.id)
    },
  }
}

export function createTasksRepository(
  config: AppConfig = loadConfig(),
  deps: TasksRepositoryDeps = {},
): TasksRepository {
  if (isSupabaseConfigured(config)) {
    return createSupabaseTasksRepository(config, deps)
  }
  return createMemoryTasksRepository(deps)
}
