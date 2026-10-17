import { randomUUID } from 'node:crypto'

import { type AppConfig, isSupabaseConfigured, loadConfig } from '../../config/index.js'
import { getSupabaseAdmin } from '../../database/index.js'
import {
  formatInvoiceNumber,
  type InvoiceRecord,
  type InvoiceStatus,
  type UpdateInvoiceInput,
} from './invoices.types.js'

export type InvoicesRepository = {
  /** Insert a numbered invoice row for a payment (number comes from the DB sequence). */
  create: (paymentId: string) => Promise<InvoiceRecord>
  findById: (id: string) => Promise<InvoiceRecord | null>
  findByPaymentId: (paymentId: string) => Promise<InvoiceRecord | null>
  listByPaymentIds: (paymentIds: string[]) => Promise<InvoiceRecord[]>
  update: (id: string, input: UpdateInvoiceInput) => Promise<InvoiceRecord | null>
  deleteByPaymentId: (paymentId: string) => Promise<boolean>
}

type InvoiceRow = {
  id: string
  payment_id: string
  invoice_seq: number | string
  invoice_number: string | null
  invoice_date: string | null
  invoice_status: InvoiceStatus | null
  pdf_path: string | null
  sent_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

const INVOICE_COLUMNS =
  'id, payment_id, invoice_seq, invoice_number, invoice_date, invoice_status, pdf_path, sent_at, last_error, created_at, updated_at'

function fromRow(row: InvoiceRow): InvoiceRecord {
  const seq = Number(row.invoice_seq)
  return {
    id: row.id,
    paymentId: row.payment_id,
    invoiceSeq: seq,
    invoiceNumber: row.invoice_number ?? formatInvoiceNumber(seq),
    invoiceDate: row.invoice_date,
    invoiceStatus: row.invoice_status,
    pdfPath: row.pdf_path,
    sentAt: row.sent_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const memoryInvoices: InvoiceRecord[] = []
let memorySeq = 0

export function resetInvoicesRepositoryForTests(): void {
  memoryInvoices.length = 0
  memorySeq = 0
}

function createMemoryInvoicesRepository(): InvoicesRepository {
  return {
    async create(paymentId) {
      memorySeq += 1
      const stamp = new Date().toISOString()
      const invoice: InvoiceRecord = {
        id: randomUUID(),
        paymentId,
        invoiceSeq: memorySeq,
        invoiceNumber: formatInvoiceNumber(memorySeq),
        invoiceDate: stamp,
        invoiceStatus: null,
        pdfPath: null,
        sentAt: null,
        lastError: null,
        createdAt: stamp,
        updatedAt: stamp,
      }
      memoryInvoices.push(invoice)
      return invoice
    },
    async findById(id) {
      return memoryInvoices.find((row) => row.id === id) ?? null
    },
    async findByPaymentId(paymentId) {
      return memoryInvoices.find((row) => row.paymentId === paymentId) ?? null
    },
    async listByPaymentIds(paymentIds) {
      const wanted = new Set(paymentIds)
      return memoryInvoices.filter((row) => wanted.has(row.paymentId))
    },
    async update(id, input) {
      const index = memoryInvoices.findIndex((row) => row.id === id)
      if (index === -1) return null
      const current = memoryInvoices[index]!
      const updated: InvoiceRecord = {
        ...current,
        invoiceDate: input.invoiceDate ?? current.invoiceDate,
        invoiceStatus: input.invoiceStatus ?? current.invoiceStatus,
        pdfPath: input.pdfPath !== undefined ? input.pdfPath : current.pdfPath,
        sentAt: input.sentAt !== undefined ? input.sentAt : current.sentAt,
        lastError: input.lastError !== undefined ? input.lastError : current.lastError,
        updatedAt: new Date().toISOString(),
      }
      memoryInvoices[index] = updated
      return updated
    },
    async deleteByPaymentId(paymentId) {
      const index = memoryInvoices.findIndex((row) => row.paymentId === paymentId)
      if (index === -1) return false
      memoryInvoices.splice(index, 1)
      return true
    },
  }
}

function createSupabaseInvoicesRepository(config: AppConfig): InvoicesRepository {
  const supabase = getSupabaseAdmin(config)
  if (!supabase) {
    throw new Error('Supabase admin client is not available')
  }
  const client = supabase

  return {
    async create(paymentId) {
      const { data, error } = await client
        .from('invoices')
        .insert({ payment_id: paymentId, invoice_date: new Date().toISOString() })
        .select(INVOICE_COLUMNS)
        .single()
      if (error) throw error
      const inserted = data as InvoiceRow
      const invoiceNumber = formatInvoiceNumber(Number(inserted.invoice_seq))
      const { data: numbered, error: numberError } = await client
        .from('invoices')
        .update({ invoice_number: invoiceNumber })
        .eq('id', inserted.id)
        .select(INVOICE_COLUMNS)
        .single()
      if (numberError) throw numberError
      return fromRow(numbered as InvoiceRow)
    },
    async findById(id) {
      const { data, error } = await client
        .from('invoices')
        .select(INVOICE_COLUMNS)
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data ? fromRow(data as InvoiceRow) : null
    },
    async findByPaymentId(paymentId) {
      const { data, error } = await client
        .from('invoices')
        .select(INVOICE_COLUMNS)
        .eq('payment_id', paymentId)
        .maybeSingle()
      if (error) throw error
      return data ? fromRow(data as InvoiceRow) : null
    },
    async listByPaymentIds(paymentIds) {
      if (paymentIds.length === 0) return []
      const { data, error } = await client
        .from('invoices')
        .select(INVOICE_COLUMNS)
        .in('payment_id', paymentIds)
      if (error) throw error
      return (data as InvoiceRow[]).map(fromRow)
    },
    async update(id, input) {
      const patch: Record<string, unknown> = {}
      if (input.invoiceDate !== undefined) patch.invoice_date = input.invoiceDate
      if (input.invoiceStatus !== undefined) patch.invoice_status = input.invoiceStatus
      if (input.pdfPath !== undefined) patch.pdf_path = input.pdfPath
      if (input.sentAt !== undefined) patch.sent_at = input.sentAt
      if (input.lastError !== undefined) patch.last_error = input.lastError
      const { data, error } = await client
        .from('invoices')
        .update(patch)
        .eq('id', id)
        .select(INVOICE_COLUMNS)
        .maybeSingle()
      if (error) throw error
      return data ? fromRow(data as InvoiceRow) : null
    },
    async deleteByPaymentId(paymentId) {
      const { error, count } = await client
        .from('invoices')
        .delete({ count: 'exact' })
        .eq('payment_id', paymentId)
      if (error) throw error
      return (count ?? 0) > 0
    },
  }
}

export function createInvoicesRepository(config: AppConfig = loadConfig()): InvoicesRepository {
  if (isSupabaseConfigured(config)) {
    return createSupabaseInvoicesRepository(config)
  }
  return createMemoryInvoicesRepository()
}
