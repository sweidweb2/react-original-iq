import { apiRequest } from './api'

export type Specialization = {
  id: string
  tutorId: string
  name: string
  note: string | null
  createdAt: string
  updatedAt: string
}

export function listSpecializations(tutorId: string) {
  const params = new URLSearchParams({ tutorId })
  return apiRequest<{ data: Specialization[] }>(`/specializations?${params.toString()}`)
}

export function createSpecialization(input: { tutorId: string; name: string; note?: string }) {
  return apiRequest<Specialization>('/specializations', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function deleteSpecialization(id: string) {
  return apiRequest<void>(`/specializations/${id}`, { method: 'DELETE' })
}
