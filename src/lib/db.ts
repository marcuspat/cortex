import { PrismaClient } from '@prisma/client'
import { env } from './env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Detect if we're in build time - check explicit flag first
const isBuildTime = process.env.NEXT_BUILD === 'true' ||
                    process.env.NEXT_BUILD === '1' ||
                    process.env.NODE_ENV === undefined

if (isBuildTime) {
  console.log('⚠️ Build mode detected - Using mock Prisma client')
}

// During build, create a mock client that doesn't connect to database
export const db =
  globalForPrisma.prisma ??
  (isBuildTime ? createMockPrismaClient() : new PrismaClient({
    log: env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error', 'warn'],
  }))

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Create a mock Prisma client for build time
function createMockPrismaClient(): any {
  return new Proxy({} as PrismaClient, {
    get(target, prop) {
      // Return mock functions for all Prisma operations
      if (prop === '$connect' || prop === '$disconnect') {
        return () => Promise.resolve()
      }
      // For any other operation (findMany, create, etc.), return a function that throws
      return () => {
        throw new Error(`Database operation "${String(prop)}" not available during build time`)
      }
    },
  })
}

// Validate database connection on startup
// During build, database might not be available - silently skip connection
if (!isBuildTime) {
  db.$connect()
    .then(() => {
      console.log('✅ Database connected successfully')
    })
    .catch((error) => {
      console.error('❌ Database connection failed:', error.message)
      console.error('Check your DATABASE_URL environment variable')
      console.error('Current DATABASE_URL:', env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'))
      process.exit(1)
    })
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await db.$disconnect()
  })
}
