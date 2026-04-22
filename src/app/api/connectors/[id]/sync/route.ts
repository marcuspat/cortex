import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { withRateLimit } from '@/lib/rate-limit'
import { RateLimitType } from '@/lib/rate-limit'
import { withErrorHandler } from '@/lib/errors'
import { AuthRequiredError, NotFoundError } from '@/lib/errors'
import { logSync, logFailure } from '@/lib/audit'

async function syncConnectorHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId()

  if (!userId) {
    throw new AuthRequiredError('Authentication required for connector sync')
  }

  const { id } = await params
  const startTime = Date.now()

  // Verify connector belongs to user
  const connector = await db.connector.findFirst({
    where: { id, userId },
  })

  if (!connector) {
    throw new NotFoundError('Connector')
  }

  try {
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

    const duration = Date.now() - startTime

    // Audit log the sync
    await logSync(userId, 'Connector', id, {
      itemsProcessed: newItems,
      itemsAdded: newItems,
      duration,
    })

    return NextResponse.json({
      data: {
        ...updated,
        syncedItems: newItems,
      },
    })
  } catch (error) {
    // Audit log the sync failure
    await logFailure(userId, 'sync', 'Connector', id, String(error))
    throw error
  }
}

// Wrap with rate limiting (sync is expensive) and error handling
export const POST = withRateLimit(
  withErrorHandler(syncConnectorHandler, {
    endpoint: '/api/connectors/[id]/sync',
    method: 'POST',
  }),
  RateLimitType.EXPENSIVE
)
