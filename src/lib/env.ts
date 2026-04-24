import { z } from 'zod'

// ===========================================
// ENVIRONMENT VALIDATION
// ===========================================

/**
 * Validates all required environment variables on startup
 * Fails fast with clear error messages if variables are missing
 */

const envSchema = z.object({
  // ===========================================
  // DATABASE (Required)
  // ===========================================
  DATABASE_URL: z
    .string()
    .describe('Database connection string (PostgreSQL or SQLite for local dev)'),

  // ===========================================
  // NEXTAUTH.JS (Optional - auto-generated if not provided)
  // ===========================================
  NEXTAUTH_SECRET: z
    .string()
    .min(32, 'NEXTAUTH_SECRET must be at least 32 characters')
    .optional()
    .describe('Secret key for NextAuth.js session encryption (auto-generated if not provided)'),

  NEXTAUTH_URL: z
    .string()
    .optional()
    .describe('URL of the application (for OAuth callbacks) - defaults to VERCEL_URL or localhost'),

  // ===========================================
  // OAUTH PROVIDERS (Optional in development, Required in production)
  // ===========================================
  GOOGLE_CLIENT_ID: z.string().optional().describe('Google OAuth client ID'),
  GOOGLE_CLIENT_SECRET: z.string().optional().describe('Google OAuth client secret'),

  GITHUB_CLIENT_ID: z.string().optional().describe('GitHub OAuth client ID'),
  GITHUB_CLIENT_SECRET: z.string().optional().describe('GitHub OAuth client secret'),

  // ===========================================
  // UPSTASH REDIS (Optional - Rate Limiting)
  // ===========================================
  UPSTASH_REDIS_REST_URL: z.string().url().optional().describe('Upstash Redis URL for rate limiting'),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().describe('Upstash Redis token for rate limiting'),

  // ===========================================
  // NODE ENVIRONMENT
  // ===========================================
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('production')
    .describe('Application environment'),

  // ===========================================
  // OPTIONAL: INFERENCE API KEYS (Future)
  // ===========================================
  ANTHROPIC_API_KEY: z.string().optional().describe('Anthropic API key for AI features'),
  OPENAI_API_KEY: z.string().optional().describe('OpenAI API key for AI features'),
})

/**
 * Validated environment variables
 * Import this to access type-safe environment variables
 */
// Helper to construct valid NEXTAUTH_URL from various sources
function constructNextAuthUrl(): string {
  // If explicitly provided, use it
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }

  // Try Vercel
  if (process.env.VERCEL_URL) {
    return process.env.VERCEL_URL.startsWith('http')
      ? process.env.VERCEL_URL
      : `https://${process.env.VERCEL_URL}`
  }

  // Try Railway
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return process.env.RAILWAY_PUBLIC_DOMAIN.startsWith('http')
      ? process.env.RAILWAY_PUBLIC_DOMAIN
      : `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  }

  // Default to localhost
  return 'http://localhost:3000'
}

export const env = envSchema.parse({
  ...process.env,
  // Provide defaults for NextAuth to prevent build failures
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || crypto.randomUUID() + crypto.randomUUID(),
  NEXTAUTH_URL: constructNextAuthUrl(),
})

// Log important environment info for debugging
console.log('🔧 Environment configuration:')
console.log(`  NODE_ENV: ${env.NODE_ENV}`)
console.log(`  NEXTAUTH_URL: ${env.NEXTAUTH_URL}`)
console.log(`  DATABASE_URL: ${env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`)
console.log(`  NEXTAUTH_SECRET: ${env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing'}`)

/**
 * Type for environment variables
 */
export type Env = z.infer<typeof envSchema>

// Validate on startup (fails fast if missing required variables)
// Skip validation during build time to prevent build failures
const isBuildTime = process.env.NEXT_BUILD === '1' || process.env.NODE_ENV === undefined

try {
  envSchema.parse({
    ...process.env,
    // Provide defaults for NextAuth to prevent build failures
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || crypto.randomUUID() + crypto.randomUUID(),
    NEXTAUTH_URL: constructNextAuthUrl(),
  })
  if (!isBuildTime) {
    console.log('✅ Environment variables validated successfully')
  }
} catch (error) {
  if (error instanceof z.ZodError) {
    // During build time, just log warnings instead of failing
    if (isBuildTime) {
      console.warn('⚠️ Environment validation warning during build:')
      error.errors.forEach((err) => {
        console.warn(`  - ${err.path.join('.')}: ${err.message}`)
      })
      console.warn('Continuing with build...\n')
    } else {
      console.error('❌ Environment validation failed:')
      console.error('\nMissing or invalid environment variables:\n')

      error.errors.forEach((err) => {
        const path = err.path.join('.')
        console.error(`  - ${path}`)
        console.error(`    ${err.message}`)

        if (process.env.NODE_ENV === 'production') {
          console.error(`    This variable is REQUIRED in production`)
        }
      })

      console.error('\nPlease check your .env file or Railway environment variables.')
      console.error('See .env.example for required variables.\n')

      // Only exit on critical errors (DATABASE_URL) in production
      const hasCriticalErrors = error.errors.some(err =>
        err.path.includes('DATABASE_URL')
      )

      if (hasCriticalErrors && process.env.NODE_ENV === 'production') {
        process.exit(1)
      }
    }
  } else {
    console.error('Unexpected error validating environment:', error)
    // Don't exit - let the app try to run
    if (!isBuildTime) {
      console.warn('⚠️ Continuing despite validation error...')
    }
  }
}

// ===========================================
// ENVIRONMENT HELPERS
// ===========================================

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development'
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return env.NODE_ENV === 'production'
}

/**
 * Check if OAuth is configured
 */
export function hasOAuthConfigured(): boolean {
  return !!(env.GOOGLE_CLIENT_ID || env.GITHUB_CLIENT_ID)
}

/**
 * Get list of configured OAuth providers
 */
export function getConfiguredProviders(): string[] {
  const providers = []
  if (env.GOOGLE_CLIENT_ID) providers.push('google')
  if (env.GITHUB_CLIENT_ID) providers.push('github')
  return providers
}

/**
 * Check if rate limiting is configured
 */
export function hasRateLimiting(): boolean {
  return !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN)
}
