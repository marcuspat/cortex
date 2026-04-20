import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentType = searchParams.get('agentType')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const where: Prisma.AgentTraceWhereInput = {}

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

    return NextResponse.json({
      data: traces,
      pagination: {
        total,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('Agent traces list error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent traces' },
      { status: 500 }
    )
  }
}
