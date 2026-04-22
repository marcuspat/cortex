import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { UpdateInsightSchema } from '@/lib/validations/insight'
import { validateRequest, validationErrorResponse } from '@/lib/validate'
import { NotFoundError, AuthRequiredError } from '@/lib/errors'

// PATCH /api/insights/[id] - Update insight (feedback, status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId()

  if (!userId) {
    throw new AuthRequiredError()
  }

  // Validate input
  const { data, error } = await validateRequest(UpdateInsightSchema, request)

  if (error || !data) {
    return validationErrorResponse(error)
  }

  try {
    const { id } = await params

    // Verify insight belongs to user
    const existing = await db.insightCard.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      throw new NotFoundError('Insight card')
    }

    // Update only provided fields
    const updateData: any = {}
    if (data.status !== undefined) {
      updateData.status = data.status
    }
    if (data.feedback !== undefined) {
      updateData.feedback = data.feedback
    }
    if (data.priority !== undefined) {
      updateData.priority = data.priority
    }

    const updated = await db.insightCard.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Insight update error:', error)
    throw error
  }
}
