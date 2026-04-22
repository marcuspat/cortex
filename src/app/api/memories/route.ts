import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { withRateLimit } from '@/lib/rate-limit'
import { RateLimitType } from '@/lib/rate-limit'

async function getMemoriesHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const sourceType = searchParams.get('sourceType')
    const connectorId = searchParams.get('connectorId')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const where: Prisma.MemoryWhereInput = {}

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ]
    }

    if (sourceType) {
      where.sourceType = sourceType
    }

    if (connectorId) {
      where.connectorId = connectorId
    }

    const orderBy: Prisma.MemoryOrderByWithRelationInput = {}
    if (
      ['createdAt', 'updatedAt', 'accessCount', 'relevanceScore', 'sourceTimestamp'].includes(
        sortBy
      )
    ) {
      ;(orderBy as Record<string, string>)[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc'
    } else {
      orderBy.createdAt = 'desc'
    }

    const [memories, total] = await Promise.all([
      db.memory.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: {
          connector: {
            select: { id: true, name: true, type: true },
          },
          entities: {
            include: {
              entity: {
                select: { id: true, name: true, type: true },
              },
            },
          },
        },
      }),
      db.memory.count({ where }),
    ])

    return NextResponse.json({
      data: memories,
      pagination: {
        total,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('Memories list error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch memories' },
      { status: 500 }
    )
  }
}

// Wrap with rate limiting (read-heavy endpoints have higher limits)
export const GET = withRateLimit(getMemoriesHandler, RateLimitType.READ)
