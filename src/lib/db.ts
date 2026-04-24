import { PrismaClient } from '@prisma/client'
import { env } from './env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
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
// During build, database might not be available - don't fail the build
db.$connect()
  .then(() => {
    console.log('✅ Database connected successfully')
  })
  .catch((error) => {
    // If database connection fails during build, log warning but don't exit
    // This handles Railway's build phase where database isn't available
    const isLikelyBuildTime = process.env.NEXT_BUILD === '1' ||
                              process.env.NODE_ENV === undefined ||
                              env.NODE_ENV === 'development'

    if (isLikelyBuildTime) {
      console.warn('⚠️ Database not available during build (this is expected)')
      console.warn('Database connection will be established at runtime')
    } else {
      console.error('❌ Database connection failed:', error.message)
      console.error('Check your DATABASE_URL environment variable')
      console.error('Current DATABASE_URL:', env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'))
      process.exit(1)
    }
  })

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await db.$disconnect()
  })
}
