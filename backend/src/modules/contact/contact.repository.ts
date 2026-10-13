import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin } from '../../database/index.js'
import type { ContactMessageInput, LeadInput } from './contact.types.js'

export type ContactRepository = {
  createMessage: (input: ContactMessageInput) => Promise<void>
  subscribe: (email: string) => Promise<void>
  createLead: (input: LeadInput) => Promise<void>
}

const memoryMessages: ContactMessageInput[] = []
const memorySubscribers = new Set<string>()
const memoryLeads: LeadInput[] = []

export function resetContactRepositoryForTests(): void {
  memoryMessages.length = 0
  memorySubscribers.clear()
  memoryLeads.length = 0
}

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === '23505'
}

function createMemoryContactRepository(): ContactRepository {
  return {
    async createMessage(input) {
      memoryMessages.push(input)
    },
    async subscribe(email) {
      memorySubscribers.add(email)
    },
    async createLead(input) {
      memoryLeads.push(input)
    },
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
  }
}

export function createContactRepository(config: AppConfig = loadConfig()): ContactRepository {
  if (isSupabaseConfigured(config)) {
    return createSupabaseContactRepository(config)
  }
  return createMemoryContactRepository()
}
