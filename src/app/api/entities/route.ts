import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
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

    const response = NextResponse.json({
      data: entities,
      meta: {
        count: entities.length,
      },
    })

    response.headers.set('x-request-id', requestId)
    response.headers.set('x-response-time', `${Date.now() - startTime}ms`)

    return response
  } catch (error) {
    console.error('Entities list error:', error)
    throw error
  }
}
