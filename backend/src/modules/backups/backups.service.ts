import { once } from 'node:events'
import { Readable, Transform, type Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { ZipArchive } from 'archiver'

import { type AuthActor, isSuper } from '../../authz/index.js'
import { forbidden, notFound, serviceUnavailable, validationError } from '../../errors/app-error.js'
import { reportError } from '../../errors/report-error.js'
import type { StorageService } from '../../storage/index.js'
import { exportFilename } from '../_shared/export-file.js'
import type { PaginationQuery } from '../_shared/pagination.schema.js'
import { getLoggingService } from '../logging/index.js'
import type { BackupHistoryRecord, BackupsRepository, TableRow } from './backups.repository.js'
import {
  BACKUP_DATA_FORMATS,
  type BackupDataFormat,
  type BackupFormat,
  runBackupBodySchema,
  type RunBackupInput,
} from './backups.schema.js'
import {
  FORMAT_CONTENT_TYPE,
  sqlFooter,
  sqlHeader,
  tablesToXlsx,
  tableToCsv,
  tableToJson,
  tableToSql,
} from './backups.serializers.js'
import { AUTH_USERS_TABLE, BACKUP_TABLES, type BackupTable } from './backups.tables.js'
import type { BackupHistoryDto, BackupHistoryPage, BackupMetaDto } from './backups.types.js'

/** Where a backup file is written; the controller binds it to the HTTP response. */
export type BackupOutput = {
  open: (file: {
    filename: string
    contentType: string
    /** Exact size, known when the file was built in memory. */
    sizeBytes?: number
    /** Rough size for streamed archives, so clients can show progress. */
    estimatedBytes?: number
  }) => Writable
}

export type BackupsService = {
  getMeta: (actor: AuthActor) => Promise<BackupMetaDto>
  listHistory: (query: PaginationQuery, actor: AuthActor) => Promise<BackupHistoryPage>
  run: (input: RunBackupInput, actor: AuthActor, output: BackupOutput) => Promise<void>
  rerun: (id: string, actor: AuthActor, output: BackupOutput) => Promise<void>
}

export type BackupsServiceDeps = {
  repository: BackupsRepository
  storage: StorageService
}

type Stats = { rows: number | null; files: number | null }

type Artifact = {
  source: Readable
  /** Feeds archive entries while `source` is being piped out. */
  produce?: (signal: AbortSignal) => Promise<void>
  sizeBytes?: number
  estimatedBytes?: number
}

/** Per-entry zip overhead (local header + central directory) used for size estimates. */
const ZIP_ENTRY_OVERHEAD_BYTES = 128

type Plan = {
  target: string | null
  format: BackupFormat
  filename: string
  contentType: string
  stats: Stats
  /** Runs after the history row exists; anything thrown here still returns a JSON error. */
  build: () => Promise<Artifact>
}

type ZipEntry = { name: string; body: Buffer | string }

function assertSuper(actor: AuthActor): void {
  if (!isSuper(actor.roles)) {
    throw forbidden('Only super admins can manage backups')
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

function bufferArtifact(body: Buffer | string): Artifact {
  const buffer = typeof body === 'string' ? Buffer.from(body) : body
  return { source: Readable.from([buffer]), sizeBytes: buffer.length }
}

function zipArtifact(
  entries: AsyncIterable<ZipEntry>,
  options: { store?: boolean } = {},
): Artifact {
  const archive = new ZipArchive(options.store ? { store: true } : { zlib: { level: 6 } })
  return {
    source: archive,
    async produce(signal) {
      try {
        for await (const entry of entries) {
          // Append one entry at a time so only one storage object is buffered.
          const added = once(archive, 'entry', { signal })
          archive.append(entry.body, { name: entry.name })
          await added
        }
        await archive.finalize()
      } catch (error) {
        if (!archive.destroyed) archive.destroy(error as Error)
        throw error
      }
    },
  }
}

function serializeTable(
  format: Exclude<BackupDataFormat, 'xlsx'>,
  table: string,
  rows: TableRow[],
  at: Date,
): string {
  switch (format) {
    case 'csv':
      return tableToCsv(rows)
    case 'json':
      return tableToJson(table, rows, at)
    case 'sql':
      return `${sqlHeader(at)}${tableToSql(table, rows)}${sqlFooter()}`
  }
}

function toDto(record: BackupHistoryRecord): BackupHistoryDto {
  return {
    id: record.id,
    type: record.type,
    target: record.target,
    format: record.format,
    status: record.status,
    filename: record.filename,
    sizeBytes: record.sizeBytes,
    rowCount: record.rowCount,
    fileCount: record.fileCount,
    durationMs: record.durationMs,
    error: record.error,
    rerunOf: record.rerunOf,
    requestedBy: record.requester,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

/** Rebuilds the request a history row was made from (re-validated, so removed tables fail). */
function inputFromHistory(record: BackupHistoryRecord): RunBackupInput {
  const candidate =
    record.type === 'table'
      ? { type: 'table', table: record.target, format: record.format }
      : record.type === 'storage_folder'
        ? { type: 'storage_folder', folder: record.target }
        : record.type === 'storage_full'
          ? { type: 'storage_full' }
          : { type: record.type, format: record.format }
  const parsed = runBackupBodySchema.safeParse(candidate)
  if (!parsed.success) {
    throw validationError('This backup can no longer be re-exported')
  }
  return parsed.data
}

export function createBackupsService(deps: BackupsServiceDeps): BackupsService {
  const { repository, storage } = deps

  function requireStorage(): void {
    if (!storage.isConfigured()) {
      throw serviceUnavailable('STORAGE_NOT_CONFIGURED', 'File storage is not configured')
    }
  }

  function singleTablePlan(
    table: BackupTable,
    format: BackupDataFormat,
    base: string,
    at: Date,
  ): Plan {
    const stats: Stats = { rows: 0, files: null }
    return {
      target: table,
      format,
      filename: exportFilename(base, format, at),
      contentType: FORMAT_CONTENT_TYPE[format],
      stats,
      async build() {
        const rows = await repository.readTable(table)
        stats.rows = rows.length
        const body =
          format === 'xlsx'
            ? await tablesToXlsx([{ name: table, rows }])
            : serializeTable(format, table, rows, at)
        return bufferArtifact(body)
      },
    }
  }

  function allTablesPlan(format: BackupDataFormat, at: Date): Plan {
    const stats: Stats = { rows: 0, files: null }
    const base = 'backup_all_tables'
    const countRows = (rows: TableRow[]) => {
      stats.rows = (stats.rows ?? 0) + rows.length
      return rows
    }

    if (format === 'xlsx' || format === 'sql') {
      return {
        target: null,
        format,
        filename: exportFilename(base, format, at),
        contentType: FORMAT_CONTENT_TYPE[format],
        stats,
        async build() {
          if (format === 'xlsx') {
            const tables = []
            for (const name of BACKUP_TABLES) {
              tables.push({ name, rows: countRows(await repository.readTable(name)) })
            }
            return bufferArtifact(await tablesToXlsx(tables))
          }
          async function* sqlChunks() {
            yield Buffer.from(sqlHeader(at))
            for (const name of BACKUP_TABLES) {
              yield Buffer.from(tableToSql(name, countRows(await repository.readTable(name))))
            }
            yield Buffer.from(sqlFooter())
          }
          return { source: Readable.from(sqlChunks()) }
        },
      }
    }

    return {
      target: null,
      format,
      filename: exportFilename(base, 'zip', at),
      contentType: FORMAT_CONTENT_TYPE.zip,
      stats,
      async build() {
        async function* entries(): AsyncIterable<ZipEntry> {
          for (const name of BACKUP_TABLES) {
            const rows = countRows(await repository.readTable(name))
            yield {
              name: `${name}.${format}`,
              body: serializeTable(format as 'csv' | 'json', name, rows, at),
            }
          }
        }
        return zipArtifact(entries())
      },
    }
  }

  async function storagePlan(folder: string | null, at: Date): Promise<Plan> {
    requireStorage()
    if (folder !== null) {
      const folders = await storage.listFolders()
      if (!folders.includes(folder)) {
        throw notFound('Storage folder not found')
      }
    }
    const objects = await storage.listObjects(folder ?? '')
    const stats: Stats = { rows: null, files: objects.length }
    return {
      target: folder,
      format: 'zip',
      filename: exportFilename(
        folder ? `backup_storage_${folder}` : 'backup_storage_full',
        'zip',
        at,
      ),
      contentType: FORMAT_CONTENT_TYPE.zip,
      stats,
      async build() {
        async function* entries(): AsyncIterable<ZipEntry> {
          for (const object of objects) {
            yield { name: object.key, body: await storage.downloadObject(object.key) }
          }
        }
        // Stored files (images, PDFs, Office docs) are already compressed.
        const estimatedBytes = objects.reduce(
          (sum, object) =>
            sum + object.sizeBytes + object.key.length * 2 + ZIP_ENTRY_OVERHEAD_BYTES,
          0,
        )
        return { ...zipArtifact(entries(), { store: true }), estimatedBytes }
      },
    }
  }

  async function planFor(input: RunBackupInput, at: Date): Promise<Plan> {
    switch (input.type) {
      case 'table':
        return singleTablePlan(input.table, input.format, `backup_${input.table}`, at)
      case 'users':
        return singleTablePlan(AUTH_USERS_TABLE, input.format, 'backup_users', at)
      case 'all_tables':
        return allTablesPlan(input.format, at)
      case 'storage_folder':
        return storagePlan(input.folder, at)
      case 'storage_full':
        return storagePlan(null, at)
    }
  }

  async function execute(
    input: RunBackupInput,
    actor: AuthActor,
    output: BackupOutput,
    rerunOf: string | null,
  ): Promise<void> {
    assertSuper(actor)
    const plan = await planFor(input, new Date())
    const history = await repository.createHistory({
      type: input.type,
      target: plan.target,
      format: plan.format,
      filename: plan.filename,
      requestedBy: actor.id,
      rerunOf,
    })
    const startedAt = Date.now()

    try {
      const artifact = await plan.build()
      let bytes = 0
      const counter = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          bytes += chunk.length
          callback(null, chunk)
        },
      })
      const destination = output.open({
        filename: plan.filename,
        contentType: plan.contentType,
        sizeBytes: artifact.sizeBytes,
        estimatedBytes: artifact.estimatedBytes,
      })
      const abort = new AbortController()
      const piping = pipeline(artifact.source, counter, destination).catch((error: unknown) => {
        abort.abort()
        throw error
      })
      await Promise.all([piping, artifact.produce?.(abort.signal)])

      const durationMs = Date.now() - startedAt
      await repository.completeHistory(history.id, {
        sizeBytes: bytes,
        rowCount: plan.stats.rows,
        fileCount: plan.stats.files,
        durationMs,
      })
      getLoggingService().recordActivitySafe({
        userId: actor.id,
        action: 'backups.export',
        entity: 'backup',
        entityId: history.id,
        meta: {
          type: input.type,
          target: plan.target,
          format: plan.format,
          sizeBytes: bytes,
          rows: plan.stats.rows,
          files: plan.stats.files,
          rerunOf,
        },
      })
    } catch (error) {
      await repository
        .failHistory(history.id, errorMessage(error), Date.now() - startedAt)
        .catch((historyError: unknown) => {
          reportError(historyError, {
            source: 'backups.fail_history',
            meta: { backupId: history.id },
          })
        })
      throw error
    }
  }

  return {
    async getMeta(actor) {
      assertSuper(actor)
      let folders: string[] = []
      if (storage.isConfigured()) {
        folders = await storage.listFolders().catch((error: unknown) => {
          reportError(error, { source: 'backups.list_folders', level: 'warning' })
          return []
        })
      }
      return {
        tables: [...BACKUP_TABLES],
        formats: [...BACKUP_DATA_FORMATS],
        storage: { configured: storage.isConfigured(), folders },
      }
    },

    async listHistory(query, actor) {
      assertSuper(actor)
      const { items, total } = await repository.listHistory(query.page, query.limit)
      return {
        data: items.map(toDto),
        meta: { page: query.page, limit: query.limit, total },
      }
    },

    run(input, actor, output) {
      return execute(input, actor, output, null)
    },

    async rerun(id, actor, output) {
      assertSuper(actor)
      const record = await repository.getHistory(id)
      if (!record) {
        throw notFound('Backup not found')
      }
      await execute(inputFromHistory(record), actor, output, record.id)
    },
  }
}
