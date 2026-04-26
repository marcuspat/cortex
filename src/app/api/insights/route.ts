// Force dynamic rendering - don't prerender at build time
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { AuthRequiredError } from '@/lib/errors'

// GET /api/insights - List insights for current user
export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId()

  if (!userId) {
    throw new AuthRequiredError()
  }

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || undefined
    const status = searchParams.get('status') || undefined
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build where clause
    const where: any = { userId }
    if (type) {
      where.type = type
    }
    if (status) {
      where.status = status
    }

    // Build orderBy
    const orderBy: any = {}
    if (['createdAt', 'priority', 'updatedAt', 'expiresAt'].includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc'
    } else {
      orderBy.createdAt = 'desc'
    }

    const insights = await db.insightCard.findMany({
      where,
      orderBy,
      take: 100, // Limit to prevent large responses
    })

    return NextResponse.json({
      data: insights,
      meta: {
        count: insights.length,
        filters: { type, status },
      },
    })
  } catch (error) {
    console.error('Insights list error:', error)
    throw error
  }
}
