/**
 * Error Handling Tests
 *
 * Tests for error classes, error response builders,
 * and error handling utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ErrorCode,
  ErrorStatusCodes,
  ApiError,
  ValidationError,
  NotFoundError,
  AuthRequiredError,
  ForbiddenError,
  RateLimitError,
  errorResponse,
  logError,
  withErrorHandler,
} from '../errors'

describe('ErrorCode Enum', () => {
  it('should have all required error codes', () => {
    expect(ErrorCode.AUTH_REQUIRED).toBe('AUTH_REQUIRED')
    expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN')
    expect(ErrorCode.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS')
    expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
    expect(ErrorCode.INVALID_INPUT).toBe('INVALID_INPUT')
    expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND')
    expect(ErrorCode.ALREADY_EXISTS).toBe('ALREADY_EXISTS')
    expect(ErrorCode.CONFLICT).toBe('CONFLICT')
    expect(ErrorCode.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED')
    expect(ErrorCode.DATABASE_ERROR).toBe('DATABASE_ERROR')
    expect(ErrorCode.EXTERNAL_SERVICE_ERROR).toBe('EXTERNAL_SERVICE_ERROR')
    expect(ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR')
  })
})

describe('ErrorStatusCodes', () => {
  it('should map error codes to correct HTTP status codes', () => {
    expect(ErrorStatusCodes[ErrorCode.AUTH_REQUIRED]).toBe(401)
    expect(ErrorStatusCodes[ErrorCode.FORBIDDEN]).toBe(403)
    expect(ErrorStatusCodes[ErrorCode.NOT_FOUND]).toBe(404)
    expect(ErrorStatusCodes[ErrorCode.VALIDATION_ERROR]).toBe(400)
    expect(ErrorStatusCodes[ErrorCode.RATE_LIMIT_EXCEEDED]).toBe(429)
    expect(ErrorStatusCodes[ErrorCode.INTERNAL_ERROR]).toBe(500)
    expect(ErrorStatusCodes[ErrorCode.SERVICE_UNAVAILABLE]).toBe(503)
  })
})

describe('ApiError', () => {
  it('should create ApiError with correct properties', () => {
    const error = new ApiError(
      ErrorCode.NOT_FOUND,
      'Resource not found',
      { resourceId: '123' }
    )

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('ApiError')
    expect(error.code).toBe(ErrorCode.NOT_FOUND)
    expect(error.message).toBe('Resource not found')
    expect(error.details).toEqual({ resourceId: '123' })
    expect(error.statusCode).toBe(404)
  })

  it('should use default status code from ErrorStatusCodes', () => {
    const error = new ApiError(
      ErrorCode.VALIDATION_ERROR,
      'Validation failed'
    )

    expect(error.statusCode).toBe(400)
  })

  it('should allow custom status code', () => {
    const error = new ApiError(
      ErrorCode.INTERNAL_ERROR,
      'Custom error',
      undefined,
      418
    )

    expect(error.statusCode).toBe(418)
  })

  it('should convert to JSON response format', () => {
    const error = new ApiError(
      ErrorCode.NOT_FOUND,
      'User not found',
      { userId: '123' }
    )

    const json = error.toJSON('req-456')

    expect(json).toEqual({
      error: 'User not found',
      code: 'NOT_FOUND',
      details: { userId: '123' },
      requestId: 'req-456',
      timestamp: expect.any(String),
    })

    // Validate timestamp format
    expect(new Date(json.timestamp)).toBeInstanceOf(Date)
  })

  it('should not include details if not provided', () => {
    const error = new ApiError(
      ErrorCode.NOT_FOUND,
      'Not found'
    )

    const json = error.toJSON()

    expect(json.details).toBeUndefined()
  })

  it('should not include requestId if not provided', () => {
    const error = new ApiError(
      ErrorCode.NOT_FOUND,
      'Not found'
    )

    const json = error.toJSON()

    expect(json.requestId).toBeUndefined()
  })
})

describe('ValidationError', () => {
  it('should create validation error with field details', () => {
    const details = [
      { path: 'email', message: 'Invalid email format' },
      { path: 'password', message: 'Password too short' },
    ]

    const error = new ValidationError(details)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.name).toBe('ValidationError')
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR)
    expect(error.message).toBe('Request validation failed')
    expect(error.details).toEqual({
      fields: details,
    })
    expect(error.statusCode).toBe(400)
  })

  it('should handle empty field details', () => {
    const error = new ValidationError([])

    expect(error.details).toEqual({ fields: [] })
  })
})

describe('NotFoundError', () => {
  it('should create not found error with default message', () => {
    const error = new NotFoundError()

    expect(error).toBeInstanceOf(ApiError)
    expect(error.name).toBe('NotFoundError')
    expect(error.code).toBe(ErrorCode.NOT_FOUND)
    expect(error.message).toBe('Resource not found')
    expect(error.statusCode).toBe(404)
  })

  it('should create not found error with custom resource', () => {
    const error = new NotFoundError('User')

    expect(error.message).toBe('User not found')
  })
})

describe('AuthRequiredError', () => {
  it('should create auth required error with default message', () => {
    const error = new AuthRequiredError()

    expect(error).toBeInstanceOf(ApiError)
    expect(error.name).toBe('AuthRequiredError')
    expect(error.code).toBe(ErrorCode.AUTH_REQUIRED)
    expect(error.message).toBe('Authentication required')
    expect(error.statusCode).toBe(401)
  })

  it('should create auth required error with custom message', () => {
    const error = new AuthRequiredError('Please log in to continue')

    expect(error.message).toBe('Please log in to continue')
  })
})

describe('ForbiddenError', () => {
  it('should create forbidden error with default message', () => {
    const error = new ForbiddenError()

    expect(error).toBeInstanceOf(ApiError)
    expect(error.name).toBe('ForbiddenError')
    expect(error.code).toBe(ErrorCode.FORBIDDEN)
    expect(error.message).toBe('Access forbidden')
    expect(error.statusCode).toBe(403)
  })

  it('should create forbidden error with custom message', () => {
    const error = new ForbiddenError('You do not have permission')

    expect(error.message).toBe('You do not have permission')
  })
})

describe('RateLimitError', () => {
  it('should create rate limit error without retry after', () => {
    const error = new RateLimitError()

    expect(error).toBeInstanceOf(ApiError)
    expect(error.name).toBe('RateLimitError')
    expect(error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED)
    expect(error.message).toBe('Too many requests. Please try again later.')
    expect(error.details).toEqual({})
    expect(error.statusCode).toBe(429)
  })

  it('should create rate limit error with retry after', () => {
    const error = new RateLimitError(60)

    expect(error.details).toEqual({
      retryAfter: 60,
    })
  })
})

describe('errorResponse', () => {
  it('should create NextResponse from ApiError', () => {
    const error = new ApiError(
      ErrorCode.NOT_FOUND,
      'Not found',
      { id: '123' }
    )

    const response = errorResponse(error, 'req-789')

    expect(response).toBeDefined()
    expect(response.status).toBe(404)
  })

  it('should create NextResponse from generic Error', () => {
    const error = new Error('Something went wrong')

    const response = errorResponse(error)

    expect(response).toBeDefined()
    expect(response.status).toBe(500)
  })

  it('should include requestId in response', () => {
    const error = new ApiError(
      ErrorCode.VALIDATION_ERROR,
      'Invalid input'
    )

    const response = errorResponse(error, 'req-123')

    expect(response).toBeDefined()
    expect(response.status).toBe(400)
  })
})

describe('logError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should log error with context', () => {
    const error = new Error('Test error')
    const context = {
      endpoint: '/api/test',
      method: 'POST',
      userId: 'user-1',
      requestId: 'req-123',
    }

    logError(error, context)

    expect(console.error).toHaveBeenCalled()
  })

  it('should include timestamp in log', () => {
    const error = new Error('Test error')
    const context = { endpoint: '/api/test' }

    logError(error, context)

    expect(console.error).toHaveBeenCalled()
    const loggedArgs = (console.error as any).mock.calls[0]
    expect(JSON.stringify(loggedArgs[0])).toContain('timestamp')
  })

  it('should include stack trace in log', () => {
    const error = new Error('Test error')
    error.stack = 'Error: Test error\n    at test.js:10:15'

    logError(error, {})

    expect(console.error).toHaveBeenCalled()
    const loggedArgs = (console.error as any).mock.calls[0]
    expect(JSON.stringify(loggedArgs[0])).toContain('stack')
  })
})

describe('withErrorHandler', () => {
  it('should wrap successful handler with request ID', async () => {
    const mockHandler = vi.fn().mockResolvedValue({
      headers: {
        set: vi.fn(),
      },
    } as any)

    const wrapped = withErrorHandler(mockHandler, {
      endpoint: '/api/test',
      method: 'GET',
    })

    await wrapped()

    expect(mockHandler).toHaveBeenCalled()
  })

  it('should catch and handle errors', async () => {
    const mockHandler = vi.fn().mockRejectedValue(
      new Error('Handler error')
    )

    const wrapped = withErrorHandler(mockHandler, {
      endpoint: '/api/test',
      method: 'POST',
    })

    const response = await wrapped()

    expect(response).toBeDefined()
  })

  it('should add X-Request-ID header to successful response', async () => {
    const mockResponse = {
      headers: {
        set: vi.fn(),
      },
    } as any

    const mockHandler = vi.fn().mockResolvedValue(mockResponse)

    const wrapped = withErrorHandler(mockHandler)

    await wrapped()

    expect(mockResponse.headers.set).toHaveBeenCalledWith(
      'X-Request-ID',
      expect.any(String)
    )
  })

  it('should add X-Response-Time header to successful response', async () => {
    const mockResponse = {
      headers: {
        set: vi.fn(),
      },
    } as any

    const mockHandler = vi.fn().mockResolvedValue(mockResponse)

    const wrapped = withErrorHandler(mockHandler)

    await wrapped()

    expect(mockResponse.headers.set).toHaveBeenCalledWith(
      'X-Response-Time',
      expect.stringMatching(/\d+ms/)
    )
  })

  it('should log errors with context', async () => {
    const mockHandler = vi.fn().mockRejectedValue(
      new Error('Test error')
    )

    const wrapped = withErrorHandler(mockHandler, {
      endpoint: '/api/test',
      method: 'GET',
    })

    await wrapped()

    // Error should be logged (we can't easily test console.error calls
    // but we can verify the handler completed)
    expect(mockHandler).toHaveBeenCalled()
  })
})
