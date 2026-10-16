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

export type FeedbackListFilter = {
  page: number
  limit: number
  search?: string
  tutorId?: string
  clientId?: string
}

export type CreateFeedbackInput = {
  taskId: string
  tutorId: string
  clientId: string
  rating: number
  comments?: string
  suggestions?: string
}
