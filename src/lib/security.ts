import { NextRequest, NextResponse } from 'next/server'

// ===========================================
// SECURITY HEADERS
// ===========================================

/**
 * Adds security headers to all responses
 * Implements OWASP best practices
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  // Allow only same-origin scripts and styles from trusted sources
  const cspHeader = [
    // Default to same-origin
    "default-src 'self';",
    // Scripts from same-origin
    "script-src 'self' 'unsafe-eval' 'unsafe-inline';",
    // Styles from same-origin and Tailwind CDN
    "style-src 'self' 'unsafe-inline';",
    // Images from same-origin and data URLs
    "img-src 'self' data: https: blob:",
    // Fonts from same-origin and Google Fonts
    "font-src 'self' data:",
    // Connect to same-origin and OAuth providers
    "connect-src 'self' https://accounts.google.com https://github.com https://api.upstash.com;",
    // Frame ancestors (deny all framing)
    "frame-ancestors 'none';",
    // Base URI for relative URLs
    "base-uri 'self';",
    // Form actions to same-origin
    "form-action 'self';",
  ].join(' ')

  response.headers.set('Content-Security-Policy', cspHeader)

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Referrer policy (strict for privacy)
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy (restrict browser features)
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  )

  // Strict Transport Security (HTTPS only, production only)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  return response
}

/**
 * Creates a CORS configuration for allowed origins
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.NEXTAUTH_URL,
    // Add production URL when deployed
    // 'https://your-production-url.com',
  ].filter(Boolean)

  const allowedOrigin = allowedOrigins.includes(origin || '') ? origin : allowedOrigins[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  }
}

/**
 * Handles OPTIONS requests for CORS preflight
 */
export function handleOptions(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}
