import { PrismaClient } from '@prisma/client'
import { env } from './env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Detect if we're in build time - check multiple indicators
const isBuildTime = process.env.NEXT_BUILD === '1' ||
                    process.env.NODE_ENV === undefined ||
                    !process.env.DATABASE_URL?.includes('railway')

if (isBuildTime) {
  console.log('⚠️ Build mode detected - Database connection will be skipped')
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error', 'warn'],
  })

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
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
} else {
  console.log('⚠️ Skipping database connection during build time')
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await db.$disconnect()
  })
}
