import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { UpdateInsightSchema } from '@/lib/validations/insight'
import { validateRequest, validationErrorResponse } from '@/lib/validate'
import { NotFoundError, AuthRequiredError } from '@/lib/errors'
import { logUpdate, logFailure } from '@/lib/audit'

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

    // Capture before state
    const beforeData = {
      status: existing.status,
      feedback: existing.feedback,
      priority: existing.priority,
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

    // Audit log the update
    await logUpdate(userId, 'InsightCard', id, beforeData, {
      status: updated.status,
      feedback: updated.feedback,
      priority: updated.priority,
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Insight update error:', error)
    const { id } = await params
    await logFailure(userId, 'update', 'InsightCard', id, String(error))
    throw error
  }
}
