import { z } from 'zod'

// ===========================================
// VALIDATION MIDDLEWARE
// ===========================================

import { ZodError } from 'zod'
import { NextResponse } from 'next/server'

interface ValidationResult<T = any> {
  data: T | null
  error: {
    message: string
    code: string
    details: Array<{
      path: string
      message: string
    }>
  } | null
}

/**
 * Validates request body against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Validation result with data or error
 */
export async function validateRequest<T>(
  schema: z.ZodSchema<T>,
  request: Request
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json()
    const validatedData = schema.parse(body)
    return { data: validatedData, error: null }
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        data: null,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
      }
    }
    // Re-throw non-Zod errors
    throw error
  }
}

/**
 * Creates a standardized validation error response
 * @param error - Validation error object
 * @returns NextResponse with 400 status and error details
 */
export function validationErrorResponse(error: ValidationResult['error']) {
  return NextResponse.json(
    {
      error: error?.message || 'Validation failed',
      code: error?.code || 'VALIDATION_ERROR',
      details: error?.details,
    },
    { status: 400 }
  )
}

/**
 * Validates query parameters against a Zod schema
 * @param schema - Zod schema to validate against
 * @param searchParams - URLSearchParams from request
 * @returns Validation result with data or error
 */
export function validateQuery<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams
): ValidationResult<T> {
  try {
    // Convert URLSearchParams to plain object
    const params: Record<string, string | string[]> = {}
    searchParams.forEach((value, key) => {
      if (params[key]) {
        // Convert to array if multiple values
        if (Array.isArray(params[key])) {
          ;(params[key] as string[]).push(value)
        } else {
          params[key] = [params[key] as string, value]
        }
      } else {
        params[key] = value
      }
    })

    const validatedData = schema.parse(params)
    return { data: validatedData, error: null }
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        data: null,
        error: {
          message: 'Query validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
      }
    }
    throw error
  }
}
