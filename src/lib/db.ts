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
if (env.NODE_ENV === 'production') {
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
