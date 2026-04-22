import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { AGENT_INFO } from '@/lib/constants'
import type { AgentStatus, AgentType } from '@/lib/types'
import { AuthRequiredError, generateRequestId } from '@/lib/errors'

export async function GET() {
  const requestId = generateRequestId()
  const startTime = Date.now()

  const userId = await getCurrentUserId()

  if (!userId) {
    throw new AuthRequiredError()
  }

  try {
    const allTraces = await db.agentTrace.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    const tracesByAgent = new Map<AgentType, typeof allTraces>()
    for (const agent of AGENT_INFO) {
      tracesByAgent.set(agent.type, [])
    }
    for (const trace of allTraces) {
      const agentType = trace.agentType as AgentType
      const existing = tracesByAgent.get(agentType) ?? []
      existing.push(trace)
      tracesByAgent.set(agentType, existing)
    }

    const agentStatuses: AgentStatus[] = AGENT_INFO.map((info) => {
      const traces = tracesByAgent.get(info.type) ?? []
      const totalRuns = traces.length
      const completedRuns = traces.filter((t) => t.status === 'completed').length
      const failedRuns = traces.filter((t) => t.status === 'failed').length
      const runningRuns = traces.filter((t) => t.status === 'running').length
      const lastTrace = traces[0] ?? null

      const avgDurationMs =
        totalRuns > 0
          ? Math.round(traces.reduce((sum, t) => sum + t.durationMs, 0) / totalRuns)
          : 0

      let status: AgentStatus['status'] = 'idle'
      if (runningRuns > 0) {
        status = 'running'
      } else if (failedRuns > 0 && completedRuns === 0 && totalRuns > 0) {
        status = 'error'
      } else if (failedRuns > completedRuns && totalRuns > 3) {
        status = 'error'
      }

      return {
        type: info.type,
        label: info.label,
        description: info.description,
        icon: info.icon,
        lastRun: lastTrace ? lastTrace.createdAt.toISOString() : null,
        runCount: totalRuns,
        successCount: completedRuns,
        failCount: failedRuns,
        avgDurationMs,
        status,
      }
    })

    const response = NextResponse.json({
      data: agentStatuses,
    })

    response.headers.set('x-request-id', requestId)
    response.headers.set('x-response-time', `${Date.now() - startTime}ms`)

    return response
  } catch (error) {
    console.error('Agent status error:', error)
    throw error
  }
}
