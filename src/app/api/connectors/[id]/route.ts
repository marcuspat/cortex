import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { UpdateConnectorSchema } from '@/lib/validations/connector'
import { validateRequest, validationErrorResponse } from '@/lib/validate'
import { logUpdate, logDelete, logFailure, sanitizeData } from '@/lib/audit'

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

    // Capture before state
    const beforeData = {
      name: existing.name,
      status: existing.status,
      config: existing.config,
    }

    const updated = await db.connector.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.config !== undefined && { config: JSON.stringify(data.config) }),
        ...(data.status !== undefined && { status: data.status }),
      },
    })

    // Audit log the update
    await logUpdate(userId, 'Connector', id, beforeData, sanitizeData({
      name: updated.name,
      status: updated.status,
      config: updated.config,
    }))

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Connector update error:', error)
    const { id } = await params
    await logFailure(userId, 'update', 'Connector', id, String(error))
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

    // Capture data before deletion
    const deletedData = {
      type: existing.type,
      name: existing.name,
      status: existing.status,
      itemCount: existing.itemCount,
    }

    await db.connector.delete({ where: { id } })

    // Audit log the deletion
    await logDelete(userId, 'Connector', id, deletedData)

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Connector delete error:', error)
    const { id } = await params
    await logFailure(userId, 'delete', 'Connector', id, String(error))
    return NextResponse.json(
      { error: 'Failed to delete connector', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
