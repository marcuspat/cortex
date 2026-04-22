import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'

export async function POST(
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
    const connector = await db.connector.findFirst({
      where: { id, userId },
    })

    if (!connector) {
      return NextResponse.json(
        { error: 'Connector not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Simulate a sync: update lastSync to now and bump itemCount
    const memoryCount = await db.memory.count({
      where: { connectorId: id, userId },
    })

    // Simulate new items being added during sync
    const newItems = Math.floor(Math.random() * 20) + 1

    const updated = await db.connector.update({
      where: { id },
      data: {
        lastSync: new Date(),
        itemCount: memoryCount + newItems,
        status: 'active',
        error: null,
      },
    })

    // Create some simulated memories from this sync
    const sourceTypeMap: Record<string, string> = {
      gmail: 'email',
      github: 'code',
      obsidian: 'note',
      notion: 'document',
      calendar: 'calendar',
      drive: 'document',
      slack: 'chat',
      filesystem: 'document',
    }

    const sourceType = sourceTypeMap[connector.type] || 'document'

    // Create memories with userId
    for (let i = 0; i < newItems; i++) {
      await db.memory.create({
        data: {
          content: `[Synced item ${i + 1}] New content synced from ${connector.name}`,
          title: `${connector.name} - Item ${memoryCount + i + 1}`,
          sourceType,
          connectorId: id,
          userId,
          sourceTimestamp: new Date(),
        },
      })
    }

    return NextResponse.json({
      data: {
        ...updated,
        syncedItems: newItems,
      },
    })
  } catch (error) {
    console.error('Connector sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync connector', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
