import { randomUUID } from 'node:crypto'

import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin } from '../../database/index.js'
import type {
  ContactListFilter,
  ContactMessageRecord,
  LeadRecord,
  StayUpdatedRecord,
} from './contact.types.js'
import type { ContactMessageInput, LeadInput } from './contact.types.js'

export type ContactRepository = {
  createMessage: (input: ContactMessageInput) => Promise<void>
  subscribe: (email: string) => Promise<void>
  createLead: (input: LeadInput) => Promise<void>
  listLeads: (filter: ContactListFilter) => Promise<{ items: LeadRecord[]; total: number }>
  deleteLead: (id: string) => Promise<boolean>
  exportLeads: (search?: string) => Promise<LeadRecord[]>
  listNewsletter: (filter: ContactListFilter) => Promise<{ items: StayUpdatedRecord[]; total: number }>
  deleteNewsletter: (id: string) => Promise<boolean>
  exportNewsletter: (search?: string) => Promise<StayUpdatedRecord[]>
  listMessages: (filter: ContactListFilter) => Promise<{ items: ContactMessageRecord[]; total: number }>
  findMessageById: (id: string) => Promise<ContactMessageRecord | null>
  deleteMessage: (id: string) => Promise<boolean>
  exportMessages: (search?: string) => Promise<ContactMessageRecord[]>
}

const memoryMessages: ContactMessageRecord[] = []
const memorySubscribers: StayUpdatedRecord[] = []
const memoryLeads: LeadRecord[] = []

export function resetContactRepositoryForTests(): void {
  memoryMessages.length = 0
  memorySubscribers.length = 0
  memoryLeads.length = 0
}

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === '23505'
}

function nowIso(): string {
  return new Date().toISOString()
}

function searchOr(fields: string[], search: string): string | null {
  const safe = search.replace(/[%_\\,()]/g, '').trim()
  if (!safe) return null
  const pattern = `%${safe}%`
  return fields.map((field) => `${field}.ilike.${pattern}`).join(',')
}

function matchesLead(lead: LeadRecord, search?: string): boolean {
  if (!search) return true
  const needle = search.toLowerCase()
  const hay = [
    lead.phone,
    lead.email,
    lead.country,
    lead.firstName,
    lead.lastName,
    lead.zip,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(needle)
}

function matchesNewsletter(row: StayUpdatedRecord, search?: string): boolean {
  if (!search) return true
  return row.email.toLowerCase().includes(search.toLowerCase())
}

function matchesMessage(row: ContactMessageRecord, search?: string): boolean {
  if (!search) return true
  const needle = search.toLowerCase()
  const hay = [row.name, row.email, row.subject, row.message]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(needle)
}

function pageOf<T>(items: T[], filter: ContactListFilter, match: (item: T) => boolean) {
  const sorted = items.filter(match).sort((a, b) => {
    const aTime = (a as { createdAt: string }).createdAt
    const bTime = (b as { createdAt: string }).createdAt
    return bTime.localeCompare(aTime)
  })
  const start = (filter.page - 1) * filter.limit
  return {
    items: sorted.slice(start, start + filter.limit),
    total: sorted.length,
  }
}

function createMemoryContactRepository(): ContactRepository {
  return {
    async createMessage(input) {
      const stamp = nowIso()
      memoryMessages.push({
        id: randomUUID(),
        name: input.name,
        email: input.email,
        subject: input.subject,
        message: input.message,
        createdAt: stamp,
        updatedAt: stamp,
      })
    },
    async subscribe(email) {
      if (memorySubscribers.some((row) => row.email === email)) return
      const stamp = nowIso()
      memorySubscribers.push({
        id: randomUUID(),
        email,
        createdAt: stamp,
        updatedAt: stamp,
      })
    },
    async createLead(input) {
      const stamp = nowIso()
      memoryLeads.push({
        id: randomUUID(),
        firstName: null,
        lastName: null,
        phone: input.phone,
        email: null,
        country: input.country,
        zip: null,
        createdAt: stamp,
        updatedAt: stamp,
      })
    },
    async listLeads(filter) {
      return pageOf(memoryLeads, filter, (lead) => matchesLead(lead, filter.search))
    },
    async deleteLead(id) {
      const index = memoryLeads.findIndex((row) => row.id === id)
      if (index === -1) return false
      memoryLeads.splice(index, 1)
      return true
    },
    async exportLeads(search) {
      return memoryLeads
        .filter((lead) => matchesLead(lead, search))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    async listNewsletter(filter) {
      return pageOf(memorySubscribers, filter, (row) => matchesNewsletter(row, filter.search))
    },
    async deleteNewsletter(id) {
      const index = memorySubscribers.findIndex((row) => row.id === id)
      if (index === -1) return false
      memorySubscribers.splice(index, 1)
      return true
    },
    async exportNewsletter(search) {
      return memorySubscribers
        .filter((row) => matchesNewsletter(row, search))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    async listMessages(filter) {
      return pageOf(memoryMessages, filter, (row) => matchesMessage(row, filter.search))
    },
    async findMessageById(id) {
      return memoryMessages.find((row) => row.id === id) ?? null
    },
    async deleteMessage(id) {
      const index = memoryMessages.findIndex((row) => row.id === id)
      if (index === -1) return false
      memoryMessages.splice(index, 1)
      return true
    },
    async exportMessages(search) {
      return memoryMessages
        .filter((row) => matchesMessage(row, search))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
  }
}

type LeadRow = {
  id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  email: string | null
  country: string | null
  zip: string | null
  created_at: string
  updated_at: string
}

type StayUpdatedRow = {
  id: string
  email: string
  created_at: string
  updated_at: string
}

type MessageRow = {
  id: string
  name: string
  email: string
  subject: string | null
  message: string
  created_at: string
  updated_at: string
}

function toLead(row: LeadRow): LeadRecord {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
    country: row.country,
    zip: row.zip,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toNewsletter(row: StayUpdatedRow): StayUpdatedRecord {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toMessage(row: MessageRow): ContactMessageRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function createSupabaseContactRepository(config: AppConfig): ContactRepository {
  const client = getSupabaseAdmin(config)
  if (!client) {
    throw new Error('Supabase admin client is not available')
  }

  return {
    async createMessage(input) {
      const { error } = await client.from('contact_messages').insert({
        name: input.name,
        email: input.email,
        subject: input.subject,
        message: input.message,
      })
      if (error) throw error
    },
    async subscribe(email) {
      const { error } = await client.from('stay_updated').insert({ email })
      if (error && !isUniqueViolation(error)) throw error
    },
    async createLead(input) {
      const { error } = await client.from('leads').insert({
        country: input.country,
        phone: input.phone,
      })
      if (error) throw error
    },
    async listLeads(filter) {
      const from = (filter.page - 1) * filter.limit
      const to = from + filter.limit - 1
      let query = client
        .from('leads')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
      if (filter.search) {
        const clause = searchOr(
          ['phone', 'email', 'country', 'first_name', 'last_name', 'zip'],
          filter.search,
        )
        if (clause) query = query.or(clause)
      }
      const { data, error, count } = await query.range(from, to)
      if (error) throw error
      return {
        items: (data as LeadRow[]).map(toLead),
        total: count ?? 0,
      }
    },
    async deleteLead(id) {
      const { error, count } = await client.from('leads').delete({ count: 'exact' }).eq('id', id)
      if (error) throw error
      return (count ?? 0) > 0
    },
    async exportLeads(search) {
      let query = client.from('leads').select('*').order('created_at', { ascending: false })
      if (search) {
        const clause = searchOr(
          ['phone', 'email', 'country', 'first_name', 'last_name', 'zip'],
          search,
        )
        if (clause) query = query.or(clause)
      }
      const { data, error } = await query
      if (error) throw error
      return (data as LeadRow[]).map(toLead)
    },
    async listNewsletter(filter) {
      const from = (filter.page - 1) * filter.limit
      const to = from + filter.limit - 1
      let query = client
        .from('stay_updated')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
      if (filter.search) {
        const clause = searchOr(['email'], filter.search)
        if (clause) query = query.or(clause)
      }
      const { data, error, count } = await query.range(from, to)
      if (error) throw error
      return {
        items: (data as StayUpdatedRow[]).map(toNewsletter),
        total: count ?? 0,
      }
    },
    async deleteNewsletter(id) {
      const { error, count } = await client
        .from('stay_updated')
        .delete({ count: 'exact' })
        .eq('id', id)
      if (error) throw error
      return (count ?? 0) > 0
    },
    async exportNewsletter(search) {
      let query = client.from('stay_updated').select('*').order('created_at', { ascending: false })
      if (search) {
        const clause = searchOr(['email'], search)
        if (clause) query = query.or(clause)
      }
      const { data, error } = await query
      if (error) throw error
      return (data as StayUpdatedRow[]).map(toNewsletter)
    },
    async listMessages(filter) {
      const from = (filter.page - 1) * filter.limit
      const to = from + filter.limit - 1
      let query = client
        .from('contact_messages')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
      if (filter.search) {
        const clause = searchOr(['name', 'email', 'subject', 'message'], filter.search)
        if (clause) query = query.or(clause)
      }
      const { data, error, count } = await query.range(from, to)
      if (error) throw error
      return {
        items: (data as MessageRow[]).map(toMessage),
        total: count ?? 0,
      }
    },
    async findMessageById(id) {
      const { data, error } = await client
        .from('contact_messages')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data ? toMessage(data as MessageRow) : null
    },
    async deleteMessage(id) {
      const { error, count } = await client
        .from('contact_messages')
        .delete({ count: 'exact' })
        .eq('id', id)
      if (error) throw error
      return (count ?? 0) > 0
    },
    async exportMessages(search) {
      let query = client
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false })
      if (search) {
        const clause = searchOr(['name', 'email', 'subject', 'message'], search)
        if (clause) query = query.or(clause)
      }
      const { data, error } = await query
      if (error) throw error
      return (data as MessageRow[]).map(toMessage)
    },
  }
}

export function createContactRepository(config: AppConfig = loadConfig()): ContactRepository {
  if (isSupabaseConfigured(config)) {
    return createSupabaseContactRepository(config)
  }
  return createMemoryContactRepository()
}
