import { rowsToCsv } from '../_shared/csv.js'
import { notFound } from '../../errors/app-error.js'
import type { ContactRepository } from './contact.repository.js'
import type {
  ContactMessageBody,
  LeadBody,
  ListContactQuery,
  NewsletterBody,
  UpdateLeadBody,
  UpdateMessageBody,
  UpdateNewsletterBody,
} from './contact.schema.js'
import type {
  ContactListResult,
  ContactMessageRecord,
  ContactResult,
  LeadRecord,
  StayUpdatedRecord,
} from './contact.types.js'

export type ContactService = {
  createMessage: (input: ContactMessageBody) => Promise<ContactResult>
  subscribe: (input: NewsletterBody) => Promise<ContactResult>
  createLead: (input: LeadBody) => Promise<ContactResult>
  updateLead: (id: string, input: UpdateLeadBody) => Promise<LeadRecord>
  listLeads: (query: ListContactQuery) => Promise<ContactListResult<LeadRecord>>
  deleteLead: (id: string) => Promise<void>
  exportLeadsCsv: (search?: string) => Promise<string>
  listNewsletter: (query: ListContactQuery) => Promise<ContactListResult<StayUpdatedRecord>>
  updateNewsletter: (id: string, input: UpdateNewsletterBody) => Promise<StayUpdatedRecord>
  deleteNewsletter: (id: string) => Promise<void>
  exportNewsletterCsv: (search?: string) => Promise<string>
  listMessages: (query: ListContactQuery) => Promise<ContactListResult<ContactMessageRecord>>
  getMessage: (id: string) => Promise<ContactMessageRecord>
  updateMessage: (id: string, input: UpdateMessageBody) => Promise<ContactMessageRecord>
  deleteMessage: (id: string) => Promise<void>
  exportMessagesCsv: (search?: string) => Promise<string>
}

function toListResult<T>(
  query: ListContactQuery,
  page: { items: T[]; total: number },
): ContactListResult<T> {
  return {
    data: page.items,
    meta: {
      page: query.page,
      limit: query.limit,
      total: page.total,
    },
  }
}

export function createContactService(repository: ContactRepository): ContactService {
  async function deleteOrThrow(deleted: boolean): Promise<void> {
    if (!deleted) {
      throw notFound('Record not found')
    }
  }

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
    async listLeads(query) {
      const page = await repository.listLeads(query)
      return toListResult(query, page)
    },
    async updateLead(id, input) {
      const updated = await repository.updateLead(id, input)
      if (!updated) throw notFound('Lead not found')
      return updated
    },
    async deleteLead(id) {
      await deleteOrThrow(await repository.deleteLead(id))
    },
    async exportLeadsCsv(search) {
      const rows = await repository.exportLeads(search)
      return rowsToCsv(
        ['id', 'first_name', 'last_name', 'phone', 'email', 'country', 'zip', 'created_at'],
        rows.map((row) => [
          row.id,
          row.firstName,
          row.lastName,
          row.phone,
          row.email,
          row.country,
          row.zip,
          row.createdAt,
        ]),
      )
    },
    async listNewsletter(query) {
      const page = await repository.listNewsletter(query)
      return toListResult(query, page)
    },
    async updateNewsletter(id, input) {
      const updated = await repository.updateNewsletter(id, input)
      if (!updated) throw notFound('Subscriber not found')
      return updated
    },
    async deleteNewsletter(id) {
      await deleteOrThrow(await repository.deleteNewsletter(id))
    },
    async exportNewsletterCsv(search) {
      const rows = await repository.exportNewsletter(search)
      return rowsToCsv(
        ['id', 'email', 'created_at'],
        rows.map((row) => [row.id, row.email, row.createdAt]),
      )
    },
    async listMessages(query) {
      const page = await repository.listMessages(query)
      return toListResult(query, page)
    },
    async getMessage(id) {
      const message = await repository.findMessageById(id)
      if (!message) {
        throw notFound('Message not found')
      }
      return message
    },
    async updateMessage(id, input) {
      const updated = await repository.updateMessage(id, input)
      if (!updated) throw notFound('Message not found')
      return updated
    },
    async deleteMessage(id) {
      await deleteOrThrow(await repository.deleteMessage(id))
    },
    async exportMessagesCsv(search) {
      const rows = await repository.exportMessages(search)
      return rowsToCsv(
        ['id', 'name', 'email', 'subject', 'message', 'created_at'],
        rows.map((row) => [row.id, row.name, row.email, row.subject, row.message, row.createdAt]),
      )
    },
  }
}
