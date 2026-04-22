/**
 * Rate Limiting Configuration and Utilities
 *
 * Uses Upstash Redis for distributed rate limiting with graceful fallback
 * when credentials are not configured.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { RateLimitError } from './errors'

// ===========================================
// TYPES
// ===========================================

export enum RateLimitType {
  /** Strict limits for authentication endpoints */
  AUTH = 'auth',
  /** Standard limits for general API routes */
  GENERAL = 'general',
  /** Higher limits for read-heavy operations */
  READ = 'read',
  /** High limits for internal/health endpoints */
  INTERNAL = 'internal',
  /** Special limits for expensive operations */
  EXPENSIVE = 'expensive',
}

export interface RateLimitConfig {
  limit: number
  window: string // in seconds, e.g., '60s' for 60 seconds
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

// ===========================================
// CONFIGURATION
// ===========================================

/**
 * Rate limit configurations for different endpoint types
 */
export const RATE_LIMIT_CONFIGS: Record<RateLimitType, RateLimitConfig> = {
  [RateLimitType.AUTH]: {
    limit: 10, // 10 requests
    window: '60s', // per minute
  },
  [RateLimitType.GENERAL]: {
    limit: 100,
    window: '60s',
  },
  [RateLimitType.READ]: {
    limit: 200,
    window: '60s',
  },
  [RateLimitType.INTERNAL]: {
    limit: 1000,
    window: '60s',
  },
  [RateLimitType.EXPENSIVE]: {
    limit: 5,
    window: '60s',
  },
}

/**
 * Route type mappings for automatic rate limit selection
 */
export const ROUTE_RATE_LIMITS: Record<string, RateLimitType> = {
  // Auth routes
  '/api/auth': RateLimitType.AUTH,
  '/api/login': RateLimitType.AUTH,
  '/api/logout': RateLimitType.AUTH,
  '/api/register': RateLimitType.AUTH,

  // Expensive operations
  '/api/connectors/sync': RateLimitType.EXPENSIVE,
  '/api/agents/traces': RateLimitType.EXPENSIVE,

  // Read-heavy routes
  '/api/memories': RateLimitType.READ,
  '/api/entities': RateLimitType.READ,
  '/api/insights': RateLimitType.READ,
  '/api/dashboard': RateLimitType.READ,
  '/api/settings': RateLimitType.READ,

  // Internal/health
  '/api/health': RateLimitType.INTERNAL,
  '/api/agents/status': RateLimitType.INTERNAL,

  // Default
  '/api': RateLimitType.GENERAL,
}

// ===========================================
// RATE LIMITER INSTANCES
// ===========================================

let redisInstance: Redis | null = null
const limiterCache = new Map<string, Ratelimit>()

/**
 * Initialize Redis instance if credentials are available
 */
function getRedis(): Redis | null {
  if (redisInstance !== null) {
    return redisInstance
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!redisUrl || !redisToken) {
    console.warn('[RateLimit] Upstash Redis credentials not configured. Rate limiting is disabled.')
    redisInstance = null
    return null
  }

  try {
    redisInstance = new Redis({
      url: redisUrl,
      token: redisToken,
    })
    console.log('[RateLimit] Upstash Redis initialized successfully')
    return redisInstance
  } catch (error) {
    console.error('[RateLimit] Failed to initialize Upstash Redis:', error)
    redisInstance = null
    return null
  }
}

/**
 * Get or create a rate limiter instance for a specific configuration
 */
function getLimiter(config: RateLimitConfig): Ratelimit | null {
  const redis = getRedis()
  if (!redis) {
    return null
  }

  const cacheKey = `${config.limit}-${config.window}`

  if (limiterCache.has(cacheKey)) {
    return limiterCache.get(cacheKey)!
  }

  try {
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.limit, config.window),
      analytics: true,
      prefix: 'cortex-ratelimit',
    })

    limiterCache.set(cacheKey, limiter)
    return limiter
  } catch (error) {
    console.error('[RateLimit] Failed to create rate limiter:', error)
    return null
  }
}

// ===========================================
// RATE LIMITING FUNCTIONS
// ===========================================

/**
 * Extract identifier from request
 * Uses IP + userId when available, falls back to IP only
 */
function extractIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || 'unknown'

  // Try to get userId from session or header
  const userId = request.headers.get('x-user-id') ||
                 request.headers.get('authorization')?.split(' ')[1] ||
                 'anonymous'

  return `${ip}:${userId}`
}

/**
 * Check rate limit for a request
 * @param request - The incoming request
 * @param type - Type of rate limit to apply
 * @returns Rate limit result
 */
export async function checkRateLimit(
  request: Request,
  type: RateLimitType = RateLimitType.GENERAL
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIGS[type]
  const limiter = getLimiter(config)

  // No limiter available - allow all requests
  if (!limiter) {
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit,
      reset: Date.now() + 60_000,
    }
  }

  try {
    const identifier = extractIdentifier(request)
    const result = await limiter.limit(identifier)

    return {
      success: result.success,
      limit: config.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: result.retryAfter,
    }
  } catch (error) {
    console.error('[RateLimit] Error checking rate limit:', error)
    // On error, allow the request to fail open
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit,
      reset: Date.now() + 60_000,
    }
  }
}

/**
 * Check rate limit and throw error if exceeded
 * @param request - The incoming request
 * @param type - Type of rate limit to apply
 * @throws RateLimitError if limit exceeded
 */
export async function enforceRateLimit(
  request: Request,
  type: RateLimitType = RateLimitType.GENERAL
): Promise<void> {
  const result = await checkRateLimit(request, type)

  if (!result.success) {
    throw new RateLimitError(result.retryAfter)
  }
}

/**
 * Get rate limit type from route path
 * @param pathname - Route path
 * @returns Rate limit type
 */
export function getRateLimitTypeFromPath(pathname: string): RateLimitType {
  // Find the most specific matching route
  for (const [route, type] of Object.entries(ROUTE_RATE_LIMITS)) {
    if (pathname.startsWith(route)) {
      return type
    }
  }

  return RateLimitType.GENERAL
}

// ===========================================
// MIDDLEWARE HELPERS
// ===========================================

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers()
  headers.set('X-RateLimit-Limit', result.limit.toString())
  headers.set('X-RateLimit-Remaining', result.remaining.toString())
  headers.set('X-RateLimit-Reset', result.reset.toString())

  if (result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString())
  }

  return headers
}

/**
 * Check if rate limiting is enabled
 */
export function isRateLimitingEnabled(): boolean {
  return getRedis() !== null
}

/**
 * Get rate limit status for health checks
 */
export function getRateLimitStatus(): {
  enabled: boolean
  configured: boolean
  redisUrl?: string
} {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  return {
    enabled: isRateLimitingEnabled(),
    configured: !!(redisUrl && redisToken),
    redisUrl: redisUrl ? '***configured***' : undefined,
  }
}

// ===========================================
// NEXT.JS ROUTE HANDLERS
// ===========================================

/**
 * Higher-order function to wrap route handlers with rate limiting
 * @param handler - The route handler function
 * @param type - Type of rate limit to apply
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  type?: RateLimitType
): T {
  return (async (...args: any[]) => {
    const request = args[0] as Request

    // Auto-detect rate limit type from pathname if not provided
    const limitType = type || getRateLimitTypeFromPath(new URL(request.url).pathname)

    try {
      // Check rate limit
      const result = await checkRateLimit(request, limitType)

      // Add rate limit headers to response
      const response = await handler(...args)

      // Clone response to add headers
      const headers = createRateLimitHeaders(result)
      headers.forEach((value, key) => {
        response.headers.set(key, value)
      })

      return response
    } catch (error) {
      if (error instanceof RateLimitError) {
        // Return rate limit error response
        const headers = new Headers()
        if (error.details?.retryAfter) {
          headers.set('Retry-After', error.details.retryAfter.toString())
        }

        return NextResponse.json(error.toJSON(), {
          status: 429,
          headers,
        })
      }

      // Re-throw other errors
      throw error
    }
  }) as T
}

/**
 * Middleware-friendly rate limit checker
 * Returns NextResponse with 429 status if rate limited, otherwise null
 */
export async function checkRateLimitMiddleware(
  request: Request,
  type?: RateLimitType
): Promise<NextResponse | null> {
  const limitType = type || getRateLimitTypeFromPath(new URL(request.url).pathname)
  const result = await checkRateLimit(request, limitType)

  if (!result.success) {
    const headers = createRateLimitHeaders(result)
    const error = new RateLimitError(result.retryAfter)

    return NextResponse.json(error.toJSON(), {
      status: 429,
      headers,
    })
  }

  return null
}
