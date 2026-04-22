import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'

// GET /api/connectors - List all connectors for current user
export async function GET() {
  const userId = await getCurrentUserId()

  if (!userId) {
    return NextResponse.json(
      {
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      },
      { status: 401 }
    )
  }

  try {
    const connectors = await db.connector.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      data: connectors,
      meta: {
        count: connectors.length,
      },
    })
  } catch (error) {
    console.error('Failed to fetch connectors:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch connectors',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}

// POST /api/connectors - Create a new connector for current user
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId()

  if (!userId) {
    return NextResponse.json(
      {
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()

    // Basic validation (will be replaced with Zod in Task 1.2)
    const { type, name, config } = body

    if (!type || !name) {
      return NextResponse.json(
        {
          error: 'Missing required fields: type and name are required',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }

    const connector = await db.connector.create({
      data: {
        type,
        name,
        config: JSON.stringify(config || {}),
        userId,
      },
    })

    return NextResponse.json(
      {
        data: connector,
        meta: {
          version: '1.0',
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create connector:', error)
    return NextResponse.json(
      {
        error: 'Failed to create connector',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
