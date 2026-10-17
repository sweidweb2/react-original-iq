import type { SupabaseClient } from '@supabase/supabase-js'

import {
  type AppConfig,
  isStorageConfigured,
  loadConfig,
  requireStorageConfig,
  type StorageConfig,
} from '../config/index.js'
import { getSupabaseAdmin } from '../database/index.js'
import { validationError } from '../errors/app-error.js'
import { reportError } from '../errors/report-error.js'
import { getLogger } from '../logging/index.js'
import type { StorageCategory } from './constants.js'
import { buildObjectKey, isManagedObjectKey } from './keys.js'
import { assertValidUpload, type ValidatedUpload } from './validate.js'

export type PutObjectInput = {
  category: StorageCategory
  taskId: string
  originalFilename: string
  contentType: string
  body: Buffer | Uint8Array
  /** Soft cap: bytes already stored for this task. */
  taskBytesUsed?: number
  objectId?: string
}

export type PutObjectResult = {
  key: string
  bucket: string
  contentType: string
  sizeBytes: number
  originalFilename: string
}

export type SignedUrlResult = {
  url: string
  expiresInSec: number
  key: string
}

export type ObjectInfo = {
  sizeBytes: number
  contentType: string | null
}

export type StoredObject = {
  key: string
  sizeBytes: number
}

export type StorageService = {
  isConfigured: () => boolean
  putObject: (input: PutObjectInput) => Promise<PutObjectResult>
  getSignedDownloadUrl: (key: string, expiresInSec?: number) => Promise<SignedUrlResult>
  getSignedUploadUrl: (input: {
    category: StorageCategory
    taskId: string
    originalFilename: string
    contentType: string
    sizeBytes: number
    taskBytesUsed?: number
  }) => Promise<SignedUrlResult & { key: string; contentType: string; sizeBytes: number }>
  /**
   * Re-checks an object uploaded through a signed URL against the type/size rules.
   * Deletes the object and throws when it is invalid.
   */
  validateStoredObject: (input: {
    key: string
    originalFilename: string
    taskBytesUsed?: number
  }) => Promise<ValidatedUpload>
  deleteObject: (key: string) => Promise<void>
  deleteObjects: (keys: string[]) => Promise<void>
  objectExists: (key: string) => Promise<boolean>
  statObject: (key: string) => Promise<ObjectInfo | null>
  /** Folder names directly under `prefix` ('' = bucket root). Read-only, used by backups. */
  listFolders: (prefix?: string) => Promise<string[]>
  /** Every object under `prefix`, recursively ('' = whole bucket). Read-only, used by backups. */
  listObjects: (prefix?: string) => Promise<StoredObject[]>
  downloadObject: (key: string) => Promise<Buffer>
}

/** Supabase signed upload URLs have a fixed lifetime of 2 hours. */
const SIGNED_UPLOAD_TTL_SEC = 2 * 60 * 60
const DELETE_BATCH_SIZE = 1000
const LIST_PAGE_SIZE = 1000

type ListEntry = {
  name: string
  id: string | null
  metadata: { size?: number } | null
}

function joinKey(prefix: string, name: string): string {
  return prefix ? `${prefix}/${name}` : name
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const { status, statusCode, message } = error as {
    status?: number
    statusCode?: string | number
    message?: string
  }
  return (
    status === 404 ||
    String(statusCode) === '404' ||
    (typeof message === 'string' && /not\s*found/i.test(message))
  )
}

function createUnconfiguredStorageService(): StorageService {
  const unavailable = () => {
    throw new Error('Storage is not configured (SUPABASE_STORAGE_BUCKET required)')
  }
  return {
    isConfigured: () => false,
    putObject: async () => unavailable(),
    getSignedDownloadUrl: async () => unavailable(),
    getSignedUploadUrl: async () => unavailable(),
    validateStoredObject: async () => unavailable(),
    deleteObject: async () => unavailable(),
    deleteObjects: async () => unavailable(),
    objectExists: async () => unavailable(),
    statObject: async () => unavailable(),
    listFolders: async () => unavailable(),
    listObjects: async () => unavailable(),
    downloadObject: async () => unavailable(),
  }
}

export function createSupabaseStorageService(
  client: SupabaseClient,
  config: StorageConfig,
): StorageService {
  const bucket = () => client.storage.from(config.bucket)
  const log = getLogger().child({ component: 'storage' })

  function assertManagedKey(key: string) {
    if (!isManagedObjectKey(key)) {
      throw new Error('Refusing to operate on unmanaged object key')
    }
  }

  const service: StorageService = {
    isConfigured: () => true,

    async putObject(input) {
      const validated = assertValidUpload({
        originalFilename: input.originalFilename,
        contentType: input.contentType,
        sizeBytes: input.body.byteLength,
        taskBytesUsed: input.taskBytesUsed,
        maxFileBytes: config.maxFileBytes,
        maxTaskBytes: config.maxTaskBytes,
      })

      const key = buildObjectKey({
        category: input.category,
        taskId: input.taskId,
        originalFilename: validated.originalFilename,
        objectId: input.objectId,
      })

      const { error } = await bucket().upload(key, input.body, {
        contentType: validated.contentType,
        upsert: false,
      })
      if (error) throw error

      log.info({ key, sizeBytes: validated.sizeBytes, category: input.category }, 'object uploaded')

      return {
        key,
        bucket: config.bucket,
        contentType: validated.contentType,
        sizeBytes: validated.sizeBytes,
        originalFilename: validated.originalFilename,
      }
    },

    async getSignedDownloadUrl(key, expiresInSec = config.signedUrlTtlSec) {
      assertManagedKey(key)
      const { data, error } = await bucket().createSignedUrl(key, expiresInSec)
      if (error) throw error
      return { url: data.signedUrl, expiresInSec, key }
    },

    async getSignedUploadUrl(input) {
      const validated = assertValidUpload({
        originalFilename: input.originalFilename,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        taskBytesUsed: input.taskBytesUsed,
        maxFileBytes: config.maxFileBytes,
        maxTaskBytes: config.maxTaskBytes,
      })

      const key = buildObjectKey({
        category: input.category,
        taskId: input.taskId,
        originalFilename: validated.originalFilename,
      })

      const { data, error } = await bucket().createSignedUploadUrl(key)
      if (error) throw error

      return {
        url: data.signedUrl,
        expiresInSec: SIGNED_UPLOAD_TTL_SEC,
        key,
        contentType: validated.contentType,
        sizeBytes: validated.sizeBytes,
      }
    },

    async validateStoredObject(input) {
      const info = await service.statObject(input.key)
      if (!info) {
        throw validationError('Uploaded file was not found in storage')
      }
      try {
        return assertValidUpload({
          originalFilename: input.originalFilename,
          contentType: info.contentType ?? '',
          sizeBytes: info.sizeBytes,
          taskBytesUsed: input.taskBytesUsed,
          maxFileBytes: config.maxFileBytes,
          maxTaskBytes: config.maxTaskBytes,
        })
      } catch (error) {
        await service.deleteObject(input.key).catch((deleteError: unknown) => {
          reportError(deleteError, {
            source: 'storage.delete_rejected_upload',
            level: 'warning',
            meta: { key: input.key },
          })
        })
        throw error
      }
    },

    async deleteObject(key) {
      assertManagedKey(key)
      const { error } = await bucket().remove([key])
      if (error) throw error
      log.info({ key }, 'object deleted')
    },

    async deleteObjects(keys) {
      const managed = [...new Set(keys)].filter(isManagedObjectKey)
      if (managed.length === 0) return

      for (let i = 0; i < managed.length; i += DELETE_BATCH_SIZE) {
        const { error } = await bucket().remove(managed.slice(i, i + DELETE_BATCH_SIZE))
        if (error) throw error
      }
      log.info({ count: managed.length }, 'objects deleted')
    },

    async objectExists(key) {
      assertManagedKey(key)
      const { data, error } = await bucket().exists(key)
      if (error && !isNotFoundError(error)) throw error
      return data
    },

    async statObject(key) {
      assertManagedKey(key)
      const { data, error } = await bucket().info(key)
      if (error) {
        if (isNotFoundError(error)) return null
        throw error
      }
      return { sizeBytes: data.size ?? 0, contentType: data.contentType ?? null }
    },

    async listFolders(prefix = '') {
      const entries = await listLevel(prefix)
      return entries.filter((entry) => entry.id === null).map((entry) => entry.name)
    },

    async listObjects(prefix = '') {
      const objects: StoredObject[] = []
      const pending = [prefix]
      while (pending.length > 0) {
        const current = pending.pop() as string
        for (const entry of await listLevel(current)) {
          const key = joinKey(current, entry.name)
          if (entry.id === null) {
            pending.push(key)
          } else {
            objects.push({ key, sizeBytes: entry.metadata?.size ?? 0 })
          }
        }
      }
      return objects.sort((a, b) => a.key.localeCompare(b.key))
    },

    async downloadObject(key) {
      const { data, error } = await bucket().download(key)
      if (error) throw error
      return Buffer.from(await data.arrayBuffer())
    },
  }

  async function listLevel(prefix: string): Promise<ListEntry[]> {
    const entries: ListEntry[] = []
    for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
      const { data, error } = await bucket().list(prefix, {
        limit: LIST_PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      })
      if (error) throw error
      const page = (data ?? []) as ListEntry[]
      // Supabase lists a placeholder object for empty folders.
      entries.push(...page.filter((entry) => entry.name !== '.emptyFolderPlaceholder'))
      if (page.length < LIST_PAGE_SIZE) break
    }
    return entries
  }

  return service
}

export function createStorageService(config: AppConfig = loadConfig()): StorageService {
  const client = getSupabaseAdmin(config)
  if (!isStorageConfigured(config) || !client) {
    return createUnconfiguredStorageService()
  }
  return createSupabaseStorageService(client, requireStorageConfig(config))
}

let shared: StorageService | null = null

export function getStorageService(config?: AppConfig): StorageService {
  if (!shared) {
    shared = createStorageService(config ?? loadConfig())
  }
  return shared
}

/** Tests only. */
export function resetStorageServiceForTests(): void {
  shared = null
}
