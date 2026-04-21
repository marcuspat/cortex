import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { feedback, status } = body

    const insight = await db.insightCard.findUnique({ where: { id } })
    if (!insight) {
      return NextResponse.json(
        { error: 'Insight card not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, string> = {}
    if (feedback !== undefined) {
      updateData.feedback = feedback
    }
    if (status !== undefined) {
      updateData.status = status
    }

    const updated = await db.insightCard.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Insight update error:', error)
    return NextResponse.json(
      { error: 'Failed to update insight card' },
      { status: 500 }
    )
  }
}
