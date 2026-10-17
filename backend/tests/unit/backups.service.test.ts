import { PassThrough } from 'node:stream'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthActor } from '../../src/authz/index.js'
import type {
  BackupHistoryRecord,
  BackupsRepository,
} from '../../src/modules/backups/backups.repository.js'
import {
  type BackupOutput,
  createBackupsService,
} from '../../src/modules/backups/backups.service.js'
import { BACKUP_TABLES } from '../../src/modules/backups/backups.tables.js'
import type { StorageService } from '../../src/storage/index.js'

const recordActivitySafe = vi.fn()
vi.mock('../../src/modules/logging/index.js', () => ({
  getLoggingService: () => ({ recordActivitySafe, recordErrorSafe: vi.fn() }),
}))

const superActor: AuthActor = { id: 'super-1', roles: ['super'] }
const adminActor: AuthActor = { id: 'admin-1', roles: ['admin'] }

function historyRecord(overrides: Partial<BackupHistoryRecord> = {}): BackupHistoryRecord {
  return {
    id: 'backup-1',
    type: 'table',
    target: 'users',
    format: 'csv',
    status: 'running',
    filename: 'backup_users.csv',
    sizeBytes: null,
    rowCount: null,
    fileCount: null,
    durationMs: null,
    error: null,
    rerunOf: null,
    requestedBy: 'super-1',
    requester: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function captureOutput() {
  const chunks: Buffer[] = []
  const opened: { filename: string; contentType: string }[] = []
  const output: BackupOutput = {
    open(file) {
      opened.push(file)
      const sink = new PassThrough()
      sink.on('data', (chunk: Buffer) => chunks.push(chunk))
      return sink
    },
  }
  return { output, opened, body: () => Buffer.concat(chunks) }
}

describe('backups service', () => {
  let repository: BackupsRepository
  let storage: StorageService

  beforeEach(() => {
    recordActivitySafe.mockClear()
    repository = {
      readTable: vi.fn(async (table: string) =>
        table === 'users' ? [{ id: 'u1', email: 'a@b.c', password_hash: 'hash' }] : [],
      ),
      createHistory: vi.fn(async (input) => historyRecord({ ...input, id: 'backup-new' })),
      completeHistory: vi.fn(async () => undefined),
      failHistory: vi.fn(async () => undefined),
      listHistory: vi.fn(async () => ({ items: [historyRecord()], total: 1 })),
      getHistory: vi.fn(async () => null),
    }
    storage = {
      isConfigured: () => true,
      listFolders: vi.fn(async () => ['solutions', 'student_files']),
      listObjects: vi.fn(async () => [
        { key: 'solutions/t1/a.png', sizeBytes: 3 },
        { key: 'solutions/t1/b.png', sizeBytes: 3 },
      ]),
      downloadObject: vi.fn(async () => Buffer.from('img')),
    } as unknown as StorageService
  })

  it('rejects non-super actors before recording anything', async () => {
    const service = createBackupsService({ repository, storage })
    const { output } = captureOutput()

    await expect(
      service.run({ type: 'table', table: 'users', format: 'csv' }, adminActor, output),
    ).rejects.toMatchObject({ status: 403 })
    await expect(service.getMeta(adminActor)).rejects.toMatchObject({ status: 403 })
    await expect(service.listHistory({ page: 1, limit: 20 }, adminActor)).rejects.toMatchObject({
      status: 403,
    })
    expect(repository.createHistory).not.toHaveBeenCalled()
  })

  it('streams a single table and completes its history row with size and rows', async () => {
    const service = createBackupsService({ repository, storage })
    const { output, opened, body } = captureOutput()

    await service.run({ type: 'table', table: 'users', format: 'csv' }, superActor, output)

    expect(opened[0]?.filename).toMatch(/^backup_users_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.csv$/)
    expect(opened[0]?.contentType).toContain('text/csv')
    expect(body().toString()).toBe('\uFEFFid,email,password_hash\nu1,a@b.c,hash\n')
    expect(opened[0]?.sizeBytes).toBe(body().length)
    expect(opened[0]?.estimatedBytes).toBeUndefined()
    expect(repository.createHistory).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'table', target: 'users', format: 'csv', rerunOf: null }),
    )
    expect(repository.completeHistory).toHaveBeenCalledWith('backup-new', {
      sizeBytes: body().length,
      rowCount: 1,
      fileCount: null,
      durationMs: expect.any(Number),
    })
    expect(recordActivitySafe).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'backups.export', entityId: 'backup-new' }),
    )
  })

  it('zips every whitelisted table for an all-tables JSON export', async () => {
    const service = createBackupsService({ repository, storage })
    const { output, opened, body } = captureOutput()

    await service.run({ type: 'all_tables', format: 'json' }, superActor, output)

    expect(opened[0]?.filename).toMatch(/^backup_all_tables_.+\.zip$/)
    expect(opened[0]?.contentType).toBe('application/zip')
    expect(body().subarray(0, 2).toString()).toBe('PK')
    expect(repository.readTable).toHaveBeenCalledTimes(BACKUP_TABLES.length)
    expect(repository.completeHistory).toHaveBeenCalledWith(
      'backup-new',
      expect.objectContaining({ rowCount: 1, fileCount: null }),
    )
  })

  it('writes one SQL script in table order for an all-tables SQL export', async () => {
    const service = createBackupsService({ repository, storage })
    const { output, body } = captureOutput()

    await service.run({ type: 'all_tables', format: 'sql' }, superActor, output)

    const sql = body().toString()
    expect(sql.startsWith('-- Original IQ backup')).toBe(true)
    expect(sql.indexOf('-- users:')).toBeLessThan(sql.indexOf('-- tasks:'))
    expect(sql.trimEnd().endsWith('COMMIT;')).toBe(true)
  })

  it('zips a storage folder with one entry per object', async () => {
    const service = createBackupsService({ repository, storage })
    const { output, opened, body } = captureOutput()

    await service.run({ type: 'storage_folder', folder: 'solutions' }, superActor, output)

    expect(storage.listObjects).toHaveBeenCalledWith('solutions')
    expect(storage.downloadObject).toHaveBeenCalledTimes(2)
    expect(opened[0]?.filename).toMatch(/^backup_storage_solutions_.+\.zip$/)
    expect(body().subarray(0, 2).toString()).toBe('PK')
    expect(opened[0]?.sizeBytes).toBeUndefined()
    expect(opened[0]?.estimatedBytes).toBeGreaterThanOrEqual(6)
    expect(repository.completeHistory).toHaveBeenCalledWith(
      'backup-new',
      expect.objectContaining({ fileCount: 2, rowCount: null }),
    )
  })

  it('rejects an unknown storage folder without a history row', async () => {
    const service = createBackupsService({ repository, storage })
    const { output } = captureOutput()

    await expect(
      service.run({ type: 'storage_folder', folder: 'secrets' }, superActor, output),
    ).rejects.toMatchObject({ status: 404 })
    expect(repository.createHistory).not.toHaveBeenCalled()
  })

  it('marks the history row failed when reading data fails', async () => {
    vi.mocked(repository.readTable).mockRejectedValueOnce({ message: 'db down' })
    const service = createBackupsService({ repository, storage })
    const { output, opened } = captureOutput()

    await expect(
      service.run({ type: 'users', format: 'json' }, superActor, output),
    ).rejects.toMatchObject({ message: 'db down' })
    expect(opened).toHaveLength(0)
    expect(repository.failHistory).toHaveBeenCalledWith('backup-new', 'db down', expect.any(Number))
    expect(repository.completeHistory).not.toHaveBeenCalled()
  })

  it('re-exports with the saved settings and links the new row to the original', async () => {
    vi.mocked(repository.getHistory).mockResolvedValueOnce(
      historyRecord({
        id: 'orig',
        type: 'table',
        target: 'tasks',
        format: 'xlsx',
        status: 'completed',
      }),
    )
    const service = createBackupsService({ repository, storage })
    const { output, opened } = captureOutput()

    await service.rerun('orig', superActor, output)

    expect(repository.readTable).toHaveBeenCalledWith('tasks')
    expect(opened[0]?.filename).toMatch(/^backup_tasks_.+\.xlsx$/)
    expect(repository.createHistory).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'table', target: 'tasks', format: 'xlsx', rerunOf: 'orig' }),
    )
  })

  it('returns 404 when re-exporting a missing backup', async () => {
    const service = createBackupsService({ repository, storage })
    const { output } = captureOutput()

    await expect(service.rerun('missing', superActor, output)).rejects.toMatchObject({
      status: 404,
    })
  })

  it('lists tables, formats and storage folders in meta', async () => {
    const service = createBackupsService({ repository, storage })

    await expect(service.getMeta(superActor)).resolves.toEqual({
      tables: [...BACKUP_TABLES],
      formats: ['csv', 'json', 'xlsx', 'sql'],
      storage: { configured: true, folders: ['solutions', 'student_files'] },
    })
  })
})
