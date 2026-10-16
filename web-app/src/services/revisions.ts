import { apiRequest } from './api'

export type RevisionStatus =
  | 'in-revision'
  | 'waiting_coordinator_approval'
  | 'completed'
  | 'cancelled'

export type RevisionSession = {
  id: string
  taskId: string
  startDate: string | null
  deadline: string | null
  submitDate: string | null
  status: RevisionStatus
  title: string | null
  description: string | null
  createdAt: string
  updatedAt: string
}

export type RevisionSessionSolution = {
  id: string
  revisionSessionId: string
  solutionId: string
  date: string | null
  createdAt: string
  updatedAt: string
}

export type RevisionDetail = RevisionSession & {
  solutions: RevisionSessionSolution[]
}

export type CreateRevisionInput = {
  title?: string
  description?: string
  startDate?: string
  deadline?: string
}

export type UpdateRevisionInput = Partial<{
  title: string
  description: string
  startDate: string | null
  deadline: string | null
}>

export function listRevisionsForTask(taskId: string) {
  return apiRequest<{ data: RevisionSession[] }>(`/tasks/${taskId}/revisions`)
}

export function createRevision(taskId: string, input: CreateRevisionInput) {
  return apiRequest<RevisionSession>(`/tasks/${taskId}/revisions`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getRevision(id: string) {
  return apiRequest<RevisionDetail>(`/revisions/${id}`)
}

export function updateRevision(id: string, input: UpdateRevisionInput) {
  return apiRequest<RevisionSession>(`/revisions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function cancelRevision(id: string) {
  return apiRequest<RevisionSession>(`/revisions/${id}/cancel`, { method: 'POST' })
}

export function approveRevision(id: string) {
  return apiRequest<RevisionSession>(`/revisions/${id}/approve`, { method: 'POST' })
}

export function rejectRevision(id: string) {
  return apiRequest<RevisionSession>(`/revisions/${id}/reject`, { method: 'POST' })
}

export function submitRevision(id: string, solutionIds?: string[]) {
  return apiRequest<RevisionDetail>(`/revisions/${id}/submit`, {
    method: 'POST',
    body: JSON.stringify({ solutionIds }),
  })
}

export function cancelRevisionSubmit(id: string) {
  return apiRequest<RevisionSession>(`/revisions/${id}/cancel-submit`, { method: 'POST' })
}

export function revisionStatusLabel(status: RevisionStatus): string {
  switch (status) {
    case 'in-revision':
      return 'In revision'
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
