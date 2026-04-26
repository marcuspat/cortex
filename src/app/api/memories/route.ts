// Force dynamic rendering - don't prerender at build time
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { withRateLimit } from '@/lib/rate-limit'
import { RateLimitType } from '@/lib/rate-limit'
import { AuthRequiredError, generateRequestId } from '@/lib/errors'
import { logger } from '@/lib/logger'

async function getMemoriesHandler(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()

  const userId = await getCurrentUserId()

  if (!userId) {
    logger.warn('Unauthorized memories list attempt', { requestId })

    // DEV MODE: Return sample data for testing without OAuth
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        data: [
          {
            id: 'sample-mem-1',
            title: 'Project Planning Notes',
            content: 'Discussed timeline and deliverables for Q2. Key milestones identified.',
            sourceType: 'notion',
            connectorId: 'conn-1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            accessCount: 5,
            relevanceScore: 0.89,
            sourceTimestamp: new Date().toISOString(),
            connector: { id: 'conn-1', name: 'Notion Workspace', type: 'notion' },
            entities: [],
          },
          {
            id: 'sample-mem-2',
            title: 'Gmail Thread: API Integration',
            content: 'Thread about integrating the new API endpoints. Discussed authentication flow.',
            sourceType: 'gmail',
            connectorId: 'conn-2',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 86400000).toISOString(),
            accessCount: 12,
            relevanceScore: 0.92,
            sourceTimestamp: new Date(Date.now() - 86400000).toISOString(),
            connector: { id: 'conn-2', name: 'Gmail', type: 'gmail' },
            entities: [],
          },
          {
            id: 'sample-mem-3',
            title: 'GitHub PR Review',
            content: 'Pull request #123 reviewing the new authentication middleware. Several improvements suggested.',
            sourceType: 'github',
            connectorId: 'conn-3',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            updatedAt: new Date(Date.now() - 172800000).toISOString(),
            accessCount: 8,
            relevanceScore: 0.85,
            sourceTimestamp: new Date(Date.now() - 172800000).toISOString(),
            connector: { id: 'conn-3', name: 'GitHub', type: 'github' },
            entities: [],
          },
        ],
        pagination: { total: 3, limit: 20, offset: 0 },
      })
    }

    throw new AuthRequiredError()
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const sourceType = searchParams.get('sourceType')
    const connectorId = searchParams.get('connectorId')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    logger.logRequest(requestId, 'GET', '/api/memories', userId)

    const where: Prisma.MemoryWhereInput = {
      userId, // CRITICAL: Filter by userId for data isolation
    }

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

    const response = NextResponse.json({
      data: memories,
      pagination: {
        total,
        limit,
        offset,
      },
    })

    response.headers.set('x-request-id', requestId)
    response.headers.set('x-response-time', `${Date.now() - startTime}ms`)

    logger.logResponse(requestId, 'GET', '/api/memories', 200, Date.now() - startTime)
    return response
  } catch (error) {
    logger.logError(requestId, error as Error, { path: '/api/memories', userId })
    throw error
  }
}

// Wrap with rate limiting (read-heavy endpoints have higher limits)
export const GET = withRateLimit(getMemoriesHandler, RateLimitType.READ)
