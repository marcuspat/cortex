import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { AuthRequiredError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId()

  if (!userId) {
    throw new AuthRequiredError()
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || undefined
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const entities = await db.entity.findMany({
      where: {
        memories: {
          some: {
            userId,
          },
        },
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { canonicalName: { contains: search, mode: 'insensitive' } },
            { aliases: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        _count: {
          select: { memories: true },
        },
      },
    })

    return NextResponse.json({
      data: entities,
      meta: {
        count: entities.length,
      },
    })
  } catch (error) {
    console.error('Entities list error:', error)
    throw error
  }
}
