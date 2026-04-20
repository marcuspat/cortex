import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { DashboardStats } from '@/lib/types';

export async function GET() {
  try {
    const [
      connectors,
      memories,
      insightCards,
      recentTraces,
      recentInsights,
    ] = await Promise.all([
      db.connector.findMany(),
      db.memory.findMany(),
      db.insightCard.findMany(),
      db.agentTrace.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.insightCard.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const totalConnectors = connectors.length;
    const activeConnectors = connectors.filter(
      (c) => c.status === 'active'
    ).length;
    const totalMemories = memories.length;
    const totalInsights = insightCards.length;
    const pendingInsights = insightCards.filter(
      (i) => i.status === 'pending'
    ).length;

    // Memory distribution by sourceType
    const memoryBySource: { source: string; count: number }[] = [];
    const memorySourceMap: Record<string, number> = {};
    for (const m of memories) {
      memorySourceMap[m.sourceType] = (memorySourceMap[m.sourceType] || 0) + 1;
    }
    for (const [source, count] of Object.entries(memorySourceMap)) {
      memoryBySource.push({ source, count });
    }

    // Insight card distribution by type
    const insightsByType: { type: string; count: number }[] = [];
    const insightTypeMap: Record<string, number> = {};
    for (const i of insightCards) {
      insightTypeMap[i.type] = (insightTypeMap[i.type] || 0) + 1;
    }
    for (const [type, count] of Object.entries(insightTypeMap)) {
      insightsByType.push({ type, count });
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
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
