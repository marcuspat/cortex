'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useCortexStore } from '@/lib/store';
import type { DashboardStats, AgentStatus, InsightCard, InsightType } from '@/lib/types';
import { formatRelativeTime, truncate } from '@/lib/helpers';
import { AGENT_INFO } from '@/lib/constants';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plug,
  Database,
  Lightbulb,
  Bot,
  RefreshCw,
  MessageSquare,
  ArrowRight,
  Zap,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  PenTool,
  CalendarClock,
  Workflow,
} from 'lucide-react';

// ─── Icon helper ─────────────────────────────────────────────────────────────

const LUCIDE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Database,
  Search,
  Plug,
  PenTool,
  CalendarClock,
  Workflow,
};

function getAgentIcon(iconName: string) {
  return LUCIDE_ICONS[iconName] ?? Bot;
}

// ─── Insight type badge colors ──────────────────────────────────────────────

const INSIGHT_TYPE_COLORS: Record<InsightType, string> = {
  connection: 'border-orange-300 bg-orange-100 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300',
  reminder: 'border-red-300 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
  draft: 'border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300',
  summary: 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  suggestion: 'border-purple-300 bg-purple-100 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300',
};

// ─── Agent status helpers ───────────────────────────────────────────────────

function getStatusDotColor(status: AgentStatus['status']) {
  switch (status) {
    case 'running':
      return 'bg-sky-500';
    case 'idle':
      return 'bg-zinc-400';
    case 'error':
      return 'bg-red-500';
  }
}

function getStatusLabel(status: AgentStatus['status']) {
  switch (status) {
    case 'running':
      return 'Running';
    case 'idle':
      return 'Idle';
    case 'error':
      return 'Error';
  }
}

// ─── Stat Card Skeleton ─────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function DashboardView() {
  const { setCurrentView, selectInsight } = useCortexStore();

  // ── Data state ──
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, agentRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/agents/status'),
      ]);

      if (!dashRes.ok || !agentRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const dashJson: DashboardStats = await dashRes.json();
      const agentJson: AgentStatus[] = await agentRes.json();

      setDashboardData(dashJson);
      setAgentStatuses(agentJson);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Track authentication state
  const { data: session, status: authStatus } = useSession();

  useEffect(() => {
    // Fetch dashboard on mount and when authentication state changes
    if (authStatus === 'authenticated' || authStatus === 'unauthenticated') {
      fetchDashboard();
    }
  }, [fetchDashboard, authStatus, session?.user?.id]);

  // ── Quick action handlers ──

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const res = await fetch('/api/connectors');
      if (res.ok) {
        const connectors = await res.json();
        await Promise.all(
          connectors.map((c: { id: string }) =>
            fetch(`/api/connectors/${c.id}/sync`, { method: 'POST' })
          )
        );
      }
      // Refresh data after sync
      await fetchDashboard();
    } finally {
      setSyncingAll(false);
    }
  };

  const handleGenerateInsights = async () => {
    setGenerating(true);
    try {
      // Simulate insight generation by waiting and refreshing
      await new Promise((r) => setTimeout(r, 1500));
      await fetchDashboard();
    } finally {
      setGenerating(false);
    }
  };

  const handleInsightClick = (insight: InsightCard) => {
    selectInsight(insight.id);
    setCurrentView('insights');
  };

  // ── Derived values ──

  const agentSuccessRate =
    agentStatuses && agentStatuses.length > 0
      ? (() => {
          const totalSuccess = agentStatuses.reduce((s, a) => s + a.successCount, 0);
          const totalRuns = agentStatuses.reduce((s, a) => s + a.runCount, 0);
          return totalRuns > 0 ? ((totalSuccess / totalRuns) * 100).toFixed(1) : '—';
        })()
      : '—';

  // ── Render ──

  if (error && !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground text-sm">{error}</p>
        <Button variant="outline" onClick={fetchDashboard}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Overview of your Cortex agent network
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={fetchDashboard}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          dashboardData && (
            <>
              {/* Active Connectors */}
              <Card className="gap-4 py-4">
                <CardContent className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Active Connectors</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">
                        {dashboardData.activeConnectors}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        / {dashboardData.totalConnectors}
                      </span>
                    </div>
                    <p className="text-emerald-600 dark:text-emerald-400 text-xs">
                      +2 since last week
                    </p>
                  </div>
                  <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                    <Plug className="text-muted-foreground h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              {/* Total Memories */}
              <Card className="gap-4 py-4">
                <CardContent className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Total Memories</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">
                        {dashboardData.totalMemories.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      indexed across sources
                    </p>
                  </div>
                  <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                    <Database className="text-muted-foreground h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              {/* Pending Insights */}
              <Card className="gap-4 py-4">
                <CardContent className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Pending Insights</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">
                        {dashboardData.pendingInsights}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {dashboardData.pendingInsights > 0
                        ? `${dashboardData.pendingInsights} awaiting review`
                        : 'All caught up'}
                    </p>
                  </div>
                  <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                    <Lightbulb className="text-muted-foreground h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              {/* Agent Health */}
              <Card className="gap-4 py-4">
                <CardContent className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">Agent Health</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">
                        {agentSuccessRate}%
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs">success rate</p>
                  </div>
                  <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                    <Bot className="text-muted-foreground h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </>
          )
        )}
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ── Recent Insights (3 cols) ──────────────────────────────────── */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Insights</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground h-8 gap-1 text-xs"
                  onClick={() => setCurrentView('insights')}
                >
                  View All
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
              <CardDescription>
                Latest discoveries from your agent network
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2 rounded-lg border p-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16 rounded-md" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                ))
              ) : dashboardData && dashboardData.recentInsights.length > 0 ? (
                dashboardData.recentInsights.map((insight) => (
                  <button
                    key={insight.id}
                    onClick={() => handleInsightClick(insight)}
                    className="group w-full text-left rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-medium leading-snug line-clamp-1">
                        {insight.title}
                      </h4>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Priority dot */}
                        <span
                          className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                            insight.priority >= 8
                              ? 'bg-red-500'
                              : insight.priority >= 5
                                ? 'bg-amber-500'
                                : 'bg-zinc-400'
                          }`}
                          title={`Priority: ${insight.priority}`}
                        />
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${
                            INSIGHT_TYPE_COLORS[insight.type] ?? ''
                          }`}
                        >
                          {insight.type}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed line-clamp-2">
                      {insight.claim}
                    </p>
                    <div className="text-muted-foreground mt-2 flex items-center gap-1.5 text-[11px]">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(insight.createdAt)}
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  No insights yet. Connect some sources and let your agents get to work.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Agent Status (2 cols) ─────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Agent Status</CardTitle>
                <Shield className="text-muted-foreground h-4 w-4" />
              </div>
              <CardDescription>
                Health of your autonomous agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="space-y-3 rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-6 w-6 rounded" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-2 w-full rounded-full" />
                      </div>
                    ))
                  : agentStatuses?.map((agent) => {
                      const IconComp = getAgentIcon(agent.icon);
                      const successRate =
                        agent.runCount > 0
                          ? Math.round((agent.successCount / agent.runCount) * 100)
                          : 0;

                      return (
                        <div
                          key={agent.type}
                          className="rounded-lg border p-3 transition-colors hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <div className="bg-muted flex h-7 w-7 items-center justify-center rounded-md">
                              <IconComp className="text-muted-foreground h-3.5 w-3.5" />
                            </div>
                            <span className="text-sm font-medium">{agent.label}</span>
                            <span
                              className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                agent.status === 'running'
                                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                                  : agent.status === 'error'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${getStatusDotColor(agent.status)} ${
                                  agent.status === 'running' ? 'animate-pulse' : ''
                                }`}
                              />
                              {getStatusLabel(agent.status)}
                            </span>
                          </div>
                          <p className="text-muted-foreground mt-1.5 text-[11px] leading-snug line-clamp-1">
                            {agent.description}
                          </p>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>{agent.runCount} runs</span>
                            <span>
                              {agent.lastRun
                                ? formatRelativeTime(agent.lastRun)
                                : 'Never'}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <Progress
                              value={successRate}
                              className="h-1.5"
                            />
                            <span className="text-muted-foreground shrink-0 text-[11px]">
                              {successRate}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="text-muted-foreground h-4 w-4" />
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleSyncAll}
              disabled={syncingAll}
            >
              {syncingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync All Connectors
            </Button>
            <Button
              variant="outline"
              onClick={handleGenerateInsights}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lightbulb className="h-4 w-4" />
              )}
              Generate Insights
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentView('chat')}
            >
              <MessageSquare className="h-4 w-4" />
              New Chat Session
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentView('memory')}
            >
              <Database className="h-4 w-4" />
              View Memory
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
