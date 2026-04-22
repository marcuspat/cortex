import { NextRequest, NextResponse } from 'next/server'
import { addSecurityHeaders, handleOptions } from '@/lib/security'

// ===========================================
// MIDDLEWARE
// ===========================================

/**
 * Next.js middleware for security headers and CORS
 * Runs on all API routes
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Handle OPTIONS preflight requests
  if (request.method === 'OPTIONS') {
    return handleOptions(request)
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
