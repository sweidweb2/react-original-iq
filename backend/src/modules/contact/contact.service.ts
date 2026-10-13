import type { ContactRepository } from './contact.repository.js'
import type { ContactMessageBody, LeadBody, NewsletterBody } from './contact.schema.js'
import type { ContactResult } from './contact.types.js'

export type ContactService = {
  createMessage: (input: ContactMessageBody) => Promise<ContactResult>
  subscribe: (input: NewsletterBody) => Promise<ContactResult>
  createLead: (input: LeadBody) => Promise<ContactResult>
}

export function createContactService(repository: ContactRepository): ContactService {
  return {
    async createMessage(input) {
      await repository.createMessage({
        name: input.name,
        email: input.email,
        subject: input.subject ?? null,
        message: input.message,
      })
      return { ok: true }
    },
    async subscribe(input) {
      await repository.subscribe(input.email)
      return { ok: true }
    },
    async createLead(input) {
      const phone = `${input.dialCode} ${input.phone}`.slice(0, 40)
      await repository.createLead({ country: input.country, phone })
      return { ok: true }
    },
  }
}
