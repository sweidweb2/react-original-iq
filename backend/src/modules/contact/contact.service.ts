import { notFound } from '../../errors/app-error.js'
import { renderTablePdf, type TableColumn } from '../../pdf/index.js'
import { rowsToCsv } from '../_shared/csv.js'
import { csvExport, type ExportFile, pdfExport } from '../_shared/export-file.js'
import { getLoggingService } from '../logging/index.js'
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
  exportLeads: (format: ExportFormat, options: ExportOptions) => Promise<ExportFile>
  listNewsletter: (query: ListContactQuery) => Promise<ContactListResult<StayUpdatedRecord>>
  updateNewsletter: (id: string, input: UpdateNewsletterBody) => Promise<StayUpdatedRecord>
  deleteNewsletter: (id: string) => Promise<void>
  exportNewsletter: (format: ExportFormat, options: ExportOptions) => Promise<ExportFile>
  listMessages: (query: ListContactQuery) => Promise<ContactListResult<ContactMessageRecord>>
  getMessage: (id: string) => Promise<ContactMessageRecord>
  updateMessage: (id: string, input: UpdateMessageBody) => Promise<ContactMessageRecord>
  deleteMessage: (id: string) => Promise<void>
  exportMessages: (options: ExportOptions) => Promise<ExportFile>
}

export type ExportFormat = 'csv' | 'pdf'

export type ExportOptions = {
  search?: string
  actorId?: string | null
}

const LEAD_COLUMNS: TableColumn[] = [
  { key: 'first_name', label: 'First name', width: 1.2 },
  { key: 'last_name', label: 'Last name', width: 1.2 },
  { key: 'phone', label: 'Phone', width: 1.4 },
  { key: 'email', label: 'Email', width: 2 },
  { key: 'country', label: 'Country', width: 1.2 },
  { key: 'zip', label: 'ZIP', width: 0.7 },
  { key: 'created_at', label: 'Created', width: 1.4 },
]

const NEWSLETTER_COLUMNS: TableColumn[] = [
  { key: 'email', label: 'Email', width: 3 },
  { key: 'created_at', label: 'Subscribed', width: 1.5 },
]

function leadRow(row: LeadRecord) {
  return {
    id: row.id,
    first_name: row.firstName,
    last_name: row.lastName,
    phone: row.phone,
    email: row.email,
    country: row.country,
    zip: row.zip,
    created_at: row.createdAt,
  }
}

function auditExport(resource: string, format: ExportFormat, rows: number, options: ExportOptions) {
  getLoggingService().recordActivitySafe({
    userId: options.actorId ?? null,
    action: 'exports.download',
    entity: 'export',
    entityId: resource,
    meta: { resource, format, rows, search: options.search ?? null },
  })
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
    async exportLeads(format, options) {
      const rows = (await repository.exportLeads(options.search)).map(leadRow)
      auditExport('leads', format, rows.length, options)
      if (format === 'pdf') {
        return pdfExport(
          'leads',
          await renderTablePdf({ title: 'Leads', columns: LEAD_COLUMNS, rows }),
        )
      }
      const keys = ['id', ...LEAD_COLUMNS.map((col) => col.key)] as (keyof ReturnType<
        typeof leadRow
      >)[]
      return csvExport(
        'leads',
        rowsToCsv(
          keys,
          rows.map((row) => keys.map((key) => row[key])),
        ),
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
    async exportNewsletter(format, options) {
      const records = await repository.exportNewsletter(options.search)
      auditExport('stay-updated', format, records.length, options)
      if (format === 'pdf') {
        const rows = records.map((row) => ({ email: row.email, created_at: row.createdAt }))
        return pdfExport(
          'stay-updated',
          await renderTablePdf({
            title: 'Stay updated subscribers',
            columns: NEWSLETTER_COLUMNS,
            rows,
          }),
        )
      }
      return csvExport(
        'stay-updated',
        rowsToCsv(
          ['id', 'email', 'created_at'],
          records.map((row) => [row.id, row.email, row.createdAt]),
        ),
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
    async exportMessages(options) {
      const rows = await repository.exportMessages(options.search)
      auditExport('contact-messages', 'csv', rows.length, options)
      return csvExport(
        'contact-messages',
        rowsToCsv(
          ['id', 'name', 'email', 'subject', 'message', 'created_at'],
          rows.map((row) => [row.id, row.name, row.email, row.subject, row.message, row.createdAt]),
        ),
      )
    },
  }
}
