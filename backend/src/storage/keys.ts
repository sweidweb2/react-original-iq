import { randomUUID } from 'node:crypto'
import path from 'node:path'

import { STORAGE_PREFIX, type StorageCategory } from './constants.js'

/** Strip path segments and keep a basename that is valid as a Supabase Storage key. */
export function sanitizeFilename(filename: string): string {
  const base = path.basename(filename.replace(/\\/g, '/')).trim()
  const cleaned = base.replace(/[^\w.\- ()]+/g, '_').replace(/^\.+/, '')
  return cleaned.slice(0, 180) || 'file'
}

export function extensionOf(filename: string): string {
  const base = sanitizeFilename(filename)
  const idx = base.lastIndexOf('.')
  if (idx <= 0 || idx === base.length - 1) return ''
  return base.slice(idx + 1).toLowerCase()
}

/**
 * Build a private object key. Never accept a client-supplied full path.
 * Example: `student_files/{taskId}/{uuid}_report.pdf`
 */
export function buildObjectKey(input: {
  category: StorageCategory
  taskId: string
  originalFilename: string
  objectId?: string
}): string {
  const prefix = STORAGE_PREFIX[input.category]
  const id = input.objectId ?? randomUUID()
  const name = sanitizeFilename(input.originalFilename)
  return `${prefix}/${input.taskId}/${id}_${name}`
}

/** True if key uses one of our known prefixes (defense in depth before delete). */
export function isManagedObjectKey(key: string): boolean {
  const normalized = key.replace(/^\/+/, '')
  return (Object.values(STORAGE_PREFIX) as string[]).some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  )
}
