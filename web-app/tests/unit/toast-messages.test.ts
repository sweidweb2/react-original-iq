import { describe, expect, it } from 'vitest'

import { ApiError, apiErrorFromBody, NETWORK_ERROR_STATUS } from '@/services/api'
import { describeError } from '@/services/toast'

describe('apiErrorFromBody', () => {
  it('reads the top-level code, message and details the API sends', () => {
    const error = apiErrorFromBody(409, {
      code: 'CONFLICT',
      message: 'Task already has a tutor assigned',
      details: { a: 1 },
    })
    expect(error.status).toBe(409)
    expect(error.code).toBe('CONFLICT')
    expect(error.message).toBe('Task already has a tutor assigned')
    expect(error.details).toEqual({ a: 1 })
  })
})

describe('describeError', () => {
  it('shows specific 4xx messages written by the API', () => {
    expect(
      describeError(new ApiError(400, 'Task must be in progress to submit', 'VALIDATION_ERROR')),
    ).toBe('Task must be in progress to submit')
    expect(describeError(new ApiError(401, 'Invalid email or password', 'UNAUTHORIZED'))).toBe(
      'Invalid email or password',
    )
  })

  it('lists invalid field names from validation details, never values', () => {
    const error = new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', {
      formErrors: [],
      fieldErrors: { coordinatorId: ['Invalid uuid'], sizeBytes: ['Too big'] },
    })
    expect(describeError(error)).toBe('Please check: coordinator id, size bytes.')
  })

  it('replaces generic auth and permission messages with plain language', () => {
    expect(describeError(new ApiError(401, 'Invalid or expired access token'))).toBe(
      'Your session has expired. Please sign in again.',
    )
    expect(describeError(new ApiError(403, 'Forbidden'))).toBe(
      "You don't have permission to do this.",
    )
  })

  it('never exposes server error text for 5xx responses', () => {
    const error = new ApiError(500, 'relation "tasks" does not exist', 'INTERNAL_ERROR')
    expect(describeError(error)).toBe(
      'Something went wrong on our side. Please try again in a moment.',
    )
  })

  it('never exposes raw JavaScript errors', () => {
    expect(describeError(new TypeError("Cannot read properties of undefined (reading 'id')"))).toBe(
      'Something unexpected happened. Please try again.',
    )
  })

  it('explains network failures', () => {
    expect(describeError(new ApiError(NETWORK_ERROR_STATUS, 'Network request failed'))).toBe(
      "Can't reach the server. Check your connection and try again.",
    )
  })
})
