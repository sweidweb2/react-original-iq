import type { AuthActor } from '../../authz/index.js'
import { isAdmin, isClient, isOps, isSuper } from '../../authz/index.js'
import { conflict, forbidden, notFound, serviceUnavailable } from '../../errors/app-error.js'
import { reportError } from '../../errors/report-error.js'
import type { Mailer } from '../../mail/index.js'
import { renderInvoicePdf } from '../../pdf/index.js'
import type { StorageService } from '../../storage/index.js'
import { formatAmount } from '../_shared/money.js'
import { getLoggingService } from '../logging/index.js'
import type { PaymentsRepository } from '../payments/payments.repository.js'
import type { PaymentRecord } from '../payments/payments.types.js'
import type { TasksRepository } from '../tasks/tasks.repository.js'
import type { Task } from '../tasks/tasks.types.js'
import type { UsersRepository } from '../users/users.repository.js'
import type { InvoicesRepository } from './invoices.repository.js'
import {
  type InvoiceRecord,
  type InvoiceSummary,
  type PaymentInvoices,
  toInvoiceSummary,
} from './invoices.types.js'

export type InvoiceDownload = {
  url: string
  expiresInSec: number
  invoiceNumber: string
}

export type InvoicesService = {
  /** Create (or finish) the invoice for a paid payment: PDF to storage, email client. Never throws. */
  issueForPayment: (paymentId: string) => Promise<InvoiceSummary | null>
  resend: (invoiceId: string, actor: AuthActor) => Promise<InvoiceSummary>
  getDownloadUrl: (invoiceId: string, actor: AuthActor) => Promise<InvoiceDownload>
  /** Void the payment's current invoice (row and PDF are kept); a new one is issued if still paid. */
  voidForPayment: (paymentId: string, reason: string) => Promise<void>
  /** True if the payment ever had an invoice, voided or not. */
  hasInvoices: (paymentId: string) => Promise<boolean>
  forPayments: (paymentIds: string[]) => Promise<Map<string, PaymentInvoices>>
}

export type InvoicesServiceDeps = {
  repository: InvoicesRepository
  paymentsRepository: PaymentsRepository
  tasksRepository: TasksRepository
  usersRepository: UsersRepository
  storage: StorageService
  mailer: Mailer
  companyName: string
}

type Context = { payment: PaymentRecord; task: Task; client: { name: string; email: string } }

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function createInvoicesService(deps: InvoicesServiceDeps): InvoicesService {
  const { repository, paymentsRepository, tasksRepository, usersRepository, storage, mailer } = deps

  async function logPaymentEvent(
    paymentId: string,
    event: string,
    payload: Record<string, unknown>,
  ) {
    try {
      await paymentsRepository.addPaymentLog(paymentId, event, payload)
    } catch (error) {
      reportError(error, { source: 'invoices.payment_log', meta: { paymentId, event } })
    }
  }

  async function loadContext(paymentId: string): Promise<Context> {
    const payment = await paymentsRepository.findPaymentById(paymentId)
    if (!payment) throw notFound('Payment not found', 'PAYMENT_NOT_FOUND')
    const task = await tasksRepository.findById(payment.taskId)
    if (!task) throw notFound('Task not found', 'TASK_NOT_FOUND')
    const account = await usersRepository.findById(payment.userId)
    const email = account?.email ?? ''
    const name = account?.profile?.displayName?.trim() || email || 'Client'
    return { payment, task, client: { name, email } }
  }

  /**
   * Render PDF, store it if missing, and email the client.
   * `sent` only when the PDF is stored AND the email was delivered (doc 06).
   */
  async function deliver(invoice: InvoiceRecord, ctx: Context): Promise<InvoiceRecord> {
    const problems: string[] = []
    let pdfPath = invoice.pdfPath
    let pdf: Buffer | null = null
    const invoiceMeta = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      paymentId: ctx.payment.id,
    }

    try {
      pdf = await renderInvoicePdf({
        companyName: deps.companyName,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: new Date(invoice.invoiceDate ?? invoice.createdAt),
        billedTo: ctx.client,
        task: { id: ctx.task.id, topic: ctx.task.topic },
        payment: {
          id: ctx.payment.id,
          amount: invoice.amount,
          currency: invoice.currency,
          method: ctx.payment.paymentMethod,
          gateway: ctx.payment.gateway,
          status: ctx.payment.status,
          paidAt: new Date(ctx.payment.updatedAt),
        },
      })
    } catch (error) {
      problems.push(`PDF render failed: ${errorMessage(error)}`)
      reportError(error, { source: 'invoices.pdf_render', level: 'warning', meta: invoiceMeta })
    }

    if (pdf && !pdfPath) {
      if (!storage.isConfigured()) {
        problems.push('Storage is not configured; PDF not stored')
      } else {
        try {
          const stored = await storage.putObject({
            category: 'invoices',
            taskId: ctx.task.id,
            originalFilename: `${invoice.invoiceNumber}.pdf`,
            contentType: 'application/pdf',
            body: pdf,
          })
          pdfPath = stored.key
        } catch (error) {
          problems.push(`PDF upload failed: ${errorMessage(error)}`)
          reportError(error, { source: 'invoices.pdf_upload', level: 'warning', meta: invoiceMeta })
        }
      }
    }

    let delivered = false
    if (!ctx.client.email) {
      problems.push('Client has no email address')
    } else {
      try {
        const amountLabel = `${formatAmount(invoice.amount, invoice.currency)} ${invoice.currency}`
        const topic = ctx.task.topic ?? 'your task'
        const result = await mailer.send({
          to: ctx.client.email,
          subject: `${deps.companyName} invoice ${invoice.invoiceNumber}`,
          text: [
            `Hello ${ctx.client.name},`,
            '',
            `Thank you for your payment of ${amountLabel} for "${topic}".`,
            `Your invoice ${invoice.invoiceNumber} is attached.`,
            '',
            `— ${deps.companyName}`,
          ].join('\n'),
          html: `<p>Hello ${escapeHtml(ctx.client.name)},</p>
<p>Thank you for your payment of <strong>${escapeHtml(amountLabel)}</strong> for "${escapeHtml(topic)}".</p>
<p>Your invoice <strong>${escapeHtml(invoice.invoiceNumber)}</strong> is attached.</p>
<p>— ${escapeHtml(deps.companyName)}</p>`,
          attachments: pdf
            ? [
                {
                  filename: `${invoice.invoiceNumber}.pdf`,
                  content: pdf,
                  contentType: 'application/pdf',
                },
              ]
            : undefined,
        })
        delivered = result.delivered
        if (!result.delivered) {
          problems.push(
            result.skipped === 'disabled'
              ? 'Email sending is turned off in settings; email not sent'
              : 'Mail is not configured; email not sent',
          )
        }
      } catch (error) {
        problems.push(`Email failed: ${errorMessage(error)}`)
        reportError(error, { source: 'invoices.email', level: 'warning', meta: invoiceMeta })
      }
    }

    const ok = Boolean(pdfPath) && delivered && problems.length === 0
    const updated = await repository.update(invoice.id, {
      pdfPath,
      invoiceStatus: ok ? 'sent' : 'failed',
      sentAt: delivered ? new Date().toISOString() : invoice.sentAt,
      lastError: ok ? null : problems.join('; '),
    })

    await logPaymentEvent(ctx.payment.id, ok ? 'invoice.sent' : 'invoice.failed', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      errors: problems,
    })
    getLoggingService().recordActivitySafe({
      action: ok ? 'invoices.issue' : 'invoices.email_failed',
      entity: 'invoice',
      entityId: invoice.id,
      meta: { paymentId: ctx.payment.id, invoiceNumber: invoice.invoiceNumber, errors: problems },
    })

    return updated ?? invoice
  }

  async function assertCanDownload(actor: AuthActor, task: Task) {
    if (isSuper(actor.roles) || isAdmin(actor.roles)) return
    if (isClient(actor.roles) && task.clientId === actor.id) return
    if (isOps(actor.roles) && task.coordinatorId === actor.id) return
    throw forbidden('You cannot access this invoice')
  }

  async function loadInvoice(id: string): Promise<InvoiceRecord> {
    const invoice = await repository.findById(id)
    if (!invoice) throw notFound('Invoice not found', 'INVOICE_NOT_FOUND')
    return invoice
  }

  return {
    async issueForPayment(paymentId) {
      try {
        const ctx = await loadContext(paymentId)
        if (ctx.payment.status !== 'paid') return null
        let invoice = await repository.findActiveByPaymentId(paymentId)
        if (invoice?.invoiceStatus === 'sent') return toInvoiceSummary(invoice)
        if (!invoice) {
          invoice = await repository.create({
            paymentId,
            amount: ctx.payment.amount,
            currency: ctx.payment.currency,
          })
          await logPaymentEvent(paymentId, 'invoice.created', {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
          })
        }
        return toInvoiceSummary(await deliver(invoice, ctx))
      } catch (error) {
        reportError(error, { source: 'invoices.issue', meta: { paymentId } })
        return null
      }
    },

    async resend(invoiceId, actor) {
      if (!isAdmin(actor.roles) && !isSuper(actor.roles)) {
        throw forbidden('Only admins can resend invoices')
      }
      const invoice = await loadInvoice(invoiceId)
      const ctx = await loadContext(invoice.paymentId)
      const updated = await deliver(invoice, ctx)
      getLoggingService().recordActivitySafe({
        userId: actor.id,
        action: 'invoices.resend',
        entity: 'invoice',
        entityId: invoice.id,
        meta: { status: updated.invoiceStatus },
      })
      return toInvoiceSummary(updated)
    },

    async getDownloadUrl(invoiceId, actor) {
      const invoice = await loadInvoice(invoiceId)
      const ctx = await loadContext(invoice.paymentId)
      await assertCanDownload(actor, ctx.task)
      if (!invoice.pdfPath) {
        throw notFound('Invoice PDF is not available yet', 'INVOICE_PDF_MISSING')
      }
      if (!storage.isConfigured()) {
        throw serviceUnavailable('STORAGE_NOT_CONFIGURED', 'File storage is not configured')
      }
      const signed = await storage.getSignedDownloadUrl(invoice.pdfPath)
      return {
        url: signed.url,
        expiresInSec: signed.expiresInSec,
        invoiceNumber: invoice.invoiceNumber,
      }
    },

    async purgeForPayment(paymentId) {
      const invoice = await repository.findByPaymentId(paymentId)
      if (!invoice) return
      if (invoice.pdfPath && storage.isConfigured()) {
        try {
          await storage.deleteObject(invoice.pdfPath)
        } catch (error) {
          reportError(error, {
            source: 'invoices.pdf_delete',
            level: 'warning',
            meta: { invoiceId: invoice.id, paymentId, key: invoice.pdfPath },
          })
        }
      }
      await repository.deleteByPaymentId(paymentId)
    },

    async summariesForPayments(paymentIds) {
      const rows = await repository.listByPaymentIds(paymentIds)
      return new Map(rows.map((row) => [row.paymentId, toInvoiceSummary(row)]))
    },
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
