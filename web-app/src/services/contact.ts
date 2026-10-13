import { apiRequest } from './api'

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
