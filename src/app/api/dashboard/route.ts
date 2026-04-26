// Force dynamic rendering - don't prerender at build time
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { withRateLimit } from '@/lib/rate-limit'
import { RateLimitType } from '@/lib/rate-limit'
import { AuthRequiredError, generateRequestId } from '@/lib/errors'
import type { DashboardStats } from '@/lib/types'

async function dashboardHandler() {
  const requestId = generateRequestId()
  const startTime = Date.now()

  const userId = await getCurrentUserId()

  // Use demo user for unauthenticated requests in development
  const effectiveUserId = userId || (process.env.NODE_ENV === 'development'
    ? (await db.user.findUnique({ where: { email: 'demo@cortex.ai' } }))?.id
    : null)

  if (!effectiveUserId) {
    throw new AuthRequiredError()
  }

  try {
    const [
      connectors,
      memories,
      insightCards,
      recentTraces,
      recentInsights,
    ] = await Promise.all([
      db.connector.findMany({
        where: { userId: effectiveUserId }, // CRITICAL: Filter by user
      }),
      db.memory.findMany({
        where: { userId: effectiveUserId }, // CRITICAL: Filter by user
      }),
      db.insightCard.findMany({
        where: { userId: effectiveUserId }, // CRITICAL: Filter by user
      }),
      db.agentTrace.findMany({
        where: { userId: effectiveUserId }, // CRITICAL: Filter by user
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.insightCard.findMany({
        where: { userId: effectiveUserId }, // CRITICAL: Filter by user
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    const totalConnectors = connectors.length
    const activeConnectors = connectors.filter(
      (c) => c.status === 'active'
    ).length
    const totalMemories = memories.length
    const totalInsights = insightCards.length
    const pendingInsights = insightCards.filter(
      (i) => i.status === 'pending'
    ).length

    // Memory distribution by sourceType
    const memoryBySource: { source: string; count: number }[] = []
    const memorySourceMap: Record<string, number> = {}
    for (const m of memories) {
      memorySourceMap[m.sourceType] = (memorySourceMap[m.sourceType] || 0) + 1
    }
    for (const [source, count] of Object.entries(memorySourceMap)) {
      memoryBySource.push({ source, count })
    }

    // Insight card distribution by type
    const insightsByType: { type: string; count: number }[] = []
    const insightTypeMap: Record<string, number> = {}
    for (const i of insightCards) {
      insightTypeMap[i.type] = (insightTypeMap[i.type] || 0) + 1
    }
    for (const [type, count] of Object.entries(insightTypeMap)) {
      insightsByType.push({ type, count })
    }

    const body: DashboardStats = {
      totalConnectors,
      activeConnectors,
      totalMemories,
      pendingInsights,
      totalInsights,
      recentTraces: recentTraces.map((t) => ({
        id: t.id,
        agentType: t.agentType as DashboardStats['recentTraces'][0]['agentType'],
        status: t.status as DashboardStats['recentTraces'][0]['status'],
        input: t.input,
        output: t.output,
        memoryIds: t.memoryIds,
        error: t.error,
        durationMs: t.durationMs,
        steps: t.steps,
        createdAt: t.createdAt.toISOString(),
      })),
      recentInsights: recentInsights.map((i) => ({
        id: i.id,
        title: i.title,
        claim: i.claim,
        type: i.type as DashboardStats['recentInsights'][0]['type'],
        status: i.status as DashboardStats['recentInsights'][0]['status'],
        action: i.action,
        feedback: i.feedback as DashboardStats['recentInsights'][0]['feedback'],
        agentType: i.agentType,
        priority: i.priority,
        memoryIds: i.memoryIds,
        expiresAt: i.expiresAt?.toISOString() ?? null,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      })),
      memoryBySource,
      insightsByType,
    }

    const response = NextResponse.json(body)

    response.headers.set('x-request-id', requestId)
    response.headers.set('x-response-time', `${Date.now() - startTime}ms`)

    return response
  } catch (error) {
    console.error('Dashboard fetch error:', error)
    throw error
  }
}

// Wrap with rate limiting
export const GET = withRateLimit(dashboardHandler, RateLimitType.GENERAL)
