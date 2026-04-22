import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateRequestId } from '@/lib/errors'
import { withRateLimit } from '@/lib/rate-limit'
import { RateLimitType } from '@/lib/rate-limit'

async function healthCheckHandler() {
  const requestId = generateRequestId()

  try {
    await db.$queryRaw`SELECT 1`

    const response = NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    })

    response.headers.set('x-request-id', requestId)

    return response
  } catch (error) {
    console.error('Health check failed:', error)

    const errorResponse = NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 503 }
    )

    errorResponse.headers.set('x-request-id', requestId)

    return errorResponse
  }
}

// Wrap with rate limiting (internal endpoints have high limits)
export const GET = withRateLimit(healthCheckHandler, RateLimitType.INTERNAL)
