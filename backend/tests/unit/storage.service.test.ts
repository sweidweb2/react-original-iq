import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'

import type { StorageConfig } from '../../src/config/index.js'
import { createSupabaseStorageService } from '../../src/storage/index.js'

const config: StorageConfig = {
  provider: 'supabase',
  bucket: 'main_bucket',
  maxFileBytes: 1024,
  maxTaskBytes: 4096,
  signedUrlTtlSec: 900,
}

function fakeClient(bucketApi: Record<string, unknown>) {
  const from = vi.fn(() => bucketApi)
  return { client: { storage: { from } } as unknown as SupabaseClient, from }
}

describe('supabase storage service', () => {
  it('signs uploads for a managed key in the configured bucket', async () => {
    const createSignedUploadUrl = vi.fn(async (key: string) => ({
      data: { signedUrl: `https://supabase.example/upload/${key}?token=t`, token: 't', path: key },
      error: null,
    }))
    const { client, from } = fakeClient({ createSignedUploadUrl })
    const storage = createSupabaseStorageService(client, config)

    const result = await storage.getSignedUploadUrl({
      category: 'documents',
      taskId: 'task-1',
      originalFilename: 'brief.pdf',
      contentType: 'application/pdf',
      sizeBytes: 100,
    })

    expect(from).toHaveBeenCalledWith('main_bucket')
    expect(result.key).toMatch(/^student_files\/task-1\/[0-9a-f-]+_brief\.pdf$/)
    expect(result.url).toContain(result.key)
    expect(result.expiresInSec).toBe(7200)
  })

  it('rejects oversized uploads before signing', async () => {
    const createSignedUploadUrl = vi.fn()
    const { client } = fakeClient({ createSignedUploadUrl })
    const storage = createSupabaseStorageService(client, config)

    await expect(
      storage.getSignedUploadUrl({
        category: 'documents',
        taskId: 'task-1',
        originalFilename: 'brief.pdf',
        contentType: 'application/pdf',
        sizeBytes: 2048,
      }),
    ).rejects.toMatchObject({ status: 400 })
    expect(createSignedUploadUrl).not.toHaveBeenCalled()
  })

  it('accepts a stored object that matches the rules', async () => {
    const info = vi.fn(async () => ({
      data: { size: 500, contentType: 'application/pdf' },
      error: null,
    }))
    const { client } = fakeClient({ info })
    const storage = createSupabaseStorageService(client, config)

    await expect(
      storage.validateStoredObject({
        key: 'student_files/task-1/abc_brief.pdf',
        originalFilename: 'abc_brief.pdf',
      }),
    ).resolves.toMatchObject({ sizeBytes: 500, contentType: 'application/pdf' })
  })

  it('deletes and rejects a stored object that is larger than allowed', async () => {
    const info = vi.fn(async () => ({
      data: { size: 5000, contentType: 'application/pdf' },
      error: null,
    }))
    const remove = vi.fn(async () => ({ data: [], error: null }))
    const { client } = fakeClient({ info, remove })
    const storage = createSupabaseStorageService(client, config)
    const key = 'student_files/task-1/abc_brief.pdf'

    await expect(
      storage.validateStoredObject({ key, originalFilename: 'abc_brief.pdf' }),
    ).rejects.toMatchObject({ status: 400 })
    expect(remove).toHaveBeenCalledWith([key])
  })

  it('reports a missing object as not found', async () => {
    const info = vi.fn(async () => ({
      data: null,
      error: { status: 400, statusCode: '404', message: 'Object not found' },
    }))
    const { client } = fakeClient({ info })
    const storage = createSupabaseStorageService(client, config)

    await expect(storage.statObject('solutions/task-1/abc_x.pdf')).resolves.toBeNull()
    await expect(
      storage.validateStoredObject({
        key: 'solutions/task-1/abc_x.pdf',
        originalFilename: 'abc_x.pdf',
      }),
    ).rejects.toMatchObject({ status: 400 })
  })

  const tree: Record<
    string,
    { name: string; id: string | null; metadata: { size: number } | null }[]
  > = {
    '': [
      { name: 'solutions', id: null, metadata: null },
      { name: 'student_files', id: null, metadata: null },
    ],
    solutions: [{ name: 'task-1', id: null, metadata: null }],
    'solutions/task-1': [
      { name: '.emptyFolderPlaceholder', id: 'p', metadata: { size: 0 } },
      { name: 'a.png', id: 'o1', metadata: { size: 10 } },
    ],
    student_files: [{ name: 'b.jpg', id: 'o2', metadata: { size: 20 } }],
  }
  const list = vi.fn(async (prefix: string) => ({ data: tree[prefix] ?? [], error: null }))

  it('lists top-level folders only', async () => {
    const { client } = fakeClient({ list })
    const storage = createSupabaseStorageService(client, config)

    await expect(storage.listFolders()).resolves.toEqual(['solutions', 'student_files'])
  })

  it('lists objects recursively and skips empty-folder placeholders', async () => {
    const { client } = fakeClient({ list })
    const storage = createSupabaseStorageService(client, config)

    await expect(storage.listObjects()).resolves.toEqual([
      { key: 'solutions/task-1/a.png', sizeBytes: 10 },
      { key: 'student_files/b.jpg', sizeBytes: 20 },
    ])
    await expect(storage.listObjects('solutions')).resolves.toEqual([
      { key: 'solutions/task-1/a.png', sizeBytes: 10 },
    ])
  })

  it('downloads an object as a buffer', async () => {
    const download = vi.fn(async () => ({ data: new Blob(['hello']), error: null }))
    const { client } = fakeClient({ download })
    const storage = createSupabaseStorageService(client, config)

    const body = await storage.downloadObject('solutions/task-1/a.png')
    expect(body.toString()).toBe('hello')
    expect(download).toHaveBeenCalledWith('solutions/task-1/a.png')
  })
})
