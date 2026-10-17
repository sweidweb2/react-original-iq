export type TaskType = 'assignment' | 'tutoring' | 'research' | 'editing'

export type TaskStatus =
  'pending' | 'in-progress' | 'waiting_coordinator_approval' | 'completed' | 'cancelled'

export type TaskPaymentStatus = 'unpaid' | 'paid' | 'refund_pending'

export type StoredFileMeta = {
  originalName: string | null
  contentType: string | null
  sizeBytes: number | null
}

export type TaskFile = StoredFileMeta & {
  id: string
  taskId: string
  fileLocation: string
  note: string | null
  createdAt: string
  updatedAt: string
}

export type TaskSolution = StoredFileMeta & {
  id: string
  taskId: string
  fileLocation: string
  createdAt: string
  updatedAt: string
}

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

export type TaskDetail = Task & {
  files: TaskFile[]
  solutions: TaskSolution[]
}

export type TaskListFilter = {
  page: number
  limit: number
  search?: string
  status?: TaskStatus
  scope:
    | { kind: 'all' }
    | { kind: 'client'; clientId: string }
    | { kind: 'tutor'; tutorId: string }
    | { kind: 'coordinator'; coordinatorId: string }
}

export type TaskStats = Record<TaskStatus, number> & { total: number }

export type CreateTaskInput = {
  clientId: string
  tutorId?: string | null
  coordinatorId?: string | null
  topic: string
  type: TaskType
  category: string
  description: string
  deadline: string
  price?: number
  status?: TaskStatus
}

export type UpdateTaskInput = {
  topic?: string
  type?: TaskType
  category?: string
  description?: string
  deadline?: string
  status?: TaskStatus
  tutorId?: string | null
  coordinatorId?: string | null
  price?: number
  paymentStatus?: TaskPaymentStatus
  feedback?: string
  allowView?: boolean
}

export type AddFileInput = {
  fileLocation: string
  originalName: string
  contentType: string
  sizeBytes: number
  note?: string
}

export type AddSolutionInput = {
  fileLocation: string
  originalName: string
  contentType: string
  sizeBytes: number
}

export type UploadUrlInput = {
  filename: string
  contentType: string
  sizeBytes: number
}

export type UploadUrlResult = {
  uploadUrl: string
  key: string
  contentType: string
  expiresInSec: number
}

export type DownloadUrlResult = {
  url: string
  filename: string
  expiresInSec: number | null
}

export const TASK_STATUSES: TaskStatus[] = [
  'pending',
  'in-progress',
  'waiting_coordinator_approval',
  'completed',
  'cancelled',
]

export function emptyTaskStats(): TaskStats {
  return {
    pending: 0,
    'in-progress': 0,
    waiting_coordinator_approval: 0,
    completed: 0,
    cancelled: 0,
    total: 0,
  }
}
