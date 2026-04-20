import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const sessions = await db.chatSession.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Chat sessions list error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat sessions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title } = body

    const session = await db.chatSession.create({
      data: {
        title: title || 'New Conversation',
      },
    })

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    console.error('Chat session create error:', error)
    return NextResponse.json(
      { error: 'Failed to create chat session' },
      { status: 500 }
    )
  }
}
