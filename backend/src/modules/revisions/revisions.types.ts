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
  taskId: string
  title?: string
  description?: string
  startDate?: string
  deadline?: string
}

export type UpdateRevisionInput = {
  title?: string
  description?: string
  startDate?: string | null
  deadline?: string | null
}
