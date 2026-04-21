import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const connector = await db.connector.findUnique({ where: { id } })

    if (!connector) {
      return NextResponse.json(
        { error: 'Connector not found' },
        { status: 404 }
      )
    }

    // Simulate a sync: update lastSync to now and bump itemCount
    const memoryCount = await db.memory.count({
      where: { connectorId: id },
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

    for (let i = 0; i < newItems; i++) {
      await db.memory.create({
        data: {
          content: `[Synced item ${i + 1}] New content synced from ${connector.name}`,
          title: `${connector.name} - Item ${memoryCount + i + 1}`,
          sourceType,
          connectorId: id,
          sourceTimestamp: new Date(),
        },
      })
    }

    return NextResponse.json({
      ...updated,
      syncedItems: newItems,
    })
  } catch (error) {
    console.error('Connector sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync connector' },
      { status: 500 }
    )
  }
}
