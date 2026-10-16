import { S3Client } from '@aws-sdk/client-s3'

import type { StorageConfig } from '../config/index.js'

let cached: { key: string; client: S3Client } | null = null

function cacheKey(config: StorageConfig): string {
  return [config.endpoint, config.bucket, config.accessKeyId, config.region].join('|')
}

/** Shared S3 client for Cloudflare R2 (path-style). */
export function getS3Client(config: StorageConfig): S3Client {
  const key = cacheKey(config)
  if (cached?.key === key) return cached.client

  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.usePathStyleEndpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })

  cached = { key, client }
  return client
}

/** Tests only. */
export function resetS3ClientForTests(): void {
  cached = null
}
