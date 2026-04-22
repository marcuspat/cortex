import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { NotFoundError, AuthRequiredError } from '@/lib/errors'

// GET /api/chat/sessions/[id] - Get a specific chat session with messages
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId()

  if (!userId) {
    throw new AuthRequiredError()
  }

  try {
    const { id } = await params

    const session = await db.chatSession.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!session) {
      throw new NotFoundError('Chat session')
    }

    return NextResponse.json({ data: session })
  } catch (error) {
    console.error('Chat session get error:', error)
    throw error
  }
}

// DELETE /api/chat/sessions/[id] - Delete a chat session
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId()

  if (!userId) {
    throw new AuthRequiredError()
  }

  try {
    const { id } = await params

    // Verify session belongs to user
    const existing = await db.chatSession.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      throw new NotFoundError('Chat session')
    }

    await db.chatSession.delete({ where: { id } })

    return NextResponse.json({
      data: { success: true },
    })
  } catch (error) {
    console.error('Chat session delete error:', error)
    throw error
  }
}
