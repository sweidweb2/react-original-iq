/**
 * Object storage (Cloudflare R2 via S3 API).
 *
 * - Controllers/services call `getStorageService()` — never raw S3 from modules.
 * - Persist **object keys** in `files.file_location` / `solutions.file_location`.
 * - Issue short-lived signed URLs for download/upload; do not expose public ACLs.
 */

export {
  ALLOWED_UPLOAD_EXTENSIONS,
  ALLOWED_UPLOAD_MIME_BY_EXT,
  DEFAULT_MAX_FILE_BYTES,
  DEFAULT_MAX_TASK_BYTES,
  DEFAULT_SIGNED_URL_TTL_SEC,
  STORAGE_PREFIX,
  type StorageCategory,
} from './constants.js'
export { buildObjectKey, extensionOf, isManagedObjectKey, sanitizeFilename } from './keys.js'
export {
  createStorageService,
  getStorageService,
  type ObjectInfo,
  type PutObjectInput,
  type PutObjectResult,
  resetStorageServiceForTests,
  type SignedUrlResult,
  type StorageService,
} from './storage.service.js'
export { assertValidUpload, type UploadValidationInput, type ValidatedUpload } from './validate.js'
