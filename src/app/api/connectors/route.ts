// Force dynamic rendering - don't prerender at build time
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import {
  CreateConnectorSchema,
  UpdateConnectorSchema,
} from '@/lib/validations/connector'
import { validateRequest, validationErrorResponse } from '@/lib/validate'
import { logCreate, logFailure, sanitizeData } from '@/lib/audit'

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
      include: {
        _count: {
          select: { memories: true },
        },
      },
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

  // Validate input with Zod
  const { data, error } = await validateRequest(CreateConnectorSchema, request)

  if (error || !data) {
    return validationErrorResponse(error)
  }

  try {
    const connector = await db.connector.create({
      data: {
        type: data.type,
        name: data.name,
        config: JSON.stringify(data.config || {}),
        status: data.status || 'disconnected',
        userId,
      },
    })

    // Audit log the creation
    await logCreate(userId, 'Connector', connector.id, sanitizeData({
      type: connector.type,
      name: connector.name,
      status: connector.status,
    }))

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
    await logFailure(userId, 'create', 'Connector', null, String(error))
    return NextResponse.json(
      {
        error: 'Failed to create connector',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
