import type { ContactRepository } from './contact.repository.js'
import type { ContactMessageBody, NewsletterBody } from './contact.schema.js'
import type { ContactResult } from './contact.types.js'

export type ContactService = {
  createMessage: (input: ContactMessageBody) => Promise<ContactResult>
  subscribe: (input: NewsletterBody) => Promise<ContactResult>
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
  }
}
