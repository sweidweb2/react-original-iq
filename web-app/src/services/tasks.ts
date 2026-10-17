import { apiDownload, ApiError, apiRequest, NETWORK_ERROR_STATUS } from './api'

export type TaskType = 'assignment' | 'tutoring' | 'research' | 'editing'

export type TaskStatus =
  'pending' | 'in-progress' | 'waiting_coordinator_approval' | 'completed' | 'cancelled'

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

export type FileDownload = {
  url: string
  filename: string
  expiresInSec: number | null
}

type UploadTicket = {
  uploadUrl: string
  key: string
  contentType: string
  expiresInSec: number
}

export const TASK_UPLOAD_ACCEPT =
  '.pdf,.doc,.docx,.txt,.zip,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif,.ico,.webp,.xls,.xlsx,.csv,.ppt,.pptx'

export const TASK_UPLOAD_MAX_BYTES = 25 * 1024 * 1024

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
}

/** Content fields only; status, tutor, and price have dedicated endpoints. */
export type UpdateTaskInput = Partial<{
  topic: string
  type: TaskType
  category: string
  description: string
  deadline: string
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

/** Called with bytes sent so far for the current file. */
export type UploadProgressHandler = (loadedBytes: number) => void

/** Storage response bodies are never surfaced; only our own wording per status. */
function storageUploadError(status: number): ApiError {
  if (status === 413) {
    return new ApiError(413, 'The file is too large for storage.', 'STORAGE_UPLOAD_FAILED')
  }
  if (status >= 400 && status < 500) {
    return new ApiError(
      status,
      'The storage service rejected this file. The upload link may have expired — please try again.',
      'STORAGE_UPLOAD_FAILED',
    )
  }
  return new ApiError(status || 502, 'Storage upload failed', 'STORAGE_UPLOAD_FAILED')
}

/** XHR instead of fetch: fetch exposes no upload progress events. */
function putFile(
  url: string,
  file: File,
  contentType: string,
  onProgress?: UploadProgressHandler,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = (event) => onProgress?.(event.loaded)
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(file.size)
        resolve()
      } else {
        reject(storageUploadError(xhr.status))
      }
    }
    xhr.onerror = () =>
      reject(new ApiError(NETWORK_ERROR_STATUS, 'Network request failed', 'NETWORK_ERROR'))
    xhr.onabort = () => reject(new ApiError(499, 'The upload was cancelled.', 'UPLOAD_ABORTED'))
    xhr.send(file)
  })
}

async function uploadToTask<T>(
  collection: 'files' | 'solutions',
  id: string,
  file: File,
  onProgress?: UploadProgressHandler,
) {
  const ticket = await apiRequest<UploadTicket>(`/tasks/${id}/${collection}/upload-url`, {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    }),
  })

  await putFile(ticket.uploadUrl, file, ticket.contentType, onProgress)

  return apiRequest<T>(`/tasks/${id}/${collection}`, {
    method: 'POST',
    body: JSON.stringify({ key: ticket.key, filename: file.name }),
  })
}

export function uploadTaskFile(id: string, file: File, onProgress?: UploadProgressHandler) {
  return uploadToTask<TaskFile>('files', id, file, onProgress)
}

export function listTaskFiles(id: string) {
  return apiRequest<TaskFile[]>(`/tasks/${id}/files`)
}

export function getTaskFileDownloadUrl(id: string, fileId: string) {
  return apiRequest<FileDownload>(`/tasks/${id}/files/${fileId}/download`)
}

export function deleteTaskFile(id: string, fileId: string) {
  return apiRequest<void>(`/tasks/${id}/files/${fileId}`, { method: 'DELETE' })
}

export function uploadTaskSolution(id: string, file: File, onProgress?: UploadProgressHandler) {
  return uploadToTask<TaskSolution>('solutions', id, file, onProgress)
}

export function listTaskSolutions(id: string) {
  return apiRequest<TaskSolution[]>(`/tasks/${id}/solutions`)
}

export function getTaskSolutionDownloadUrl(id: string, solutionId: string) {
  return apiRequest<FileDownload>(`/tasks/${id}/solutions/${solutionId}/download`)
}

export type TaskFileKind = 'documents' | 'solutions'

/** Zip of all (or the selected) task documents or solutions; the server names the file. */
export function downloadTaskZip(id: string, kind: TaskFileKind, ids?: string[]) {
  const collection = kind === 'documents' ? 'files' : 'solutions'
  const query = ids && ids.length > 0 ? `?ids=${encodeURIComponent(ids.join(','))}` : ''
  return apiDownload(
    `/tasks/${id}/${collection}/zip${query}`,
    `task-${id.slice(0, 8)}_${kind}.zip`,
    {
      label: `Task ${kind} (zip)`,
    },
  )
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
