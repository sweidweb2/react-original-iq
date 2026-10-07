import { type ErrorCode, ErrorCodes } from './error-codes.js'

export class AppError extends Error {
  readonly status: number
  readonly code: ErrorCode | string
  readonly details?: unknown

  constructor(code: ErrorCode | string, message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.details = details
  }
}

export function validationError(message: string, details?: unknown): AppError {
  return new AppError(ErrorCodes.VALIDATION_ERROR, message, 400, details)
}

export function unauthorized(
  message = 'Authentication required',
  code: ErrorCode | string = ErrorCodes.UNAUTHORIZED,
): AppError {
  return new AppError(code, message, 401)
}

export function forbidden(
  message = 'Forbidden',
  code: ErrorCode | string = ErrorCodes.FORBIDDEN,
): AppError {
  return new AppError(code, message, 403)
}

export function notFound(
  message = 'Resource not found',
  code: ErrorCode | string = ErrorCodes.NOT_FOUND,
): AppError {
  return new AppError(code, message, 404)
}

export function conflict(
  message: string,
  code: ErrorCode | string = ErrorCodes.CONFLICT,
): AppError {
  return new AppError(code, message, 409)
}

export function serviceUnavailable(code: ErrorCode | string, message: string): AppError {
  return new AppError(code, message, 503)
}

export function notImplemented(feature: string): AppError {
  return new AppError(ErrorCodes.NOT_IMPLEMENTED, `${feature} is not implemented yet`, 501)
}

export function internalError(message = 'Internal server error'): AppError {
  return new AppError(ErrorCodes.INTERNAL_ERROR, message, 500)
}
