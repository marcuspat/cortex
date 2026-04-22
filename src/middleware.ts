import { NextRequest, NextResponse } from 'next/server'
import { addSecurityHeaders, handleOptions } from '@/lib/security'
import { checkRateLimitMiddleware } from '@/lib/rate-limit'

// ===========================================
// MIDDLEWARE
// ===========================================

/**
 * Next.js middleware for security headers, CORS, and rate limiting
 * Runs on all API routes
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Handle OPTIONS preflight requests
  if (request.method === 'OPTIONS') {
    return handleOptions(request)
  }

  // Check rate limit (non-blocking - adds headers even if not enabled)
  const rateLimitResponse = await checkRateLimitMiddleware(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Add security headers
  return addSecurityHeaders(response)
}

/**
 * Middleware configuration
 * Apply to all API routes
 */
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match NextAuth routes
    '/api/auth/:path*',
  ],
}
