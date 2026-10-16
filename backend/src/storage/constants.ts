/**
 * File storage rules — aligned with Docs/[5] Transfer docs/08-file-storage-and-access.md
 * and rebuild decisions (MIME allowlist, 25 MiB/file, 100 MiB/task).
 */

/** Object key prefixes by category (never trust client-supplied paths). */
export const STORAGE_PREFIX = {
  documents: 'student_files',
  solutions: 'solutions',
  invoices: 'invoices',
} as const

export type StorageCategory = keyof typeof STORAGE_PREFIX

/** Extension → MIME map used for allowlisting uploads. */
export const ALLOWED_UPLOAD_MIME_BY_EXT: Readonly<Record<string, readonly string[]>> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  txt: ['text/plain'],
  zip: ['application/zip', 'application/x-zip-compressed'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  gif: ['image/gif'],
  bmp: ['image/bmp'],
  tiff: ['image/tiff'],
  tif: ['image/tiff'],
  ico: ['image/x-icon', 'image/vnd.microsoft.icon'],
  webp: ['image/webp'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  csv: ['text/csv', 'application/csv', 'text/plain'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
}

export const ALLOWED_UPLOAD_EXTENSIONS = Object.keys(ALLOWED_UPLOAD_MIME_BY_EXT)

/** Defaults when STORAGE_* env vars are unset (tests / no R2). */
export const DEFAULT_MAX_FILE_BYTES = 25 * 1024 * 1024
export const DEFAULT_MAX_TASK_BYTES = 100 * 1024 * 1024
export const DEFAULT_SIGNED_URL_TTL_SEC = 900
