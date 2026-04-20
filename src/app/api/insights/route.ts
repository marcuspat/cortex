import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const where: Prisma.InsightCardWhereInput = {}

    if (type) {
      where.type = type
    }

    if (status) {
      where.status = status
    }

    const orderBy: Prisma.InsightCardOrderByWithRelationInput = {}
    if (['createdAt', 'priority', 'updatedAt'].includes(sortBy)) {
      ;(orderBy as Record<string, string>)[sortBy] =
        sortOrder === 'asc' ? 'asc' : 'desc'
    } else {
      orderBy.createdAt = 'desc'
    }

    const insights = await db.insightCard.findMany({
      where,
      orderBy,
    })

    return NextResponse.json({ insights })
  } catch (error) {
    console.error('Insights list error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    )
  }
}
