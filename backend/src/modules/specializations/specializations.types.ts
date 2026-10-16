export type Specialization = {
  id: string
  tutorId: string
  name: string
  note: string | null
  createdAt: string
  updatedAt: string
}

export type CreateSpecializationInput = {
  tutorId: string
  name: string
  note?: string
}
