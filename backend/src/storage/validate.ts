import { validationError } from '../errors/app-error.js'
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  ALLOWED_UPLOAD_MIME_BY_EXT,
  DEFAULT_MAX_FILE_BYTES,
  DEFAULT_MAX_TASK_BYTES,
} from './constants.js'
import { extensionOf } from './keys.js'

export type UploadValidationInput = {
  originalFilename: string
  contentType: string
  sizeBytes: number
  /** Existing bytes already stored for the task (for soft task cap). */
  taskBytesUsed?: number
  maxFileBytes?: number
  maxTaskBytes?: number
}

export type ValidatedUpload = {
  extension: string
  contentType: string
  sizeBytes: number
  originalFilename: string
}

function normalizeMime(value: string): string {
  return value.split(';')[0]?.trim().toLowerCase() ?? ''
}

/**
 * Server-side MIME + size checks (doc 08). Throws AppError on failure.
 */
export function assertValidUpload(input: UploadValidationInput): ValidatedUpload {
  const maxFile = input.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES
  const maxTask = input.maxTaskBytes ?? DEFAULT_MAX_TASK_BYTES
  const extension = extensionOf(input.originalFilename)

  if (!extension || !ALLOWED_UPLOAD_EXTENSIONS.includes(extension)) {
    throw validationError('File type is not allowed', {
      extension,
      allowed: ALLOWED_UPLOAD_EXTENSIONS,
    })
  }

  const allowedMimes = ALLOWED_UPLOAD_MIME_BY_EXT[extension] ?? []
  const contentType = normalizeMime(input.contentType)
  if (!contentType || !allowedMimes.includes(contentType)) {
    throw validationError('Content type does not match an allowed file type', {
      contentType,
      extension,
      allowedMimes,
    })
  }

  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    throw validationError('File size is invalid')
  }
  if (input.sizeBytes > maxFile) {
    throw validationError(`File exceeds the ${maxFile} byte limit`, {
      sizeBytes: input.sizeBytes,
      maxFileBytes: maxFile,
    })
  }

  const used = input.taskBytesUsed ?? 0
  if (used + input.sizeBytes > maxTask) {
    throw validationError(`Task storage would exceed the ${maxTask} byte limit`, {
      sizeBytes: input.sizeBytes,
      taskBytesUsed: used,
      maxTaskBytes: maxTask,
    })
  }

  return {
    extension,
    contentType,
    sizeBytes: input.sizeBytes,
    originalFilename: input.originalFilename,
  }
}
