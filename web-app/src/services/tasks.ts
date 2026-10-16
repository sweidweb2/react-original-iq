import { apiRequest } from './api'

export type TaskType = 'assignment' | 'tutoring' | 'research' | 'editing'

export type TaskStatus =
  | 'pending'
  | 'in-progress'
  | 'waiting_coordinator_approval'
  | 'completed'
  | 'cancelled'

export type TaskPaymentStatus = 'unpaid' | 'paid' | 'refund_pending'

export type Task = {
  id: string
  clientId: string
  tutorId: string | null
  coordinatorId: string | null
  topic: string | null
  type: TaskType | null
  description: string | null
  isAssigned: boolean
  status: TaskStatus
  deadline: string | null
  price: number
  paymentStatus: TaskPaymentStatus
  category: string | null
  feedback: string | null
  allowView: boolean
  createdAt: string
  updatedAt: string
}

export type TaskFile = {
  id: string
  taskId: string
  fileLocation: string
  note: string | null
  createdAt: string
  updatedAt: string
}

export type TaskSolution = {
  id: string
  taskId: string
  fileLocation: string
  createdAt: string
  updatedAt: string
}

export type TaskDetail = Task & {
  files: TaskFile[]
  solutions: TaskSolution[]
}

export type TaskListMeta = {
  page: number
  limit: number
  total: number
}

export type TaskStats = Record<TaskStatus, number> & { total: number }

export type ListTasksQuery = {
  page: number
  limit: number
  search?: string
  status?: TaskStatus
}

export type CreateTaskInput = {
  clientId?: string
  tutorId?: string | null
  topic: string
  type: TaskType
  category: string
  description: string
  deadline: string
  price?: number
  status?: TaskStatus
}

export type UpdateTaskInput = Partial<{
  topic: string
  type: TaskType
  category: string
  description: string
  deadline: string
  status: TaskStatus
  tutorId: string | null
  price: number
  paymentStatus: TaskPaymentStatus
  feedback: string
}>

export function listTasks(query: ListTasksQuery) {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.status) params.set('status', query.status)
  return apiRequest<{ data: Task[]; meta: TaskListMeta }>(`/tasks?${params.toString()}`)
}

export function getTaskStats() {
  return apiRequest<TaskStats>('/tasks/stats')
}

export function getTask(id: string) {
  return apiRequest<TaskDetail>(`/tasks/${id}`)
}

export function createTask(input: CreateTaskInput) {
  return apiRequest<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateTask(id: string, input: UpdateTaskInput) {
  return apiRequest<Task>(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function updateTaskPrice(id: string, price: number) {
  return apiRequest<Task>(`/tasks/${id}/price`, {
    method: 'PATCH',
    body: JSON.stringify({ price }),
  })
}

export function assignTutor(id: string, tutorId: string) {
  return apiRequest<Task>(`/tasks/${id}/assign-tutor`, {
    method: 'POST',
    body: JSON.stringify({ tutorId }),
  })
}

export function removeTutor(id: string) {
  return apiRequest<Task>(`/tasks/${id}/remove-tutor`, { method: 'POST' })
}

export function changeCoordinator(id: string, coordinatorId: string) {
  return apiRequest<Task>(`/tasks/${id}/change-coordinator`, {
    method: 'POST',
    body: JSON.stringify({ coordinatorId }),
  })
}

export function submitTask(id: string) {
  return apiRequest<Task>(`/tasks/${id}/submit`, { method: 'POST' })
}

export function cancelTaskSubmit(id: string) {
  return apiRequest<Task>(`/tasks/${id}/cancel-submit`, { method: 'POST' })
}

export function approveTask(id: string) {
  return apiRequest<Task>(`/tasks/${id}/approve`, { method: 'POST' })
}

export function disapproveTask(id: string) {
  return apiRequest<Task>(`/tasks/${id}/disapprove`, { method: 'POST' })
}

export function cancelTask(id: string) {
  return apiRequest<Task>(`/tasks/${id}/cancel`, { method: 'POST' })
}

export function activateTask(id: string) {
  return apiRequest<Task>(`/tasks/${id}/activate`, { method: 'POST' })
}

export function setTaskAllowView(id: string, allowView: boolean) {
  return apiRequest<Task>(`/tasks/${id}/allow-view`, {
    method: 'POST',
    body: JSON.stringify({ allowView }),
  })
}

export function deleteTask(id: string) {
  return apiRequest<void>(`/tasks/${id}`, { method: 'DELETE' })
}

export function addTaskFile(id: string, fileLocation: string, note?: string) {
  return apiRequest<TaskFile>(`/tasks/${id}/files`, {
    method: 'POST',
    body: JSON.stringify({ fileLocation, note }),
  })
}

export function listTaskFiles(id: string) {
  return apiRequest<TaskFile[]>(`/tasks/${id}/files`)
}

export function deleteTaskFile(id: string, fileId: string) {
  return apiRequest<void>(`/tasks/${id}/files/${fileId}`, { method: 'DELETE' })
}

export function addTaskSolution(id: string, fileLocation: string) {
  return apiRequest<TaskSolution>(`/tasks/${id}/solutions`, {
    method: 'POST',
    body: JSON.stringify({ fileLocation }),
  })
}

export function listTaskSolutions(id: string) {
  return apiRequest<TaskSolution[]>(`/tasks/${id}/solutions`)
}

export function deleteTaskSolution(id: string, solutionId: string) {
  return apiRequest<void>(`/tasks/${id}/solutions/${solutionId}`, { method: 'DELETE' })
}

export function taskStatusLabel(status: TaskStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'in-progress':
      return 'In progress'
    case 'waiting_coordinator_approval':
      return 'Awaiting approval'
    case 'completed':
      return 'Completed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}
