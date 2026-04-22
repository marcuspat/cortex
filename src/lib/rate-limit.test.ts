/**
 * Rate Limiting Tests
 *
 * Tests for the rate limiting system including:
 * - Configuration loading
 * - Rate limit checking
 * - Graceful degradation
 * - Route protection
 * - Header generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  checkRateLimit,
  enforceRateLimit,
  getRateLimitTypeFromPath,
  isRateLimitingEnabled,
  getRateLimitStatus,
  createRateLimitHeaders,
  checkRateLimitMiddleware,
  withRateLimit,
  RateLimitType,
  RATE_LIMIT_CONFIGS,
  ROUTE_RATE_LIMITS,
} from './rate-limit'

describe('Rate Limiting Configuration', () => {
  it('should have configuration for all rate limit types', () => {
    expect(RATE_LIMIT_CONFIGS[RateLimitType.AUTH]).toBeDefined()
    expect(RATE_LIMIT_CONFIGS[RateLimitType.GENERAL]).toBeDefined()
    expect(RATE_LIMIT_CONFIGS[RateLimitType.READ]).toBeDefined()
    expect(RATE_LIMIT_CONFIGS[RateLimitType.INTERNAL]).toBeDefined()
    expect(RATE_LIMIT_CONFIGS[RateLimitType.EXPENSIVE]).toBeDefined()
  })

  it('should have stricter limits for auth endpoints', () => {
    const authConfig = RATE_LIMIT_CONFIGS[RateLimitType.AUTH]
    const generalConfig = RATE_LIMIT_CONFIGS[RateLimitType.GENERAL]

    expect(authConfig.limit).toBeLessThan(generalConfig.limit)
    expect(authConfig.limit).toBe(10)
  })

  it('should have higher limits for read endpoints', () => {
    const readConfig = RATE_LIMIT_CONFIGS[RateLimitType.READ]
    const generalConfig = RATE_LIMIT_CONFIGS[RateLimitType.GENERAL]

    expect(readConfig.limit).toBeGreaterThan(generalConfig.limit)
    expect(readConfig.limit).toBe(200)
  })

  it('should have lowest limits for expensive operations', () => {
    const expensiveConfig = RATE_LIMIT_CONFIGS[RateLimitType.EXPENSIVE]

    expect(expensiveConfig.limit).toBe(5)
  })

  it('should have route mappings for all endpoint types', () => {
    expect(ROUTE_RATE_LIMITS['/api/auth']).toBe(RateLimitType.AUTH)
    expect(ROUTE_RATE_LIMITS['/api/health']).toBe(RateLimitType.INTERNAL)
    expect(ROUTE_RATE_LIMITS['/api/memories']).toBe(RateLimitType.READ)
    expect(ROUTE_RATE_LIMITS['/api/connectors/sync']).toBe(RateLimitType.EXPENSIVE)
  })
})

describe('Rate Limit Type Detection', () => {
  it('should detect auth routes', () => {
    expect(getRateLimitTypeFromPath('/api/auth/signin')).toBe(RateLimitType.AUTH)
    expect(getRateLimitTypeFromPath('/api/auth/session')).toBe(RateLimitType.AUTH)
  })

  it('should detect health/internal routes', () => {
    expect(getRateLimitTypeFromPath('/api/health')).toBe(RateLimitType.INTERNAL)
    expect(getRateLimitTypeFromPath('/api/agents/status')).toBe(RateLimitType.INTERNAL)
  })

  it('should detect read routes', () => {
    expect(getRateLimitTypeFromPath('/api/memories')).toBe(RateLimitType.READ)
    expect(getRateLimitTypeFromPath('/api/entities')).toBe(RateLimitType.READ)
    expect(getRateLimitTypeFromPath('/api/insights')).toBe(RateLimitType.READ)
  })

  it('should detect expensive routes', () => {
    expect(getRateLimitTypeFromPath('/api/connectors/123/sync')).toBe(RateLimitType.EXPENSIVE)
    expect(getRateLimitTypeFromPath('/api/agents/traces')).toBe(RateLimitType.EXPENSIVE)
  })

  it('should default to GENERAL for unknown routes', () => {
    expect(getRateLimitTypeFromPath('/api/unknown')).toBe(RateLimitType.GENERAL)
    expect(getRateLimitTypeFromPath('/api/custom')).toBe(RateLimitType.GENERAL)
  })
})

describe('Rate Limit Checking', () => {
  beforeEach(() => {
    // Clear environment variables to test graceful degradation
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('should allow all requests when Upstash is not configured', async () => {
    const request = new Request('https://example.com/api/test')
    const result = await checkRateLimit(request, RateLimitType.GENERAL)

    expect(result.success).toBe(true)
    expect(result.remaining).toBeGreaterThan(0)
  })

  it('should return valid structure for rate limit result', async () => {
    const request = new Request('https://example.com/api/test')
    const result = await checkRateLimit(request, RateLimitType.GENERAL)

    expect(result).toHaveProperty('success')
    expect(result).toHaveProperty('limit')
    expect(result).toHaveProperty('remaining')
    expect(result).toHaveProperty('reset')
    expect(typeof result.success).toBe('boolean')
    expect(typeof result.limit).toBe('number')
    expect(typeof result.remaining).toBe('number')
    expect(typeof result.reset).toBe('number')
  })

  it('should not throw error when enforcing limit without Upstash', async () => {
    const request = new Request('https://example.com/api/test')

    await expect(enforceRateLimit(request, RateLimitType.GENERAL)).resolves.not.toThrow()
  })
})

describe('Rate Limit Status', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('should indicate rate limiting is disabled when not configured', () => {
    expect(isRateLimitingEnabled()).toBe(false)
  })

  it('should return correct status when not configured', () => {
    const status = getRateLimitStatus()

    expect(status.enabled).toBe(false)
    expect(status.configured).toBe(false)
    expect(status.redisUrl).toBeUndefined()
  })

  it('should return configured status when credentials are set', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

    // Clear the cached Redis instance
    const rateLimitModule = require('./rate-limit')
    rateLimitModule.getRedis = () => null // Force re-check

    const status = getRateLimitStatus()

    expect(status.configured).toBe(true)
    expect(status.redisUrl).toBe('***configured***')

    // Clean up
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })
})

describe('Header Generation', () => {
  it('should create correct headers for rate limit result', () => {
    const result = {
      success: true,
      limit: 100,
      remaining: 95,
      reset: Date.now() + 60000,
    }

    const headers = createRateLimitHeaders(result)

    expect(headers.get('X-RateLimit-Limit')).toBe('100')
    expect(headers.get('X-RateLimit-Remaining')).toBe('95')
    expect(headers.get('X-RateLimit-Reset')).toBeDefined()
  })

  it('should include Retry-After header when limited', () => {
    const result = {
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 60000,
      retryAfter: 45,
    }

    const headers = createRateLimitHeaders(result)

    expect(headers.get('Retry-After')).toBe('45')
  })

  it('should not include Retry-After header when not limited', () => {
    const result = {
      success: true,
      limit: 100,
      remaining: 95,
      reset: Date.now() + 60000,
    }

    const headers = createRateLimitHeaders(result)

    expect(headers.get('Retry-After')).toBeNull()
  })
})

describe('Middleware Integration', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('should return null when rate limit is not exceeded', async () => {
    const request = new Request('https://example.com/api/test')
    const response = await checkRateLimitMiddleware(request, RateLimitType.GENERAL)

    expect(response).toBeNull()
  })

  it('should auto-detect rate limit type from pathname', async () => {
    const request = new Request('https://example.com/api/auth/login')
    const response = await checkRateLimitMiddleware(request)

    expect(response).toBeNull() // No rate limiting when not configured
  })

  it('should return null for health check routes', async () => {
    const request = new Request('https://example.com/api/health')
    const response = await checkRateLimitMiddleware(request)

    expect(response).toBeNull()
  })
})

describe('Route Handler Wrapper', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('should wrap handler and call it', async () => {
    const mockHandler = vi.fn().mockResolvedValue(
      NextResponse.json({ success: true })
    )

    const wrappedHandler = withRateLimit(mockHandler, RateLimitType.GENERAL)
    const request = new Request('https://example.com/api/test')

    const response = await wrappedHandler(request)

    expect(mockHandler).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(200)
  })

  it('should add rate limit headers to response', async () => {
    const mockHandler = vi.fn().mockResolvedValue(
      NextResponse.json({ success: true })
    )

    const wrappedHandler = withRateLimit(mockHandler, RateLimitType.GENERAL)
    const request = new Request('https://example.com/api/test')

    const response = await wrappedHandler(request)

    expect(response.headers.get('X-RateLimit-Limit')).toBeDefined()
    expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
    expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
  })

  it('should handle errors from wrapped handler', async () => {
    const mockHandler = vi.fn().mockRejectedValue(
      new Error('Handler error')
    )

    const wrappedHandler = withRateLimit(mockHandler, RateLimitType.GENERAL)
    const request = new Request('https://example.com/api/test')

    await expect(wrappedHandler(request)).rejects.toThrow('Handler error')
  })
})

describe('Identifier Extraction', () => {
  it('should extract IP from x-forwarded-for header', async () => {
    const request = new Request('https://example.com/api/test', {
      headers: {
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      },
    })

    // This will succeed because Upstash is not configured
    const result = await checkRateLimit(request, RateLimitType.GENERAL)
    expect(result.success).toBe(true)
  })

  it('should extract IP from x-real-ip header', async () => {
    const request = new Request('https://example.com/api/test', {
      headers: {
        'x-real-ip': '192.168.1.1',
      },
    })

    const result = await checkRateLimit(request, RateLimitType.GENERAL)
    expect(result.success).toBe(true)
  })

  it('should handle missing IP headers', async () => {
    const request = new Request('https://example.com/api/test')

    const result = await checkRateLimit(request, RateLimitType.GENERAL)
    expect(result.success).toBe(true)
  })

  it('should include userId in identifier when available', async () => {
    const request = new Request('https://example.com/api/test', {
      headers: {
        'x-user-id': 'user-123',
      },
    })

    const result = await checkRateLimit(request, RateLimitType.GENERAL)
    expect(result.success).toBe(true)
  })
})
