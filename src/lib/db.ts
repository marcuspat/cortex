import { PrismaClient } from '@prisma/client'
import { env } from './env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Lazy initialization - only create Prisma client when actually used
// This prevents database connection attempts during build time
let prismaInstance: PrismaClient | undefined

function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance =
      globalForPrisma.prisma ??
      new PrismaClient({
        log: env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error', 'warn'],
      })

    if (env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prismaInstance
    }
  }
  return prismaInstance
}

// Export a proxy that defers initialization until first use
export const db = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrismaClient()
    return client[prop as keyof PrismaClient]
  },
})

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    if (prismaInstance) {
      await prismaInstance.$disconnect()
    }
  })
}
