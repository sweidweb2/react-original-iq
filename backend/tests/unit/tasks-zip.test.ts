import { PassThrough } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'

import type { AuthActor } from '../../src/authz/index.js'
import type { TasksRepository } from '../../src/modules/tasks/tasks.repository.js'
import { createTasksService } from '../../src/modules/tasks/tasks.service.js'
import type {
  TaskDetail,
  TaskFile,
  TaskSolution,
  TaskZip,
} from '../../src/modules/tasks/tasks.types.js'
import type { UsersRepository } from '../../src/modules/users/users.repository.js'
import type { UsersService } from '../../src/modules/users/users.service.js'
import type { StorageService } from '../../src/storage/index.js'

const recordActivitySafe = vi.fn()
vi.mock('../../src/modules/logging/index.js', () => ({
  getLoggingService: () => ({ recordActivitySafe, recordErrorSafe: vi.fn() }),
}))

const TASK_ID = '11111111-1111-1111-1111-111111111111'
const admin: AuthActor = { id: 'admin-1', roles: ['admin'] }
const client: AuthActor = { id: 'client-1', roles: ['client'] }
const otherClient: AuthActor = { id: 'client-2', roles: ['client'] }
const tutor: AuthActor = { id: 'tutor-1', roles: ['tutor'] }

function file(id: string, name: string, overrides: Partial<TaskFile> = {}): TaskFile {
  return {
    id,
    taskId: TASK_ID,
    fileLocation: `student_files/${TASK_ID}/${id}_${name}`,
    originalName: name,
    contentType: 'application/pdf',
    sizeBytes: 10,
    note: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function solution(id: string, name: string): TaskSolution {
  const { note: _note, ...rest } = file(id, name, {
    fileLocation: `solutions/${TASK_ID}/${id}_${name}`,
  })
  return rest
}

function makeDetail(overrides: Partial<TaskDetail> = {}): TaskDetail {
  return {
    id: TASK_ID,
    clientId: 'client-1',
    tutorId: 'tutor-1',
    coordinatorId: 'coord-1',
    topic: 'Essay help',
    type: 'assignment',
    description: null,
    isAssigned: true,
    status: 'in-progress',
    deadline: null,
    price: 100,
    paymentStatus: 'unpaid',
    category: null,
    feedback: null,
    allowView: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    files: [
      file('a1a1a1a1-0000-4000-8000-000000000001', 'report.pdf'),
      file('a1a1a1a1-0000-4000-8000-000000000002', 'Report.pdf'),
      file('a1a1a1a1-0000-4000-8000-000000000003', 'notes.txt', { contentType: 'text/plain' }),
    ],
    solutions: [solution('b2b2b2b2-0000-4000-8000-000000000001', 'answer.pdf')],
    ...overrides,
  }
}

function setup(detail: TaskDetail, options: { maxZipBytes?: number } = {}) {
  const repository = {
    findDetailById: vi.fn(async () => detail),
  } as unknown as TasksRepository
  const storage = {
    isConfigured: () => true,
    downloadObject: vi.fn(async (key: string) => {
      if (key.includes('missing')) throw new Error('not found')
      return Buffer.from(`content of ${key}`)
    }),
  } as unknown as StorageService
  const service = createTasksService(repository, {} as UsersService, {} as UsersRepository, {
    storage,
    maxZipBytes: options.maxZipBytes,
  })
  return { service, storage }
}

async function collect(zip: TaskZip): Promise<string> {
  const sink = new PassThrough()
  const chunks: Buffer[] = []
  sink.on('data', (chunk: Buffer) => chunks.push(chunk))
  await zip.write(sink)
  return Buffer.concat(chunks).toString('latin1')
}

describe('tasks.service buildZip', () => {
  it('zips all documents with de-duplicated names and audits the download', async () => {
    const { service } = setup(makeDetail())
    const zip = await service.buildZip(TASK_ID, 'documents', undefined, client)

    expect(zip.entryCount).toBe(3)
    expect(zip.filename).toMatch(
      /^task-11111111_documents_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.zip$/,
    )
    const bytes = await collect(zip)
    expect(bytes.startsWith('PK')).toBe(true)
    expect(bytes).toContain('report.pdf')
    expect(bytes).toContain('Report (2).pdf')
    expect(bytes).toContain('notes.txt')
    expect(recordActivitySafe).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'tasks.files.zip',
        meta: expect.objectContaining({ kind: 'documents', count: 3, selected: false }),
      }),
    )
  })

  it('includes only the selected ids', async () => {
    const { service } = setup(makeDetail())
    const zip = await service.buildZip(
      TASK_ID,
      'documents',
      ['a1a1a1a1-0000-4000-8000-000000000003'],
      admin,
    )
    const bytes = await collect(zip)

    expect(zip.entryCount).toBe(1)
    expect(bytes).toContain('notes.txt')
    expect(bytes).not.toContain('report.pdf')
  })

  it('rejects unknown selections, empty lists, and oversize zips', async () => {
    const { service } = setup(makeDetail())
    await expect(
      service.buildZip(TASK_ID, 'documents', ['c3c3c3c3-0000-4000-8000-000000000009'], admin),
    ).rejects.toMatchObject({ status: 404, code: 'FILE_NOT_FOUND' })

    const empty = setup(makeDetail({ files: [] }))
    await expect(
      empty.service.buildZip(TASK_ID, 'documents', undefined, admin),
    ).rejects.toMatchObject({ status: 404, code: 'NO_FILES' })

    const tiny = setup(makeDetail(), { maxZipBytes: 15 })
    await expect(
      tiny.service.buildZip(TASK_ID, 'documents', undefined, admin),
    ).rejects.toMatchObject({ status: 413, code: 'ZIP_TOO_LARGE' })
  })

  it('enforces task access and solution visibility', async () => {
    const { service } = setup(makeDetail())
    await expect(
      service.buildZip(TASK_ID, 'documents', undefined, otherClient),
    ).rejects.toMatchObject({ status: 403 })
    await expect(service.buildZip(TASK_ID, 'solutions', undefined, client)).rejects.toMatchObject({
      status: 403,
    })

    const tutorZip = await service.buildZip(TASK_ID, 'solutions', undefined, tutor)
    expect(await collect(tutorZip)).toContain('answer.pdf')

    const visible = setup(makeDetail({ allowView: true }))
    const clientZip = await visible.service.buildZip(TASK_ID, 'solutions', undefined, client)
    expect(clientZip.entryCount).toBe(1)
  })

  it('lists unreadable or legacy files in MISSING_FILES.txt', async () => {
    const detail = makeDetail({
      files: [
        file('a1a1a1a1-0000-4000-8000-000000000001', 'ok.pdf'),
        file('a1a1a1a1-0000-4000-8000-000000000002', 'gone.pdf', {
          fileLocation: `student_files/${TASK_ID}/missing_gone.pdf`,
        }),
        file('a1a1a1a1-0000-4000-8000-000000000003', 'legacy.pdf', {
          fileLocation: 'https://old.example.com/legacy.pdf',
        }),
      ],
    })
    const { service, storage } = setup(detail)
    const bytes = await collect(await service.buildZip(TASK_ID, 'documents', undefined, admin))

    expect(bytes).toContain('ok.pdf')
    expect(bytes).toContain('MISSING_FILES.txt')
    expect(storage.downloadObject).toHaveBeenCalledTimes(2)
  })
})
