import { describe, expect, it } from 'vitest'

import { STORAGE_PREFIX } from '../../src/storage/constants.js'
import { buildObjectKey, extensionOf, isManagedObjectKey, sanitizeFilename } from '../../src/storage/keys.js'
import { assertValidUpload } from '../../src/storage/validate.js'

describe('storage keys', () => {
  it('sanitizes filenames and builds managed keys', () => {
    expect(sanitizeFilename('../../etc/passwd.pdf')).toBe('passwd.pdf')
    expect(extensionOf('Report.DOCX')).toBe('docx')

    const key = buildObjectKey({
      category: 'documents',
      taskId: 'task-1',
      originalFilename: 'my report.pdf',
      objectId: 'abc',
    })
    expect(key).toBe(`${STORAGE_PREFIX.documents}/task-1/abc_my report.pdf`)
    expect(isManagedObjectKey(key)).toBe(true)
    expect(isManagedObjectKey('evil/../other')).toBe(false)
  })
})

describe('assertValidUpload', () => {
  it('accepts an allowed pdf', () => {
    const result = assertValidUpload({
      originalFilename: 'brief.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1024,
    })
    expect(result).toMatchObject({
      extension: 'pdf',
      contentType: 'application/pdf',
      sizeBytes: 1024,
    })
  })

  it('rejects disallowed types and oversize files', () => {
    expect(() =>
      assertValidUpload({
        originalFilename: 'virus.exe',
        contentType: 'application/octet-stream',
        sizeBytes: 10,
      }),
    ).toThrow(expect.objectContaining({ status: 400 }))

    expect(() =>
      assertValidUpload({
        originalFilename: 'brief.pdf',
        contentType: 'application/pdf',
        sizeBytes: 30 * 1024 * 1024,
        maxFileBytes: 25 * 1024 * 1024,
      }),
    ).toThrow(expect.objectContaining({ status: 400 }))

    expect(() =>
      assertValidUpload({
        originalFilename: 'brief.pdf',
        contentType: 'application/pdf',
        sizeBytes: 10,
        taskBytesUsed: 100,
        maxTaskBytes: 100,
      }),
    ).toThrow(expect.objectContaining({ status: 400 }))
  })
})
