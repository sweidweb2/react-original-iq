import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import {
  type AppConfig,
  isStorageConfigured,
  loadConfig,
  requireStorageConfig,
  type StorageConfig,
} from '../config/index.js'
import { getLogger } from '../logging/index.js'
import { getS3Client } from './client.js'
import type { StorageCategory } from './constants.js'
import { buildObjectKey, isManagedObjectKey } from './keys.js'
import { assertValidUpload } from './validate.js'

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
    expiresInSec?: number
  }) => Promise<SignedUrlResult & { key: string; contentType: string; sizeBytes: number }>
  deleteObject: (key: string) => Promise<void>
  deleteObjects: (keys: string[]) => Promise<void>
  objectExists: (key: string) => Promise<boolean>
  statObject: (key: string) => Promise<ObjectInfo | null>
}

function isNotFoundError(error: unknown): boolean {
  const name = error instanceof Error ? error.name : ''
  const status =
    error && typeof error === 'object' && '$metadata' in error
      ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
      : undefined
  return name === 'NotFound' || name === 'NoSuchKey' || status === 404
}

function createUnconfiguredStorageService(): StorageService {
  const unavailable = () => {
    throw new Error('Storage is not configured (STORAGE_PROVIDER=r2 + AWS_* required)')
  }
  return {
    isConfigured: () => false,
    putObject: async () => unavailable(),
    getSignedDownloadUrl: async () => unavailable(),
    getSignedUploadUrl: async () => unavailable(),
    deleteObject: async () => unavailable(),
    deleteObjects: async () => unavailable(),
    objectExists: async () => unavailable(),
    statObject: async () => unavailable(),
  }
}

function createR2StorageService(config: StorageConfig): StorageService {
  const client = getS3Client(config)
  const log = getLogger().child({ component: 'storage' })

  function assertManagedKey(key: string) {
    if (!isManagedObjectKey(key)) {
      throw new Error('Refusing to operate on unmanaged object key')
    }
  }

  return {
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

      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: input.body,
          ContentType: validated.contentType,
          ContentLength: validated.sizeBytes,
        }),
      )

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
      const url = await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: config.bucket, Key: key }),
        { expiresIn: expiresInSec },
      )
      return { url, expiresInSec, key }
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
      const expiresInSec = input.expiresInSec ?? config.signedUrlTtlSec

      const url = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          ContentType: validated.contentType,
          ContentLength: validated.sizeBytes,
        }),
        { expiresIn: expiresInSec },
      )

      return {
        url,
        expiresInSec,
        key,
        contentType: validated.contentType,
        sizeBytes: validated.sizeBytes,
      }
    },

    async deleteObject(key) {
      assertManagedKey(key)
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }))
      log.info({ key }, 'object deleted')
    },

    async deleteObjects(keys) {
      const managed = [...new Set(keys)].filter(isManagedObjectKey)
      if (managed.length === 0) return

      // R2/S3 delete batch max 1000
      for (let i = 0; i < managed.length; i += 1000) {
        const chunk = managed.slice(i, i + 1000)
        await client.send(
          new DeleteObjectsCommand({
            Bucket: config.bucket,
            Delete: {
              Objects: chunk.map((Key) => ({ Key })),
              Quiet: true,
            },
          }),
        )
      }
      log.info({ count: managed.length }, 'objects deleted')
    },

    async objectExists(key) {
      assertManagedKey(key)
      try {
        await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }))
        return true
      } catch (error) {
        if (isNotFoundError(error)) return false
        throw error
      }
    },

    async statObject(key) {
      assertManagedKey(key)
      try {
        const head = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }))
        return { sizeBytes: head.ContentLength ?? 0, contentType: head.ContentType ?? null }
      } catch (error) {
        if (isNotFoundError(error)) return null
        throw error
      }
    },
  }
}

export function createStorageService(config: AppConfig = loadConfig()): StorageService {
  if (!isStorageConfigured(config)) {
    return createUnconfiguredStorageService()
  }
  return createR2StorageService(requireStorageConfig(config))
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
