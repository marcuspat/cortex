import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { UpdateConnectorSchema } from '@/lib/validations/connector'
import { validateRequest, validationErrorResponse } from '@/lib/validate'

// GET /api/connectors/[id] - Get a specific connector
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId()

  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 }
    )
  }

  try {
    const { id } = await params
    const connector = await db.connector.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: { memories: true },
        },
      },
    })

    if (!connector) {
      return NextResponse.json(
        { error: 'Connector not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: connector })
  } catch (error) {
    console.error('Connector get error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connector', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// PUT /api/connectors/[id] - Update a connector
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId()

  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 }
    )
  }

  // Validate input with Zod
  const { data, error } = await validateRequest(UpdateConnectorSchema, request)

  if (error || !data) {
    return validationErrorResponse(error)
  }

  try {
    const { id } = await params

    // Verify connector belongs to user
    const existing = await db.connector.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Connector not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const updated = await db.connector.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.config !== undefined && { config: JSON.stringify(data.config) }),
        ...(data.status !== undefined && { status: data.status }),
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Connector update error:', error)
    return NextResponse.json(
      { error: 'Failed to update connector', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// DELETE /api/connectors/[id] - Delete a connector
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId()

  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 }
    )
  }

  try {
    const { id } = await params

    // Verify connector belongs to user
    const existing = await db.connector.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Connector not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    await db.connector.delete({ where: { id } })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Connector delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete connector', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
