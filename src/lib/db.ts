import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Validate database connection on startup in production
if (process.env.NODE_ENV === 'production') {
  db.$connect()
    .then(() => console.log('✅ Database connected successfully'))
    .catch((error) => {
      console.error('❌ Database connection failed:', error)
      process.exit(1)
    })
}