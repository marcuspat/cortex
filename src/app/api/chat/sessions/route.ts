import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { CreateChatSessionSchema } from '@/lib/validations/chat'
import { validateRequest, validationErrorResponse } from '@/lib/validate'
import { AuthRequiredError } from '@/lib/errors'

// GET /api/chat/sessions - List chat sessions for current user
export async function GET() {
  const userId = await getCurrentUserId()

  if (!userId) {
    throw new AuthRequiredError()
  }

  try {
    const sessions = await db.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            createdAt: true,
          },
        },
      },
    })

    return NextResponse.json({
      data: sessions,
      meta: {
        count: sessions.length,
      },
    })
  } catch (error) {
    console.error('Chat sessions list error:', error)
    throw error
  }
}

// POST /api/chat/sessions - Create a new chat session
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId()

  if (!userId) {
    throw new AuthRequiredError()
  }

  // Validate input (title is optional)
  const { data, error } = await validateRequest(CreateChatSessionSchema, request)

  if (error) {
    // Allow empty body for default title
    const session = await db.chatSession.create({
      data: {
        userId,
        title: 'New Conversation',
      },
    })

    return NextResponse.json({ data: session }, { status: 201 })
  }

  try {
    const session = await db.chatSession.create({
      data: {
        userId,
        title: data.title || 'New Conversation',
      },
    })

    return NextResponse.json({ data: session }, { status: 201 })
  } catch (error) {
    console.error('Chat session create error:', error)
    throw error
  }
}
