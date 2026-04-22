import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { logDelete, logFailure, sanitizeData } from '@/lib/audit'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const memory = await db.memory.findUnique({
      where: { id },
      include: {
        connector: {
          select: { id: true, name: true, type: true },
        },
        entities: {
          include: {
            entity: true,
          },
        },
      },
    })

    if (!memory) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      )
    }

    // Increment access count
    await db.memory.update({
      where: { id },
      data: { accessCount: { increment: 1 } },
    })

    return NextResponse.json({ ...memory, accessCount: memory.accessCount + 1 })
  } catch (error) {
    console.error('Memory get error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch memory' },
      { status: 500 }
    )
  }
}

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

    const memory = await db.memory.findFirst({
      where: { id, userId },
    })

    if (!memory) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      )
    }

    // Capture data before deletion
    const deletedData = {
      title: memory.title,
      sourceType: memory.sourceType,
      chunkIndex: memory.chunkIndex,
      tags: memory.tags,
    }

    await db.memory.delete({ where: { id } })

    // Audit log the deletion
    await logDelete(userId, 'Memory', id, deletedData)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Memory delete error:', error)
    const { id } = await params
    await logFailure(userId || 'unknown', 'delete', 'Memory', id, String(error))
    return NextResponse.json(
      { error: 'Failed to delete memory' },
      { status: 500 }
    )
  }
}
