import { z } from 'zod'

// ===========================================
// ERROR HANDLING
// ===========================================

/**
 * Standardized error codes for API responses
 */
export enum ErrorCode {
  // Authentication & Authorization
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Resources
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Database
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',

  // External Services
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  OAUTH_ERROR = 'OAUTH_ERROR',

  // Server Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Business Logic
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
}

/**
 * HTTP status codes for different error types
 */
export const ErrorStatusCodes: Record<ErrorCode, number> = {
  [ErrorCode.AUTH_REQUIRED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.INVALID_CREDENTIALS]: 401,

  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,

  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.ALREADY_EXISTS]: 409,
  [ErrorCode.CONFLICT]: 409,

  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,

  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.CONSTRAINT_VIOLATION]: 400,

  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.OAUTH_ERROR]: 401,

  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,

  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCode.OPERATION_NOT_ALLOWED]: 403,
}

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  error: string
  code: ErrorCode
  details?: any
  requestId?: string
  timestamp: string
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode || ErrorStatusCodes[code]
  }

  /**
   * Convert error to standardized JSON response
   */
  toJSON(requestId?: string): ApiErrorResponse {
    return {
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details }),
      ...(requestId && { requestId }),
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Validation error with field-level details
 */
export class ValidationError extends ApiError {
  constructor(
    details: Array<{ path: string; message: string }>
  ) {
    super(
      ErrorCode.VALIDATION_ERROR,
      'Request validation failed',
      { fields: details }
    )
    this.name = 'ValidationError'
  }
}

/**
 * Not found error
 */
export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(ErrorCode.NOT_FOUND, `${resource} not found`)
    this.name = 'NotFoundError'
  }
}

/**
 * Authentication required error
 */
export class AuthRequiredError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(ErrorCode.AUTH_REQUIRED, message)
    this.name = 'AuthRequiredError'
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Access forbidden') {
    super(ErrorCode.FORBIDDEN, message)
    this.name = 'ForbiddenError'
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends ApiError {
  constructor(retryAfter?: number) {
    super(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Too many requests. Please try again later.',
      { retryAfter }
    )
    this.name = 'RateLimitError'
  }
}

// ===========================================
// ERROR RESPONSE BUILDERS
// ===========================================

/**
 * Creates a NextResponse with standardized error format
 */
export function errorResponse(
  error: ApiError | Error,
  requestId?: string
): NextResponse {
  const statusCode =
    error instanceof ApiError ? error.statusCode : 500

  const response =
    error instanceof ApiError
      ? error.toJSON(requestId)
      : {
          error: 'An unexpected error occurred',
          code: ErrorCode.INTERNAL_ERROR,
          timestamp: new Date().toISOString(),
          ...(requestId && { requestId }),
        }

  return NextResponse.json(response, { status: statusCode })
}

/**
 * Logs error with context
 */
export function logError(
  error: Error,
  context: {
    endpoint?: string
    method?: string
    userId?: string
    requestId?: string
    [key: string]: any
  }
) {
  const logData = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: error.message,
    stack: error.stack,
    ...context,
  }

  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to Sentry, DataDog, etc.
    // Sentry.captureException(error, { extra: context })
  }

  console.error(JSON.stringify(logData, null, 2))
}

/**
 * Wraps async route handlers with error handling
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  context?: { endpoint?: string; method?: string }
): T {
  return (async (...args: any[]) => {
    // Generate request ID
    const requestId = crypto.randomUUID()
    const startTime = Date.now()

    try {
      const response = await handler(...args)

      // Add request ID to response headers
      response.headers.set('X-Request-ID', requestId)
      response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`)

      return response
    } catch (error) {
      // Log the error
      if (error instanceof Error) {
        logError(error, {
          ...context,
          requestId,
          duration: Date.now() - startTime,
        })
      }

      // Return error response
      return errorResponse(error as Error, requestId)
    }
  }) as T
}
