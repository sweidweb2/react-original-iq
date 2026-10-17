import { describe, expect, it, vi } from 'vitest'

import type { AuthActor } from '../../src/authz/index.js'
import { CSV_BOM, rowsToCsv } from '../../src/modules/_shared/csv.js'
import { exportFilename } from '../../src/modules/_shared/export-file.js'
import type { ContactRepository } from '../../src/modules/contact/contact.repository.js'
import { createContactService } from '../../src/modules/contact/contact.service.js'
import type { ExportsRepository } from '../../src/modules/exports/exports.repository.js'
import { createExportsService } from '../../src/modules/exports/exports.service.js'
import type { FeedbackRepository } from '../../src/modules/feedback/feedback.repository.js'
import type { PaymentsRepository } from '../../src/modules/payments/payments.repository.js'
import type { TasksRepository } from '../../src/modules/tasks/tasks.repository.js'
import type { UsersRepository } from '../../src/modules/users/users.repository.js'
import { renderTablePdf } from '../../src/pdf/index.js'

const recordActivitySafe = vi.fn()
vi.mock('../../src/modules/logging/index.js', () => ({
  getLoggingService: () => ({ recordActivitySafe, recordErrorSafe: vi.fn() }),
}))

const superActor: AuthActor = { id: 'super-1', roles: ['super'] }
const admin: AuthActor = { id: 'admin-1', roles: ['admin'] }
const tutor: AuthActor = { id: 'tutor-1', roles: ['tutor'] }

function pageCount(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length
}

function stripBom(csv: string): string[] {
  return csv.replace(CSV_BOM, '').trim().split('\n')
}

describe('export helpers', () => {
  it('prefixes CSV with a UTF-8 BOM', () => {
    const csv = rowsToCsv(['name'], [['محمد']])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(stripBom(csv)).toEqual(['name', 'محمد'])
  })

  it('builds timestamped export filenames', () => {
    const at = new Date(2026, 9, 17, 14, 5, 9)
    expect(exportFilename('leads', 'pdf', at)).toBe('leads_2026-10-17_14-05-09.pdf')
    expect(exportFilename('payment-logs', 'csv', at)).toBe('payment-logs_2026-10-17_14-05-09.csv')
  })

  it('renders a multi-page landscape table PDF with Arabic text', async () => {
    const rows = Array.from({ length: 60 }, (_, i) => ({
      name: i % 2 ? 'محمد أحمد' : 'Ada Lovelace',
      email: `user${i}@example.com`,
    }))
    const pdf = await renderTablePdf({
      title: 'Leads',
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email', width: 2 },
      ],
      rows,
    })
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pageCount(pdf)).toBeGreaterThan(1)
    expect(pdf.toString('latin1')).toContain('NotoSansArabic')
  })
})

describe('exports service', () => {
  function makeService() {
    const usersRepository = {
      findMany: vi.fn(async () => [
        { id: 'client-1', email: 'c@x.test', profile: { displayName: 'Client One' } },
        { id: 'admin-1', email: 'a@x.test', profile: { displayName: 'Admin One' } },
      ]),
    } as unknown as UsersRepository
    const tasksRepository = {
      findPage: vi.fn(async () => ({
        items: [
          {
            id: 'task-1',
            topic: 'Essay help',
            clientId: 'client-1',
            tutorId: null,
            coordinatorId: null,
          },
        ],
        total: 1,
      })),
    } as unknown as TasksRepository
    const paymentsRepository = {
      exportAllPayments: vi.fn(async () => [
        {
          id: 'pay-1',
          taskId: 'task-1',
          userId: 'client-1',
          amount: 100,
          currency: 'USD',
          status: 'paid',
          gateway: 'simulated',
          paymentMethod: 'card',
          montypayTransactionId: 'SIM_1',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
      exportAllRefunds: vi.fn(async () => []),
    } as unknown as PaymentsRepository
    const exportsRepository = {
      listPaymentLogs: vi.fn(async () => [
        {
          id: 'log-1',
          payment_id: 'pay-1',
          event: 'checkout.simulated',
          payload: { amount: 100 },
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ]),
      listLoginVerifications: vi.fn(async () => [
        {
          id: 'lv-1',
          user_id: 'client-1',
          type: 'password_reset',
          expires_at: '2026-01-01T00:10:00.000Z',
          used: false,
          used_at: null,
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ]),
    } as unknown as ExportsRepository

    return createExportsService({
      usersRepository,
      tasksRepository,
      paymentsRepository,
      feedbackRepository: {} as FeedbackRepository,
      contactRepository: {} as ContactRepository,
      exportsRepository,
    })
  }

  it('adds client and task labels to payments', async () => {
    const file = await makeService().exportCsv('payments', superActor)
    const [header, row] = stripBom(String(file.body))

    expect(file.filename).toMatch(/^payments_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.csv$/)
    expect(header).toContain('client_name')
    expect(header).toContain('task_label')
    expect(row).toContain('Client One')
    expect(row).toContain('Essay help')
    expect(recordActivitySafe).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'exports.download',
        meta: expect.objectContaining({ resource: 'payments', format: 'csv', rows: 1 }),
      }),
    )
  })

  it('exports payment logs with labels and login verifications without codes', async () => {
    const service = makeService()
    const logs = stripBom(String((await service.exportCsv('payment-logs', superActor)).body))
    expect(logs[1]).toContain('checkout.simulated')
    expect(logs[1]).toContain('Essay help')

    const verifications = stripBom(
      String((await service.exportCsv('login-verifications', superActor)).body),
    )
    expect(verifications[0]).not.toContain('code')
    expect(verifications[1]).toContain('Client One')
  })

  it('rejects everyone but super, including admins', async () => {
    await expect(makeService().exportCsv('users', admin)).rejects.toMatchObject({ status: 403 })
    await expect(makeService().exportCsv('users', tutor)).rejects.toMatchObject({ status: 403 })
  })
})

describe('contact PDF exports', () => {
  it('uses the search and returns a timestamped PDF', async () => {
    const repository = {
      exportLeads: vi.fn(async () => [
        {
          id: 'lead-1',
          firstName: 'سارة',
          lastName: null,
          phone: '+961 70000000',
          email: 'sara@x.test',
          country: 'Lebanon',
          zip: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    } as unknown as ContactRepository

    const file = await createContactService(repository).exportLeads('pdf', {
      search: 'sara',
      actorId: 'super-1',
    })

    expect(repository.exportLeads).toHaveBeenCalledWith('sara')
    expect(file.contentType).toBe('application/pdf')
    expect(file.filename).toMatch(/^leads_.*\.pdf$/)
    expect(Buffer.isBuffer(file.body) && file.body.subarray(0, 5).toString()).toBe('%PDF-')
  })
})
