import { apiRequest } from './api'

export type FeedbackRecord = {
  id: string
  taskId: string
  tutorId: string
  clientId: string
  rating: number
  comments: string | null
  suggestions: string | null
  createdAt: string
  updatedAt: string
}

export type FeedbackListMeta = {
  page: number
  limit: number
  total: number
}

export type FeedbackListQuery = {
  page: number
  limit: number
  search?: string
}

export type CreateFeedbackInput = {
  taskId: string
  tutorId: string
  rating: number
  comments?: string
  suggestions?: string
}

export function createFeedback(input: CreateFeedbackInput) {
  return apiRequest<FeedbackRecord>('/feedback', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function listFeedback(query: FeedbackListQuery) {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  return apiRequest<{ data: FeedbackRecord[]; meta: FeedbackListMeta }>(
    `/feedback?${params.toString()}`,
  )
}

export function deleteFeedback(id: string) {
  return apiRequest<void>(`/feedback/${id}`, { method: 'DELETE' })
}
