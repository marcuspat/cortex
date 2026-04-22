import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { CreateChatMessageSchema } from '@/lib/validations/chat'
import { validateRequest, validationErrorResponse } from '@/lib/validate'
import { NotFoundError, AuthRequiredError, generateRequestId } from '@/lib/errors'

// POST /api/chat/sessions/[id]/messages - Send a message in a chat session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId()
  const startTime = Date.now()

  const userId = await getCurrentUserId()

  if (!userId) {
    throw new AuthRequiredError()
  }

  const { data, error } = await validateRequest(CreateChatMessageSchema, request)

  if (error || !data) {
    return validationErrorResponse(error, requestId)
  }

  try {
    const { id } = await params

    // Verify session belongs to user
    const session = await db.chatSession.findFirst({
      where: { id, userId },
    })

    if (!session) {
      throw new NotFoundError('Chat session')
    }

    // Extract keywords from user message for memory search
    const stopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
      'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
      'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
      'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
      'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
      'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
      'because', 'but', 'and', 'or', 'if', 'while', 'about', 'it', 'its',
      'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we',
      'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself',
      'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
      'herself', 'they', 'them', 'their', 'theirs', 'themselves', 'what',
      'which', 'who', 'whom', 'tell', 'find', 'show', 'get', 'know', 'think',
    ])

    const keywords = data.content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word: string) => word.length > 2 && !stopWords.has(word))

    // Search memories based on keywords
    const relevantMemories = await db.memory.findMany({
      where: {
        userId,
        ...(keywords.length > 0
          ? {
              OR: keywords.flatMap((keyword: string) => [
                { title: { contains: keyword, mode: 'insensitive' } },
                { content: { contains: keyword, mode: 'insensitive' } },
              ]),
            }
          : {}),
      },
      take: 5,
      orderBy: { relevanceScore: 'desc' },
    })

    const memoryIds = relevantMemories.map((m) => m.id)

    // Create user message
    const userMessage = await db.chatMessage.create({
      data: {
        sessionId: id,
        role: data.role || 'user',
        content: data.content,
        memoryIds: JSON.stringify([]),
      },
    })

    // Generate assistant response based on found memories
    let assistantContent: string

    if (relevantMemories.length === 0) {
      assistantContent =
        "I couldn't find any relevant memories matching your query. Try connecting more data sources or using different keywords. I'm here to help you explore your second brain!"
    } else {
      const memorySummaries = relevantMemories.map((m) => {
        const preview =
          m.content.length > 150
            ? m.content.substring(0, 150) + '...'
            : m.content
        return `- **${m.title || 'Untitled'}** (${m.sourceType}): ${preview}`
      })

      assistantContent = `Based on your query, I found ${relevantMemories.length} relevant memory item${relevantMemories.length > 1 ? 's' : ''}:\n\n${memorySummaries.join('\n\n')}\n\n---\n\nWould you like me to dive deeper into any of these, or search for something else?`
    }

    // Create assistant message
    const assistantMessage = await db.chatMessage.create({
      data: {
        sessionId: id,
        role: 'assistant',
        content: assistantContent,
        memoryIds: JSON.stringify(memoryIds),
      },
    })

    const response = NextResponse.json({
      data: {
        userMessage,
        assistantMessage,
        relevantMemories: memoryIds,
      },
    })

    response.headers.set('x-request-id', requestId)
    response.headers.set('x-response-time', `${Date.now() - startTime}ms`)

    return response
  } catch (error) {
    console.error('Chat message create error:', error)
    throw error
  }
}
