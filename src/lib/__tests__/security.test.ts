/**
 * Security Tests
 *
 * Tests for security headers, CORS handling,
 * and other security-related utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextResponse } from 'next/server'
import {
  addSecurityHeaders,
  getCorsHeaders,
  handleOptions,
} from '../security'

describe('addSecurityHeaders', () => {
  let originalEnv: string | undefined

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NODE_ENV = originalEnv
    }
  })

  it('should add Content-Security-Policy header', () => {
    const response = new NextResponse(JSON.stringify({ data: 'test' }))
    const result = addSecurityHeaders(response)

    expect(result.headers.get('Content-Security-Policy')).toContain("default-src 'self'")
  })

  it('should add X-Frame-Options header', () => {
    const response = new NextResponse(JSON.stringify({ data: 'test' }))
    const result = addSecurityHeaders(response)

    expect(result.headers.get('X-Frame-Options')).toBe('DENY')
  })

  it('should add X-Content-Type-Options header', () => {
    const response = new NextResponse(JSON.stringify({ data: 'test' }))
    const result = addSecurityHeaders(response)

    expect(result.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('should add Referrer-Policy header', () => {
    const response = new NextResponse(JSON.stringify({ data: 'test' }))
    const result = addSecurityHeaders(response)

    expect(result.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
  })

  it('should add Permissions-Policy header', () => {
    const response = new NextResponse(JSON.stringify({ data: 'test' }))
    const result = addSecurityHeaders(response)

    expect(result.headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()')
  })

  it('should add Strict-Transport-Security header in production', () => {
    process.env.NODE_ENV = 'production'

    const response = new NextResponse(JSON.stringify({ data: 'test' }))
    const result = addSecurityHeaders(response)

    expect(result.headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains; preload')
  })

  it('should not add Strict-Transport-Security header in development', () => {
    process.env.NODE_ENV = 'development'

    const response = new NextResponse(JSON.stringify({ data: 'test' }))
    const result = addSecurityHeaders(response)

    expect(result.headers.get('Strict-Transport-Security')).toBeNull()
  })

  it('should include trusted sources in CSP connect-src', () => {
    const response = new NextResponse(JSON.stringify({ data: 'test' }))
    const result = addSecurityHeaders(response)

    const csp = result.headers.get('Content-Security-Policy')

    expect(csp).toContain('https://accounts.google.com')
    expect(csp).toContain('https://github.com')
    expect(csp).toContain('https://api.upstash.com')
  })

  it('should deny all framing in CSP frame-ancestors', () => {
    const response = new NextResponse(JSON.stringify({ data: 'test' }))
    const result = addSecurityHeaders(response)

    expect(result.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'")
  })

  it('should return the same response object', () => {
    const response = new NextResponse(JSON.stringify({ data: 'test' }))
    const result = addSecurityHeaders(response)

    expect(result).toBe(response)
  })

  it('should include all CSP directives', () => {
    const response = new NextResponse(JSON.stringify({ data: 'test' }))
    const result = addSecurityHeaders(response)

    const csp = result.headers.get('Content-Security-Policy')

    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("style-src 'self'")
    expect(csp).toContain("img-src 'self'")
    expect(csp).toContain("font-src 'self'")
    expect(csp).toContain("connect-src 'self'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
  })
})

describe('getCorsHeaders', () => {
  const originalEnv = process.env.NEXTAUTH_URL

  beforeEach(() => {
    process.env.NEXTAUTH_URL = 'https://example.com'
  })

  afterEach(() => {
    process.env.NEXTAUTH_URL = originalEnv
  })

  it('should return CORS headers for allowed origin', () => {
    const headers = getCorsHeaders('http://localhost:3000')

    expect(headers).toEqual({
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    })
  })

  it('should return CORS headers for localhost:3001', () => {
    const headers = getCorsHeaders('http://localhost:3001')

    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3001')
  })

  it('should return CORS headers for NEXTAUTH_URL', () => {
    const headers = getCorsHeaders('https://example.com')

    expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com')
  })

  it('should default to first allowed origin for unknown origin', () => {
    const headers = getCorsHeaders('https://unknown.com')

    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000')
  })

  it('should handle null origin', () => {
    const headers = getCorsHeaders(null)

    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000')
  })

  it('should include all allowed HTTP methods', () => {
    const headers = getCorsHeaders('http://localhost:3000')

    expect(headers['Access-Control-Allow-Methods']).toBe(
      'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    )
  })

  it('should include authorization in allowed headers', () => {
    const headers = getCorsHeaders('http://localhost:3000')

    expect(headers['Access-Control-Allow-Headers']).toBe(
      'Content-Type, Authorization'
    )
  })

  it('should enable credentials', () => {
    const headers = getCorsHeaders('http://localhost:3000')

    expect(headers['Access-Control-Allow-Credentials']).toBe('true')
  })

  it('should set max-age to 24 hours', () => {
    const headers = getCorsHeaders('http://localhost:3000')

    expect(headers['Access-Control-Max-Age']).toBe('86400')
  })

  it('should filter out undefined NEXTAUTH_URL', () => {
    process.env.NEXTAUTH_URL = undefined as any

    const headers = getCorsHeaders('http://localhost:3000')

    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000')
  })
})

describe('handleOptions', () => {
  it('should return 204 No Content status', () => {
    const mockRequest = {
      headers: {
        get: vi.fn().mockReturnValue('http://localhost:3000'),
      },
    } as any

    const response = handleOptions(mockRequest)

    expect(response.status).toBe(204)
  })

  it('should include CORS headers from origin', () => {
    const mockRequest = {
      headers: {
        get: vi.fn().mockReturnValue('http://localhost:3000'),
      },
    } as any

    const response = handleOptions(mockRequest)

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:3000'
    )
  })

  it('should handle OPTIONS request with origin header', () => {
    const mockRequest = {
      headers: {
        get: vi.fn((key: string) => {
          if (key === 'origin') return 'https://example.com'
          return null
        }),
      },
    } as any

    const response = handleOptions(mockRequest)

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined()
  })

  it('should include all required CORS headers', () => {
    const mockRequest = {
      headers: {
        get: vi.fn().mockReturnValue('http://localhost:3000'),
      },
    } as any

    const response = handleOptions(mockRequest)

    expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
      'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    )
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe(
      'Content-Type, Authorization'
    )
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(response.headers.get('Access-Control-Max-Age')).toBe('86400')
  })
})
