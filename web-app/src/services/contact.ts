import { apiDownload, apiRequest } from './api'

export type ContactMessagePayload = {
  name: string
  email: string
  subject?: string
  message: string
}

export function sendContactMessage(body: ContactMessagePayload) {
  return apiRequest<{ ok: true }>('/contact/messages', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuthRefresh: true,
  })
}

export function subscribeNewsletter(email: string) {
  return apiRequest<{ ok: true }>('/contact/newsletter', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipAuthRefresh: true,
  })
}

export type LeadPayload = {
  country: string
  dialCode: string
  phone: string
}

export function createLead(body: LeadPayload) {
  return apiRequest<{ ok: true }>('/contact/leads', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuthRefresh: true,
  })
}

export type ContactListMeta = {
  page: number
  limit: number
  total: number
}

export type ContactListQuery = {
  page: number
  limit: number
  search?: string
}

export type LeadRecord = {
  id: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  email: string | null
  country: string | null
  zip: string | null
  createdAt: string
  updatedAt: string
}

export type StayUpdatedRecord = {
  id: string
  email: string
  createdAt: string
  updatedAt: string
}

export type ContactMessageRecord = {
  id: string
  name: string
  email: string
  subject: string | null
  message: string
  createdAt: string
  updatedAt: string
}

function listQueryParams(query: ContactListQuery): string {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  return params.toString()
}

export function listLeads(query: ContactListQuery) {
  return apiRequest<{ data: LeadRecord[]; meta: ContactListMeta }>(
    `/contact/leads?${listQueryParams(query)}`,
  )
}

export function deleteLead(id: string) {
  return apiRequest<void>(`/contact/leads/${id}`, { method: 'DELETE' })
}

export function updateLead(
  id: string,
  input: {
    country?: string
    phone?: string
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    zip?: string | null
  },
) {
  return apiRequest<LeadRecord>(`/contact/leads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function exportLeads(search?: string) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiDownload(`/contact/leads/export${suffix}`, 'leads.csv')
}

export function listNewsletter(query: ContactListQuery) {
  return apiRequest<{ data: StayUpdatedRecord[]; meta: ContactListMeta }>(
    `/contact/newsletter?${listQueryParams(query)}`,
  )
}

export function deleteNewsletterSubscriber(id: string) {
  return apiRequest<void>(`/contact/newsletter/${id}`, { method: 'DELETE' })
}

export function updateNewsletterSubscriber(id: string, email: string) {
  return apiRequest<StayUpdatedRecord>(`/contact/newsletter/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ email }),
  })
}

export function exportNewsletter(search?: string) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiDownload(`/contact/newsletter/export${suffix}`, 'stay-updated.csv')
}

export function listContactMessages(query: ContactListQuery) {
  return apiRequest<{ data: ContactMessageRecord[]; meta: ContactListMeta }>(
    `/contact/messages?${listQueryParams(query)}`,
  )
}

export function getContactMessage(id: string) {
  return apiRequest<ContactMessageRecord>(`/contact/messages/${id}`)
}

export function deleteContactMessage(id: string) {
  return apiRequest<void>(`/contact/messages/${id}`, { method: 'DELETE' })
}

export function updateContactMessage(
  id: string,
  input: { name?: string; email?: string; subject?: string | null; message?: string },
) {
  return apiRequest<ContactMessageRecord>(`/contact/messages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function exportContactMessages(search?: string) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiDownload(`/contact/messages/export${suffix}`, 'contact-messages.csv')
}
