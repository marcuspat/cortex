import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { AuthRequiredError, generateRequestId } from '@/lib/errors'

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()

  const userId = await getCurrentUserId()

  if (!userId) {
    throw new AuthRequiredError()
  }

  try {
    const { searchParams } = new URL(request.url)
    const agentType = searchParams.get('agentType')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const where: Prisma.AgentTraceWhereInput = {
      userId,
    }

    if (agentType) {
      where.agentType = agentType
    }

    if (status) {
      where.status = status
    }

    const [traces, total] = await Promise.all([
      db.agentTrace.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.agentTrace.count({ where }),
    ])

    const response = NextResponse.json({
      data: traces,
      pagination: {
        total,
        limit,
        offset,
      },
    })

    response.headers.set('x-request-id', requestId)
    response.headers.set('x-response-time', `${Date.now() - startTime}ms`)

    return response
  } catch (error) {
    console.error('Agent traces list error:', error)
    throw error
  }
}
