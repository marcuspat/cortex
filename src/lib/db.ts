import { PrismaClient } from '@prisma/client'
import { env } from './env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Lazy-load Prisma client - only instantiate when actually used
// This prevents database connection attempts during build time
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    // Check if we're in build time before creating client
    const isBuildTime = process.env.NEXT_BUILD === 'true' ||
                        process.env.NEXT_BUILD === '1' ||
                        process.env.NODE_ENV === undefined

    if (isBuildTime) {
      console.log('⚠️ Build mode: Skipping Prisma client instantiation')
      // Return a mock client during build
      globalForPrisma.prisma = createMockPrismaClient()
    } else {
      // Only create real Prisma client at runtime
      globalForPrisma.prisma = new PrismaClient({
        log: env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error', 'warn'],
      })
    }
  }

  return globalForPrisma.prisma
}

// Create a mock Prisma client for build time
function createMockPrismaClient(): any {
  return new Proxy({} as PrismaClient, {
    get(target, prop) {
      // Return mock functions for all Prisma operations
      if (prop === '$connect' || prop === '$disconnect') {
        return () => Promise.resolve()
      }
      // For any other operation, return a function that throws
      return () => {
        throw new Error(`Database operation "${String(prop)}" not available during build time`)
      }
    },
  })
}

// Export a getter that lazily initializes the client
export const db = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrismaClient()
    return client[prop as keyof PrismaClient]
  },
})

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    try {
      const client = getPrismaClient()
      await client.$disconnect()
    } catch (error) {
      // Ignore errors during shutdown
    }
  })
}
