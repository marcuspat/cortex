/**
 * Environment Validation Tests
 *
 * Tests for environment variable validation,
 * environment helpers, and configuration checks.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'

describe('Environment Validation', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env }

    // Set up valid default environment
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test'
    process.env.NEXTAUTH_SECRET = 'a'.repeat(32)
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
  })

  describe('Environment Schema', () => {
    it('should validate required environment variables', async () => {
      const envModule = await import('../env')

      expect(envModule.env).toBeDefined()
      expect(envModule.env.DATABASE_URL).toBe(process.env.DATABASE_URL)
      expect(envModule.env.NEXTAUTH_SECRET).toBe(process.env.NEXTAUTH_SECRET)
      expect(envModule.env.NEXTAUTH_URL).toBe(process.env.NEXTAUTH_URL)
    })

    it('should accept optional OAuth variables', async () => {
      process.env.GOOGLE_CLIENT_ID = 'google-client-id'
      process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret'
      process.env.GITHUB_CLIENT_ID = 'github-client-id'
      process.env.GITHUB_CLIENT_SECRET = 'github-client-secret'

      // Clear the module cache to force re-import
      const modulePath = '/workspaces/cortex/src/lib/env.ts'
      delete require.cache[require.resolve(modulePath)]

      const envModule = await import('../env')

      expect(envModule.env.GOOGLE_CLIENT_ID).toBe('google-client-id')
      expect(envModule.env.GITHUB_CLIENT_ID).toBe('github-client-id')
    })

    it('should accept optional Upstash Redis variables', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://redis.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'redis-token'

      const envModule = await import('../env')

      expect(envModule.env.UPSTASH_REDIS_REST_URL).toBe('https://redis.upstash.io')
      expect(envModule.env.UPSTASH_REDIS_REST_TOKEN).toBe('redis-token')
    })

    it('should accept optional API keys', async () => {
      process.env.ANTHROPIC_API_KEY = 'anthropic-key'
      process.env.OPENAI_API_KEY = 'openai-key'

      const envModule = await import('../env')

      expect(envModule.env.ANTHROPIC_API_KEY).toBe('anthropic-key')
      expect(envModule.env.OPENAI_API_KEY).toBe('openai-key')
    })

    it('should default NODE_ENV to development', async () => {
      delete process.env.NODE_ENV

      const envModule = await import('../env')

      expect(envModule.env.NODE_ENV).toBe('development')
    })

    it('should accept production NODE_ENV', async () => {
      process.env.NODE_ENV = 'production'

      const envModule = await import('../env')

      expect(envModule.env.NODE_ENV).toBe('production')
    })

    it('should accept test NODE_ENV', async () => {
      process.env.NODE_ENV = 'test'

      const envModule = await import('../env')

      expect(envModule.env.NODE_ENV).toBe('test')
    })
  })

  describe('Environment Helpers', () => {
    it('should detect development environment', async () => {
      process.env.NODE_ENV = 'development'

      const envModule = await import('../env')

      expect(envModule.isDevelopment()).toBe(true)
      expect(envModule.isProduction()).toBe(false)
    })

    it('should detect production environment', async () => {
      process.env.NODE_ENV = 'production'

      const envModule = await import('../env')

      expect(envModule.isDevelopment()).toBe(false)
      expect(envModule.isProduction()).toBe(true)
    })

    it('should detect test environment', async () => {
      process.env.NODE_ENV = 'test'

      const envModule = await import('../env')

      expect(envModule.isDevelopment()).toBe(false)
      expect(envModule.isProduction()).toBe(false)
    })

    it('should return false for helpers in wrong environment', async () => {
      process.env.NODE_ENV = 'production'

      const envModule = await import('../env')

      expect(envModule.isDevelopment()).toBe(false)
    })

    it('should detect OAuth configuration - Google only', async () => {
      process.env.GOOGLE_CLIENT_ID = 'google-id'
      delete process.env.GITHUB_CLIENT_ID

      const envModule = await import('../env')

      expect(envModule.hasOAuthConfigured()).toBe(true)
      expect(envModule.getConfiguredProviders()).toEqual(['google'])
    })

    it('should detect OAuth configuration - GitHub only', async () => {
      delete process.env.GOOGLE_CLIENT_ID
      process.env.GITHUB_CLIENT_ID = 'github-id'

      const envModule = await import('../env')

      expect(envModule.hasOAuthConfigured()).toBe(true)
      expect(envModule.getConfiguredProviders()).toEqual(['github'])
    })

    it('should detect OAuth configuration - both providers', async () => {
      process.env.GOOGLE_CLIENT_ID = 'google-id'
      process.env.GITHUB_CLIENT_ID = 'github-id'

      const envModule = await import('../env')

      expect(envModule.hasOAuthConfigured()).toBe(true)
      expect(envModule.getConfiguredProviders()).toEqual(['google', 'github'])
    })

    it('should detect no OAuth configuration', async () => {
      delete process.env.GOOGLE_CLIENT_ID
      delete process.env.GITHUB_CLIENT_ID

      const envModule = await import('../env')

      expect(envModule.hasOAuthConfigured()).toBe(false)
      expect(envModule.getConfiguredProviders()).toEqual([])
    })

    it('should detect rate limiting configuration', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://redis.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'token'

      const envModule = await import('../env')

      expect(envModule.hasRateLimiting()).toBe(true)
    })

    it('should detect missing rate limiting configuration - missing URL', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL

      const envModule = await import('../env')

      expect(envModule.hasRateLimiting()).toBe(false)
    })

    it('should detect missing rate limiting configuration - missing token', async () => {
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const envModule = await import('../env')

      expect(envModule.hasRateLimiting()).toBe(false)
    })

    it('should detect missing rate limiting configuration - both missing', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const envModule = await import('../env')

      expect(envModule.hasRateLimiting()).toBe(false)
    })
  })

  describe('Environment Type Safety', () => {
    it('should export Env type', async () => {
      const envModule = await import('../env')

      expect(envModule.Env).toBeDefined()
    })

    it('should infer type from schema', async () => {
      const envModule = await import('../env')

      // Type check - this will cause TypeScript error if types don't match
      const env: envModule.Env = envModule.env

      expect(env).toBeDefined()
      expect(env.DATABASE_URL).toBeTypeOf('string')
      expect(env.NEXTAUTH_SECRET).toBeTypeOf('string')
    })
  })

  describe('Environment Validation', () => {
    it('should validate URL format for DATABASE_URL', async () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test'

      const envModule = await import('../env')

      expect(envModule.env.DATABASE_URL).toBe('postgresql://localhost:5432/test')
    })

    it('should validate URL format for NEXTAUTH_URL', async () => {
      process.env.NEXTAUTH_URL = 'http://localhost:3000'

      const envModule = await import('../env')

      expect(envModule.env.NEXTAUTH_URL).toBe('http://localhost:3000')
    })

    it('should validate URL format for UPSTASH_REDIS_REST_URL when provided', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://redis.upstash.io'

      const envModule = await import('../env')

      expect(envModule.env.UPSTASH_REDIS_REST_URL).toBe('https://redis.upstash.io')
    })

    it('should validate NEXTAUTH_SECRET minimum length', async () => {
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32)

      const envModule = await import('../env')

      expect(envModule.env.NEXTAUTH_SECRET).toBe('a'.repeat(32))
    })
  })
})

