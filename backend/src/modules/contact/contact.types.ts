export type ContactMessageInput = {
  name: string
  email: string
  subject: string | null
  message: string
}

export type LeadInput = {
  country: string
  phone: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  zip?: string | null
}

export type UpdateLeadInput = {
  country?: string
  phone?: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  zip?: string | null
}

export type UpdateMessageInput = {
  name?: string
  email?: string
  subject?: string | null
  message?: string
}

export type UpdateNewsletterInput = {
  email: string
}

export type ContactResult = {
  ok: true
}

export type ContactListFilter = {
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

export type ContactListResult<T> = {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
  }
}
